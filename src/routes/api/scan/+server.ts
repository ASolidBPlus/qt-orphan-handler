import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { runScan, getScanProgress } from '$lib/server/scanner.js';

export const GET: RequestHandler = async () => {
	return json(getScanProgress());
};

export const POST: RequestHandler = async ({ locals }) => {
	const { db, config } = locals;

	const progress = getScanProgress();
	if (progress.scanning) {
		return json({ error: 'Scan already in progress' }, { status: 409 });
	}

	// Run scan in background, return immediately
	runScan(db, config).catch((e) => {
		console.error('[api/scan] Scan failed:', (e as Error).message);
	});

	return json({ status: 'started' });
};
