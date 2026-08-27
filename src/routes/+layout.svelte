<script lang="ts">
	import '../app.css';
	import { organization, website } from '$lib/seo/ld';
	import { loadAds } from '$lib/seo/ads';
	import { onMount } from 'svelte';
	let { children } = $props();
	onMount(loadAds);
	const graph = JSON.stringify({ '@context': 'https://schema.org', '@graph': [organization(), website()] }).replace(/</g, '\\u003c');
</script>

<svelte:head>{@html `<script type="application/ld+json">${graph}</script>`}</svelte:head>

{@render children()}
