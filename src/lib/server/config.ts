import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { parse, stringify } from 'yaml';
import { DEFAULT_CONFIG, type AppConfig } from '$lib/types.js';

const CONFIG_PATH = process.env.CONFIG_PATH || './config/config.yml';

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
	const result = { ...target };
	for (const key of Object.keys(source)) {
		if (
			source[key] &&
			typeof source[key] === 'object' &&
			!Array.isArray(source[key]) &&
			target[key] &&
			typeof target[key] === 'object' &&
			!Array.isArray(target[key])
		) {
			result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
		} else {
			result[key] = source[key];
		}
	}
	return result;
}

export function loadConfig(): AppConfig {
	if (!existsSync(CONFIG_PATH)) {
		const dir = dirname(CONFIG_PATH);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		writeFileSync(CONFIG_PATH, stringify(DEFAULT_CONFIG), 'utf-8');
		return { ...DEFAULT_CONFIG };
	}

	const raw = readFileSync(CONFIG_PATH, 'utf-8');
	const parsed = parse(raw) || {};
	return deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, parsed) as unknown as AppConfig;
}

export function saveConfig(config: AppConfig): void {
	const dir = dirname(CONFIG_PATH);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(CONFIG_PATH, stringify(config), 'utf-8');
}

export function validateConfig(config: unknown): config is AppConfig {
	if (!config || typeof config !== 'object') return false;
	const c = config as Record<string, unknown>;

	if (!c.qbittorrent || typeof c.qbittorrent !== 'object') return false;
	const qbt = c.qbittorrent as Record<string, unknown>;
	if (typeof qbt.url !== 'string') return false;

	if (!c.scan || typeof c.scan !== 'object') return false;
	const scan = c.scan as Record<string, unknown>;
	if (typeof scan.interval !== 'number') return false;
	if (!Array.isArray(scan.categories)) return false;

	if (!Array.isArray(c.filters)) return false;
	if (!Array.isArray(c.pathMappings)) return false;

	return true;
}
