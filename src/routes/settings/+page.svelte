<script lang="ts">
	import type { PageData } from './$types.js';
	import type { AppConfig, FilterConfig, PathMapping } from '$lib/types.js';

	let { data } = $props<{ data: PageData }>();

	let config = $state<AppConfig>(structuredClone(data.config));
	let saving = $state(false);
	let saved = $state(false);
	let testing = $state(false);
	let testResult = $state<{ ok: boolean; version?: string; error?: string } | null>(null);
	let categoriesText = $state(config.scan.categories.join(', '));

	async function saveSettings() {
		saving = true;
		saved = false;
		config.scan.categories = categoriesText
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

		try {
			const res = await fetch('/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(config)
			});
			if (res.ok) saved = true;
		} finally {
			saving = false;
		}
	}

	async function testConnection() {
		testing = true;
		testResult = null;
		try {
			const res = await fetch('/api/config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'test-connection',
					url: config.qbittorrent.url,
					username: config.qbittorrent.username,
					password: config.qbittorrent.password
				})
			});
			testResult = await res.json();
		} catch (e) {
			testResult = { ok: false, error: (e as Error).message };
		} finally {
			testing = false;
		}
	}

	function addFilter() {
		config.filters = [...config.filters, { name: '', directories: [''] }];
	}

	function removeFilter(i: number) {
		config.filters = config.filters.filter((_, idx) => idx !== i);
	}

	function addFilterDir(fi: number) {
		config.filters[fi].directories = [...config.filters[fi].directories, ''];
	}

	function removeFilterDir(fi: number, di: number) {
		config.filters[fi].directories = config.filters[fi].directories.filter((_, idx) => idx !== di);
	}

	function addMapping() {
		config.pathMappings = [...config.pathMappings, { from: '', to: '' }];
	}

	function removeMapping(i: number) {
		config.pathMappings = config.pathMappings.filter((_, idx) => idx !== i);
	}
</script>

<svelte:head>
	<title>Settings - QT Orphan Handler</title>
</svelte:head>

<div class="page">
	<div class="header">
		<h1>Settings</h1>
		<div class="header-actions">
			{#if saved}
				<span class="saved-msg">Saved!</span>
			{/if}
			<button class="btn-primary" onclick={saveSettings} disabled={saving}>
				{saving ? 'Saving...' : 'Save'}
			</button>
		</div>
	</div>

	<div class="card section">
		<h2>qBittorrent Connection</h2>
		<div class="form-row">
			<div class="field">
				<label for="qbt-url">URL</label>
				<input id="qbt-url" type="text" bind:value={config.qbittorrent.url} placeholder="http://localhost:8080" />
			</div>
		</div>
		<div class="form-row two-col">
			<div class="field">
				<label for="qbt-user">Username (optional)</label>
				<input id="qbt-user" type="text" bind:value={config.qbittorrent.username} />
			</div>
			<div class="field">
				<label for="qbt-pass">Password (optional)</label>
				<input id="qbt-pass" type="password" bind:value={config.qbittorrent.password} />
			</div>
		</div>
		<div class="test-row">
			<button class="btn-outline" onclick={testConnection} disabled={testing}>
				{testing ? 'Testing...' : 'Test Connection'}
			</button>
			{#if testResult}
				{#if testResult.ok}
					<span class="badge badge-success">Connected (v{testResult.version})</span>
				{:else}
					<span class="badge badge-danger">Failed: {testResult.error}</span>
				{/if}
			{/if}
		</div>
	</div>

	<div class="card section">
		<h2>Scan Settings</h2>
		<div class="form-row two-col">
			<div class="field">
				<label for="scan-interval">Interval (seconds, 0 = disabled)</label>
				<input id="scan-interval" type="number" bind:value={config.scan.interval} min="0" />
			</div>
			<div class="field">
				<label for="scan-categories">Categories (comma-separated)</label>
				<input id="scan-categories" type="text" bind:value={categoriesText} placeholder="sonarr, radarr" />
			</div>
		</div>
	</div>

	<div class="card section">
		<h2>Filters</h2>
		<p class="help">Directories where hard-linked files should be considered "filtered" (e.g., cross-seed folders). Torrents with links only to these directories are treated as orphaned.</p>

		{#each config.filters as filter, fi}
			<div class="filter-block">
				<div class="filter-header">
					<input type="text" bind:value={config.filters[fi].name} placeholder="Filter name" class="filter-name" />
					<button class="btn-outline btn-sm" onclick={() => removeFilter(fi)}>Remove</button>
				</div>
				{#each filter.directories as dir, di}
					<div class="dir-row">
						<input type="text" bind:value={config.filters[fi].directories[di]} placeholder="/data/cross-seed" />
						<button class="btn-outline btn-sm" onclick={() => removeFilterDir(fi, di)}>X</button>
					</div>
				{/each}
				<button class="btn-outline btn-sm" onclick={() => addFilterDir(fi)}>+ Directory</button>
			</div>
		{/each}
		<button class="btn-outline" onclick={addFilter}>+ Add Filter</button>
	</div>

	<div class="card section">
		<h2>Path Mappings</h2>
		<p class="help">Map remote paths to local paths. Useful when qBittorrent reports paths that differ from what this app can access (similar to Sonarr/Radarr remote path mappings).</p>

		{#each config.pathMappings as mapping, i}
			<div class="mapping-row">
				<div class="field">
					<label for="mapping-from-{i}">From (qBittorrent path)</label>
					<input id="mapping-from-{i}" type="text" bind:value={config.pathMappings[i].from} placeholder="/downloads/" />
				</div>
				<div class="field">
					<label for="mapping-to-{i}">To (local path)</label>
					<input id="mapping-to-{i}" type="text" bind:value={config.pathMappings[i].to} placeholder="/data/downloads/" />
				</div>
				<button class="btn-outline btn-sm mapping-remove" onclick={() => removeMapping(i)}>X</button>
			</div>
		{/each}
		<button class="btn-outline" onclick={addMapping}>+ Add Mapping</button>
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.saved-msg {
		color: var(--success);
		font-size: 0.875rem;
	}

	h1 {
		font-size: 1.5rem;
	}

	h2 {
		font-size: 1.1rem;
		margin-bottom: 0.75rem;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.help {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin-top: -0.5rem;
	}

	.form-row {
		display: flex;
		gap: 1rem;
	}

	.two-col {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.field {
		flex: 1;
	}

	.test-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.filter-block {
		background: var(--bg);
		border-radius: var(--radius);
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.filter-header {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.filter-name {
		max-width: 250px;
	}

	.dir-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.mapping-row {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		gap: 0.75rem;
		align-items: end;
		background: var(--bg);
		border-radius: var(--radius);
		padding: 0.75rem;
	}

	.mapping-remove {
		margin-bottom: 0.25rem;
	}

	.btn-sm {
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
	}
</style>
