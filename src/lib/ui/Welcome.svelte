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

<div class="brand" style="margin-top:8px"><div class="ring lg" aria-hidden="true"></div><span class="display" style="font-size:22px">Mind the Test</span></div>
<h1 class="display" style="font-size:26px;line-height:1.1">When is your test?</h1>
<p class="muted" style="font-size:13.5px">The plan is built around the date: how many new questions a day, and when each one comes back.</p>
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
<button class="big blue" type="button" onclick={() => { ondone(); nav.startMock(true); }}>Find out where I stand <span><small>24 questions · about 10 min</small></span><span class="arrow">›</span></button>
<button class="big ghost" type="button" onclick={() => { ondone(); nav.home(); }}>Skip, start learning</button>
<p class="muted" style="font-size:12px;margin-top:auto">No account needed. Progress stays on this device until you sign in.</p>
