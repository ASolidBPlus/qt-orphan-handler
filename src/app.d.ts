import type { AppDb } from '$lib/server/db/index.js';
import type { AppConfig } from '$lib/types.js';

declare global {
	namespace App {
		interface Locals {
			db: AppDb;
			config: AppConfig;
		}
	}
}

export {};
