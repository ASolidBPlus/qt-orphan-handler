<script lang="ts">
	import type { PageData } from './$types.js';

	let { data } = $props<{ data: PageData }>();

	let selected = $state<Set<string>>(new Set());
	let expandedId = $state<number | null>(null);
	let showConfirm = $state(false);
	let deleteFiles = $state(false);
	let deleting = $state(false);

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
	}

	function formatDate(iso: string | null): string {
		if (!iso) return 'Never';
		return new Date(iso).toLocaleString();
	}

	function toggleSelect(hash: string) {
		const next = new Set(selected);
		if (next.has(hash)) {
			next.delete(hash);
		} else {
			next.add(hash);
		}
		selected = next;
	}

	function toggleAll() {
		if (selected.size === data.orphans.length) {
			selected = new Set();
		} else {
			selected = new Set(data.orphans.map((o) => o.hash));
		}
	}

	function toggleExpand(id: number) {
		expandedId = expandedId === id ? null : id;
	}

	async function deleteSelected() {
		deleting = true;
		try {
			await fetch('/api/orphans', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					hashes: Array.from(selected),
					deleteFiles
				})
			});
			window.location.reload();
		} catch {
			deleting = false;
		}
	}

	$effect(() => {
		showConfirm;
		deleteFiles = false;
	});

	const totalSelectedSize = $derived(
		data.orphans.filter((o) => selected.has(o.hash)).reduce((sum, o) => sum + o.size, 0)
	);
</script>

<svelte:head>
	<title>Orphans - QT Orphan Handler</title>
</svelte:head>

<div class="page">
	<div class="header">
		<h1>Orphaned Torrents</h1>
		{#if data.scan}
			<span class="muted">Last scan: {formatDate(data.scan.completedAt)}</span>
		{/if}
	</div>

	{#if data.orphans.length === 0}
		<div class="card empty">
			{#if data.scan}
				<p>No orphaned torrents found in the last scan.</p>
			{:else}
				<p>No scan has been completed yet. Run a scan from the Dashboard.</p>
			{/if}
		</div>
	{:else}
		<div class="toolbar">
			<div class="toolbar-left">
				<span class="muted">{data.orphans.length} orphans ({formatBytes(data.orphans.reduce((s, o) => s + o.size, 0))})</span>
			</div>
			{#if selected.size > 0}
				<div class="toolbar-right">
					<span class="muted">{selected.size} selected ({formatBytes(totalSelectedSize)})</span>
					<button class="btn-danger" onclick={() => (showConfirm = true)}>
						Delete Selected
					</button>
				</div>
			{/if}
		</div>

		<div class="card table-card">
			<table>
				<thead>
					<tr>
						<th class="th-check">
							<input type="checkbox" checked={selected.size === data.orphans.length && data.orphans.length > 0}
								onchange={toggleAll} />
						</th>
						<th>Name</th>
						<th>Category</th>
						<th>Size</th>
						<th>Reason</th>
						<th>State</th>
					</tr>
				</thead>
				<tbody>
					{#each data.orphans as orphan}
						<tr class="torrent-row" class:expanded={expandedId === orphan.id}>
							<td>
								<input type="checkbox" checked={selected.has(orphan.hash)}
									onchange={() => toggleSelect(orphan.hash)} />
							</td>
							<td>
								<button class="name-btn" onclick={() => toggleExpand(orphan.id)}>
									{orphan.name}
								</button>
							</td>
							<td><span class="badge badge-info">{orphan.category || 'none'}</span></td>
							<td>{formatBytes(orphan.size)}</td>
							<td>
								{#if orphan.reason === 'no_links'}
									<span class="badge badge-danger">No Links</span>
								{:else}
									<span class="badge badge-warning">Filtered Only</span>
								{/if}
								{#if orphan.matchedFilter}
									<span class="badge badge-info">{orphan.matchedFilter}</span>
								{/if}
							</td>
							<td class="muted">{orphan.state}</td>
						</tr>
						{#if expandedId === orphan.id && data.files[orphan.id]}
							<tr class="files-row">
								<td colspan="6">
									<div class="files-list">
										<strong>Files:</strong>
										{#each data.files[orphan.id] as file}
											<div class="file-entry">
												<span class="file-path">{file.filePath}</span>
												<span class="muted">{formatBytes(file.size)}</span>
												<span class="muted">nlink={file.nlinkCount}</span>
											</div>
										{/each}
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if showConfirm}
	<div class="overlay" onclick={() => (showConfirm = false)} role="presentation">
		<!-- svelte-ignore a11y_interactive_supports_focus a11y_click_events_have_key_events -->
		<div class="modal card" onclick={(e) => e.stopPropagation()} role="dialog">
			<h2>Confirm Delete</h2>
			<p>Delete {selected.size} torrent(s) ({formatBytes(totalSelectedSize)}) from qBittorrent?</p>
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={deleteFiles} />
				Also delete files from disk
			</label>
			{#if deleteFiles}
				<p class="warn">This will permanently remove files from disk!</p>
			{/if}
			<div class="modal-actions">
				<button class="btn-outline" onclick={() => (showConfirm = false)}>Cancel</button>
				<button class="btn-danger" onclick={deleteSelected} disabled={deleting}>
					{deleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}

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

	h1 {
		font-size: 1.5rem;
	}

	h2 {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}

	.muted {
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.empty {
		text-align: center;
		padding: 3rem;
		color: var(--text-muted);
	}

	.toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.table-card {
		padding: 0;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th, td {
		padding: 0.625rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--border);
	}

	th {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-transform: uppercase;
		font-weight: 500;
	}

	.th-check {
		width: 40px;
	}

	.torrent-row:hover {
		background: var(--bg-hover);
	}

	.name-btn {
		background: none;
		border: none;
		color: var(--text);
		padding: 0;
		font-size: 0.875rem;
		text-align: left;
		cursor: pointer;
	}

	.name-btn:hover {
		color: var(--accent);
	}

	.files-row td {
		background: var(--bg);
		padding: 0.75rem 1rem;
	}

	.files-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8rem;
	}

	.file-entry {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.file-path {
		font-family: monospace;
		word-break: break-all;
	}

	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal {
		max-width: 480px;
		width: 90%;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.75rem 0;
		font-size: 0.9rem;
		color: var(--text);
		cursor: pointer;
	}

	.checkbox-label input {
		width: auto;
	}

	.warn {
		color: var(--danger);
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 1rem;
	}
</style>
