<script lang="ts">
	// Contact support. Writes to Supabase (same table as feedback) — no email address is exposed in the
	// page, so it cannot be scraped. A honeypot field and a one-minute cooldown block bots.
	import { app } from '$lib/store/app.svelte';
	let { onclose }: { onclose: () => void } = $props();
	let replyEmail = $state(app.user?.email ?? '');
	let text = $state('');
	let hp = $state(''); // honeypot: real people leave it empty
	let busy = $state(false);
	let done = $state(false);
	let err = $state<string | null>(null);
	const KEY = 'uis-support-last';
	async function send() {
		if (!text.trim()) return;
		if (hp) { done = true; return; } // a bot filled the hidden field — drop it silently
		try { const last = Number(localStorage.getItem(KEY) || 0); if (Date.now() - last < 60_000) { err = 'Please wait a minute between messages.'; return; } } catch { /* fine */ }
		busy = true; err = null;
		const ok = await app.sendSupport(replyEmail.trim() || null, text);
		busy = false;
		if (ok) { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* fine */ } done = true; }
		else err = 'Could not send. Please try again in a moment.';
	}
</script>

{#if done}
	<div class="note">Thanks — we have your message. If you left an email, we will reply there.</div>
{:else}
	<div class="onb" style="gap:12px">
		<p class="muted small" style="margin:0">Tell us what is wrong or what you need. We read every message.</p>
		<input class="field" type="email" autocomplete="email" placeholder="Your email (so we can reply)" aria-label="Your email" bind:value={replyEmail} />
		<textarea class="field" rows="4" maxlength="2000" placeholder="How can we help?" aria-label="Your message" bind:value={text}></textarea>
		<input class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" bind:value={hp} />
		{#if err}<div class="verdict"><b>Not sent</b>{err}</div>{/if}
		<button class="big" type="button" disabled={busy || !text.trim()} onclick={send}>{busy ? 'Sending…' : 'Send message'} <span class="arrow">›</span></button>
	</div>
{/if}

<style>
	.field { font-family: inherit; background: var(--soft); resize: none; }
	.hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
</style>
