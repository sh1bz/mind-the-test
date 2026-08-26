<script lang="ts">
	import { onMount } from 'svelte';
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { QUESTIONS, TOPICS, type Question } from '$lib/content';
	import { pickMock, EXAM_PASS, EXAM_MINUTES, EXAM_QUESTIONS } from '$lib/engine/readiness';
	import { optionOrder, fmtSecs, stampMilestones } from '$lib/ui/derive';
	import Sheet from './Sheet.svelte';
	let { ondone }: { ondone?: () => void } = $props();
	const st = (id: string) => app.item(id);
	const startAt = Date.now();
	const qs: { q: Question; order: number[] }[] = pickMock(QUESTIONS, st, Math.random, startAt).map((q) => ({ q, order: optionOrder(q, Math.random) }));
	let answers = $state<number[][]>(qs.map(() => []));
	let i = $state(0);
	let secs = $state(EXAM_MINUTES * 60);
	let leaving = $state(false);
	let result = $state<{ score: number; wrong: string[]; secs: number; byTopic: { name: string; ok: number; n: number }[] } | null>(null);
	let announce = $state('');
	const cur = $derived(qs[i]);
	const unanswered = $derived(answers.filter((a, k) => a.length < qs[k].q.c.length).length);
	let timer: ReturnType<typeof setInterval>;
	onMount(() => { timer = setInterval(() => { secs = Math.max(0, EXAM_MINUTES * 60 - Math.floor((Date.now() - startAt) / 1000)); if (secs === 300) announce = '5 minutes left'; if (secs === 60) announce = '1 minute left'; if (secs <= 0) finish(); }, 1000); return () => clearInterval(timer); });

	function pick(k: number) {
		const a = answers[i]; const need = cur.q.c.length;
		if (need === 1) answers[i] = [k];
		else if (a.includes(k)) answers[i] = a.filter((x) => x !== k);
		else if (a.length < need) answers[i] = [...a, k];
	}
	function finish() {
		clearInterval(timer);
		const took = Math.round((Date.now() - startAt) / 1000);
		const wrong: string[] = []; let score = 0;
		const byTopic = TOPICS.map((name) => ({ name, ok: 0, n: 0 }));
		qs.forEach(({ q, order }, k) => {
			const chosen = answers[k].map((d) => order[d]).sort().join(',');
			const ok = chosen === [...q.c].sort().join(',');
			if (ok) score++; else wrong.push(q.id);
			byTopic[q.t].n++; if (ok) byTopic[q.t].ok++;
			app.answer(q.id, ok, Date.now());
			if (!ok) app.recordMiss(q.id, answers[k].map((d) => order[d]).filter((i) => !q.c.includes(i)));
		});
		app.addMock({ at: Date.now(), score, total: EXAM_QUESTIONS, secs: took, wrong });
		stampMilestones(app.progress, st, Date.now()); app.persist();
		result = { score, wrong, secs: took, byTopic: byTopic.filter((t) => t.n) };
	}
	function discard() { clearInterval(timer); leave(); }
	function leave() { ondone?.(); nav.home(); }
	function key(e: KeyboardEvent) {
		if (result || leaving) return;
		if ((e.target as HTMLElement | null)?.closest?.('button, input, a') && e.key !== '1' && e.key !== '2' && e.key !== '3' && e.key !== '4') return;
		if (e.key >= '1' && e.key <= '4') pick(Number(e.key) - 1);
		else if (e.key === 'Enter' || e.key === 'ArrowRight') { if (i < qs.length - 1) i++; }
		else if (e.key === 'ArrowLeft') { if (i > 0) i--; }
		else if (e.key === 'Escape') leaving = true;
	}
</script>

<svelte:window onkeydown={key} />
<span class="sr" aria-live="assertive">{announce}</span>

{#if result}
	{@const pass = result.score >= EXAM_PASS}
	<div class="result" class:fail={!pass}>
		<span class="stamp">{pass ? 'PASS' : 'NOT YET'}</span>
		<div class="score num">{result.score}<span class="muted" style="font-size:22px">/{EXAM_QUESTIONS}</span></div>
		<div class="verdictline num">{Math.round((100 * result.score) / EXAM_QUESTIONS)}% · {Math.max(1, Math.round(result.secs / 60))} min</div>
	</div>
	<p class="muted" style="font-size:15px">{pass ? `Pass mark is ${EXAM_PASS}. Keep the reviews going so it holds on the day.` : `Pass mark is ${EXAM_PASS}. Every wrong answer is now scheduled to come back.`}</p>
	<div class="topicrow">{#each result.byTopic as t (t.name)}<span>{t.name}</span><b class="num">{t.ok}/{t.n}</b>{/each}</div>
	{#if result.wrong.length}
		<button class="big alt" type="button" onclick={() => { ondone?.(); nav.startTrain({ kind: 'custom', topic: null, ids: result!.wrong, title: 'Missed in the mock' }); }}>Review the {result.wrong.length} you missed <span class="arrow">›</span></button>
	{/if}
	<button class="big" type="button" onclick={leave}>{nav.placement ? 'Start learning' : 'Back to Today'} <span class="arrow">›</span></button>
{:else}
	{#if leaving}
		<Sheet label="Leave the mock?" close="Keep going" onclose={() => (leaving = false)}>
			<div class="note">{unanswered} unanswered. Finishing now marks them wrong.</div>
			<button class="big" type="button" onclick={finish}>Finish now</button>
			<button class="big ghost" type="button" onclick={discard}>Discard</button>
		</Sheet>
	{/if}
	<div class="navrow">
		<button class="xbtn" type="button" aria-label="Leave the mock" onclick={() => (leaving = true)}>✕</button>
		<span class="muted num">{i + 1} of {qs.length}</span>
		<span class="timer num" class:low={secs <= 300}>{fmtSecs(Math.max(0, secs))}</span>
	</div>
	<div class="row"><span class="pbar"><div style="width:{Math.round((100 * (i + 1)) / qs.length)}%;background:var(--blue)"></div></span></div>
	<p class="qtext">{cur.q.q}</p>
	{#if cur.q.c.length > 1}<p class="muted small" style="margin-top:-6px">Select {cur.q.c.length} answers</p>{/if}
	<div class="opts">
		{#each cur.order as oi, k (oi)}
			<button class="opt" class:sel={answers[i].includes(k)} type="button" aria-pressed={answers[i].includes(k)} onclick={() => pick(k)}>
				<span class="k">{'ABCD'[k]}</span><span style="flex:1">{cur.q.o[oi]}</span><span class="key">{k + 1}</span>
			</button>
		{/each}
	</div>
	<div class="row" style="margin-top:auto">
		<button class="chip" type="button" disabled={i === 0} onclick={() => i--}>‹ Back</button>
		<span class="muted small num">{unanswered} unanswered</span>
		{#if i < qs.length - 1}
			<button class="chip tint" type="button" onclick={() => i++}>Next ›</button>
		{:else}
			<button class="chip on" type="button" onclick={() => (unanswered ? (leaving = true) : finish())}>Finish</button>
		{/if}
	</div>
{/if}
