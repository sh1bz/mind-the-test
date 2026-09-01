<script lang="ts">
	// What a visitor without JavaScript sees on /, and what every crawler indexes. The app replaces
	// it on mount. Same claims as the onboarding sheet, so the copy never diverges.
	import { SITE, TEST, HOW_IT_WORKS, STATIC_PAGES } from './site';
	import { MAP, TOPICS } from '$lib/content';
	import { topicSlug } from './site';
	const links = STATIC_PAGES.filter((p) => p.path !== '/');
</script>

<div class="landing col">
	<header class="row" style="padding-top:8px">
		<a href="/" class="brand" aria-label="Until It Sticks home"><img src="/icon.svg" alt="" width="30" height="30" /><b>Until It Sticks</b></a>
	</header>
	<h1 class="large">Pass your Life in the UK test. Every miss comes back until it sticks.</h1>
	<p class="lede">{SITE.description}</p>
	<a class="big" href="/">Start practising free <span class="arrow">›</span></a>
	<p class="muted small" style="padding:0 4px">{#if SITE.beta}Free while in beta — all {SITE.questions} questions and unlimited mocks, no subscription.{:else}Free for {SITE.free.questions} questions and {SITE.free.mocks} mock. Then {SITE.price} once, no subscription.{/if}</p>

	<div class="sec"><h2>How it works</h2></div>
	<div class="list">
		{#each HOW_IT_WORKS as s (s.n)}
			<div class="lrow step"><b class="n">{s.n}</b><span><b>{s.t}</b> — {s.d}</span></div>
		{/each}
	</div>

	<div class="sec"><h2>The test</h2></div>
	<div class="card facts">
		<p><b>{TEST.questions} questions</b> in <b>{TEST.minutes} minutes</b>. Pass at <b>{TEST.pass}</b> ({TEST.passPercent}%). Fee <b>{TEST.fee}</b>, booked on <a href={TEST.bookUrl} rel="noopener">GOV.UK</a>. Based on the official handbook, <i>{TEST.handbook}</i>.</p>
		<p><a href="/life-in-the-uk-test/">Everything about the test →</a></p>
	</div>

	<div class="sec"><h2>Free practice questions</h2></div>
	<div class="list">
		{#each TOPICS as t, i (t)}<a class="lrow" href="/questions/{topicSlug(i)}/">{t}<span class="chev">›</span></a>{/each}
	</div>

	<div class="sec"><h2>Revision notes</h2></div>
	<div class="list">
		{#each MAP as s (s.id)}<a class="lrow" href="/revise/{s.id}/">{s.title}<span class="chev">›</span></a>{/each}
	</div>

	<nav class="foot" aria-label="Site">
		{#each links as p (p.path)}<a href={p.path}>{p.title.split(/ [—:] /)[0]}</a>{/each}
	</nav>
</div>

<style>
	.landing { padding-bottom: 40px; }
	.brand { display: flex; align-items: center; gap: 10px; color: var(--ink); text-decoration: none; font-size: 17px; }
	.lede { font-size: 17px; color: var(--ink2); line-height: 1.5; }
	a.big { text-decoration: none; }
	.step { align-items: flex-start; padding: 12px 16px; font-size: 15px; line-height: 1.45; color: var(--ink2); }
	.step .n { width: 26px; height: 26px; border-radius: 50%; background: var(--soft); display: grid; place-items: center; font-size: 13px; font-weight: 700; flex: none; color: var(--ink); }
	.step span b { color: var(--ink); }
	.facts { display: flex; flex-direction: column; gap: 10px; font-size: 15px; line-height: 1.5; color: var(--ink2); }
	a.lrow { text-decoration: none; }
	.foot { display: flex; flex-wrap: wrap; gap: 6px 16px; padding: 12px 4px; font-size: 14px; }
</style>
