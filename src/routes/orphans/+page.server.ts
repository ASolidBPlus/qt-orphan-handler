import type { PageServerLoad } from './$types.js';
import { desc, eq, isNull, and } from 'drizzle-orm';
import { scans, orphanedTorrents, orphanedFiles } from '$lib/server/db/schema.js';

export const load: PageServerLoad = async ({ locals }) => {
	const { db } = locals;

	const latestScan = db
		.select()
		.from(scans)
		.where(eq(scans.status, 'completed'))
		.orderBy(desc(scans.completedAt))
		.limit(1)
		.get();

	if (!latestScan) {
		return { orphans: [], scan: null, files: {} };
	}

	const orphans = db
		.select()
		.from(orphanedTorrents)
		.where(and(eq(orphanedTorrents.scanId, latestScan.id), isNull(orphanedTorrents.deletedAt)))
		.orderBy(desc(orphanedTorrents.size))
		.all();

	// Get files for each orphan
	const files: Record<number, typeof orphanedFiles.$inferSelect[]> = {};
	for (const orphan of orphans) {
		files[orphan.id] = db
			.select()
			.from(orphanedFiles)
			.where(eq(orphanedFiles.orphanTorrentId, orphan.id))
			.all();
	}

	return { orphans, scan: latestScan, files };
};
