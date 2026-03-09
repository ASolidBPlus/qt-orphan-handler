import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

const DB_PATH = process.env.DB_PATH || './config/qt-orphan-handler.db';

let db: ReturnType<typeof createDb> | null = null;

function createDb() {
	const sqlite = new Database(DB_PATH);
	sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	return drizzle(sqlite, { schema });
}

export function getDb() {
	if (!db) {
		db = createDb();
	}
	return db;
}

export type AppDb = ReturnType<typeof getDb>;
