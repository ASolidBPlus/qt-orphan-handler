import type { AppConfig } from '$lib/types.js';
import type { AppDb } from './db/index.js';
import { runScan } from './scanner.js';

let timer: ReturnType<typeof setInterval> | null = null;

export function startScheduler(db: AppDb, config: AppConfig) {
	stopScheduler();

	if (config.scan.interval <= 0) {
		console.log('[scheduler] Automatic scanning disabled (interval = 0)');
		return;
	}

	const intervalMs = config.scan.interval * 1000;
	console.log(`[scheduler] Starting scan scheduler (every ${config.scan.interval}s)`);

	timer = setInterval(async () => {
		try {
			console.log('[scheduler] Triggered scheduled scan');
			await runScan(db, config);
		} catch (e) {
			console.error('[scheduler] Scheduled scan failed:', (e as Error).message);
		}
	}, intervalMs);
}

export function stopScheduler() {
	if (timer) {
		clearInterval(timer);
		timer = null;
		console.log('[scheduler] Scheduler stopped');
	}
}
