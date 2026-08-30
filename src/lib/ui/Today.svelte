<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { TOPIC_COLORS, TOPICS } from '$lib/content';
	import { plan, topicStats, stateCounts, verdict, slippingIds, ready, daysLeft, fmtDay, fmtIn } from '$lib/ui/derive';
	import { streakDays } from '$lib/store/progress';
	import { EXAM_PASS, EXAM_QUESTIONS, EXAM_MINUTES } from '$lib/engine/readiness';
	import { TOPIC_ICONS } from './icons';
	import Gauge from './Gauge.svelte';
	import Ic from './Ic.svelte';

	const now = Date.now();
	const st = (id: string) => app.item(id);
	const r = $derived(ready(st, now));
	const p = $derived(plan(app.progress, st, now, nav.topic));
	const lines = $derived(topicStats(st));
	const c = $derived(stateCounts(st));
	const dayStreak = $derived(streakDays(app.progress.days, now));
	const v = $derived(c.answered === 0 ? { label: 'Ready to begin', tone: 'var(--blue)' } : verdict(r.passProb));
	const slipIds = $derived(slippingIds(st, nav.topic));
	const readySub = $derived(
		c.answered === 0 ? 'Answer a few questions to see your readiness.'
		: c.slip > 0 ? `Clear the ${c.slip} slipping and you climb.`
		: r.passProb >= 0.8 ? 'You pass. Keep it warm with a short session.'
		: `${c.almost + c.learn} still to lock in.`
	);
	const left = $derived(daysLeft(app.exam, now));
	const topicName = $derived(nav.topic === null ? '' : TOPICS[nav.topic]);
	const title = $derived(nav.topic === null ? 'Training' : `${topicName} practice`);
	const nothing = $derived(p.due + p.fresh === 0);
	function start(kind: 'smart' | 'review' | 'new' | 'weak') {
		const names = { smart: title, review: 'Review', new: 'New questions', weak: 'Ones you keep missing' };
		nav.startTrain({ kind, topic: nav.topic, title: names[kind] });
	}
</script>

<div class="row">
	<h1 class="large">Home</h1>
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
		<div class="rverd">
			<h4 style="color:{v.tone}">{v.label}</h4>
			<p class="muted">{readySub}</p>
		</div>
	</div>
</div>

<div class="loop">
	<div class="ltile good"><b class="num">🧠 {c.stuck}</b><span>Sticky</span></div>
	<div class="ltile learn"><b class="num">🔄 {c.almost + c.learn}</b><span>Still learning</span></div>
	<div class="ltile slip"><b class="num">⚠️ {c.slip}</b><span>Slipping</span></div>
	<div class="ltile streak"><b class="num">🔥 {dayStreak}</b><span>Day streak</span></div>
</div>
<div class="card lockcard">
	<div class="lockbar"><i class="seen" style="width:{(100 * c.answered) / c.total}%"></i><i class="lock" style="width:{(100 * c.stuck) / c.total}%"></i></div>
	<div class="lockcap"><span><b class="num">{c.stuck}</b> locked · <span class="num">{c.answered}</span> answered</span><span class="num">of {c.total}</span></div>
</div>

{#if nav.topic !== null}
	<div class="row"><span class="chip on"><span class="dot" style="background:#fff"></span>{topicName} only</span><button class="chip" type="button" onclick={() => (nav.topic = null)}>Clear</button></div>
{/if}

{#if nothing}
	<div class="note">All caught up{p.unseen ? '' : ' — every question seen'}. {p.weak ? `${p.weak} you keep missing are waiting.` : 'Come back when reviews are due, or run a mock.'}</div>
	{#if p.weak}<button class="big" type="button" onclick={() => start('weak')}>Drill the ones you keep missing <span class="arrow">›</span></button>{/if}
{:else}
	<button class="big" type="button" onclick={() => start('smart')}>{c.answered === 0 ? 'Start training' : 'Continue training'} <span class="arrow">›</span></button>
{/if}
<button class="big alt" type="button" onclick={() => nav.startMock(false)}><span>Mock exam<small>{EXAM_QUESTIONS} questions · {EXAM_MINUTES} min · pass {EXAM_PASS}</small></span><span class="arrow">›</span></button>

<div class="sec"><h2>Practice</h2><span class="muted small">pick what to work on</span></div>
<div class="list">
	<button class="lrow ic-sep" type="button" onclick={() => start('review')} disabled={!p.due}><Ic name="review" color="var(--blue)" />Review due{#if !p.due && p.soon}<span class="v num">{p.soon} back in {fmtIn(p.soonAt - now)}</span>{:else}<b class="v ink num">{p.due}</b>{/if}<span class="chev">›</span></button>
	<button class="lrow ic-sep" type="button" onclick={() => start('new')} disabled={!p.fresh}><Ic name="plus" color="var(--green)" />New questions<b class="v ink num">{p.fresh}</b><span class="chev">›</span></button>
	<button class="lrow ic-sep" type="button" onclick={() => nav.startTrain({ kind: 'custom', topic: nav.topic, ids: slipIds, title: 'Fix slipping' })} disabled={!slipIds.length}><Ic name="warn" color="var(--orange)" />Fix what’s slipping<b class="v ink num">{slipIds.length}</b><span class="chev">›</span></button>
</div>

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

<style>
	.rverd { display: flex; flex-direction: column; justify-content: center; }
	.rverd h4 { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; margin: 0 0 3px; }
	.rverd p { font-size: 14px; line-height: 1.35; margin: 0; }
	.loop { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
	.ltile { background: var(--card); border-radius: 14px; padding: 12px 10px; }
	.ltile b { display: flex; align-items: center; gap: 4px; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
	.ltile span { display: block; font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 6px; white-space: nowrap; }
	.ltile.good b { color: var(--green); }
	.ltile.learn b { color: var(--blue); }
	.ltile.slip b { color: var(--orange); }
	.ltile.streak b { color: var(--orange); }
	.lockbar { position: relative; height: 12px; border-radius: 7px; overflow: hidden; background: var(--soft); }
	.lockbar i { position: absolute; left: 0; top: 0; height: 100%; border-radius: 7px; transition: width 0.35s ease; }
	.lockbar .seen { background: #cfe8ff; }
	.lockbar .lock { background: var(--green); }
	.lockcap { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-top: 8px; }
	.lockcap b { color: var(--ink); }
</style>
