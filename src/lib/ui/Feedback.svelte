<script lang="ts">
	// The feedback card: shown once, inline on the first mock result. NPS 0–10 plus one free-text line.
	import { app } from '$lib/store/app.svelte';
	let { skip = true }: { skip?: boolean } = $props(); // the Account sheet has its own close button
	let score = $state<number | null>(null);
	let text = $state('');
	let sent = $state(false);
	function send() { sent = true; app.sendFeedback(score, text.trim()); }
	function skipIt() { app.sendFeedback(null, ''); }
</script>

{#if sent}
	<div class="note">Thank you. That helps.</div>
{:else}
	<div class="card fb" role="group" aria-label="Feedback">
		<div class="hd">How likely are you to recommend this to a friend?{#if skip}<button class="chip" type="button" onclick={skipIt}>Skip</button>{/if}</div>
		<div class="scale" role="radiogroup" aria-label="0 = not at all, 10 = very likely">
			{#each Array.from({ length: 11 }, (_, i) => i) as n (n)}
				<button class="chip num" class:on={score === n} type="button" role="radio" aria-checked={score === n} onclick={() => (score = n)}>{n}</button>
			{/each}
		</div>
		<div class="ends muted small"><span>Not at all</span><span>Very likely</span></div>
		<textarea class="field" rows="2" maxlength="1000" placeholder="What would make this worth paying for?" aria-label="What would make this worth paying for?" bind:value={text}></textarea>
		<button class="big" type="button" disabled={score === null && !text.trim()} onclick={send}>Send <span class="arrow">›</span></button>
	</div>
{/if}

<style>
	.fb { display: flex; flex-direction: column; gap: 10px; }
	.fb .hd { justify-content: space-between; margin-bottom: 0; }
	.scale { display: flex; gap: 4px; }
	.scale .chip { flex: 1; justify-content: center; padding: 7px 0; min-width: 0; }
	.ends { display: flex; justify-content: space-between; padding: 0 2px; }
	.field { resize: none; font-family: inherit; background: var(--soft); }
	.big:disabled { opacity: 0.4; }
</style>
