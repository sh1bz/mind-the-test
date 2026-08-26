<script lang="ts">
	import { browser } from '$app/environment';
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import Tabs from '$lib/ui/Tabs.svelte';
	import Today from '$lib/ui/Today.svelte';
	import Welcome from '$lib/ui/Welcome.svelte';
	import Train from '$lib/ui/Train.svelte';
	import Summary from '$lib/ui/Summary.svelte';
	import Mock from '$lib/ui/Mock.svelte';
	import MapTab from '$lib/ui/MapTab.svelte';
	import QuestionsTab from '$lib/ui/QuestionsTab.svelte';
	import Account from '$lib/ui/Account.svelte';

	const WELCOMED = 'lifeuk-welcomed';
	const seen = () => { try { return !!localStorage.getItem(WELCOMED); } catch { return true; } };
	let welcomed = $state(!browser || seen() || !!app.progress.exam || Object.keys(app.progress.items).length > 0);
	function done() { welcomed = true; try { localStorage.setItem(WELCOMED, '1'); } catch { /* fine */ } }
	const full = $derived(nav.screen === 'train' || nav.screen === 'mock');
</script>

<svelte:head><title>Mind the Test</title></svelte:head>

<main class="col" class:full>
	{#if !welcomed}
		<Welcome ondone={done} />
	{:else if nav.screen === 'train'}
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
