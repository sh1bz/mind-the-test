<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { TOPIC_COLORS, TOPICS } from '$lib/content';
	import { plan, topicStats, known, ready, daysLeft, fmtDay, pct } from '$lib/ui/derive';
	import { streakDays } from '$lib/store/progress';
	import { EXAM_PASS, EXAM_QUESTIONS, EXAM_MINUTES } from '$lib/engine/readiness';
	import { QUESTIONS } from '$lib/content';
	import { TOPIC_ICONS } from './icons';
	import Gauge from './Gauge.svelte';
	import Ic from './Ic.svelte';

	const now = Date.now();
	const st = (id: string) => app.item(id);
	const r = $derived(ready(st, now));
	const p = $derived(plan(app.progress, st, now, nav.topic));
	const lines = $derived(topicStats(st));
	const k = $derived(known(st));
	const streak = $derived(streakDays(app.progress.days, now));
	const mocks = $derived(app.progress.mocks.slice(-3).map((m) => m.score));
	const left = $derived(daysLeft(app.exam, now));
	const topicName = $derived(nav.topic === null ? '' : TOPICS[nav.topic]);
	const title = $derived(nav.topic === null ? "Today's session" : `${topicName} session`);
	const nothing = $derived(p.due + p.fresh === 0);
	const today = new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
	function start(kind: 'smart' | 'review' | 'new' | 'weak') {
		const names = { smart: title, review: 'Review', new: 'New questions', weak: 'Ones you keep missing' };
		nav.startTrain({ kind, topic: nav.topic, title: names[kind] });
	}
</script>

<div class="datehd">{today}</div>
<div class="row">
	<h1 class="large">Today</h1>
	{#if app.exam && left !== undefined}
		<button class="chip tint num" type="button" onclick={() => nav.go('account')}>Test {left <= 0 ? 'today' : `in ${left} day${left === 1 ? '' : 's'}`}</button>
	{:else}
		<button class="chip tint" type="button" onclick={() => nav.go('account')}>Set test date</button>
	{/if}
</div>

<div class="card">
	<div class="hd"><Ic name="heart" color="var(--red)" sm />Readiness{#if app.exam}<span class="muted small num" style="margin-left:auto">Test {fmtDay(app.exam)}</span>{/if}</div>
	<div class="hero">
		<Gauge value={r.passProb} />
		<div class="stats">
			<div><b class="num">{pct(r.recall)}</b>Recall now</div>
			<div><b class="num">{k} <span class="muted" style="font-size:13px;font-weight:500">/ {QUESTIONS.length}</span></b>Known</div>
			<div><b class="num">{streak}</b>Day streak</div>
			<div><b class="num">{mocks.length ? mocks.join(' · ') : '—'}</b>Last mocks</div>
		</div>
	</div>
</div>

{#if nav.topic !== null}
	<div class="row"><span class="chip on"><span class="dot" style="background:#fff"></span>{topicName} only</span><button class="chip" type="button" onclick={() => (nav.topic = null)}>Clear</button></div>
{/if}

<div class="sec"><h2>Today's plan</h2>{#if nothing}<span class="muted small">All caught up</span>{/if}</div>
<div class="list">
	<button class="lrow ic-sep" type="button" onclick={() => start('review')} disabled={!p.due}><Ic name="review" color="var(--blue)" />Questions to review<b class="v ink num">{p.due}</b><span class="chev">›</span></button>
	<button class="lrow ic-sep" type="button" onclick={() => start('new')} disabled={!p.fresh}><Ic name="plus" color="var(--green)" />New questions<b class="v ink num">{p.fresh}</b><span class="chev">›</span></button>
	<button class="lrow ic-sep" type="button" onclick={() => start('weak')} disabled={!p.weak}><Ic name="warn" color="var(--orange)" />Ones you keep missing<b class="v ink num">{p.weak}</b><span class="chev">›</span></button>
	<div class="lrow"><Ic name="clock" color="var(--indigo)" />Time needed<span class="v num">{nothing ? '—' : `about ${p.minutes} min`}</span></div>
</div>

{#if nothing}
	<div class="note">All caught up{p.unseen ? '' : ' — every question seen'}. {p.weak ? `${p.weak} you keep missing are waiting.` : 'Come back when reviews are due, or run a mock.'}</div>
	{#if p.weak}<button class="big" type="button" onclick={() => start('weak')}>Drill the ones you keep missing <span class="arrow">›</span></button>{/if}
{:else}
	<button class="big" type="button" onclick={() => start('smart')}>Start {nav.topic === null ? "today's session" : `${topicName} session`} <span class="arrow">›</span></button>
{/if}
<button class="big alt" type="button" onclick={() => nav.startMock(false)}><span>Mock exam<small>{EXAM_QUESTIONS} questions · {EXAM_MINUTES} min · pass {EXAM_PASS}</small></span><span class="arrow">›</span></button>

<div class="sec"><h2>Topics</h2><span class="muted small">tap to focus</span></div>
<div class="list">
	{#each lines as l (l.t)}
		<button class="lrow ic-sep" class:on={nav.topic === l.t} type="button" aria-pressed={nav.topic === l.t} onclick={() => (nav.topic = nav.topic === l.t ? null : l.t)}>
			<Ic name={TOPIC_ICONS[l.t]} color="var(--{TOPIC_COLORS[l.t]})" /><span class="name">{l.name}</span>
			<span class="bar"><i style="width:{Math.round((100 * l.known) / l.total)}%;background:var(--{TOPIC_COLORS[l.t]})"></i></span>
			<span class="v num">{l.known}/{l.total}</span>
		</button>
	{/each}
</div>
