<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { daysLeft } from '$lib/ui/derive';
	import Calendar from './Calendar.svelte';
	import Ic from './Ic.svelte';
	import Sheet from './Sheet.svelte';
	let { ondone }: { ondone: () => void } = $props();
	let step = $state(0);
	let picked = $state<string | undefined>(undefined);
	const now = Date.now();
	const ms = $derived(picked ? new Date(picked + 'T00:00:00').getTime() : undefined);
	const left = $derived(daysLeft(ms, now));
	const labels = ['Welcome', 'How it works', 'Your test'];
	function save() { if (picked) app.setExam(picked); ondone(); }
</script>

<Sheet label={labels[step]} close="Skip" onclose={ondone}>
	<div class="onb">
		{#if step === 0}
			<svg class="logo tile" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" /><path d="M50 20 A30 30 0 1 1 24 35"/><path d="M14 27 L24 35 L34 27"/><path d="M38 51 L47 60 L65 40"/></svg>
			<h3>A question you miss comes back until it sticks</h3>
			<p>Most apps show you the whole bank and hope. Here every wrong answer is asked again, spaced out, until you get it right from memory. You spend time only on what you do not know yet.</p>
			<div class="list flow">
				<div class="lrow"><b class="n bad">✕</b>Wrong answer<span class="v">back in 8–12 cards</span></div>
				<div class="lrow"><b class="n">1</b>Right again<span class="v">same session, 15–20 later</span></div>
				<div class="lrow"><b class="n">2</b>Right the next day<span class="v">then 3 days later</span></div>
				<div class="lrow"><b class="n ok">3</b>Three in a row<span class="v">it sticks</span></div>
			</div>
		{:else if step === 1}
			<h3>Train until it sticks</h3>
			<p>Everything is built from what you can recall right now, not from how many pages you have read. Do as much or as little as you want.</p>
			<div class="hlist">
				<div><Ic name="review" /><span><b>Practice</b> — questions due for review plus any new ones. You choose how many to take on.</span></div>
				<div><Ic name="map" color="var(--green)" /><span><b>The Map</b> — every miss links to its place in the handbook, so you learn the fact, not the letter.</span></div>
				<div><Ic name="trophy" color="var(--orange)" /><span><b>Mock exams</b> — the real format: 24 questions, 45 minutes, pass at 18.</span></div>
				<div><Ic name="heart" color="var(--indigo)" /><span><b>Readiness</b> — how much of the whole bank you have locked in.</span></div>
			</div>
		{:else}
			<h3>When is your test?</h3>
			<p>Set your test date and the app counts down to it and tracks your readiness against it. No date is fine — you can add it later in Account.</p>
			<div class="card" style="display:flex;flex-direction:column;gap:8px">
				<Calendar value={picked} onpick={(iso) => (picked = iso)} />
			</div>
			<div class="note">
				{#if picked && left !== undefined}
					<b>{left} day{left === 1 ? '' : 's'}</b> until your test — we will track your readiness against it.
				{:else}
					No date yet — you can add it any time in Account.
				{/if}
			</div>
		{/if}
		<div class="dots" aria-hidden="true">{#each labels as _, i}<i class:on={i === step}></i>{/each}</div>
		{#if step < 2}
			<button class="big" type="button" onclick={() => step++}>Next <span class="arrow">›</span></button>
		{:else}
			<button class="big" type="button" disabled={!picked} onclick={save}>Save date <span class="arrow">›</span></button>
			<button class="big ghost" type="button" onclick={ondone}>Set it later</button>
		{/if}
	</div>
</Sheet>
