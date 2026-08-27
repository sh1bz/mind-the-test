<script lang="ts">
	import Seo from '$lib/seo/Seo.svelte';
	import { STATIC_PAGES, SITE, TEST } from '$lib/seo/site';
	import { breadcrumb, webpage } from '$lib/seo/ld';
	import { MAP } from '$lib/content';
	const page = STATIC_PAGES.find((p) => p.path === '/revise/')!;
</script>

<Seo title={page.title} description={page.description} path={page.path} jsonld={[webpage(page), breadcrumb([{ name: 'Home', path: '/' }, { name: 'Revision notes', path: page.path }])]} />

<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><span>Revision notes</span></nav>
<h1>Life in the UK revision notes</h1>
<div class="prose">
	<p>The official handbook, <i>{TEST.handbook}</i>, cut down to the facts the test asks. Each section is a set of cards: the question on the left, the answer in blue on the right. In {SITE.name} every wrong answer opens its card, one tap away.</p>
</div>
<div class="list">
	{#each MAP as s (s.id)}
		<a class="lrow ic-sep" href="/revise/{s.id}/"><span class="ic" style="background:var(--{s.color})"></span>{s.title}<span class="v">{s.cards.length} card{s.cards.length === 1 ? '' : 's'}</span><span class="chev">›</span></a>
	{/each}
</div>
