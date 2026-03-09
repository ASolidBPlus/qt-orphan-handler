import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const scans = sqliteTable('scans', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	startedAt: text('started_at').notNull(),
	completedAt: text('completed_at'),
	status: text('status', { enum: ['running', 'completed', 'failed'] }).notNull().default('running'),
	totalTorrents: integer('total_torrents').notNull().default(0),
	orphanedCount: integer('orphaned_count').notNull().default(0),
	orphanedBytes: integer('orphaned_bytes').notNull().default(0),
	errorMessage: text('error_message')
});

export const orphanedTorrents = sqliteTable('orphaned_torrents', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	scanId: integer('scan_id')
		.notNull()
		.references(() => scans.id),
	hash: text('hash').notNull(),
	name: text('name').notNull(),
	category: text('category').notNull().default(''),
	tags: text('tags').notNull().default(''),
	savePath: text('save_path').notNull(),
	size: integer('size').notNull(),
	state: text('state').notNull(),
	reason: text('reason', { enum: ['no_links', 'filtered_only'] }).notNull(),
	matchedFilter: text('matched_filter'),
	deletedAt: text('deleted_at')
});

export const orphanedFiles = sqliteTable('orphaned_files', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	orphanTorrentId: integer('orphan_torrent_id')
		.notNull()
		.references(() => orphanedTorrents.id),
	filePath: text('file_path').notNull(),
	size: integer('size').notNull(),
	inode: integer('inode').notNull(),
	nlinkCount: integer('nlink_count').notNull(),
	reason: text('reason', { enum: ['no_links', 'filtered_only'] }).notNull()
});
