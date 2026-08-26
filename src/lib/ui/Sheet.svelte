<script lang="ts">
	import type { Snippet } from 'svelte';
	let { onclose, children, label = 'Details' }: { onclose: () => void; children: Snippet; label?: string } = $props();
	function key(e: KeyboardEvent) { if (e.key === 'Escape') { e.stopPropagation(); onclose(); } }
	let closeBtn = $state<HTMLButtonElement>();
	// Move focus into the dialog, and back to the opener when it closes.
	$effect(() => { const prev = document.activeElement as HTMLElement | null; closeBtn?.focus(); return () => prev?.focus?.(); });
</script>

<svelte:window onkeydown={key} />
<div class="sheet-back" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
	<div class="sheet" role="dialog" aria-modal="true" aria-label={label}>
		<div class="row"><span class="sec" style="margin:0"><h2 style="font-size:17px">{label}</h2></span><button class="chip tint" type="button" bind:this={closeBtn} onclick={onclose}>Done</button></div>
		{@render children()}
	</div>
</div>
