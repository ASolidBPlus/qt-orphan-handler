import type { LayoutServerLoad } from './$types.js';
import { desc, eq } from 'drizzle-orm';
import { scans } from '$lib/server/db/schema.js';

export const load: LayoutServerLoad = async ({ locals }) => {
	const lastScan = locals.db
		.select()
		.from(scans)
		.orderBy(desc(scans.id))
		.limit(1)
		.get();

	return {
		lastScan: lastScan || null
	};
};
