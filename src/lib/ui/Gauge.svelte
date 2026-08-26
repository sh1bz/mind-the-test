<script lang="ts">
	import { onMount } from 'svelte';
	let { value, label = 'pass chance' }: { value: number; label?: string } = $props();
	const C = 2 * Math.PI * 50;
	let shown = $state(0);
	let settled = false;
	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) { shown = value; settled = true; return; }
		const t0 = performance.now(); const target = value;
		const step = (t: number) => { const k = Math.min(1, (t - t0) / 400); shown = target * (1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(step); else settled = true; };
		requestAnimationFrame(step);
	});
	$effect(() => { const v = value; if (settled) shown = v; });
</script>

<div class="gauge" role="img" aria-label="{Math.round(value * 100)}% {label}">
	<svg width="118" height="118" viewBox="0 0 118 118">
		<circle cx="59" cy="59" r="50" fill="none" stroke="var(--hair)" stroke-width="11" />
		<circle class="fg" cx="59" cy="59" r="50" fill="none" stroke="var(--red)" stroke-width="11" stroke-dasharray={C} stroke-dashoffset={C * (1 - shown)} />
	</svg>
	<div class="pct"><b class="num">{Math.round(shown * 100)}%</b><span>{label}</span></div>
</div>
