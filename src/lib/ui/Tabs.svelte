<script lang="ts">
	import { nav, type Tab } from '$lib/ui/nav.svelte';
	const items: { id: Tab; label: string; svg: string }[] = [
		{ id: 'today', label: 'Today', svg: '<circle cx="12" cy="12" r="8"/><path d="M2 12h20"/>' },
		{ id: 'map', label: 'Map', svg: '<path d="M4 18 10 6l4 12 6-12"/>' },
		{ id: 'questions', label: 'Questions', svg: '<path d="M5 6h14M5 12h14M5 18h9"/>' },
		{ id: 'account', label: 'Account', svg: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' }
	];
</script>

<nav class="tabs" aria-label="Sections">
	<div class="in">
		{#each items as it (it.id)}
			<a href="#{it.id}" class:on={nav.tab === it.id} aria-current={nav.tab === it.id ? 'page' : undefined} onclick={(e) => { e.preventDefault(); nav.go(it.id); }}>
				<svg viewBox="0 0 24 24" aria-hidden="true">{@html it.svg}</svg>{it.label}
			</a>
		{/each}
	</div>
</nav>
