import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { desc, eq, isNull, and } from 'drizzle-orm';
import { orphanedTorrents, orphanedFiles, scans } from '$lib/server/db/schema.js';
import { QBittorrentClient } from '$lib/server/qbittorrent.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	const { db } = locals;

	// Get latest completed scan
	const latestScan = db
		.select()
		.from(scans)
		.where(eq(scans.status, 'completed'))
		.orderBy(desc(scans.completedAt))
		.limit(1)
		.get();

	if (!latestScan) {
		return json({ orphans: [], scan: null });
	}

	const showDeleted = url.searchParams.get('showDeleted') === 'true';

	const whereClause = showDeleted
		? eq(orphanedTorrents.scanId, latestScan.id)
		: and(eq(orphanedTorrents.scanId, latestScan.id), isNull(orphanedTorrents.deletedAt));

	const orphans = db
		.select()
		.from(orphanedTorrents)
		.where(whereClause)
		.orderBy(desc(orphanedTorrents.size))
		.all();

	return json({ orphans, scan: latestScan });
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	const { db, config } = locals;
	const body = await request.json();
	const { hashes, deleteFiles = false } = body as { hashes: string[]; deleteFiles?: boolean };

	if (!hashes || !Array.isArray(hashes) || hashes.length === 0) {
		return json({ error: 'No hashes provided' }, { status: 400 });
	}

	const qbt = new QBittorrentClient(
		config.qbittorrent.url,
		config.qbittorrent.username,
		config.qbittorrent.password
	);

	try {
		await qbt.deleteTorrents(hashes, deleteFiles);

		// Mark as deleted in DB
		const now = new Date().toISOString();
		for (const hash of hashes) {
			db.update(orphanedTorrents)
				.set({ deletedAt: now })
				.where(eq(orphanedTorrents.hash, hash))
				.run();
		}

		return json({ deleted: hashes.length });
	} catch (e) {
		return json({ error: (e as Error).message }, { status: 500 });
	}
};
