<script lang="ts">
	import type { MapCard, MapSection } from '$lib/content';
	let { card, section, blur = false, mastery, due = 0, onquiz }: { card: MapCard; section: MapSection; blur?: boolean; mastery?: { known: number; total: number }; due?: number; onquiz?: () => void } = $props();
	const color = $derived(`var(--${section.color})`);
	function reveal(e: MouseEvent) {
		const t = e.target as HTMLElement;
		const a = t.closest('.a'); if (blur && a) a.classList.toggle('show');
	}
	const stripHead = (h: string) => h.replace(/<[^>]+>/g, '');
</script>

<div class="mapcard">
	<h3>
		<span style="display:flex;align-items:center;flex:1"><span class="dot" style="background:{color}"></span>{card.title}</span>
		{#if mastery && mastery.total}
			<span class="mastery" title="{mastery.known} of {mastery.total} linked questions known"><i><b style="width:{Math.round((100 * mastery.known) / mastery.total)}%"></b></i>{mastery.known}/{mastery.total}</span>
		{/if}
	</h3>
	<div class:blur onclick={reveal} role={blur ? "button" : undefined}>
		{#if card.kind === 'rail'}
			<div class="rail">{#each card.items as it, i (i)}<div class="it"><span class="yr">{it.yr}</span><span>{@html it.html ?? it.text}</span></div>{/each}</div>
		{:else if card.kind === 'numbers'}
			<div class="nums">{#each card.items as it, i (i)}<div class="n"><b class="a num">{it.n}</b><span>{@html it.label ?? ''}</span></div>{/each}</div>
		{:else if card.kind === 'table'}
			<div class="tbl"><table><thead><tr>{#each card.head ?? [] as h, i (i)}<th>{stripHead(h)}</th>{/each}</tr></thead><tbody>{#each card.rows ?? [] as r, i (i)}<tr>{#each r as c, j (j)}<td>{@html c}</td>{/each}</tr>{/each}</tbody></table></div>
		{:else}
			<ul>{#each card.items as it, i (i)}<li>{@html it.html ?? it.text}</li>{/each}</ul>
		{/if}
	</div>
	{#each card.cues as cue, i (i)}<div class="cue">{@html cue}</div>{/each}
	{#if onquiz && mastery && mastery.total}
		<div class="row" style="margin-top:10px">
			<button class="chip tint" type="button" onclick={onquiz}>Quiz this card · {mastery.total}</button>
			{#if due}<span class="muted small num">{due} due now</span>{/if}
		</div>
	{/if}
</div>
