import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { readFileSync } from 'fs';

let appVersion = 'unknown';
try {
	const pkg = JSON.parse(readFileSync(new URL('../../../../package.json', import.meta.url), 'utf-8'));
	appVersion = pkg.version;
} catch {
	// fallback
}

export const GET: RequestHandler = async () => {
	return json({ status: 'ok', version: appVersion, timestamp: new Date().toISOString() });
};
