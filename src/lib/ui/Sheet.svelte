<script lang="ts">
	import type { Snippet } from 'svelte';
	let { onclose, children, label = 'Details' }: { onclose: () => void; children: Snippet; label?: string } = $props();
	function key(e: KeyboardEvent) { if (e.key === 'Escape') { e.stopPropagation(); onclose(); } }
</script>

<svelte:window onkeydown={key} />
<div class="sheet-back" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
	<div class="sheet" role="dialog" aria-modal="true" aria-label={label}>
		<div class="row"><span class="eyebrow">{label}</span><button class="chip" type="button" onclick={onclose}>Close</button></div>
		{@render children()}
	</div>
</div>
