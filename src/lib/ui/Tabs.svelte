<script lang="ts">
	import { nav, type Tab } from '$lib/ui/nav.svelte';
	import { ICONS } from './icons';
	const items: { id: Tab; label: string; svg: string }[] = [
		{ id: 'today', label: 'Home', svg: ICONS.house },
		{ id: 'map', label: 'Map', svg: ICONS.map },
		{ id: 'questions', label: 'Questions', svg: ICONS.list },
		{ id: 'account', label: 'Account', svg: ICONS.person }
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
