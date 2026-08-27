<script lang="ts">
	import Seo from '$lib/seo/Seo.svelte';
	import { STATIC_PAGES, samples, topicSlug, SITE, TEST } from '$lib/seo/site';
	import { breadcrumb, webpage } from '$lib/seo/ld';
	import { TOPICS, TOPIC_COLORS, QUESTIONS } from '$lib/content';
	const page = STATIC_PAGES.find((p) => p.path === '/questions/')!;
	const count = (t: number) => QUESTIONS.filter((q) => q.t === t).length;
</script>

<Seo title={page.title} description={page.description} path={page.path} jsonld={[webpage(page), breadcrumb([{ name: 'Home', path: '/' }, { name: 'Practice questions', path: page.path }])]} />

<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><span>Practice questions</span></nav>
<h1>Free Life in the UK test practice questions</h1>
<div class="prose">
	<p>The real test asks {TEST.questions} questions from the official handbook and you need {TEST.pass} right. These are sample questions from the {SITE.questions} in {SITE.name}, grouped by topic. Each one shows the answer and the reason.</p>
</div>
<div class="list">
	{#each TOPICS as t, i (t)}
		<a class="lrow ic-sep" href="/questions/{topicSlug(i)}/"><span class="ic" style="background:var(--{TOPIC_COLORS[i]})"></span>{t}<span class="v">{samples(i).length} of {count(i)}</span><span class="chev">›</span></a>
	{/each}
</div>
<div class="prose">
	<p>In the app, every question you miss comes back until you answer it right from memory. <a href="/">Start free</a> with {SITE.free.questions} questions and {SITE.free.mocks} mock exam.</p>
</div>
