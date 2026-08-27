<script lang="ts">
	import Seo from '$lib/seo/Seo.svelte';
	import { sectionPage, topicSlug, SITE } from '$lib/seo/site';
	import { article, breadcrumb, webpage } from '$lib/seo/ld';
	import { MAP, TOPICS } from '$lib/content';
	import MapCardView from '$lib/ui/MapCardView.svelte';
	let { data } = $props();
	const s = $derived(data.section);
	const page = $derived(sectionPage(s));
	const others = $derived(MAP.filter((x) => x.id !== s.id));
	const updated = '2026-08-27';
</script>

<Seo title={page.title} description={page.description} path={page.path} type="article" jsonld={[webpage(page), article(page, updated), breadcrumb([{ name: 'Home', path: '/' }, { name: 'Revision notes', path: '/revise/' }, { name: s.title, path: page.path }])]} />

<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/revise/">Revision notes</a><span>›</span><span>{s.title}</span></nav>
<h1>{s.title}</h1>
<div class="prose"><p>{s.note}</p></div>

{#each s.cards as card (card.id)}
	<section id={card.id}><MapCardView {card} section={s} /></section>
{/each}

<div class="prose">
	{#if s.topic !== null}
		<p>Test yourself: <a href="/questions/{topicSlug(s.topic)}/">free practice questions on {TOPICS[s.topic].toLowerCase()}</a>. In {SITE.name} every question you miss links back to its card here. <a href="/">Start free</a>.</p>
	{:else}
		<p>In {SITE.name} every question you miss links back to its card here. <a href="/">Start free</a>.</p>
	{/if}
</div>
<div class="sec"><h2>Other sections</h2></div>
<div class="list">
	{#each others as o (o.id)}<a class="lrow ic-sep" href="/revise/{o.id}/"><span class="ic" style="background:var(--{o.color})"></span>{o.title}<span class="chev">›</span></a>{/each}
</div>

<style>
	section { scroll-margin-top: 12px; }
</style>
