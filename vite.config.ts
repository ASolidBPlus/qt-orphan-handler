import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';

let gitSha = 'unknown';
try {
	gitSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
	// Not in a git repo (e.g. Docker build)
}

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__GIT_SHA__: JSON.stringify(gitSha)
	}
});
