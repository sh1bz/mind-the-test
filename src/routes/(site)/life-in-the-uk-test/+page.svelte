<script lang="ts">
	import Seo from '$lib/seo/Seo.svelte';
	import { STATIC_PAGES, TEST, SITE } from '$lib/seo/site';
	import { article, breadcrumb, webpage } from '$lib/seo/ld';
	import { MAP, TOPICS } from '$lib/content';
	import { topicSlug } from '$lib/seo/site';
	const page = STATIC_PAGES.find((p) => p.path === '/life-in-the-uk-test/')!;
	const updated = '2026-08-27';
</script>

<Seo title={page.title} description={page.description} path={page.path} type="article" jsonld={[webpage(page), article(page, updated), breadcrumb([{ name: 'Home', path: '/' }, { name: 'The test', path: page.path }])]} />

<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><span>The test</span></nav>
<h1>The Life in the UK test: format, pass mark, cost and how to book</h1>
<article class="prose">
	<p>The Life in the UK test is the knowledge test you must pass to apply for <b>indefinite leave to remain</b> (settlement) or <b>British citizenship</b>. This page has the facts you need, in the order you need them.</p>

	<h2>The format</h2>
	<ul>
		<li><b>{TEST.questions} multiple-choice questions</b>, answered on a computer at a test centre.</li>
		<li><b>{TEST.minutes} minutes</b>. Most people finish in 15 to 20.</li>
		<li><b>Pass mark {TEST.passPercent}%</b>: at least {TEST.pass} of {TEST.questions} correct.</li>
		<li>Some questions have <b>two correct answers</b>. Some are <b>true or false</b>. Read each one twice.</li>
		<li>The questions are drawn at random from the official handbook, <i>{TEST.handbook}</i>. Nothing outside the book is asked.</li>
		<li>The test is in English. In Wales you can take it in Welsh; in Scotland, in Scottish Gaelic.</li>
		<li>You get the result at the centre, right after the test.</li>
	</ul>

	<h2>Who must take it</h2>
	<ul>
		<li>Applicants for settlement or citizenship aged <b>{TEST.ageFrom} to {TEST.ageTo}</b>.</li>
		<li>You are <b>exempt</b> if you are under {TEST.ageFrom}, aged 65 or over, or have a long-term physical or mental condition that a doctor confirms.</li>
		<li>You take it once. A pass does not expire, so a pass for settlement also counts for citizenship later.</li>
	</ul>

	<h2>Cost and booking</h2>
	<ul>
		<li>The fee is <b>{TEST.fee}</b> per attempt.</li>
		<li>Book online on <a href={TEST.bookUrl} rel="noopener">GOV.UK</a>, at least <b>{TEST.bookAheadDays} days</b> before the date you want. You choose from the test centres across the UK.</li>
		<li>You need an email address, a debit or credit card, and an accepted photo ID: a passport, a biometric residence permit or card, a UK photo driving licence, or a travel document.</li>
		<li>Bring the <b>same ID</b> you booked with. Without it you cannot sit the test and you lose the fee.</li>
		<li>Arrive early. You cannot bring notes, a phone or a bag into the test room.</li>
	</ul>

	<h2>If you fail</h2>
	<ul>
		<li>You can rebook after <b>{TEST.rebookDays} days</b>. You pay the fee again.</li>
		<li>There is no limit on attempts. The result letter tells you which sections to work on.</li>
	</ul>

	<h2>What the test covers</h2>
	<p>The handbook has five chapters. Questions come from all of them, but the weight is uneven: history is the biggest chapter and most of the dates, names and numbers come from it.</p>
	<ol>
		<li><b>The values and principles of the UK</b> — the fundamental principles of British life and your responsibilities as a resident.</li>
		<li><b>What is the UK?</b> — the four nations, Great Britain versus the UK, the Crown dependencies and overseas territories.</li>
		<li><b>A long and illustrious history</b> — from the Stone Age to today: Romans, the Middle Ages, the Tudors and Stuarts, the Industrial Revolution, the two world wars and post-war Britain.</li>
		<li><b>A modern, thriving society</b> — population, religion, festivals, sport, arts, and everyday culture.</li>
		<li><b>The UK government, the law and your role</b> — the monarchy, Parliament, elections, devolution, the courts and jury service, and how to take part in your community.</li>
	</ol>

	<h2>How to prepare</h2>
	<p>Read the handbook once, then spend your time on questions. What you can <b>recall</b> passes the test, not what you have read. Two things make the difference:</p>
	<ul>
		<li><b>Ask every question you get wrong again</b>, spaced out, until you answer it right from memory three times. That is the whole idea behind <a href="/">{SITE.name}</a>.</li>
		<li><b>Sit mock exams in the real format</b>: {TEST.questions} questions, {TEST.minutes} minutes, pass at {TEST.pass}. A mock a week tells you if you are ready.</li>
	</ul>
	<p>A plan around your test date means you never cram. With {SITE.questions} questions and a date a month away, that is about 15 new questions a day, 15 minutes.</p>

	<h2>Start here</h2>
	<ul>
		<li>Free practice questions by topic: {#each TOPICS as t, i (t)}<a href="/questions/{topicSlug(i)}/">{t}</a>{i < TOPICS.length - 1 ? ' · ' : ''}{/each}</li>
		<li>Revision notes: {#each MAP as s, i (s.id)}<a href="/revise/{s.id}/">{s.title}</a>{i < MAP.length - 1 ? ' · ' : ''}{/each}</li>
		<li><a href="/faq/">Frequently asked questions</a> · <a href="/pricing/">Pricing</a></li>
	</ul>
	<p class="muted small">Test rules and the fee are set by the Home Office. Check <a href={TEST.bookUrl} rel="noopener">GOV.UK</a> before you book. Last reviewed {updated}.</p>
</article>
