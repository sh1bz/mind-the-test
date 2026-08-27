<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { QUESTIONS, BY_ID, CARD_BY_ID, TOPIC_COLORS, type Question } from '$lib/content';
	import { Session, shuffle, type Card } from '$lib/engine/session';
	import { isDue, isNew, isWeak, isKnown } from '$lib/engine/scheduler';
	import { correctText } from '$lib/ui/derive';
	import { plan, pool, ready, optionOrder, stampMilestones, stateCounts } from '$lib/ui/derive';
	import Sheet from './Sheet.svelte';
	import Ic from './Ic.svelte';
	import { TOPIC_ICONS } from './icons';
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
	let cheerTier = $state(1);
	let popKey = $state(0);
	let lockKey = $state(0);
	let cheerTone = $state('var(--orange)');
	const career = $derived(stateCounts(st));
	let cheerTimer: ReturnType<typeof setTimeout>;
	const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	function cheerFor(n: number): { msg: string; tier: number } | null {
		if (n === 3) return { msg: '🔥 3 in a row!', tier: 1 };
		if (n === 5) return { msg: '🔥🔥 On fire — 5!', tier: 2 };
		if (n === 7) return { msg: '🔥 Red hot — 7!', tier: 2 };
		if (n === 10) return { msg: '⚡ UNSTOPPABLE — 10!', tier: 3 };
		if (n > 10 && n % 5 === 0) return { msg: `🌋 INSANE — ${n}!`, tier: 4 };
		return null;
	}
	function showCheer(msg: string, tier: number, tone = 'var(--orange)') {
		cheer = msg; cheerTier = tier; cheerTone = tone;
		clearTimeout(cheerTimer); cheerTimer = setTimeout(() => (cheer = null), 1500);
		burst(tier, tone);
	}
	type P = { x: number; y: number; vx: number; vy: number; g: number; size: number; rot: number; vrot: number; color: string; life: number; decay: number; shape: 0 | 1 };
	let cvs = $state<HTMLCanvasElement>();
	let parts: P[] = [];
	let raf = 0;
	let origin: { x: number; y: number } | null = null;
	const PALETTES: Record<number, string[]> = {
		1: ['#ff9500', '#ffcc00', '#ff3b30'],
		2: ['#ff9500', '#ffcc00', '#ff3b30', '#ff2d55'],
		3: ['#ff9500', '#ffcc00', '#ff3b30', '#ff2d55', '#af52de', '#32ade6', '#34c759'],
		4: ['#ff9500', '#ffcc00', '#ff3b30', '#ff2d55', '#af52de', '#5856d6', '#32ade6', '#34c759', '#ffd700', '#ffffff']
	};
	function burst(tier: number, tone = 'var(--orange)') {
		if (reduced || !cvs) return;
		cvs.width = innerWidth; cvs.height = innerHeight;
		const n = [0, 45, 80, 150, 240][tier] ?? 45;
		const pal = tone.includes('green') ? ['#34c759', '#a7e3b8', '#ffd700', '#32ade6'] : PALETTES[tier] ?? PALETTES[1];
		const cx = origin?.x ?? cvs.width / 2, cy = origin?.y ?? cvs.height * 0.72;
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * (5 + tier * 3.5);
			parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (2 + tier), g: 0.12 + Math.random() * 0.1, size: 4 + Math.random() * (4 + tier), rot: Math.random() * 6.28, vrot: (Math.random() - 0.5) * 0.6, color: pal[i % pal.length], life: 1, decay: 0.006 + Math.random() * 0.006, shape: Math.random() < 0.5 ? 0 : 1 });
		}
		if (!raf) raf = requestAnimationFrame(tick);
	}
	function tick() {
		const ctx = cvs?.getContext('2d');
		if (!ctx || !cvs) { raf = 0; return; }
		ctx.clearRect(0, 0, cvs.width, cvs.height);
		parts = parts.filter((p) => p.life > 0 && p.y < cvs!.height + 40);
		for (const p of parts) {
			p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vrot; p.life -= p.decay;
			ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
			if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
			else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.28); ctx.fill(); }
			ctx.restore();
		}
		if (parts.length) raf = requestAnimationFrame(tick);
		else { raf = 0; ctx.clearRect(0, 0, cvs.width, cvs.height); }
	}
	onDestroy(() => { if (raf) cancelAnimationFrame(raf); clearTimeout(cheerTimer); });
	let sheet = $state<string | null>(null);
	const multi = $derived(!!q && q.c.length > 1);
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
	function pick(i: number, e?: MouseEvent) {
		if (graded || !q) return;
		if (e && e.clientX) origin = { x: e.clientX, y: e.clientY };
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
			if (isKnown(st(q.id)) && !wasStuck) { lockKey++; showCheer(`🧠 Locked in! ${career.stuck} of ${career.total}`, 2, 'var(--green)'); }
			else { const c = cheerFor(streak); if (c) showCheer(c.msg, c.tier); }
		}
	}
	function next() { if (!graded) { if (multi && picked.length) grade(); return; } load(); }
	function finish() {
		const hit = stampMilestones(app.progress, st, now()); if (hit.length) app.persist();
		nav.finishTrain({ answered: session.done, firstTry: session.firstTry.n ? session.firstTry.ok / session.firstTry.n : 0, best: session.best, before, after: ready(st, now()).passProb });
	}
	function key(e: KeyboardEvent) {
		if (sheet) return;
		if (e.key >= '1' && e.key <= '4') { origin = null; pick(Number(e.key) - 1); e.preventDefault(); }
		else if (e.key === 'Enter') { next(); e.preventDefault(); }
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
	<div class="stop">
		<button class="xbtn" type="button" aria-label="End session" onclick={finish}>✕</button>
		<div class="topcard">
			<span class="sprog" aria-label="{pctDone}% of this session"><i style="width:{pctDone}%"></i></span>
			<div class="sbadges">
				{#key popKey}<div class="sbadge streak" class:hot={streak >= 3} class:blaze={streak >= 10}><b>🔥 {streak}</b><span>Streak</span></div>{/key}
				{#key lockKey}<div class="sbadge lock" class:pulse={lockKey > 0}><b>🧠 {career.stuck}</b><span>Locked in</span></div>{/key}
				<div class="sbadge"><b>📚 {career.answered}</b><span>Answered</span></div>
			</div>
		</div>
	</div>
	<canvas class="confetti" bind:this={cvs}></canvas>
	{#if cheer}<div class="cheer tier{cheerTier}" role="status" style="background:{cheerTone}">{cheer}</div>{/if}
	<div class="qhead">
		<span class="tico" style="--tc:var(--{TOPIC_COLORS[q.t]})"><Ic name={TOPIC_ICONS[q.t]} color="var(--tc)" /></span>
		<p class="qtext">{q.q}</p>
	</div>
	{#if multi}<div class="qmeta"><span class="pick">Select {q.c.length}</span></div>{/if}
	<div class="opts">
		{#each order as oi, i (oi)}
			<button class="opt {cls(i)}" type="button" disabled={graded} aria-pressed={picked.includes(i)} onclick={(e) => pick(i, e)}>
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
		<button class="big alt" type="button" disabled={picked.length !== q.c.length} onclick={(e) => { if (e.clientX) origin = { x: e.clientX, y: e.clientY }; grade(); }}>Check <span class="key">↵</span></button>
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
	.confetti { position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 30; }
	.qhead { display: flex; align-items: flex-start; gap: 12px; }
	.tico { flex: none; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: color-mix(in srgb, var(--tc) 14%, transparent); margin-top: 1px; }
	.qmeta { margin: 10px 0 16px; font-size: 12px; font-weight: 600; }
	.pick { color: var(--muted); }
	.stop { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
	.topcard { flex: 1; min-width: 0; background: var(--card); border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
	.sprog { display: block; height: 8px; border-radius: 5px; background: var(--soft); overflow: hidden; }
	.sprog i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, var(--blue), #4aa3ff); transition: width 0.35s cubic-bezier(0.3, 0.9, 0.3, 1); }
	.sbadges { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
	.sbadge { background: var(--bg); border-radius: 12px; padding: 9px 6px; text-align: center; }
	.sbadge b { display: block; font-size: 18px; font-weight: 800; letter-spacing: -0.4px; line-height: 1; font-variant-numeric: tabular-nums; }
	.sbadge span { display: block; font-size: 10px; font-weight: 700; color: var(--muted); margin-top: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
	.sbadge.lock b { color: var(--green); }
	.sbadge.lock.pulse { animation: pop 0.5s ease; }
	.sbadge.streak.hot { background: var(--warnbg); animation: pop 0.4s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
	.sbadge.streak.hot b { color: var(--orange); }
	.sbadge.streak.blaze { background: linear-gradient(135deg, #ff3b30, #ff9500); animation: pop 0.4s cubic-bezier(0.2, 0.8, 0.3, 1.3), blaze 1.1s ease-in-out infinite; }
	.sbadge.streak.blaze b, .sbadge.streak.blaze span { color: #fff; }
	@keyframes pop { 0% { transform: scale(1); } 42% { transform: scale(1.1); } 100% { transform: scale(1); } }
	@keyframes blaze { 0%, 100% { box-shadow: 0 0 6px 0 rgba(255, 90, 40, 0.4); } 50% { box-shadow: 0 0 18px 3px rgba(255, 149, 0, 0.7); } }
	.cheer { position: fixed; left: 50%; top: 15%; transform: translateX(-50%); z-index: 31; color: #fff; font-weight: 800; letter-spacing: -0.3px; padding: 11px 20px; border-radius: 14px; pointer-events: none; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.25); animation: cheerpop 1.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards; }
	.cheer.tier1 { font-size: 18px; box-shadow: 0 14px 34px -10px rgba(255, 149, 0, 0.6); }
	.cheer.tier2 { font-size: 21px; box-shadow: 0 16px 40px -8px rgba(255, 59, 48, 0.6); }
	.cheer.tier3 { font-size: 25px; padding: 13px 24px; box-shadow: 0 18px 46px -8px rgba(175, 82, 222, 0.6); animation: cheerpop 1.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards, wobble 0.5s ease-in-out; }
	.cheer.tier4 { font-size: 30px; padding: 15px 28px; background: linear-gradient(90deg, #ff3b30, #ff9500, #ffcc00, #af52de) !important; box-shadow: 0 22px 60px -6px rgba(255, 45, 85, 0.7); animation: cheerpop 1.6s cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards, wobble 0.45s ease-in-out 2; }
	@keyframes cheerpop {
		0% { opacity: 0; transform: translateX(-50%) translateY(14px) scale(0.7); }
		12% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.12); }
		26% { transform: translateX(-50%) translateY(0) scale(1); }
		80% { opacity: 1; }
		100% { opacity: 0; transform: translateX(-50%) translateY(-18px) scale(1); }
	}
	@keyframes wobble { 0%, 100% { rotate: 0deg; } 25% { rotate: -4deg; } 75% { rotate: 4deg; } }
</style>
