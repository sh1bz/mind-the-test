<script lang="ts">
	import Seo from '$lib/seo/Seo.svelte';
	import { STATIC_PAGES, SITE } from '$lib/seo/site';
	import { breadcrumb, webapp, webpage } from '$lib/seo/ld';
	const page = STATIC_PAGES.find((p) => p.path === '/pricing/')!;
</script>

<Seo title={page.title} description={page.description} path={page.path} jsonld={[webpage(page), webapp(), breadcrumb([{ name: 'Home', path: '/' }, { name: 'Pricing', path: page.path }])]} />

<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><span>Pricing</span></nav>
<h1>Free to start. {SITE.price} once to unlock.</h1>
<div class="prose"><p>No subscription, no account needed to start. Pay once and it is yours until you pass.</p></div>
<div class="plans">
	<section class="card">
		<h2>Free</h2>
		<p class="price">£0</p>
		<ul>
			<li>{SITE.free.questions} questions with the full miss-comes-back schedule</li>
			<li>{SITE.free.mocks} mock exam in the real format</li>
			<li>Reviews of questions you have seen, always free</li>
			<li>The revision map</li>
		</ul>
	</section>
	<section class="card on">
		<h2>Unlock</h2>
		<p class="price">{SITE.price} <span>one payment</span></p>
		<ul>
			<li>All {SITE.questions} questions</li>
			<li>Unlimited mock exams</li>
			<li>Readiness score and a plan around your test date</li>
			<li>Sync across devices when you sign in</li>
		</ul>
	</section>
</div>
<div class="prose">
	<p>Payment is by card through Stripe. You unlock from inside the app, in Account, when the free part is used up.</p>
</div>

<style>
	.plans { display: flex; flex-direction: column; gap: 12px; }
	.plans h2 { font-size: 20px; }
	.plans .on { box-shadow: inset 0 0 0 2px var(--blue); }
	.price { font-size: 30px; font-weight: 800; letter-spacing: -0.03em; margin: 6px 0 8px; }
	.price span { font-size: 14px; font-weight: 500; color: var(--muted); letter-spacing: 0; }
	.plans ul { margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.5; color: var(--ink2); }
</style>
