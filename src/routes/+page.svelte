<script lang="ts">
	import { browser } from '$app/environment';
	import { app } from '$lib/store/app.svelte';
	import { supabaseEnabled } from '$lib/store/supabase';
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
	import { convert } from '$lib/seo/ads';
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
	// Self-heal a client stuck on a stale service worker that cached an empty env.js (cloud reads as off).
	// Bypass the SW with a cache-busting query; if the real config is there, drop the old worker and reload.
	if (browser && !supabaseEnabled) {
		try {
			if (!sessionStorage.getItem('cfg-healed')) {
				fetch(`/_app/env.js?ping=${Date.now()}`, { cache: 'reload' })
					.then((r) => r.text())
					.then((t) => {
						if (t.includes('supabase') && 'serviceWorker' in navigator) {
							sessionStorage.setItem('cfg-healed', '1');
							navigator.serviceWorker.getRegistrations()
								.then((rs) => Promise.all(rs.map((r) => r.unregister())))
								.then(() => (self.caches ? caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))) : null))
								.then(() => location.reload());
						}
					})
					.catch(() => {});
			}
		} catch { /* fine */ }
	}
	const full = $derived(nav.screen === 'train' || nav.screen === 'mock');
	$effect(() => { void nav.screen; void nav.tab; scrollTo(0, 0); });
	// Back from Stripe: ?paid=1&session_id=cs_… Drop them from the URL. The session id signs the buyer in
	// without an email; when that fails the thanks sheet falls back to the email link.
	// From the email: ?token_hash=…&type=email. Verify here, then drop it from the URL. A used or stale link
	// (an older email, or a link a mail scanner already opened) lands on the Account tab with the reason.
	const qs = browser ? new URLSearchParams(location.search) : null;
	if (qs?.get('token_hash')) {
		const th = qs.get('token_hash')!, ty = qs.get('type') ?? 'email';
		history.replaceState(null, '', location.pathname + location.hash);
		app.verifyLink(th, ty).then((ok) => { if (!ok) nav.go('account'); });
	} else if (browser && /^#error=/.test(location.hash)) {
		app.linkError = 'That link has expired or was already used. Request a new one.';
		history.replaceState(null, '', location.pathname + '#account');
		nav.go('account');
	}
	if (browser && new URLSearchParams(location.search).get('paid')) {
		const sid = new URLSearchParams(location.search).get('session_id');
		history.replaceState(null, '', location.pathname + location.hash);
		nav.paywall = 'thanks';
		convert('unlock', 4.99);
		if (sid && !app.user) app.claimSession(sid);
		else if (app.user) app.claim();
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
