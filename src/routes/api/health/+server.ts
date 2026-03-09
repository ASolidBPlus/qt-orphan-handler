import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

declare const __GIT_SHA__: string;

export const GET: RequestHandler = async () => {
	return json({ status: 'ok', version: __GIT_SHA__, timestamp: new Date().toISOString() });
};
