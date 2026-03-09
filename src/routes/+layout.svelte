<script lang="ts">
	import '../app.css';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/orphans', label: 'Orphans' },
		{ href: '/settings', label: 'Settings' }
	];
</script>

<div class="app">
	<nav class="navbar">
		<div class="nav-brand">QT Orphan Handler</div>
		<div class="nav-links">
			{#each navItems as item}
				<a href={item.href} class="nav-link">{item.label}</a>
			{/each}
		</div>
	</nav>

	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	.app {
		min-height: 100vh;
	}

	.navbar {
		display: flex;
		align-items: center;
		gap: 2rem;
		padding: 0 2rem;
		height: 56px;
		background: var(--bg-card);
		border-bottom: 1px solid var(--border);
	}

	.nav-brand {
		font-weight: 700;
		font-size: 1.1rem;
		color: var(--accent);
	}

	.nav-links {
		display: flex;
		gap: 0.25rem;
	}

	.nav-link {
		padding: 0.375rem 0.75rem;
		border-radius: var(--radius);
		font-size: 0.875rem;
		color: var(--text-muted);
		transition: color 0.15s, background 0.15s;
	}

	.nav-link:hover {
		color: var(--text);
		background: var(--bg-hover);
	}

	.content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}
</style>
