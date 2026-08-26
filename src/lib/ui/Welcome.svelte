<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { QUESTIONS } from '$lib/content';
	import { newPerDay } from '$lib/engine/readiness';
	import { daysLeft } from '$lib/ui/derive';
	import Calendar from './Calendar.svelte';
	let { ondone }: { ondone: () => void } = $props();
	const now = Date.now();
	const left = $derived(daysLeft(app.exam, now));
	const perDay = $derived(newPerDay(QUESTIONS.length, app.exam, now));
	const mins = $derived(Math.max(1, Math.round((perDay * 40) / 60)));
</script>

<div class="brand" style="margin-top:8px"><svg class="logo" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 20 A30 30 0 1 1 24 35"/><path d="M14 27 L24 35 L34 27"/><path d="M38 51 L47 60 L65 40"/></svg><span style="font-size:17px;font-weight:600">Until It Sticks</span></div>
<h1 class="large">When is your test?</h1>
<p class="muted" style="font-size:15px">The plan is built around the date: how many new questions a day, and when each one comes back.</p>
<div class="card" style="display:flex;flex-direction:column;gap:8px">
	<Calendar value={app.progress.exam} onpick={(iso) => app.setExam(iso)} />
</div>
<div class="note">
	{#if app.exam && left !== undefined}
		{left} day{left === 1 ? '' : 's'} · {QUESTIONS.length} questions → <b>{perDay} new a day</b>, about {mins} minutes.
	{:else}
		No date yet: <b>20 new a day</b>, about 15 minutes. You can set the date later in Account.
	{/if}
</div>
<button class="big" type="button" onclick={() => { ondone(); nav.startMock(true); }}><span>Find out where I stand<small>24 questions · about 10 min</small></span><span class="arrow">›</span></button>
<button class="big ghost" type="button" onclick={() => { ondone(); nav.home(); }}>Skip, start learning</button>
<p class="muted" style="font-size:13px;margin-top:auto">No account needed. Progress stays on this device until you sign in.</p>
