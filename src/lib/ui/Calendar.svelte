<script lang="ts">
	import { untrack } from "svelte";
	import { monthName, isoDate } from "$lib/ui/derive";
	let { value, onpick }: { value?: string; onpick: (iso: string) => void } = $props();
	const today = new Date(); today.setHours(0, 0, 0, 0);
	const start = (() => { const v = untrack(() => value); return v ? new Date(v + "T00:00:00") : today; })();
	let y = $state(start.getFullYear());
	let m = $state(start.getMonth());
	const first = $derived(new Date(y, m, 1));
	const lead = $derived((first.getDay() + 6) % 7); // Monday first
	const days = $derived(new Date(y, m + 1, 0).getDate());
	const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
	function shift(d: number) { const n = new Date(y, m + d, 1); y = n.getFullYear(); m = n.getMonth(); }
</script>

<div class="row">
	<span class="display" style="font-size:16px">{monthName(m)} {y}</span>
	<span style="display:flex;gap:6px">
		<button class="navbtn" type="button" aria-label="Previous month" onclick={() => shift(-1)}>‹</button>
		<button class="navbtn" type="button" aria-label="Next month" onclick={() => shift(1)}>›</button>
	</span>
</div>
<div class="cal" aria-label="Pick a date">
	{#each ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as h, i (i)}<span class="h" aria-hidden="true">{h}</span>{/each}
	{#each Array(lead) as _, i (i)}<span></span>{/each}
	{#each Array(days) as _, i (i)}
		{@const iso = isoDate(y, m, i + 1)}
		<button type="button" class:on={iso === value} disabled={iso < todayIso} aria-pressed={iso === value} onclick={() => onpick(iso)}>{i + 1}</button>
	{/each}
</div>
