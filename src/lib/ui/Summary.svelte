<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { QUESTIONS } from '$lib/content';
	import { isNew, isDue } from '$lib/engine/scheduler';
	import { milestones, fmtIn, pct } from '$lib/ui/derive';
	const now = Date.now();
	const s = nav.summary!;
	const st = (id: string) => app.item(id);
	const stops = milestones(app.progress, st, now);
	const end = new Date(now); end.setHours(23, 59, 59, 999);
	let nextDue = Infinity, tonight = 0;
	for (const q of QUESTIONS) { const x = st(q.id); if (isNew(x)) continue; if (isDue(x, now)) { tonight++; nextDue = 0; continue; } if (x.due <= end.getTime()) tonight++; nextDue = Math.min(nextDue, x.due); }
	const headline = s.firstTry >= 0.8 ? 'Good run.' : s.firstTry >= 0.5 ? 'Solid work.' : 'Hard ones today.';
</script>

<h1 class="display" style="font-size:26px;line-height:1.1;margin-top:8px">{headline}</h1>
<div class="row" style="justify-content:flex-start;gap:22px">
	<div><span class="display num" style="font-size:30px">{s.answered}</span><br /><span class="muted small">answered</span></div>
	<div><span class="display num" style="font-size:30px">{pct(s.firstTry)}</span><br /><span class="muted small">first try</span></div>
	<div><span class="display num" style="font-size:30px">{s.best}</span><br /><span class="muted small">best streak</span></div>
</div>
<div class="row" style="font-size:13px"><span>Pass chance</span><b class="num">{pct(s.before)} → {pct(s.after)}</b></div>
<div class="row" style="font-size:13px"><span>Next reviews due</span><b class="num">{nextDue === Infinity ? '—' : `in ${fmtIn(nextDue - now)}`}{tonight ? ` · ${tonight} today` : ''}</b></div>
<div class="eyebrow" style="margin-top:6px">Milestones</div>
<div class="journey">
	{#each stops as m (m.id)}
		<div class="st {m.state}"><span>{#if m.state === 'next' || m.id === 'exam'}<b>{m.label}</b>{:else}{m.label}{/if}</span><span class="muted num">{m.state === 'next' ? 'next' : (m.when ?? '—')}</span></div>
	{/each}
</div>
<button class="big" type="button" style="margin-top:auto" onclick={() => nav.startTrain(nav.train)}>Keep going <span class="arrow">›</span></button>
<button class="big ghost" type="button" onclick={() => nav.home()}>Back to Today</button>
