import type { Handle } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/index.js';
import { migrate } from '$lib/server/db/migrate.js';
import { loadConfig } from '$lib/server/config.js';
import { startScheduler } from '$lib/server/scheduler.js';

const db = getDb();
migrate(db);

const config = loadConfig();
startScheduler(db, config);

console.log('[init] QT Orphan Handler started');

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.db = db;
	event.locals.config = loadConfig();
	return resolve(event);
};
