import type { ArrInstance } from '$lib/types.js';

interface ArrHistoryRecord {
	eventType: string;
	downloadId: string;
	date: string;
	sourceTitle: string;
}

interface ArrQueueRecord {
	downloadId: string;
	status: string;
	title: string;
}

export interface ArrCheckResult {
	found: boolean;
	inQueue: boolean;
	imported: boolean;
	hasDeleteEvent: boolean;
	instanceName: string;
	lastEvent: string | null;
	status: string;
}

export class ArrClient {
	private instance: ArrInstance;

	constructor(instance: ArrInstance) {
		this.instance = instance;
	}

	private get baseUrl(): string {
		return this.instance.url.replace(/\/+$/, '');
	}

	private async request(path: string): Promise<Response> {
		return fetch(`${this.baseUrl}/api/v3${path}`, {
			headers: {
				'X-Api-Key': this.instance.apiKey
			}
		});
	}

	async testConnection(): Promise<{ ok: boolean; version?: string; error?: string }> {
		try {
			const res = await this.request('/system/status');
			if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
			const data = await res.json();
			return { ok: true, version: data.version };
		} catch (e) {
			return { ok: false, error: (e as Error).message };
		}
	}

	async checkTorrent(hash: string): Promise<ArrCheckResult> {
		const downloadId = hash.toUpperCase();
		const result: ArrCheckResult = {
			found: false,
			inQueue: false,
			imported: false,
			hasDeleteEvent: false,
			instanceName: this.instance.name,
			lastEvent: null,
			status: 'No History'
		};

		try {
			// Check queue first
			const queueRes = await this.request('/queue?pageSize=1000');
			if (queueRes.ok) {
				const queueData = await queueRes.json();
				const records = queueData.records || [];
				const inQueue = records.some(
					(r: ArrQueueRecord) => r.downloadId?.toUpperCase() === downloadId
				);
				if (inQueue) {
					result.found = true;
					result.inQueue = true;
					result.status = 'In Queue';
					return result;
				}
			}

			// Check history
			const historyRes = await this.request(
				`/history?downloadId=${downloadId}&pageSize=50`
			);
			if (!historyRes.ok) return result;

			const historyData = await historyRes.json();
			const records: ArrHistoryRecord[] = historyData.records || [];

			if (records.length === 0) return result;

			result.found = true;
			result.lastEvent = records[0]?.eventType || null;

			for (const record of records) {
				if (record.eventType === 'downloadFolderImported') {
					result.imported = true;
				}
				if (
					record.eventType === 'episodeFileDeleted' ||
					record.eventType === 'movieFileDeleted' ||
					record.eventType === 'fileDeleted'
				) {
					result.hasDeleteEvent = true;
				}
			}

			// Determine descriptive status
			if (result.imported && result.hasDeleteEvent) {
				result.status = 'Imported, Media Deleted';
			} else if (result.imported) {
				result.status = 'Imported';
			} else if (result.lastEvent === 'grabbed') {
				result.status = 'Grabbed';
			} else {
				result.status = `In History (${result.lastEvent})`;
			}
		} catch (e) {
			console.error(
				`[arr] Error checking ${this.instance.name} for ${hash}:`,
				(e as Error).message
			);
			result.status = 'Error';
		}

		return result;
	}
}

export async function checkAllInstances(
	instances: ArrInstance[],
	hash: string,
	category: string
): Promise<{
	isOrphaned: boolean;
	reason: 'arr_no_record' | 'arr_deleted' | null;
	instanceName: string | null;
	arrStatus: string | null;
}> {
	// Find instances that match this torrent's category
	const matching = instances.filter(
		(inst) => inst.category.toLowerCase() === category.toLowerCase()
	);

	if (matching.length === 0) {
		return { isOrphaned: false, reason: null, instanceName: null, arrStatus: null };
	}

	for (const instance of matching) {
		const client = new ArrClient(instance);
		const result = await client.checkTorrent(hash);

		// If it's in the queue, it's actively being processed — not orphaned
		if (result.inQueue) {
			return { isOrphaned: false, reason: null, instanceName: instance.name, arrStatus: result.status };
		}

		// Found in history
		if (result.found) {
			// Was imported and then the media file was deleted → orphaned
			if (result.imported && result.hasDeleteEvent) {
				return {
					isOrphaned: true,
					reason: 'arr_deleted',
					instanceName: instance.name,
					arrStatus: result.status
				};
			}
			// Found and imported, media still exists → not orphaned
			if (result.imported) {
				return { isOrphaned: false, reason: null, instanceName: instance.name, arrStatus: result.status };
			}
			// Found but not imported — return status for context
			return { isOrphaned: false, reason: null, instanceName: instance.name, arrStatus: result.status };
		}
	}

	// Not found in any matching instance's history or queue
	return {
		isOrphaned: true,
		reason: 'arr_no_record',
		instanceName: matching[0].name,
		arrStatus: 'No History'
	};
}
