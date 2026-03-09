<script lang="ts">
	import type { PageData } from './$types.js';

	let { data } = $props<{ data: PageData }>();

	let scanning = $state(false);
	let scanProgress = $state(data.scanProgress);

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

	async function triggerScan() {
		scanning = true;
		try {
			await fetch('/api/scan', { method: 'POST' });
			// Poll for progress
			const interval = setInterval(async () => {
				const res = await fetch('/api/scan');
				const progress = await res.json();
				scanProgress = progress;
				if (!progress.scanning) {
					clearInterval(interval);
					scanning = false;
					// Reload page data
					window.location.reload();
				}
			}, 1000);
		} catch {
			scanning = false;
		}
	}
</script>

<svelte:head>
	<title>Dashboard - QT Orphan Handler</title>
</svelte:head>

<div class="page">
	<div class="header">
		<h1>Dashboard</h1>
		<button class="btn-primary" onclick={triggerScan} disabled={scanning}>
			{scanning ? `Scanning... (${scanProgress.processed}/${scanProgress.total})` : 'Run Scan'}
		</button>
	</div>

	<div class="cards">
		<div class="card stat-card">
			<div class="stat-label">Orphaned Torrents</div>
			<div class="stat-value">{data.orphanCount}</div>
		</div>

		<div class="card stat-card">
			<div class="stat-label">Orphaned Disk Usage</div>
			<div class="stat-value">{formatBytes(data.orphanBytes)}</div>
		</div>

		<div class="card stat-card">
			<div class="stat-label">Scan Interval</div>
			<div class="stat-value">
				{data.config.scanInterval > 0 ? `${data.config.scanInterval}s` : 'Disabled'}
			</div>
		</div>

		<div class="card stat-card">
			<div class="stat-label">Categories</div>
			<div class="stat-value small">{data.config.categories.join(', ') || 'All'}</div>
		</div>
	</div>

	<div class="card">
		<h2>Connection</h2>
		<p class="muted">{data.config.qbittorrentUrl}</p>
	</div>

	{#if data.recentScans.length > 0}
		<div class="card" style="margin-top: 1rem;">
			<h2>Recent Scans</h2>
			<table class="scan-table">
				<thead>
					<tr>
						<th>Date</th>
						<th>Status</th>
						<th>Torrents</th>
						<th>Orphaned</th>
						<th>Size</th>
					</tr>
				</thead>
				<tbody>
					{#each data.recentScans as scan}
						<tr>
							<td>{formatDate(scan.startedAt)}</td>
							<td>
								<span class="badge" class:badge-success={scan.status === 'completed'}
									class:badge-danger={scan.status === 'failed'}
									class:badge-warning={scan.status === 'running'}>
									{scan.status}
								</span>
							</td>
							<td>{scan.totalTorrents}</td>
							<td>{scan.orphanedCount}</td>
							<td>{formatBytes(scan.orphanedBytes)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
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

	h1 {
		font-size: 1.5rem;
	}

	h2 {
		font-size: 1.1rem;
		margin-bottom: 0.75rem;
	}

	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		text-align: center;
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		margin-top: 0.25rem;
	}

	.stat-value.small {
		font-size: 1rem;
	}

	.muted {
		color: var(--text-muted);
	}

	.scan-table {
		width: 100%;
		border-collapse: collapse;
	}

	.scan-table th,
	.scan-table td {
		padding: 0.5rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--border);
	}

	.scan-table th {
		font-size: 0.8rem;
		color: var(--text-muted);
		text-transform: uppercase;
		font-weight: 500;
	}
</style>
