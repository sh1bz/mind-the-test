<script lang="ts">
	// The head of every public page: title, description, canonical, Open Graph, Twitter, JSON-LD.
	import { SITE } from './site';
	let {
		title,
		description,
		path,
		type = 'website',
		jsonld = []
	}: { title: string; description: string; path: string; type?: 'website' | 'article'; jsonld?: Record<string, unknown>[] } = $props();
	const url = $derived(SITE.url + path);
	const image = $derived(SITE.url + SITE.ogImage);
	const graph = $derived(JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonld }));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
	<meta property="og:site_name" content={SITE.name} />
	<meta property="og:locale" content={SITE.locale} />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Until It Sticks — Life in the UK test practice" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
	{#if jsonld.length}{@html `<script type="application/ld+json">${graph.replace(/</g, '\\u003c')}</script>`}{/if}
</svelte:head>
