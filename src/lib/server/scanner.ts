import { stat, readdir } from 'fs/promises';
import { join } from 'path';
import { eq } from 'drizzle-orm';
import type { AppConfig, PathMapping } from '$lib/types.js';
import type { AppDb } from './db/index.js';
import { scans, orphanedTorrents, orphanedFiles } from './db/schema.js';
import { QBittorrentClient } from './qbittorrent.js';

interface InodeEntry {
	dev: number;
	ino: number;
	filterName: string;
}

type InodeMap = Map<string, InodeEntry>;

function inodeKey(dev: number, ino: number): string {
	return `${dev}:${ino}`;
}

function applyPathMappings(filePath: string, mappings: PathMapping[]): string {
	for (const mapping of mappings) {
		if (filePath.startsWith(mapping.from)) {
			return mapping.to + filePath.slice(mapping.from.length);
		}
	}
	return filePath;
}

async function walkDirectory(dir: string): Promise<string[]> {
	const files: string[] = [];
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				files.push(...(await walkDirectory(fullPath)));
			} else if (entry.isFile()) {
				files.push(fullPath);
			}
		}
	} catch {
		// Directory may not exist or be inaccessible
	}
	return files;
}

async function buildInodeMap(config: AppConfig): Promise<InodeMap> {
	const map: InodeMap = new Map();

	for (const filter of config.filters) {
		for (const dir of filter.directories) {
			const mappedDir = applyPathMappings(dir, config.pathMappings);
			const files = await walkDirectory(mappedDir);

			const BATCH_SIZE = 50;
			for (let i = 0; i < files.length; i += BATCH_SIZE) {
				const batch = files.slice(i, i + BATCH_SIZE);
				const stats = await Promise.all(
					batch.map(async (f) => {
						try {
							return { file: f, stat: await stat(f) };
						} catch {
							return null;
						}
					})
				);

				for (const result of stats) {
					if (result) {
						const key = inodeKey(result.stat.dev, result.stat.ino);
						map.set(key, {
							dev: result.stat.dev,
							ino: result.stat.ino,
							filterName: filter.name
						});
					}
				}
			}
		}
	}

	return map;
}

export interface ScanProgress {
	scanning: boolean;
	scanId: number | null;
	processed: number;
	total: number;
}

let currentProgress: ScanProgress = {
	scanning: false,
	scanId: null,
	processed: 0,
	total: 0
};

export function getScanProgress(): ScanProgress {
	return { ...currentProgress };
}

export async function runScan(db: AppDb, config: AppConfig): Promise<number> {
	if (currentProgress.scanning) {
		throw new Error('Scan already in progress');
	}

	const [scan] = db
		.insert(scans)
		.values({ startedAt: new Date().toISOString(), status: 'running' })
		.returning();

	currentProgress = { scanning: true, scanId: scan.id, processed: 0, total: 0 };

	try {
		const qbt = new QBittorrentClient(
			config.qbittorrent.url,
			config.qbittorrent.username,
			config.qbittorrent.password
		);

		if (config.qbittorrent.username) {
			await qbt.login();
		}

		console.log('[scanner] Building inode map from filter directories...');
		const inodeMap = await buildInodeMap(config);
		console.log(`[scanner] Inode map built with ${inodeMap.size} entries`);

		const categories = config.scan.categories.length > 0 ? config.scan.categories : undefined;
		const torrents = await qbt.getTorrents(categories);
		console.log(`[scanner] Found ${torrents.length} torrents to scan`);

		currentProgress.total = torrents.length;
		let orphanCount = 0;
		let orphanBytes = 0;

		for (const torrent of torrents) {
			currentProgress.processed++;

			const files = await qbt.getTorrentFiles(torrent.hash);
			if (files.length === 0) continue;

			const fileResults: {
				path: string;
				size: number;
				inode: number;
				nlink: number;
				reason: 'no_links' | 'filtered_only';
				matchedFilter: string | null;
			}[] = [];

			let allOrphaned = true;
			let torrentReason: 'no_links' | 'filtered_only' = 'no_links';
			let torrentFilter: string | null = null;

			for (const file of files) {
				const rawPath = join(torrent.save_path, file.name);
				const filePath = applyPathMappings(rawPath, config.pathMappings);

				try {
					const fileStat = await stat(filePath);

					if (fileStat.nlink === 1) {
						fileResults.push({
							path: filePath,
							size: file.size,
							inode: fileStat.ino,
							nlink: fileStat.nlink,
							reason: 'no_links',
							matchedFilter: null
						});
					} else {
						const key = inodeKey(fileStat.dev, fileStat.ino);
						const filterEntry = inodeMap.get(key);

						if (filterEntry) {
							fileResults.push({
								path: filePath,
								size: file.size,
								inode: fileStat.ino,
								nlink: fileStat.nlink,
								reason: 'filtered_only',
								matchedFilter: filterEntry.filterName
							});
							torrentReason = 'filtered_only';
							torrentFilter = filterEntry.filterName;
						} else {
							allOrphaned = false;
						}
					}
				} catch {
					// File doesn't exist on disk — treat as orphaned (no_links)
					fileResults.push({
						path: filePath,
						size: file.size,
						inode: 0,
						nlink: 0,
						reason: 'no_links',
						matchedFilter: null
					});
				}
			}

			if (allOrphaned && fileResults.length > 0) {
				orphanCount++;
				orphanBytes += torrent.size;

				const [orphan] = db
					.insert(orphanedTorrents)
					.values({
						scanId: scan.id,
						hash: torrent.hash,
						name: torrent.name,
						category: torrent.category || '',
						tags: torrent.tags || '',
						savePath: torrent.save_path,
						size: torrent.size,
						state: torrent.state,
						reason: torrentReason,
						matchedFilter: torrentFilter
					})
					.returning();

				for (const fr of fileResults) {
					db.insert(orphanedFiles)
						.values({
							orphanTorrentId: orphan.id,
							filePath: fr.path,
							size: fr.size,
							inode: fr.inode,
							nlinkCount: fr.nlink,
							reason: fr.reason
						})
						.run();
				}
			}
		}

		db.update(scans)
			.set({
				completedAt: new Date().toISOString(),
				status: 'completed',
				totalTorrents: torrents.length,
				orphanedCount: orphanCount,
				orphanedBytes: orphanBytes
			})
			.where(eq(scans.id, scan.id))
			.run();

		console.log(`[scanner] Scan complete: ${orphanCount} orphaned torrents found`);
		return scan.id;
	} catch (e) {
		const errorMsg = (e as Error).message;
		console.error(`[scanner] Scan failed: ${errorMsg}`);
		db.update(scans)
			.set({
				completedAt: new Date().toISOString(),
				status: 'failed',
				errorMessage: errorMsg
			})
			.where(eq(scans.id, scan.id))
			.run();
		throw e;
	} finally {
		currentProgress = { scanning: false, scanId: null, processed: 0, total: 0 };
	}
}
