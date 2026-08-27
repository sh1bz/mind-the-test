<script lang="ts">
	import { onMount } from 'svelte';
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { QUESTIONS, BY_ID, CARD_BY_ID, TOPICS, TOPIC_COLORS, type Question } from '$lib/content';
	import { Session, shuffle, type Card } from '$lib/engine/session';
	import { isDue, isNew, isWeak, isKnown } from '$lib/engine/scheduler';
	import { correctText } from '$lib/ui/derive';
	import { plan, pool, ready, optionOrder, stampMilestones, stateCounts } from '$lib/ui/derive';
	import Sheet from './Sheet.svelte';
	import MapCardView from './MapCardView.svelte';

	const spec = nav.train;
	const st = (id: string) => app.item(id);
	const rand = Math.random;
	const now = () => Date.now();
	const before = ready(st, now()).passProb;

	// Build the queue for this kind of session
	const qs = pool(spec.topic); const ids = qs.map((q) => q.id); const topicOf = new Map(qs.map((q) => [q.id, q.t])); const topic = (id: string) => topicOf.get(id) ?? 0;
	let session: Session; let goal: number;
	if (spec.kind === 'smart') {
		const p = plan(app.progress, st, now(), spec.topic);
		goal = Math.min(40, Math.max(1, p.due + p.fresh));
		session = new Session('smart', { ids, state: st, now, rand, topic, newBudget: p.fresh });
	} else {
		let seed: string[] = [];
		if (spec.kind === 'review') seed = ids.filter((id) => isDue(st(id), now())).sort((a, b) => st(a).due - st(b).due);
		else if (spec.kind === 'new') { const p = plan(app.progress, st, now(), spec.topic); seed = shuffle(ids.filter((id) => isNew(st(id))), rand).slice(0, p.fresh); }
		else if (spec.kind === 'weak') seed = ids.filter((id) => isWeak(st(id)));
		else seed = spec.ids ?? [];
		goal = seed.length;
		session = new Session('custom', { ids, state: st, now, rand, topic }, seed);
	}

	let card = $state<Card | null>(null);
	let q = $state<Question | null>(null);
	let order = $state<number[]>([]);
	let picked = $state<number[]>([]); // display indices
	let mixup = $state<{ text: string; n: number } | null>(null); // a distractor picked before
	let graded = $state(false);
	let correct = $state(false);
	let done = $state(0);
	let streak = $state(0);
	let best = $state(0);
	let acc = $state({ ok: 0, n: 0 });
	let cheer = $state<string | null>(null);
	let popKey = $state(0);
	let lockKey = $state(0);
	let cheerTone = $state('var(--orange)');
	const career = $derived(stateCounts(st));
	let cheerTimer: ReturnType<typeof setTimeout>;
	function cheerFor(n: number): string | null {
		if (n === 3) return '🔥 3 in a row!';
		if (n === 5) return '🔥 On fire — 5!';
		if (n === 10) return '⚡ 10 straight!';
		if (n > 10 && n % 5 === 0) return `🔥 ${n} in a row!`;
		return null;
	}
	function showCheer(m: string, tone = 'var(--orange)') { cheer = m; cheerTone = tone; clearTimeout(cheerTimer); cheerTimer = setTimeout(() => (cheer = null), 1400); }
	let sheet = $state<string | null>(null);
	const multi = $derived(!!q && q.c.length > 1);
	const flagged = $derived(!!q && !!st(q.id).flag);
	const link = $derived(q?.card ? CARD_BY_ID[q.card] : undefined);
	const stopItem = $derived.by(() => {
		if (!link || !q) return null;
		const words = new Set((q.q + ' ' + q.c.map((i) => q!.o[i]).join(' ')).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3));
		let best = link.card.items[0], score = -1;
		for (const it of link.card.items) { const n = it.text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => words.has(w)).length; if (n > score) { score = n; best = it; } }
		return best ?? null;
	});

	function load() {
		const c = spec.kind === 'smart' && done >= goal ? session.nextPending() : session.next();
		if (!c) { if (session.done === 0) { q = null; return; } return finish(); }
		card = c; q = BY_ID[c.id]; order = optionOrder(q, rand); picked = []; graded = false;
	}
	function pick(i: number) {
		if (graded || !q) return;
		if (!multi) { picked = [i]; grade(); return; }
		picked = picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i];
		if (picked.length === q.c.length) grade();
	}
	function grade() {
		if (!q || !card || graded) return;
		const wasStuck = isKnown(st(q.id));
		const chosen = picked.map((i) => order[i]).sort().join(',');
		correct = chosen === [...q.c].sort().join(',');
		const { schedule, recovered } = session.answer(card, correct);
		if (schedule) app.answer(q.id, correct, now());
		else if (recovered) app.relearn(q.id, now());
		if (!correct) {
			const wrong = picked.map((i) => order[i]).filter((i) => !q!.c.includes(i));
			const before = st(q.id).miss ?? [];
			const again = wrong.find((i) => (before[i] ?? 0) >= 1);
			mixup = again === undefined ? null : { text: q.o[again], n: (before[again] ?? 0) + 1 };
			app.recordMiss(q.id, wrong);
			navigator.vibrate?.(60);
		} else mixup = null;
		graded = true; done = session.done; streak = session.streak; best = session.best; acc = { ...session.firstTry };
		if (correct) {
			popKey++;
			if (isKnown(st(q.id)) && !wasStuck) { lockKey++; showCheer(`🧠 Locked in! ${career.stuck} of ${career.total}`, 'var(--green)'); }
			else { const m = cheerFor(streak); if (m) showCheer(m); }
		}
	}
	function next() { if (!graded) { if (multi && picked.length) grade(); return; } load(); }
	function finish() {
		const hit = stampMilestones(app.progress, st, now()); if (hit.length) app.persist();
		nav.finishTrain({ answered: session.done, firstTry: session.firstTry.n ? session.firstTry.ok / session.firstTry.n : 0, best: session.best, before, after: ready(st, now()).passProb });
	}
	function key(e: KeyboardEvent) {
		if (sheet) return;
		if (e.key >= '1' && e.key <= '4') { pick(Number(e.key) - 1); e.preventDefault(); }
		else if (e.key === 'Enter') { next(); e.preventDefault(); }
		else if (e.key === 'f' || e.key === 'F') { if (q) app.toggleFlag(q.id); }
		else if (e.key === 'Escape') finish();
	}
	onMount(load);
	const cls = (i: number) => {
		if (!graded || !q) return picked.includes(i) ? 'sel' : '';
		const isRight = q.c.includes(order[i]); const was = picked.includes(i);
		return isRight ? 'ok' : was ? 'bad' : 'dim';
	};
	const pctDone = $derived(goal ? Math.min(100, Math.round((100 * done) / goal)) : 0);
</script>

<svelte:window onkeydown={key} />

{#if q}
	<div class="navrow">
		<button class="xbtn" type="button" aria-label="End session" onclick={finish}>✕</button>
		<span class="pbar"><div style="width:{pctDone}%"></div></span>
		{#key popKey}<span class="flame" class:hot={streak >= 3} aria-label="{streak} in a row">🔥 {streak}</span>{/key}
	</div>
	<div class="runbar" aria-hidden="true"><span>{done}/{goal}</span><span>·</span><span>{acc.ok}/{acc.n} first try</span><span>·</span><span>best 🔥{best}</span></div>
	{#key lockKey}<div class="career" class:lock={lockKey > 0}><span class="clabel">🧠 <b>{career.stuck}</b> locked in<span class="cmut"> · {career.answered} answered</span></span><span class="ctrack"><i class="cfill" style="width:{(100 * career.stuck) / career.total}%"></i><i class="cseen" style="width:{(100 * (career.total - career.unseen - career.stuck)) / career.total}%"></i></span></div>{/key}
	{#if cheer}<div class="cheer" role="status" style="background:{cheerTone};box-shadow:0 14px 34px -10px {cheerTone}">{cheer}</div>{/if}
	<div class="row">
		<span class="chip" style="background:var(--{TOPIC_COLORS[q.t]});color:#fff"><span class="dot" style="background:#fff"></span>{TOPICS[q.t]}</span>
		<button class="chip" class:on={flagged} type="button" aria-pressed={flagged} onclick={() => app.toggleFlag(q!.id)}>{flagged ? 'Flagged' : 'Flag'} <span class="key">F</span></button>
	</div>
	<p class="qtext">{q.q}</p>
	{#if multi}<p class="muted small" style="margin-top:-6px">Select {q.c.length} answers</p>{/if}
	<div class="opts">
		{#each order as oi, i (oi)}
			<button class="opt {cls(i)}" type="button" disabled={graded} aria-pressed={picked.includes(i)} onclick={() => pick(i)}>
				<span class="k">{'ABCD'[i]}</span><span style="flex:1">{q.o[oi]}</span><span class="key">{i + 1}</span>
			</button>
		{/each}
	</div>
	<div aria-live="polite">
		{#if graded}
			<div class="verdict" class:good={correct}><b>{correct ? 'Correct' : 'Not quite'}</b>{q.e}
				{#if mixup}<div class="mixup">You picked “{mixup.text}” again ({mixup.n} times). The right answer is: {correctText(q)}.</div>{/if}
			</div>
			{#if !correct && link?.card.cues[0]}<div class="cue">{@html link.card.cues[0]}</div>{/if}
		{/if}
	</div>
	{#if graded && link && stopItem}
		<button class="stop" type="button" onclick={() => (sheet = link!.card.id)}>
			<div class="hd">On the map · {link.card.title}</div>
			{#if stopItem.yr}<span class="yr">{stopItem.yr}</span>{/if}{#if stopItem.n}<span class="a">{stopItem.n}</span> {@html stopItem.label ?? ''}{:else}{@html stopItem.html ?? stopItem.text}{/if}
		</button>
	{/if}
	{#if graded}
		<button class="big {correct ? 'ok' : 'bad'}" type="button" onclick={next}>Continue {#if !correct}<span><small>back in 8–12 cards</small></span>{/if}<span class="key">↵</span></button>
	{:else if multi}
		<button class="big alt" type="button" disabled={picked.length !== q.c.length} onclick={grade}>Check <span class="key">↵</span></button>
	{/if}
{:else}
	<h1 class="large">Nothing to train here.</h1><p class="muted">Every question in this set is known or not due yet.</p>
	<button class="big ghost" type="button" onclick={() => nav.home()}>Back to Today</button>
{/if}

{#if sheet && link}
	<Sheet label={link.section.title} onclose={() => (sheet = null)}>
		<MapCardView card={link.card} section={link.section} />
	</Sheet>
{/if}

<style>
	.flame { display: inline-flex; align-items: center; gap: 4px; font-size: 15px; font-weight: 800; color: var(--muted); font-variant-numeric: tabular-nums; padding: 2px 9px; border-radius: 999px; }
	.flame.hot { color: var(--orange); background: var(--warnbg); animation: flamepop 0.38s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
	@keyframes flamepop { 0% { transform: scale(1); } 42% { transform: scale(1.38); } 100% { transform: scale(1); } }
	.career { display: flex; align-items: center; gap: 10px; margin: 0 0 10px; }
	.career.lock .cfill { animation: lockpulse 0.6s ease; }
	.clabel { font-size: 12px; font-weight: 700; color: var(--ink2); white-space: nowrap; }
	.clabel b { color: var(--green); }
	.cmut { color: var(--muted); font-weight: 500; }
	.ctrack { flex: 1; display: flex; height: 8px; border-radius: 5px; overflow: hidden; background: var(--soft); }
	.cfill { height: 100%; background: var(--green); }
	.cseen { height: 100%; background: #bfe6c9; }
	@keyframes lockpulse { 0% { filter: brightness(1); } 40% { filter: brightness(1.4); } 100% { filter: brightness(1); } }
	.runbar { display: flex; gap: 8px; justify-content: center; color: var(--muted); font-size: 12px; font-weight: 600; margin: -4px 0 8px; font-variant-numeric: tabular-nums; }
	.cheer { position: fixed; left: 50%; top: 15%; transform: translateX(-50%); z-index: 20; background: var(--orange); color: #fff; font-weight: 800; font-size: 18px; letter-spacing: -0.2px; padding: 11px 20px; border-radius: 14px; box-shadow: 0 14px 34px -10px rgba(255, 149, 0, 0.65); pointer-events: none; animation: cheerpop 1.4s ease forwards; }
	@keyframes cheerpop {
		0% { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.8); }
		14% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.06); }
		28% { transform: translateX(-50%) translateY(0) scale(1); }
		82% { opacity: 1; }
		100% { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(1); }
	}
</style>
