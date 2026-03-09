import { sql } from 'drizzle-orm';
import type { AppDb } from './index.js';

export function migrate(db: AppDb) {
	db.run(sql`CREATE TABLE IF NOT EXISTS scans (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		started_at TEXT NOT NULL,
		completed_at TEXT,
		status TEXT NOT NULL DEFAULT 'running',
		total_torrents INTEGER NOT NULL DEFAULT 0,
		orphaned_count INTEGER NOT NULL DEFAULT 0,
		orphaned_bytes INTEGER NOT NULL DEFAULT 0,
		error_message TEXT
	)`);

	db.run(sql`CREATE TABLE IF NOT EXISTS orphaned_torrents (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		scan_id INTEGER NOT NULL REFERENCES scans(id),
		hash TEXT NOT NULL,
		name TEXT NOT NULL,
		category TEXT NOT NULL DEFAULT '',
		tags TEXT NOT NULL DEFAULT '',
		save_path TEXT NOT NULL,
		size INTEGER NOT NULL,
		state TEXT NOT NULL,
		reason TEXT NOT NULL,
		matched_filter TEXT,
		arr_status TEXT,
		deleted_at TEXT
	)`);

	db.run(sql`CREATE TABLE IF NOT EXISTS orphaned_files (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		orphan_torrent_id INTEGER NOT NULL REFERENCES orphaned_torrents(id),
		file_path TEXT NOT NULL,
		size INTEGER NOT NULL,
		inode INTEGER NOT NULL,
		nlink_count INTEGER NOT NULL,
		reason TEXT NOT NULL
	)`);

	db.run(sql`CREATE INDEX IF NOT EXISTS idx_orphaned_torrents_scan_id ON orphaned_torrents(scan_id)`);
	db.run(sql`CREATE INDEX IF NOT EXISTS idx_orphaned_files_torrent_id ON orphaned_files(orphan_torrent_id)`);

	// Migration: add arr_status column if missing
	try {
		db.run(sql`ALTER TABLE orphaned_torrents ADD COLUMN arr_status TEXT`);
	} catch {
		// Column already exists
	}
}
