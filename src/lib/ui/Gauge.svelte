<script lang="ts">
	import { onMount } from 'svelte';
	let { value, label = 'ready' }: { value: number; label?: string } = $props();
	const R = 44, C = 2 * Math.PI * R;
	let shown = $state(0);
	let settled = false;
	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) { shown = value; settled = true; return; }
		const t0 = performance.now(); const target = value;
		const step = (t: number) => { const k = Math.min(1, (t - t0) / 400); shown = target * (1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(step); else settled = true; };
		requestAnimationFrame(step);
	});
	$effect(() => { const v = value; if (settled) shown = v; });
	const tone = $derived(value >= 0.75 ? 'var(--green)' : value >= 0.5 ? 'var(--orange)' : 'var(--red)');
</script>

<div class="gauge" role="img" aria-label="{Math.round(value * 100)}% {label}">
	<svg viewBox="0 0 104 104">
		<circle cx="52" cy="52" r={R} fill="none" stroke="var(--soft)" stroke-width="10" />
		<circle class="fg" cx="52" cy="52" r={R} fill="none" stroke={tone} stroke-width="10" stroke-linecap={shown > 0.01 ? "round" : "butt"} stroke-dasharray={C} stroke-dashoffset={C * (1 - shown)} />
	</svg>
	<div class="pct"><b class="num">{Math.round(shown * 100)}%</b><span>{label}</span></div>
</div>
