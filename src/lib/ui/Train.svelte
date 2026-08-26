<script lang="ts">
	import { onMount } from 'svelte';
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { QUESTIONS, BY_ID, CARD_BY_ID, TOPICS, TOPIC_COLORS, type Question } from '$lib/content';
	import { Session, shuffle, type Card } from '$lib/engine/session';
	import { isDue, isNew, isWeak } from '$lib/engine/scheduler';
	import { plan, pool, ready, optionOrder, stampMilestones } from '$lib/ui/derive';
	import Sheet from './Sheet.svelte';
	import MapCardView from './MapCardView.svelte';

	const spec = nav.train;
	const st = (id: string) => app.item(id);
	const rand = Math.random;
	const now = () => Date.now();
	const before = ready(st, now()).passProb;

	// Build the queue for this kind of session
	const ids = pool(spec.topic).map((q) => q.id);
	let session: Session; let goal: number;
	if (spec.kind === 'smart') {
		const p = plan(app.progress, st, now(), spec.topic);
		goal = Math.min(40, Math.max(10, p.due + p.fresh));
		session = new Session('smart', { ids, state: st, now, rand, newPerRefill: Math.max(1, p.fresh) });
	} else {
		let seed: string[] = [];
		if (spec.kind === 'review') seed = ids.filter((id) => isDue(st(id), now())).sort((a, b) => st(a).due - st(b).due);
		else if (spec.kind === 'new') { const p = plan(app.progress, st, now(), spec.topic); seed = shuffle(ids.filter((id) => isNew(st(id))), rand).slice(0, p.fresh); }
		else if (spec.kind === 'weak') seed = ids.filter((id) => isWeak(st(id)));
		else seed = spec.ids ?? [];
		goal = seed.length;
		session = new Session('custom', { ids, state: st, now, rand }, seed);
	}

	let card = $state<Card | null>(null);
	let q = $state<Question | null>(null);
	let order = $state<number[]>([]);
	let picked = $state<number[]>([]); // display indices
	let graded = $state(false);
	let correct = $state(false);
	let done = $state(0);
	let streak = $state(0);
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
		const c = session.next();
		if (!c || (spec.kind === 'smart' && done >= goal)) return finish();
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
		const chosen = picked.map((i) => order[i]).sort().join(',');
		correct = chosen === [...q.c].sort().join(',');
		const { schedule } = session.answer(card, correct);
		if (schedule) app.answer(q.id, correct, now());
		if (!correct) navigator.vibrate?.(60);
		graded = true; done = session.done; streak = session.streak;
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
	<div class="row">
		<button class="chip" type="button" aria-label="End session" onclick={finish}>✕</button>
		<span class="pbar"><div style="width:{pctDone}%"></div></span>
		<span class="muted num small">{done} done · {streak} streak</span>
	</div>
	<div class="row">
		<span class="chip" style="background:var(--{TOPIC_COLORS[q.t]});color:#fff;border-color:var(--{TOPIC_COLORS[q.t]})"><span class="dot" style="background:#fff"></span>{TOPICS[q.t]}</span>
		<button class="chip" class:on={flagged} type="button" aria-pressed={flagged} onclick={() => app.toggleFlag(q!.id)}>{flagged ? 'Flagged' : 'Flag'} <span class="key">F</span></button>
	</div>
	<p class="qtext">{q.q}</p>
	{#if multi}<p class="muted small" style="margin-top:-6px">Select {q.c.length} answers</p>{/if}
	<div style="display:flex;flex-direction:column;gap:8px">
		{#each order as oi, i (oi)}
			<button class="opt {cls(i)}" type="button" disabled={graded} aria-pressed={picked.includes(i)} onclick={() => pick(i)}>
				<span class="k">{'ABCD'[i]}</span><span style="flex:1">{q.o[oi]}</span><span class="key">{i + 1}</span>
			</button>
		{/each}
	</div>
	<div aria-live="polite">
		{#if graded}
			<div class="verdict" class:good={correct}><b>{correct ? 'Correct' : 'Not quite'}</b>{q.e}</div>
		{/if}
	</div>
	{#if graded && link && stopItem}
		<button class="stop" type="button" onclick={() => (sheet = link!.card.id)}>
			<div class="hd">On the map · {link.card.title}</div>
			{#if stopItem.yr}<span class="yr">{stopItem.yr}</span>{/if}{#if stopItem.n}<span class="a">{stopItem.n}</span> {@html stopItem.label ?? ''}{:else}{@html stopItem.html ?? stopItem.text}{/if}
		</button>
	{/if}
	{#if graded}
		<button class="big" type="button" onclick={next}>Continue {#if !correct}<span><small>back in 8–12 cards</small></span>{/if}<span class="key">↵</span></button>
	{:else if multi}
		<button class="big alt" type="button" disabled={picked.length !== q.c.length} onclick={grade}>Check <span class="key">↵</span></button>
	{/if}
{:else}
	<p class="muted">Nothing to train here.</p>
	<button class="big ghost" type="button" onclick={() => nav.home()}>Back to Today</button>
{/if}

{#if sheet && link}
	<Sheet label={link.section.title} onclose={() => (sheet = null)}>
		<MapCardView card={link.card} section={link.section} />
	</Sheet>
{/if}
