// One registry for everything a crawler sees: site identity, the public pages, and the test facts
// the guide, FAQ, llms.txt and JSON-LD all quote. Change a fact here and every surface follows.
import { MAP, TOPICS, QUESTIONS, type MapSection } from '$lib/content';
import { EXAM_PASS, EXAM_QUESTIONS, EXAM_MINUTES } from '$lib/engine/readiness';
import { FREE_QUESTIONS, FREE_MOCKS, PRICE } from '$lib/engine/gate';

export const SITE = {
	name: 'Until It Sticks',
	url: 'https://untilitsticks.com',
	tagline: 'Life in the UK test practice that repeats what you miss until it sticks',
	description:
		"Pass your Life in the UK test. Every question you miss comes back until it sticks — with real mock exams, a readiness score that tells you when you're ready, and the revision map one tap from every wrong answer. Practise as much as you like, no daily limit.",
	locale: 'en_GB',
	twitter: undefined as string | undefined,
	ogImage: '/og.png',
	questions: QUESTIONS.length,
	free: { questions: FREE_QUESTIONS, mocks: FREE_MOCKS },
	price: PRICE,
	priceNumber: PRICE.replace(/[^0-9.]/g, '')
};

/** The official test, as published on GOV.UK. */
export const TEST = {
	questions: EXAM_QUESTIONS,
	minutes: EXAM_MINUTES,
	pass: EXAM_PASS,
	passPercent: Math.round((100 * EXAM_PASS) / EXAM_QUESTIONS),
	fee: '£50',
	handbook: 'Life in the United Kingdom: A Guide for New Residents (3rd edition)',
	bookUrl: 'https://www.gov.uk/life-in-the-uk-test',
	ageFrom: 18,
	ageTo: 64,
	rebookDays: 7,
	bookAheadDays: 3
};

export const TOPIC_SLUGS = ['values', 'uk-and-geography', 'history', 'government', 'law', 'culture-and-sport'];
export const topicIndex = (slug: string) => TOPIC_SLUGS.indexOf(slug);
export const topicSlug = (t: number) => TOPIC_SLUGS[t];

/** Sample questions published per topic. Enough to answer "what does the test ask", not the bank. */
export const SAMPLE_PER_TOPIC = 12;
export const samples = (t: number) => {
	const all = QUESTIONS.filter((q) => q.t === t);
	return all.slice(0, Math.min(SAMPLE_PER_TOPIC, Math.floor(all.length / 2)));
};

export type Page = { path: string; title: string; description: string; priority?: number };

export const sectionPage = (s: MapSection): Page => ({
	path: `/revise/${s.id}/`,
	title: `${s.title} — Life in the UK revision notes`,
	description: `${s.note} ${s.cards.length} revision cards with the facts the Life in the UK test asks about ${s.title.toLowerCase()}.`
});
export const topicPage = (t: number): Page => ({
	path: `/questions/${topicSlug(t)}/`,
	title: `${TOPICS[t]} — Life in the UK practice questions`,
	description: `${samples(t).length} free Life in the UK test practice questions on ${TOPICS[t].toLowerCase()}, with the answers and the reason behind each one.`
});

export const STATIC_PAGES: Page[] = [
	{ path: '/', title: 'Until It Sticks — Life in the UK test practice', description: SITE.description, priority: 1 },
	{
		path: '/life-in-the-uk-test/',
		title: 'The Life in the UK test: format, pass mark, cost and how to book',
		description: `Everything about the Life in the UK test in one page: ${TEST.questions} questions in ${TEST.minutes} minutes, pass at ${TEST.pass} (${TEST.passPercent}%), the ${TEST.fee} fee, who must take it, what to bring and how to book on GOV.UK.`,
		priority: 0.9
	},
	{ path: '/questions/', title: 'Free Life in the UK test practice questions by topic', description: `Free practice questions for the Life in the UK test, grouped by the six topics the test covers, each with the answer and an explanation.`, priority: 0.9 },
	{ path: '/revise/', title: 'Life in the UK revision notes: the map of the handbook', description: `The Life in the UK handbook cut down to the facts the test asks: ${MAP.reduce((n, s) => n + s.cards.length, 0)} revision cards across ${MAP.length} sections, with the numbers and true/false traps.`, priority: 0.9 },
	{ path: '/faq/', title: 'Life in the UK test FAQ', description: 'Short answers to the questions people ask before the Life in the UK test: pass mark, cost, retakes, exemptions, what to bring, and how Until It Sticks helps.', priority: 0.7 },
	{ path: '/pricing/', title: 'Pricing — free to start, one payment to unlock', description: `Until It Sticks is free for ${FREE_QUESTIONS} questions and ${FREE_MOCKS} mock exam. One payment of ${PRICE} unlocks all ${QUESTIONS.length} questions and unlimited mocks. No subscription.`, priority: 0.6 }
];

export const ALL_PAGES: Page[] = [...STATIC_PAGES, ...MAP.map(sectionPage), ...TOPICS.map((_, t) => topicPage(t))];

export const FAQ: { q: string; a: string }[] = [
	{ q: 'How many questions are in the Life in the UK test?', a: `${TEST.questions} multiple-choice questions. You have ${TEST.minutes} minutes.` },
	{ q: 'What is the pass mark for the Life in the UK test?', a: `${TEST.passPercent}%. You must answer at least ${TEST.pass} of the ${TEST.questions} questions correctly.` },
	{ q: 'How much does the Life in the UK test cost?', a: `${TEST.fee} per attempt, paid when you book on GOV.UK. If you fail you pay again to rebook.` },
	{ q: 'Who has to take the Life in the UK test?', a: `Anyone applying for indefinite leave to remain (settlement) or British citizenship who is aged ${TEST.ageFrom} to ${TEST.ageTo}. People under ${TEST.ageFrom}, people aged 65 or over, and people with a long-term physical or mental condition confirmed by a doctor are exempt.` },
	{ q: 'How do I book the Life in the UK test?', a: `Book online at ${TEST.bookUrl}. You must book at least ${TEST.bookAheadDays} days ahead, choose one of the test centres in the UK, and bring the same photo ID you used to book.` },
	{ q: 'What happens if I fail the Life in the UK test?', a: `You can take the test again. You must wait ${TEST.rebookDays} days before rebooking and pay the fee again. There is no limit on attempts.` },
	{ q: 'Does the Life in the UK test pass result expire?', a: 'No. Once you pass, the result is valid for any later settlement or citizenship application.' },
	{ q: 'What is the test based on?', a: `The official handbook "${TEST.handbook}". Every question comes from that book: values and principles, what the UK is, its history, society and culture, and government, law and your role.` },
	{ q: 'How is Until It Sticks different from other Life in the UK apps?', a: 'Most apps show you the whole bank and hope. Until It Sticks asks every question you get wrong again, spaced out, until you answer it right from memory. No daily limit — practise as much as you like — plus real-format mock exams, a readiness score, and a revision map one tap from every wrong answer.' },
	{ q: 'Is there a daily limit?', a: 'No. Practise as little or as much as you want — a handful of questions or the whole bank in one sitting. The app just makes sure anything you get wrong comes back, spaced out, until it sticks.' },
	{ q: 'What does "Sticky" mean?', a: `A question is Sticky once you have answered it right from memory across spaced repeats — it has stuck. The goal is to make all ${QUESTIONS.length} questions Sticky.` },
	{ q: 'How does the readiness score work?', a: "It is the share of the whole question bank you have locked into memory, weighted by how well you recall each question. It climbs as questions become Sticky and tells you plainly whether you're ready, almost ready, or should keep training." },
	{ q: 'How much does Until It Sticks cost?', a: `Free for the first ${FREE_QUESTIONS} questions and ${FREE_MOCKS} mock exam. One payment of ${PRICE} unlocks all ${QUESTIONS.length} questions and unlimited mocks. No subscription.` },
	{ q: 'Does Until It Sticks work offline?', a: 'Yes. It is a web app you can add to your home screen. Your progress is saved on the device, and syncs to your account when you sign in.' }
];

export const HOW_IT_WORKS = [
	{ n: '1', t: 'Answer as many as you want', d: `No daily limit — do a handful or the whole bank in one sitting. Each question is built from what you can recall right now, and a wrong answer comes back 8–12 cards later in the same session.` },
	{ n: '2', t: 'Misses come back until they stick', d: 'Right again the same session, then the next day, then three days later. Answer it right from memory enough times and it turns Sticky. You spend time only on what you do not know yet.' },
	{ n: '3', t: 'Learn the fact, not the letter', d: 'Every question links to its place in the handbook. One tap from a wrong answer opens the revision card, so you learn why.' },
	{ n: '4', t: 'Know when you are ready', d: `Sit real mock exams in the exact format: ${TEST.questions} questions, ${TEST.minutes} minutes, pass at ${TEST.pass}. Your readiness score is the share of the whole bank you have made Sticky — it tells you when you are ready.` }
];
