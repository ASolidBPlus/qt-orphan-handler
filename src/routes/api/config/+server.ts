import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { saveConfig, validateConfig } from '$lib/server/config.js';
import { startScheduler } from '$lib/server/scheduler.js';
import { QBittorrentClient } from '$lib/server/qbittorrent.js';
import { ArrClient } from '$lib/server/arr.js';

export const GET: RequestHandler = async ({ locals }) => {
	return json(locals.config);
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	const body = await request.json();

	if (!validateConfig(body)) {
		return json({ error: 'Invalid configuration' }, { status: 400 });
	}

	saveConfig(body);
	startScheduler(locals.db, body);

	return json({ status: 'saved' });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { action } = body as { action: string };

	if (action === 'test-connection') {
		const { url, username, password } = body as {
			url: string;
			username?: string;
			password?: string;
		};
		const qbt = new QBittorrentClient(url, username || '', password || '');
		const result = await qbt.testConnection();
		return json(result);
	}

	if (action === 'test-arr') {
		const { name, type, url, apiKey, category } = body as {
			name: string;
			type: 'sonarr' | 'radarr';
			url: string;
			apiKey: string;
			category: string;
		};
		const client = new ArrClient({ name, type, url, apiKey, category });
		const result = await client.testConnection();
		return json(result);
	}

	return json({ error: 'Unknown action' }, { status: 400 });
};
