<script lang="ts">
	// The unlock sheet. 'gate': the free part is used up. 'thanks': back from Stripe, confirm the entitlement.
	import { env } from '$env/dynamic/public';
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { QUESTIONS } from '$lib/content';
	import { FREE_QUESTIONS, FREE_MOCKS, PRICE } from '$lib/engine/gate';
	import Sheet from './Sheet.svelte';
	const LINK = env.PUBLIC_PAY_LINK ?? '';
	const rest = QUESTIONS.length - FREE_QUESTIONS;
	let email = $state(app.user?.email ?? '');
	let sent = $state(false);
	let busy = $state(false);
	let err = $state<string | null>(null);
	let checking = $state(!!app.user);
	let missing = $state(false);
	function close() { nav.paywall = null; }
	function pay() {
		if (!LINK) return;
		const e = app.user?.email;
		location.href = LINK + (e ? (LINK.includes('?') ? '&' : '?') + 'prefilled_email=' + encodeURIComponent(e) : '');
	}
	async function send(ev: Event) {
		ev.preventDefault(); busy = true; err = null;
		const r = await app.signIn(email.trim()); busy = false;
		if (r) err = r; else sent = true;
	}
	$effect(() => {
		if (nav.paywall !== 'thanks' || !app.user) return;
		checking = true; missing = false;
		app.claim().then((ok) => { checking = false; missing = !ok; if (ok) close(); });
	});
</script>

{#if nav.paywall === 'thanks'}
	<Sheet label="Payment received" close="Later" onclose={close}>
		<div class="onb">
			<div class="lock ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg></div>
			{#if app.user}
				<h3>Thank you</h3>
				{#if checking}<p>Confirming your payment…</p>
				{:else if missing}<p>Not found yet for <b>{app.user.email}</b>. Use the email from the Stripe receipt, or try again in a minute.</p>
					<button class="big" type="button" onclick={() => { checking = true; missing = false; app.claim().then((ok) => { checking = false; missing = !ok; if (ok) close(); }); }}>Check again <span class="arrow">›</span></button>
				{/if}
			{:else if sent}
				<h3>Check your email</h3>
				<p>We sent a link to <b>{email}</b>. Open it on this device and everything unlocks. Your progress is kept.</p>
				<button class="big ghost" type="button" onclick={() => (sent = false)}>Use a different email</button>
			{:else}
				<h3>Thank you. Sign in to unlock</h3>
				<p>We send a link to the email you paid with. Tap it on this device and everything opens. Your progress is kept.</p>
				<form onsubmit={send} style="display:flex;flex-direction:column;gap:10px">
					<input class="field" type="email" required autocomplete="email" placeholder="you@example.com" aria-label="Email" bind:value={email} disabled={!app.cloud} />
					<button class="big" type="submit" disabled={busy || !app.cloud}>{busy ? 'Sending…' : 'Send me a link'} <span class="arrow">›</span></button>
				</form>
				{#if err}<div class="verdict"><b>Could not send</b>{err}</div>{/if}
				<p class="fine">Use the email from the Stripe receipt.</p>
			{/if}
		</div>
	</Sheet>
{:else}
	<Sheet label="Unlock" close="Not now" onclose={close}>
		<div class="onb">
			<div class="lock"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></div>
			<h3>You have done the free part</h3>
			<p>{FREE_QUESTIONS} questions and {FREE_MOCKS === 1 ? 'one mock' : `${FREE_MOCKS} mocks`}. Unlock the other {rest} questions and unlimited mocks. Everything you have learned stays.</p>
			<div class="list flow">
				<div class="lrow"><span class="n ok">✓</span>All {QUESTIONS.length} questions</div>
				<div class="lrow"><span class="n ok">✓</span>Unlimited mocks</div>
				<div class="lrow"><span class="n ok">✓</span>Pass chance and test-day plan</div>
			</div>
			<p class="price">{PRICE}<small>once, for good</small></p>
			<button class="big" type="button" onclick={pay} disabled={!LINK}>{LINK ? `Unlock for ${PRICE}` : 'Checkout opens soon'} <span class="arrow">›</span></button>
			<p class="fine">Secure checkout by Stripe. Apple Pay and Google Pay work.</p>
		</div>
	</Sheet>
{/if}
