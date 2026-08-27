<script lang="ts">
	import Seo from '$lib/seo/Seo.svelte';
	import { samples, topicPage, topicSlug, SITE } from '$lib/seo/site';
	import { breadcrumb, webpage, quiz } from '$lib/seo/ld';
	import { TOPICS, TOPIC_COLORS, CARD_BY_ID } from '$lib/content';
	let { data } = $props();
	const t = $derived(data.t);
	const name = $derived(TOPICS[t]);
	const page = $derived(topicPage(t));
	const qs = $derived(samples(t));
	const letter = (i: number) => String.fromCharCode(65 + i);
	const others = $derived(TOPICS.map((n, i) => ({ n, i })).filter((x) => x.i !== t));
</script>

<Seo title={page.title} description={page.description} path={page.path} jsonld={[webpage(page), quiz(page.title, name, page.path, qs), breadcrumb([{ name: 'Home', path: '/' }, { name: 'Practice questions', path: '/questions/' }, { name, path: page.path }])]} />

<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/questions/">Practice questions</a><span>›</span><span>{name}</span></nav>
<h1>{name}: Life in the UK practice questions</h1>
<div class="prose">
	<p>{qs.length} sample questions on {name.toLowerCase()} from the {SITE.name} bank. Open the answer under each question. In the real test some questions have two correct answers.</p>
</div>

<ol class="qs">
	{#each qs as q, n (q.id)}
		<li class="card">
			<h2 class="qt"><span class="num muted">{n + 1}.</span> {q.q}</h2>
			<ul class="opts">
				{#each q.o as o, i (i)}<li><b class="k">{letter(i)}</b>{o}</li>{/each}
			</ul>
			<details>
				<summary>Show the answer</summary>
				<p class="ans"><b>{q.c.map((i) => letter(i)).join(' and ')}</b> — {q.c.map((i) => q.o[i]).join('; ')}</p>
				<p class="why">{q.e}</p>
				{#if q.card && CARD_BY_ID[q.card]}
					<p class="why">Revise: <a href="/revise/{CARD_BY_ID[q.card].section.id}/#{q.card}">{CARD_BY_ID[q.card].card.title}</a></p>
				{/if}
			</details>
		</li>
	{/each}
</ol>

<div class="prose">
	<p>These are {qs.length} of the {SITE.questions} questions in the app. In the app a question you miss comes back 8–12 cards later, then the next day, then three days later, until it sticks. <a href="/">Start free</a>.</p>
</div>
<div class="sec"><h2>Other topics</h2></div>
<div class="list">
	{#each others as o (o.i)}<a class="lrow ic-sep" href="/questions/{topicSlug(o.i)}/"><span class="ic" style="background:var(--{TOPIC_COLORS[o.i]})"></span>{o.n}<span class="chev">›</span></a>{/each}
</div>

<style>
	.qs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
	.qt { font-size: 17px; font-weight: 600; line-height: 1.35; }
	.opts { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 15px; color: var(--ink2); }
	.opts li { display: flex; gap: 10px; align-items: baseline; }
	.k { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; background: var(--soft); font-size: 12px; flex: none; color: var(--ink); }
	details { margin-top: 10px; font-size: 15px; }
	summary { color: var(--blue); font-weight: 500; cursor: pointer; }
	.ans { margin-top: 8px; color: var(--okink); }
	.why { margin-top: 6px; color: var(--ink2); line-height: 1.5; }
</style>
