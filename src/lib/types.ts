export interface AppConfig {
	qbittorrent: {
		url: string;
		username: string;
		password: string;
	};
	scan: {
		interval: number;
		categories: string[];
	};
	filters: FilterConfig[];
	pathMappings: PathMapping[];
}

export interface FilterConfig {
	name: string;
	directories: string[];
}

export interface PathMapping {
	from: string;
	to: string;
}

export interface QBTorrent {
	hash: string;
	name: string;
	category: string;
	tags: string;
	save_path: string;
	size: number;
	state: string;
	content_path: string;
}

export interface QBTorrentFile {
	index: number;
	name: string;
	size: number;
	progress: number;
}

export interface ScanResult {
	id: number;
	startedAt: string;
	completedAt: string | null;
	status: 'running' | 'completed' | 'failed';
	totalTorrents: number;
	orphanedCount: number;
	orphanedBytes: number;
	errorMessage: string | null;
}

export interface OrphanedTorrent {
	id: number;
	scanId: number;
	hash: string;
	name: string;
	category: string;
	tags: string;
	savePath: string;
	size: number;
	state: string;
	reason: 'no_links' | 'filtered_only';
	matchedFilter: string | null;
	deletedAt: string | null;
}

export interface OrphanedFile {
	id: number;
	orphanTorrentId: number;
	filePath: string;
	size: number;
	inode: number;
	nlinkCount: number;
	reason: 'no_links' | 'filtered_only';
}

export const DEFAULT_CONFIG: AppConfig = {
	qbittorrent: {
		url: 'http://localhost:8080',
		username: '',
		password: ''
	},
	scan: {
		interval: 3600,
		categories: ['sonarr', 'radarr']
	},
	filters: [],
	pathMappings: []
};
