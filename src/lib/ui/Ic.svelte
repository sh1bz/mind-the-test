<script lang="ts">
	import { ICONS, type IconName } from './icons';
	let { name, color = 'var(--blue)', sm = false }: { name: IconName; color?: string; sm?: boolean } = $props();
</script>

<span class="ic" class:sm style="background:{color}" aria-hidden="true"><svg viewBox="0 0 24 24">{@html ICONS[name]}</svg></span>
