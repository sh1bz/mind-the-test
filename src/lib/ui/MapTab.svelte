<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { MAP, QUESTIONS } from '$lib/content';
	import { isDue, isKnown } from '$lib/engine/scheduler';
	import MapCardView from './MapCardView.svelte';
	const now = Date.now();
	const st = (id: string) => app.item(id);
	let blur = $state(false);
	let sec = $state(nav.mapFocus ?? MAP[0].id);
	const section = $derived(MAP.find((s) => s.id === sec) ?? MAP[0]);
	const linked = (cardId: string) => QUESTIONS.filter((q) => q.card === cardId);
	const short = (t: string) => t.split(/ — | & |,/)[0].replace('The UK', 'Geography').replace('Mind the gap', 'Traps').replace('Numbers that get tested', 'Numbers').replace('Values', 'Values').replace('Government', 'Government').replace('Law', 'Law').replace('Culture', 'Culture');
</script>

<div class="datehd">Revision</div>
<div class="row">
	<h1 class="large">Map</h1>
	<div class="seg" role="group" aria-label="Reading mode" style="width:200px">
		<button type="button" class:on={!blur} aria-pressed={!blur} onclick={() => (blur = false)}>Read</button>
		<button type="button" class:on={blur} aria-pressed={blur} onclick={() => (blur = true)}>Test yourself</button>
	</div>
</div>
<div class="wrapchips">
	{#each MAP as s (s.id)}
		<button class="chip" class:on={sec === s.id} type="button" aria-pressed={sec === s.id} onclick={() => { sec = s.id; nav.mapFocus = s.id; }}><span class="dot" style="background:{sec === s.id ? '#fff' : `var(--${s.color})`}"></span>{short(s.title)}</button>
	{/each}
</div>
{#if blur}<p class="muted small">Answers are hidden. Tap one to reveal it.</p>{/if}
<div class="sec"><h2>{section.title}</h2></div>
{#if section.note}<p class="muted" style="font-size:15px;margin-top:-4px">{@html section.note}</p>{/if}
{#each section.cards as card (card.id)}
	{@const qs = linked(card.id)}
	<MapCardView {card} {section} {blur}
		mastery={{ known: qs.filter((q) => isKnown(st(q.id))).length, total: qs.length }}
		due={qs.filter((q) => isDue(st(q.id), now)).length}
		onquiz={() => nav.startTrain({ kind: 'custom', topic: null, ids: qs.map((q) => q.id), title: card.title })} />
{/each}
