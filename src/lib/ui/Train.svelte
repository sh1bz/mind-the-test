<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { QUESTIONS, BY_ID, CARD_BY_ID, TOPIC_COLORS, type Question } from '$lib/content';
	import { Session, shuffle, type Card } from '$lib/engine/session';
	import { isDue, isNew, isWeak, isKnown } from '$lib/engine/scheduler';
	import { correctText } from '$lib/ui/derive';
	import { pool, optionOrder, stampMilestones, stateCounts } from '$lib/ui/derive';
	import { FREE_QUESTIONS } from '$lib/engine/gate';
	import Sheet from './Sheet.svelte';
	import Ic from './Ic.svelte';
	import { TOPIC_ICONS } from './icons';
	import MapCardView from './MapCardView.svelte';

	const spec = nav.train;
	const st = (id: string) => app.item(id);
	const rand = Math.random;
	const now = () => Date.now();
	// Build the queue for this kind of session
	const qs = pool(spec.topic); const ids = qs.map((q) => q.id); const topicOf = new Map(qs.map((q) => [q.id, q.t])); const topic = (id: string) => topicOf.get(id) ?? 0;
	// Reviews of seen questions stay free; new questions are limited to the free allowance until unlocked.
	const newBudget = app.paid ? undefined : Math.max(0, FREE_QUESTIONS - app.answered);
	let session: Session;
	if (spec.kind === 'smart') {
		// One endless session: no goal — it keeps serving due-first then new, missed cards flow back
		// in 8–12 cards later, and you leave with Go home when you want.
		session = new Session('smart', { ids, state: st, now, rand, topic, newBudget });
	} else {
		let seed: string[] = [];
		if (spec.kind === 'review') seed = ids.filter((id) => isDue(st(id), now())).sort((a, b) => st(a).due - st(b).due);
		else if (spec.kind === 'new') { seed = shuffle(ids.filter((id) => isNew(st(id))), rand); if (newBudget !== undefined) seed = seed.slice(0, newBudget); }
		else if (spec.kind === 'weak') seed = ids.filter((id) => isWeak(st(id)));
		else seed = spec.ids ?? [];
		session = new Session('custom', { ids, state: st, now, rand, topic }, seed);
	}

	let card = $state<Card | null>(null);
	let q = $state<Question | null>(null);
	let order = $state<number[]>([]);
	let picked = $state<number[]>([]); // display indices
	let mixup = $state<{ text: string; n: number } | null>(null); // a distractor picked before
	let graded = $state(false);
	let correct = $state(false);
	let streak = $state(0);
	let best = $state(0);
	let acc = $state({ ok: 0, n: 0 });
	let cheer = $state<string | null>(null);
	let cheerTier = $state(1);
	let popKey = $state(0);
	let lockKey = $state(0);
	let cheerTone = $state('var(--orange)');
	let cheerPos = $state<{ x: number; y: number } | null>(null);
	const career = $derived(stateCounts(st));
	let cheerTimer: ReturnType<typeof setTimeout>;
	const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	function cheerFor(n: number): { msg: string; tier: number } | null {
		if (n === 3) return { msg: '🔥 3 in a row!', tier: 1 };
		if (n === 5) return { msg: '🔥🔥 On fire — 5!', tier: 2 };
		if (n === 7) return { msg: '🎆 Fireworks — 7!', tier: 2 };
		if (n === 10) return { msg: '⚡ UNSTOPPABLE — 10!', tier: 3 };
		if (n === 15) return { msg: '🌠 Star shower — 15!', tier: 3 };
		if (n === 20) return { msg: '🕺 RAVE MODE — 20!', tier: 4 };
		if (n === 25) return { msg: '☄️ Meteor storm — 25!', tier: 4 };
		if (n === 30) return { msg: '💥 SUPERNOVA — 30!', tier: 4 };
		if (n === 40) return { msg: '👑 LEGENDARY — 40!', tier: 4 };
		if (n === 50) return { msg: '🐐 G.O.A.T. — 50!', tier: 4 };
		if (n > 10 && n % 5 === 0) return { msg: `🌋 INSANE — ${n}!`, tier: 4 };
		return null;
	}
	function showCheer(msg: string, tier: number, tone = 'var(--orange)') {
		cheer = msg; cheerTier = tier; cheerTone = tone;
		// Pop the message just above the button that was tapped; keyboard picks fall back to the top.
		cheerPos = origin ? { x: Math.min(Math.max(origin.x, 100), innerWidth - 100), y: Math.max(origin.y - 56, 60) } : null;
		clearTimeout(cheerTimer); cheerTimer = setTimeout(() => (cheer = null), 1500);
		celebrate(streak, tone);
	}

	// ---- Celebration engine -------------------------------------------------
	// Every effect is a particle with a `kind`; the draw + physics switch on it. A streak just
	// composes these blocks with weights, so higher streaks stack richer effects, not more code.
	type Kind = 'conf' | 'spark' | 'glit' | 'emoji' | 'comet' | 'ring' | 'rocket';
	type P = {
		kind: Kind; x: number; y: number; vx: number; vy: number; g: number; size: number;
		rot: number; vrot: number; color: string; life: number; decay: number;
		shape?: 0 | 1; flick?: boolean; char?: string; targetY?: number; burst?: number; pal?: string[]; trail?: number[];
	};
	type Flash = { color: string; life: number; decay: number };
	let cvs = $state<HTMLCanvasElement>();
	let parts: P[] = [];
	let flashes: Flash[] = [];
	let raf = 0;
	let frame = 0;
	let fwTimers: ReturnType<typeof setTimeout>[] = [];
	let origin: { x: number; y: number } | null = null;
	const TAU = Math.PI * 2;
	const CAP = 2600; // hard particle ceiling so the wildest streak can't stall the tab
	const CONFETTI = ['#ff9500', '#ffcc00', '#ff3b30', '#ff2d55', '#af52de', '#5856d6', '#32ade6', '#34c759', '#ffd700', '#ffffff'];
	const GLITTER = ['#ffd700', '#fff3b0', '#ffffff', '#ffe680', '#f5d76e'];
	const GREEN = ['#34c759', '#a7e3b8', '#ffd700', '#32ade6', '#ffffff'];
	const GOLD = ['#ffd700', '#ffec8b', '#ffffff', '#ffcc00', '#f5d76e'];
	const COOL = ['#8ea9c1', '#b9c7d6', '#dfe7ef', '#a7c8e8', '#ffffff'];
	const pickColor = (a: string[]) => a[(Math.random() * a.length) | 0];
	const W = () => cvs?.width ?? innerWidth;
	const H = () => cvs?.height ?? innerHeight;
	function clearFireworks() { for (const t of fwTimers) clearTimeout(t); fwTimers = []; }
	function arm() { if (!raf) raf = requestAnimationFrame(tick); }

	/** Radial pop of confetti + sparks at a point. */
	function confettiBurst(cx: number, cy: number, n: number, power: number, pal: string[], sparkle: number) {
		for (let i = 0; i < n && parts.length < CAP; i++) {
			const a = Math.random() * TAU, sp = power * (0.4 + Math.random() * 0.8), spark = Math.random() < sparkle;
			parts.push({ kind: spark ? 'spark' : 'conf', x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - power * 0.35, g: 0.10 + Math.random() * 0.08, size: spark ? 2 + Math.random() * 3 : 3 + Math.random() * 5, rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 0.7, color: pickColor(pal), life: 1, decay: 0.006 + Math.random() * 0.007, shape: Math.random() < 0.5 ? 0 : 1, flick: spark });
		}
	}
	/** Twinkling flecks raining down the whole width. */
	function glitter(n: number, pal: string[]) {
		for (let i = 0; i < n && parts.length < CAP; i++) {
			parts.push({ kind: 'glit', x: Math.random() * W(), y: -10 - Math.random() * H() * 0.35, vx: (Math.random() - 0.5) * 1.3, vy: 1 + Math.random() * 2.6, g: 0.02 + Math.random() * 0.02, size: 2 + Math.random() * 3, rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 0.4, color: pickColor(pal), life: 1, decay: 0.004 + Math.random() * 0.004, flick: true });
		}
	}
	/** A confetti cannon firing up-and-inward from a bottom corner. side 0 = left, 1 = right. */
	function cannon(side: 0 | 1, n: number, pal: string[]) {
		const x = side === 0 ? 0 : W(), y = H(), base = side === 0 ? -Math.PI * 0.32 : -Math.PI * 0.68;
		for (let i = 0; i < n && parts.length < CAP; i++) {
			const ang = base + (Math.random() - 0.5) * 0.5, sp = 16 + Math.random() * 12;
			parts.push({ kind: 'conf', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 0.22, size: 4 + Math.random() * 6, rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 0.8, color: pickColor(pal), life: 1, decay: 0.005 + Math.random() * 0.005, shape: Math.random() < 0.5 ? 0 : 1 });
		}
	}
	/** Rockets that rise from the bottom and explode into a burst at their apex. */
	function fireworks(count: number, pal: string[]) {
		for (let k = 0; k < count && parts.length < CAP; k++) {
			parts.push({ kind: 'rocket', x: W() * (0.12 + Math.random() * 0.76), y: H() + 10, vx: (Math.random() - 0.5) * 1.5, vy: -(9 + Math.random() * 5), g: 0.14, size: 3, rot: 0, vrot: 0, color: pickColor(pal), life: 1, decay: 0, targetY: H() * (0.12 + Math.random() * 0.35), burst: 40 + ((Math.random() * 40) | 0), pal });
		}
	}
	/** Expanding ring — a shockwave punch. */
	function shockwave(x: number, y: number, color: string) {
		parts.push({ kind: 'ring', x, y, vx: 0, vy: 0, g: 0, size: 6, rot: 0, vrot: 0, color, life: 1, decay: 0.03 });
	}
	/** Emoji rain from the top. */
	function emojiRain(n: number, chars: string[], scale: number) {
		for (let i = 0; i < n && parts.length < CAP; i++) {
			parts.push({ kind: 'emoji', x: Math.random() * W(), y: -20 - Math.random() * H() * 0.3, vx: (Math.random() - 0.5) * 1.5, vy: 1.5 + Math.random() * 2.5, g: 0.03, size: (16 + Math.random() * 16) * scale, rot: (Math.random() - 0.5) * 0.4, vrot: (Math.random() - 0.5) * 0.12, color: '#000', life: 1, decay: 0.004, char: pickColor(chars) });
		}
	}
	/** A comet arcing across the screen with a trail. */
	function comet(pal: string[]) {
		const fromLeft = Math.random() < 0.5, sp = 14 + Math.random() * 9;
		parts.push({ kind: 'comet', x: fromLeft ? -30 : W() + 30, y: Math.random() * H() * 0.4, vx: (fromLeft ? 1 : -1) * sp, vy: 2 + Math.random() * 3, g: 0.05, size: 5 + Math.random() * 3, rot: 0, vrot: 0, color: pickColor(pal), life: 1, decay: 0.005, trail: [] });
	}
	function flash(color: string, life: number, decay: number) { flashes.push({ color, life, decay }); }
	function ravePulse(hues: string[]) {
		hues.forEach((h, i) => fwTimers.push(setTimeout(() => { if (!cvs) return; flash(h, 0.34, 0.05); arm(); }, i * 150)));
	}
	/** Keep lobbing fireworks for `dur` ms — the sustained finale on the biggest streaks. */
	function sustain(pal: string[], dur: number, every: number) {
		for (let t = every; t < dur; t += every) fwTimers.push(setTimeout(() => { if (!cvs) return; fireworks(2 + ((Math.random() * 3) | 0), pal); arm(); }, t));
	}

	/** The ladder: compose the blocks by streak. Each rung keeps the ones below and adds its own. */
	function celebrate(streak: number, tone: string) {
		if (reduced || !cvs) return;
		clearFireworks();
		cvs.width = innerWidth; cvs.height = innerHeight;
		const green = tone.includes('green'), pal = green ? GREEN : CONFETTI;
		const cx = origin?.x ?? W() / 2, cy = origin?.y ?? H() * 0.72;
		const s = streak, cap = Math.min(s, 40);
		confettiBurst(cx, cy, 50 + cap * 6, 6 + cap * 0.4, pal, 0.28);
		glitter(40 + cap * 4, green ? GREEN : GLITTER);
		if (!green) {
			if (s >= 5) { cannon(0, 45 + s, pal); cannon(1, 45 + s, pal); }
			if (s >= 7) fireworks(3 + Math.floor((s - 7) / 4), pal);
			if (s >= 10) { shockwave(cx, cy, '#ffd700'); emojiRain(12 + s, ['🔥'], 0.9); }
			if (s >= 15) { for (let k = 0; k < 2 + Math.floor(s / 10); k++) comet(pal); glitter(120, GLITTER); }
			if (s >= 20) ravePulse(['#ff9500', '#ff2d55', '#5856d6', '#32ade6']);
			if (s >= 25) { for (let k = 0; k < 3; k++) comet(GOLD); emojiRain(18, ['💥', '⚡'], 1); }
			if (s >= 30) { sustain(pal, 2600, 200); flash('#ffffff', 0.5, 0.05); emojiRain(28, ['🎉', '🔥', '⭐'], 1.1); }
			if (s >= 40) { emojiRain(22, ['👑', '🏆', '✨'], 1.2); confettiBurst(cx, cy, 150, 16, GOLD, 0.4); }
			if (s >= 50) { sustain(GOLD, 4200, 160); emojiRain(40, ['🐐', '👑', '🔥', '⚡', '🎉'], 1.3); ravePulse(GOLD); }
		}
		arm();
	}

	// Losing a streak is gentle and kind: no bang, the flame just puffs away and cool embers settle,
	// with an encouraging word — you never feel punished for a miss.
	function showBreak(prev: number) {
		const msgs = [`Streak reset — you had ${prev}! Shake it off. 💪`, "No stress — it'll come back until it sticks.", `${prev} in a row. Get the next one.`, 'Deep breath. Keep going.'];
		cheer = msgs[(Math.random() * msgs.length) | 0]; cheerTier = 1; cheerTone = 'var(--blue)';
		cheerPos = origin ? { x: Math.min(Math.max(origin.x, 100), innerWidth - 100), y: Math.max(origin.y - 56, 60) } : null;
		clearTimeout(cheerTimer); cheerTimer = setTimeout(() => (cheer = null), 1700);
		soften(origin?.x ?? W() / 2, origin?.y ?? H() * 0.6);
	}
	function soften(x: number, y: number) {
		if (reduced || !cvs) return;
		clearFireworks();
		cvs.width = innerWidth; cvs.height = innerHeight;
		shockwave(x, y, '#9fb4c9');
		for (let i = 0; i < 28 && parts.length < CAP; i++) {
			const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.7, sp = 1 + Math.random() * 2.5;
			parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 + 0.4, g: 0.03, size: 2 + Math.random() * 3, rot: Math.random() * TAU, vrot: (Math.random() - 0.5) * 0.3, color: pickColor(COOL), life: 1, decay: 0.008 + Math.random() * 0.006, flick: true });
		}
		for (let i = 0; i < 4; i++) {
			parts.push({ kind: 'emoji', x: x + (Math.random() - 0.5) * 40, y, vx: (Math.random() - 0.5) * 1.4, vy: -1 - Math.random() * 1.6, g: -0.008, size: 24 + Math.random() * 10, rot: (Math.random() - 0.5) * 0.3, vrot: (Math.random() - 0.5) * 0.05, color: '#000', life: 1, decay: 0.012, char: '💨' });
		}
		glitter(28, COOL);
		arm();
	}

	function tick() {
		frame++;
		const ctx = cvs?.getContext('2d');
		if (!ctx || !cvs) { raf = 0; return; }
		const w = cvs.width, h = cvs.height;
		ctx.clearRect(0, 0, w, h);
		const next: P[] = [];
		for (const p of parts) {
			if (p.kind === 'rocket') {
				p.vy += p.g; p.x += p.vx; p.y += p.vy;
				if (p.y <= (p.targetY ?? 0) || p.vy >= 0) { confettiBurst(p.x, p.y, p.burst ?? 40, 7 + Math.random() * 4, p.pal ?? CONFETTI, 0.5); if (Math.random() < 0.5) shockwave(p.x, p.y, p.color); continue; }
				ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, TAU); ctx.fill();
				ctx.globalAlpha = 0.4; ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); ctx.stroke(); ctx.restore();
				next.push(p); continue;
			}
			if (p.kind === 'ring') {
				p.size += 16; p.life -= p.decay;
				if (p.life <= 0) continue;
				ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, 9 * p.life); ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.stroke(); ctx.restore();
				next.push(p); continue;
			}
			// confetti / spark / glit / emoji / comet share ballistic motion
			p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vrot; p.life -= p.decay;
			if (p.life <= 0 || p.y > h + 50 || p.x < -80 || p.x > w + 80) continue;
			const alpha = p.flick ? Math.max(0, p.life) * (0.45 + 0.55 * Math.abs(Math.sin((frame + p.x) * 0.25))) : Math.max(0, p.life);
			if (p.kind === 'comet') {
				(p.trail ??= []).push(p.x, p.y); if (p.trail.length > 20) p.trail.splice(0, 2);
				ctx.save(); ctx.strokeStyle = p.color; ctx.lineCap = 'round';
				for (let i = 0; i < p.trail.length - 2; i += 2) { ctx.globalAlpha = (i / p.trail.length) * alpha * 0.9; ctx.lineWidth = (i / p.trail.length) * p.size; ctx.beginPath(); ctx.moveTo(p.trail[i], p.trail[i + 1]); ctx.lineTo(p.trail[i + 2], p.trail[i + 3]); ctx.stroke(); }
				ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, TAU); ctx.fill(); ctx.restore();
				next.push(p); continue;
			}
			ctx.save(); ctx.globalAlpha = alpha; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
			if (p.kind === 'emoji') { ctx.font = `${p.size}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.char ?? '✨', 0, 0); }
			else if (p.kind === 'conf') { ctx.fillStyle = p.color; if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55); else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, TAU); ctx.fill(); } }
			else { ctx.fillStyle = p.color; const s = p.size; ctx.fillRect(-s / 2, -s / 6, s, s / 3); ctx.fillRect(-s / 6, -s / 2, s / 3, s); }
			ctx.restore();
			next.push(p);
		}
		parts = next;
		// Screen flashes on top.
		flashes = flashes.filter((f) => (f.life -= f.decay) > 0);
		for (const f of flashes) { ctx.save(); ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = f.color; ctx.fillRect(0, 0, w, h); ctx.restore(); }
		if (parts.length || flashes.length) raf = requestAnimationFrame(tick);
		else { raf = 0; ctx.clearRect(0, 0, w, h); }
	}
	onDestroy(() => { if (raf) cancelAnimationFrame(raf); clearTimeout(cheerTimer); clearFireworks(); });
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
		const c = session.next();
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
		const prevStreak = streak;
		graded = true; streak = session.streak; best = session.best; acc = { ...session.firstTry };
		if (correct) {
			popKey++;
			if (isKnown(st(q.id)) && !wasStuck) { lockKey++; showCheer(`🧠 Locked in! ${career.stuck} of ${career.total}`, 2, 'var(--green)'); }
			else { const c = cheerFor(streak); if (c) showCheer(c.msg, c.tier); }
		} else if (prevStreak >= 3) {
			showBreak(prevStreak);
		}
	}
	function next() { if (!graded) { if (multi && picked.length) grade(); return; } load(); }
	function finish() {
		// No summary interstitial — record any milestones reached and drop straight back to Home.
		const hit = stampMilestones(app.progress, st, now()); if (hit.length) app.persist();
		nav.home();
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
	const pctBank = $derived(career.total ? Math.round((100 * career.answered) / career.total) : 0);
</script>

<svelte:window onkeydown={key} />

{#if q}
	<div class="stopbar">
		<div class="sbadges">
			{#key popKey}<div class="sbadge streak" class:hot={streak >= 3} class:blaze={streak >= 10}><b>🔥 {streak}</b><span>Streak</span></div>{/key}
			{#key lockKey}<div class="sbadge lock" class:pulse={lockKey > 0}><b>🧠 {career.stuck}</b><span>Locked in</span></div>{/key}
			<div class="sbadge"><b>📚 {career.answered}</b><span>Answered</span></div>
		</div>
		<div class="scomplete">
			<span class="sprog" aria-label="{pctBank}% of the question bank answered"><i style="width:{pctBank}%"></i></span>
			<span class="scap">{career.answered} of {career.total} answered</span>
		</div>
	</div>
	<canvas class="confetti" bind:this={cvs}></canvas>
	{#if cheer}<div class="cheer tier{cheerTier}" role="status" style="background:{cheerTone}{cheerPos ? `;left:${cheerPos.x}px;top:${cheerPos.y}px` : ''}">{cheer}</div>{/if}
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
		<button class="gohome" type="button" onclick={finish}>Go home</button>
	{:else if multi}
		<button class="big alt" type="button" disabled={picked.length !== q.c.length} onclick={(e) => { if (e.clientX) origin = { x: e.clientX, y: e.clientY }; grade(); }}>Check <span class="key">↵</span></button>
	{/if}
{:else}
	<h1 class="large">Nothing to train here.</h1><p class="muted">Every question in this set is known or not due yet.</p>
	<button class="big ghost" type="button" onclick={finish}>Back to home</button>
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
	.stopbar { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
	.scomplete { display: flex; flex-direction: column; gap: 6px; }
	.sprog { display: block; height: 8px; border-radius: 5px; background: var(--soft); overflow: hidden; }
	.sprog i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, var(--blue), #4aa3ff); transition: width 0.35s cubic-bezier(0.3, 0.9, 0.3, 1); }
	.scap { font-size: 11px; font-weight: 600; color: var(--muted); text-align: center; font-variant-numeric: tabular-nums; }
	.sbadges { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
	.sbadge { background: var(--card); border-radius: 12px; padding: 10px 6px; text-align: center; }
	.sbadge b { display: block; font-size: 18px; font-weight: 800; letter-spacing: -0.4px; line-height: 1; font-variant-numeric: tabular-nums; }
	.sbadge span { display: block; font-size: 10px; font-weight: 700; color: var(--muted); margin-top: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
	.sbadge.lock b { color: var(--green); }
	.sbadge.lock.pulse { animation: pop 0.5s ease; }
	.sbadge.streak.hot { background: var(--warnbg); animation: pop 0.4s cubic-bezier(0.2, 0.8, 0.3, 1.3); }
	.sbadge.streak.hot b { color: var(--orange); }
	.sbadge.streak.blaze { background: linear-gradient(135deg, #ff3b30, #ff9500); animation: pop 0.4s cubic-bezier(0.2, 0.8, 0.3, 1.3), blaze 1.1s ease-in-out infinite; }
	.sbadge.streak.blaze b, .sbadge.streak.blaze span { color: #fff; }
	.gohome { display: block; margin: 12px auto 0; padding: 6px 14px; background: none; border: 0; color: var(--muted); font-size: 13px; font-weight: 600; }
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
