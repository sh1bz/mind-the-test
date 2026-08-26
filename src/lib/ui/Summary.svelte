<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { QUESTIONS } from '$lib/content';
	import { isNew, isDue } from '$lib/engine/scheduler';
	import { milestones, fmtIn, pct } from '$lib/ui/derive';
	import Ic from './Ic.svelte';
	const now = Date.now();
	const s = nav.summary!;
	const st = (id: string) => app.item(id);
	const stops = milestones(app.progress, st, now);
	const end = new Date(now); end.setHours(23, 59, 59, 999);
	let nextDue = Infinity, tonight = 0;
	for (const q of QUESTIONS) { const x = st(q.id); if (isNew(x)) continue; if (isDue(x, now)) { tonight++; nextDue = 0; continue; } if (x.due <= end.getTime()) tonight++; nextDue = Math.min(nextDue, x.due); }
	const headline = s.firstTry >= 0.8 ? 'Good run.' : s.firstTry >= 0.5 ? 'Solid work.' : 'Hard ones today.';
</script>

<div class="datehd">Session done</div>
<h1 class="large">{headline}</h1>
<div class="card">
	<div class="stats" style="grid-template-columns:1fr 1fr 1fr">
		<div><b class="num" style="font-size:28px">{s.answered}</b>answered</div>
		<div><b class="num" style="font-size:28px">{pct(s.firstTry)}</b>first try</div>
		<div><b class="num" style="font-size:28px">{s.best}</b>best streak</div>
	</div>
</div>
<div class="list">
	<div class="lrow ic-sep"><Ic name="heart" color="var(--red)" />Pass chance<span class="v ink num">{pct(s.before)} → {pct(s.after)}</span></div>
	<div class="lrow"><Ic name="clock" color="var(--indigo)" />Next reviews due<span class="v num">{nextDue === Infinity ? '—' : `in ${fmtIn(nextDue - now)}`}{tonight ? ` · ${tonight} today` : ''}</span></div>
</div>
<div class="sec"><h2>Milestones</h2></div>
<div class="card">
	<div class="journey">
		{#each stops as m (m.id)}
			<div class="st {m.state}"><span>{#if m.state === 'next' || m.id === 'exam'}<b>{m.label}</b>{:else}{m.label}{/if}</span><span class="muted num">{m.state === 'next' ? 'next' : (m.when ?? '—')}</span></div>
		{/each}
	</div>
</div>
<button class="big" type="button" style="margin-top:auto" onclick={() => nav.startTrain(nav.train)}>Keep going <span class="arrow">›</span></button>
<button class="big ghost" type="button" onclick={() => nav.home()}>Back to Today</button>
