<script lang="ts">
	// Chrome for the public content pages: brand header, "Open the app", footer nav.
	import { STATIC_PAGES } from '$lib/seo/site';
	let { children } = $props();
	const links = STATIC_PAGES.filter((p) => p.path !== '/');
</script>

<div class="site col">
	<header class="row" style="padding-top:8px">
		<a href="/" class="brand" aria-label="Until It Sticks home"><img src="/icon.svg" alt="" width="30" height="30" /><b>Until It Sticks</b></a>
		<a href="/" class="open">Open the app ›</a>
	</header>
	{@render children()}
	<footer>
		<a class="big" href="/">Start practising free <span class="arrow">›</span></a>
		<nav class="foot" aria-label="Site">
			{#each links as p (p.path)}<a href={p.path}>{p.title.split(/ [—:] /)[0]}</a>{/each}
		</nav>
	</footer>
</div>

<style>
	.site { padding-bottom: 40px; }
	.brand { display: flex; align-items: center; gap: 10px; color: var(--ink); text-decoration: none; font-size: 17px; }
	.open { font-size: 15px; font-weight: 500; text-decoration: none; white-space: nowrap; }
	footer { display: flex; flex-direction: column; gap: 14px; margin-top: 10px; }
	a.big { text-decoration: none; }
	.foot { display: flex; flex-wrap: wrap; gap: 6px 16px; padding: 0 4px; font-size: 14px; }
	.site :global(h1) { font-size: 30px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.12; margin-top: 4px; }
	.site :global(.prose) { display: flex; flex-direction: column; gap: 10px; font-size: 15px; line-height: 1.55; color: var(--ink2); }
	.site :global(.prose h2) { font-size: 22px; color: var(--ink); margin-top: 8px; }
	.site :global(.prose h3) { font-size: 17px; color: var(--ink); margin-top: 4px; }
	.site :global(.prose ul), .site :global(.prose ol) { margin: 0; padding-left: 20px; }
	.site :global(.prose li) { margin: 3px 0; }
	.site :global(.prose b) { color: var(--ink); }
	.site :global(a.lrow) { text-decoration: none; }
	.site :global(.crumbs) { display: flex; flex-wrap: wrap; gap: 4px 8px; font-size: 13px; color: var(--muted); padding: 0 2px; }
	.site :global(.crumbs a) { color: var(--muted); }
</style>
