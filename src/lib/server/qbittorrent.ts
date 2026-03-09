import type { QBTorrent, QBTorrentFile } from '$lib/types.js';

export class QBittorrentClient {
	private url: string;
	private username: string;
	private password: string;
	private cookie: string | null = null;

	constructor(url: string, username: string = '', password: string = '') {
		this.url = url.replace(/\/+$/, '');
		this.username = username;
		this.password = password;
	}

	private async request(path: string, options: RequestInit = {}): Promise<Response> {
		const headers: Record<string, string> = {
			Referer: this.url,
			...(options.headers as Record<string, string> || {})
		};

		if (this.cookie) {
			headers['Cookie'] = this.cookie;
		}

		const res = await fetch(`${this.url}${path}`, {
			...options,
			headers
		});

		if (res.status === 403 && this.username) {
			await this.login();
			headers['Cookie'] = this.cookie || '';
			return fetch(`${this.url}${path}`, { ...options, headers });
		}

		return res;
	}

	async login(): Promise<boolean> {
		if (!this.username) return true;

		const body = new URLSearchParams({
			username: this.username,
			password: this.password
		});

		const res = await fetch(`${this.url}/api/v2/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Referer: this.url
			},
			body
		});

		const text = await res.text();
		if (text === 'Ok.') {
			const setCookie = res.headers.get('set-cookie');
			if (setCookie) {
				this.cookie = setCookie.split(';')[0];
			}
			return true;
		}
		return false;
	}

	async testConnection(): Promise<{ ok: boolean; version?: string; error?: string }> {
		try {
			if (this.username) {
				const loggedIn = await this.login();
				if (!loggedIn) return { ok: false, error: 'Authentication failed' };
			}
			const res = await this.request('/api/v2/app/version');
			if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
			const version = await res.text();
			return { ok: true, version };
		} catch (e) {
			return { ok: false, error: (e as Error).message };
		}
	}

	async getTorrents(categories?: string[]): Promise<QBTorrent[]> {
		const torrents: QBTorrent[] = [];

		if (categories && categories.length > 0) {
			for (const category of categories) {
				const params = new URLSearchParams({ category });
				const res = await this.request(`/api/v2/torrents/info?${params}`);
				if (!res.ok) throw new Error(`Failed to fetch torrents: HTTP ${res.status}`);
				const data = await res.json();
				torrents.push(...data);
			}
		} else {
			const res = await this.request('/api/v2/torrents/info');
			if (!res.ok) throw new Error(`Failed to fetch torrents: HTTP ${res.status}`);
			const data = await res.json();
			torrents.push(...data);
		}

		return torrents;
	}

	async getTorrentFiles(hash: string): Promise<QBTorrentFile[]> {
		const res = await this.request(`/api/v2/torrents/files?hash=${hash}`);
		if (!res.ok) throw new Error(`Failed to fetch torrent files: HTTP ${res.status}`);
		return res.json();
	}

	async deleteTorrents(hashes: string[], deleteFiles: boolean = false): Promise<void> {
		const body = new URLSearchParams({
			hashes: hashes.join('|'),
			deleteFiles: deleteFiles.toString()
		});

		const res = await this.request('/api/v2/torrents/delete', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body
		});

		if (!res.ok) throw new Error(`Failed to delete torrents: HTTP ${res.status}`);
	}
}
