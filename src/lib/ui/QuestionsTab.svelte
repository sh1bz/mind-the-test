<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { QUESTIONS, TOPICS, TOPIC_COLORS, CARD_BY_ID } from '$lib/content';
	import { isKnown, isNew, topMiss } from '$lib/engine/scheduler';
	import { dueBadge, correctText } from '$lib/ui/derive';
	const now = Date.now();
	const st = (id: string) => app.item(id);
	type F = 'all' | 'wrong' | 'flagged' | 'learning' | 'unseen' | 'known';
	const filters: { id: F; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'wrong', label: 'Wrong' }, { id: 'flagged', label: 'Flagged' }, { id: 'learning', label: 'Learning' }, { id: 'unseen', label: 'Unseen' }, { id: 'known', label: 'Known' }];
	let f = $state<F>('all');
	let topic = $state<number | null>(null);
	let search = $state('');
	let open = $state<string | null>(null);
	let shown = $state(60);
	const match = (id: string) => { const s = st(id); switch (f) { case 'wrong': return s.lapses > 0 && !isKnown(s); case 'flagged': return !!s.flag; case 'learning': return !isNew(s) && !isKnown(s); case 'unseen': return isNew(s); case 'known': return isKnown(s); default: return true; } };
	const list = $derived.by(() => {
		const term = search.trim().toLowerCase();
		return QUESTIONS.filter((q) => (topic === null || q.t === topic) && match(q.id) && (!term || (q.q + ' ' + q.o.join(' ')).toLowerCase().includes(term)))
			.sort((a, b) => st(b.id).lapses - st(a.id).lapses);
	});
	const counts = $derived({ known: list.filter((q) => isKnown(st(q.id))).length, unseen: list.filter((q) => isNew(st(q.id))).length });
	$effect(() => { f; topic; search; shown = 60; });
</script>

<div class="datehd">{QUESTIONS.length} in the bank</div>
<h1 class="large">Questions</h1>
<input class="field search" type="search" placeholder="Search" aria-label="Search questions" bind:value={search} />
<div class="wrapchips">{#each filters as x (x.id)}<button class="chip" class:on={f === x.id} type="button" aria-pressed={f === x.id} onclick={() => (f = x.id)}>{x.label}</button>{/each}</div>
<div class="wrapchips">
	<button class="chip" class:on={topic === null} type="button" onclick={() => (topic = null)}>All topics</button>
	{#each TOPICS as name, t (t)}<button class="chip" class:on={topic === t} type="button" aria-pressed={topic === t} onclick={() => (topic = topic === t ? null : t)}><span class="dot" style="background:{topic === t ? '#fff' : `var(--${TOPIC_COLORS[t]})`}"></span>{name}</button>{/each}
</div>
<div class="sec"><h2 class="num">{list.length} question{list.length === 1 ? '' : 's'}</h2><span class="muted small num">{counts.known} known · {list.length - counts.known - counts.unseen} learning · {counts.unseen} unseen</span></div>
{#if list.length}
	<button class="big" type="button" onclick={() => nav.startTrain({ kind: 'custom', topic: null, ids: list.map((q) => q.id), title: `Test ${list.length}` })}>Test these {list.length} <span class="arrow">›</span></button>
{/if}
<div class="list">
	{#each list.slice(0, shown) as q (q.id)}
		{@const s = st(q.id)}
		{@const b = dueBadge(s, now)}
		<button class="qrow" type="button" aria-expanded={open === q.id} onclick={() => (open = open === q.id ? null : q.id)}>
			<span class="t">{q.q}</span>
			{#if !isNew(s) || open === q.id}<span class="muted" style="font-size:14px">{correctText(q)}</span>{/if}
			<span class="m"><span class="dot" style="background:var(--{TOPIC_COLORS[q.t]})"></span>{TOPICS[q.t]}{#if s.flag}<span>· flagged</span>{/if}{#if s.lapses}<span class="zb w" style="margin-left:0">✕{s.lapses}</span>{/if}<span class="zb {b.cls}">{b.text}</span></span>
			{#if open === q.id}
				<span class="x">{q.e}</span>
				{#if topMiss(s) !== undefined}<span class="x muted">Often mixed up with “{q.o[topMiss(s)!]}”</span>{/if}
			{/if}
		</button>
		{#if open === q.id}
			<div class="wrapchips wacts">
				<button class="chip" class:on={!!s.flag} type="button" aria-pressed={!!s.flag} onclick={() => app.toggleFlag(q.id)}>{s.flag ? 'Flagged' : 'Flag'}</button>
				{#if q.card && CARD_BY_ID[q.card]}<button class="chip tint" type="button" onclick={() => nav.openMap(CARD_BY_ID[q.card!].section.id)}>On the map</button>{/if}
			</div>
		{/if}
	{/each}
</div>
{#if list.length > shown}<button class="chip tint" type="button" style="align-self:center" onclick={() => (shown += 60)}>Show more · {list.length - shown} left</button>{/if}
