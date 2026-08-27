<script lang="ts">
	import Seo from '$lib/seo/Seo.svelte';
	import { STATIC_PAGES, FAQ } from '$lib/seo/site';
	import { breadcrumb, faqPage, webpage } from '$lib/seo/ld';
	const page = STATIC_PAGES.find((p) => p.path === '/faq/')!;
</script>

<Seo title={page.title} description={page.description} path={page.path} jsonld={[webpage(page), faqPage(), breadcrumb([{ name: 'Home', path: '/' }, { name: 'FAQ', path: page.path }])]} />

<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><span>FAQ</span></nav>
<h1>Life in the UK test: frequently asked questions</h1>
<div class="faq">
	{#each FAQ as f, i (i)}
		<section class="card">
			<h2>{f.q}</h2>
			<p>{f.a}</p>
		</section>
	{/each}
</div>
<div class="prose"><p>More detail: <a href="/life-in-the-uk-test/">the test, in full</a>.</p></div>

<style>
	.faq { display: flex; flex-direction: column; gap: 12px; }
	.faq h2 { font-size: 17px; font-weight: 600; line-height: 1.35; }
	.faq p { margin-top: 8px; font-size: 15px; line-height: 1.5; color: var(--ink2); }
</style>
