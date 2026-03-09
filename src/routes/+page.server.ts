import type { PageServerLoad } from './$types.js';
import { desc, eq, isNull } from 'drizzle-orm';
import { scans, orphanedTorrents } from '$lib/server/db/schema.js';
import { getScanProgress } from '$lib/server/scanner.js';

export const load: PageServerLoad = async ({ locals }) => {
	const { db, config } = locals;

	const latestScan = db
		.select()
		.from(scans)
		.where(eq(scans.status, 'completed'))
		.orderBy(desc(scans.completedAt))
		.limit(1)
		.get();

	const recentScans = db
		.select()
		.from(scans)
		.orderBy(desc(scans.id))
		.limit(10)
		.all();

	let orphanCount = 0;
	let orphanBytes = 0;
	if (latestScan) {
		const orphans = db
			.select()
			.from(orphanedTorrents)
			.where(eq(orphanedTorrents.scanId, latestScan.id))
			.all();

		orphanCount = orphans.filter((o) => !o.deletedAt).length;
		orphanBytes = orphans.filter((o) => !o.deletedAt).reduce((sum, o) => sum + o.size, 0);
	}

	return {
		latestScan: latestScan || null,
		recentScans,
		orphanCount,
		orphanBytes,
		scanProgress: getScanProgress(),
		config: {
			qbittorrentUrl: config.qbittorrent.url,
			scanInterval: config.scan.interval,
			categories: config.scan.categories
		}
	};
};
