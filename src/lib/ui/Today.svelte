<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { TOPIC_COLORS, TOPICS } from '$lib/content';
	import { plan, topicStats, known, ready, daysLeft, fmtDay, pct } from '$lib/ui/derive';
	import { streakDays } from '$lib/store/progress';
	import { EXAM_PASS, EXAM_QUESTIONS, EXAM_MINUTES } from '$lib/engine/readiness';
	import { QUESTIONS } from '$lib/content';
	import Gauge from './Gauge.svelte';

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
	function start(kind: 'smart' | 'review' | 'new' | 'weak') {
		const names = { smart: title, review: 'Review', new: 'New questions', weak: 'Ones you keep missing' };
		nav.startTrain({ kind, topic: nav.topic, title: names[kind] });
	}
</script>

<div class="row">
	<div class="brand"><div class="ring" aria-hidden="true"></div><span class="display" style="font-size:18px">Mind the Test</span></div>
	{#if app.exam && left !== undefined}
		<button class="chip num" type="button" onclick={() => nav.go('account')}>{fmtDay(app.exam)} · {left <= 0 ? 'today' : `${left} day${left === 1 ? '' : 's'}`}</button>
	{:else}
		<button class="chip" type="button" onclick={() => nav.go('account')}>Set test date</button>
	{/if}
</div>

<div class="hero card">
	<Gauge value={r.passProb} />
	<div class="stats">
		<div class="row"><span>Recall now</span><b class="num">{pct(r.recall)}</b></div>
		<div class="row"><span>Known</span><b class="num">{k} / {QUESTIONS.length}</b></div>
		<div class="row"><span>Streak</span><b class="num">{streak} day{streak === 1 ? '' : 's'}</b></div>
		<div class="row"><span>Mocks</span><b class="num">{mocks.length ? mocks.join(' · ') : '—'}</b></div>
	</div>
</div>

{#if nav.topic !== null}
	<div class="row"><span class="chip on"><span class="dot" style="background:var(--{TOPIC_COLORS[nav.topic]})"></span>{topicName} only</span><button class="chip" type="button" onclick={() => (nav.topic = null)}>Clear</button></div>
{/if}

<div class="board">
	<div class="hd">Today's plan</div>
	<button class="r" type="button" onclick={() => start('review')} disabled={!p.due}><span>Questions to review</span><b>{p.due}</b></button>
	<button class="r" type="button" onclick={() => start('new')} disabled={!p.fresh}><span>New questions</span><b>{p.fresh}</b></button>
	<button class="r" class:dim={!p.weak} type="button" onclick={() => start('weak')} disabled={!p.weak}><span>Ones you keep missing</span><b>{p.weak}</b></button>
	<div class="r"><span>Time needed</span><b>{nothing ? '—' : `about ${p.minutes} min`}</b></div>
</div>

{#if nothing}
	<div class="note">All caught up{p.unseen ? '' : ' — every question seen'}. {p.weak ? `${p.weak} you keep missing are waiting.` : 'Come back when reviews are due, or run a mock.'}</div>
	{#if p.weak}<button class="big" type="button" onclick={() => start('weak')}>Drill the ones you keep missing <span class="arrow">›</span></button>{/if}
{:else}
	<button class="big" type="button" onclick={() => start('smart')}>Start {nav.topic === null ? "today's session" : `${topicName} session`} <span class="arrow">›</span></button>
{/if}
<button class="big blue" type="button" onclick={() => nav.startMock(false)}>Mock exam <span><small>{EXAM_QUESTIONS} · {EXAM_MINUTES} min · pass {EXAM_PASS}</small></span><span class="arrow">›</span></button>

<div class="eyebrow" style="margin-top:6px">Topics</div>
<div>
	{#each lines as l (l.t)}
		<button class="line" class:on={nav.topic === l.t} type="button" aria-pressed={nav.topic === l.t} onclick={() => (nav.topic = nav.topic === l.t ? null : l.t)}>
			<span class="dot" style="background:var(--{TOPIC_COLORS[l.t]})"></span><span class="name">{l.name}</span>
			<span class="bar"><i style="width:{Math.round((100 * l.known) / l.total)}%;background:var(--{TOPIC_COLORS[l.t]})"></i></span>
			<b class="num">{l.known}/{l.total}</b>
		</button>
	{/each}
</div>
