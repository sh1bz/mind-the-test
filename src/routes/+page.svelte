<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { QUESTIONS } from '$lib/content';
</script>

<p>Life in the UK — {QUESTIONS.length} questions · sync {app.sync}</p>
