<script lang="ts">
	import { browser } from '$app/environment';
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import Tabs from '$lib/ui/Tabs.svelte';
	import Today from '$lib/ui/Today.svelte';
	import Onboarding from '$lib/ui/Onboarding.svelte';
	import Train from '$lib/ui/Train.svelte';
	import Summary from '$lib/ui/Summary.svelte';
	import Mock from '$lib/ui/Mock.svelte';
	import MapTab from '$lib/ui/MapTab.svelte';
	import QuestionsTab from '$lib/ui/QuestionsTab.svelte';
	import Account from '$lib/ui/Account.svelte';
	import Paywall from '$lib/ui/Paywall.svelte';
	import Landing from '$lib/seo/Landing.svelte';
	import Seo from '$lib/seo/Seo.svelte';
	import { STATIC_PAGES } from '$lib/seo/site';
	import { webapp, faqPage } from '$lib/seo/ld';
	import { onMount } from 'svelte';

	// The prerendered HTML is the landing (what crawlers and no-JS visitors read). The app takes
	// over on mount, so the server and first client render always match.
	let mounted = $state(false);
	onMount(() => { mounted = true; });
	const home = STATIC_PAGES[0];

	const WELCOMED = 'lifeuk-welcomed';
	const seen = () => { try { return !!localStorage.getItem(WELCOMED); } catch { return true; } };
	let welcomed = $state(!browser || seen() || !!app.progress.exam || Object.keys(app.progress.items).length > 0);
	function done() { welcomed = true; nav.onboarding = false; try { localStorage.setItem(WELCOMED, '1'); } catch { /* fine */ } }
	const full = $derived(nav.screen === 'train' || nav.screen === 'mock');
	$effect(() => { void nav.screen; void nav.tab; scrollTo(0, 0); });
	// Back from Stripe: ?paid=1. Drop the flag from the URL, then confirm the entitlement.
	if (browser && new URLSearchParams(location.search).get('paid')) {
		history.replaceState(null, '', location.pathname + location.hash);
		nav.paywall = 'thanks';
		if (app.user) app.claim();
	}
</script>

<Seo title={home.title} description={home.description} path="/" jsonld={[webapp(), faqPage()]} />

{#if !mounted}
	<Landing />
{:else}
<main class="col" class:full>
	{#if nav.screen === 'train'}
		<Train />
	{:else if nav.screen === 'summary'}
		<Summary />
	{:else if nav.screen === 'mock'}
		<Mock ondone={done} />
	{:else if nav.tab === 'map'}
		<MapTab />
	{:else if nav.tab === 'questions'}
		<QuestionsTab />
	{:else if nav.tab === 'account'}
		<Account />
	{:else}
		<Today />
	{/if}
</main>
{#if !full}<Tabs />{/if}
{#if !welcomed || nav.onboarding}<Onboarding ondone={done} />{/if}
{#if nav.paywall}<Paywall />{/if}
{/if}
