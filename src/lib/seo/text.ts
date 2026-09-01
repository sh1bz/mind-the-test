// Plain-text renderings for sitemap.xml, llms.txt and llms-full.txt.
import { MAP, TOPICS, type MapCard } from '$lib/content';
import { ALL_PAGES, STATIC_PAGES, SITE, TEST, FAQ, HOW_IT_WORKS, samples, topicPage, sectionPage } from './site';

const strip = (h: string) => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export const sitemap = (lastmod: string) =>
	`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
	ALL_PAGES.map((p) => `  <url><loc>${SITE.url}${p.path}</loc><lastmod>${lastmod}</lastmod><priority>${p.priority ?? 0.8}</priority></url>`).join('\n') +
	`\n</urlset>\n`;

export const llms = () =>
	`# ${SITE.name}

> ${SITE.tagline}. ${SITE.description}

${SITE.name} is a web app at ${SITE.url}/ for the Life in the UK test, the knowledge test for UK settlement and citizenship. It has ${SITE.questions} practice questions, a revision map of the official handbook, and mock exams in the real format (${TEST.questions} questions, ${TEST.minutes} minutes, pass at ${TEST.pass}). Every question the learner misses is asked again, spaced out, until it is answered right from memory. ${SITE.beta ? `Free while in beta — everything included, no subscription.` : `Free for ${SITE.free.questions} questions and ${SITE.free.mocks} mock; ${SITE.price} once unlocks everything, no subscription.`}

## Pages

${STATIC_PAGES.map((p) => `- [${p.title}](${SITE.url}${p.path}): ${p.description}`).join('\n')}

## Practice questions by topic

${TOPICS.map((_, t) => topicPage(t)).map((p) => `- [${p.title}](${SITE.url}${p.path})`).join('\n')}

## Revision notes by section

${MAP.map(sectionPage).map((p) => `- [${p.title}](${SITE.url}${p.path})`).join('\n')}

## Optional

- [Full text of the site](${SITE.url}/llms-full.txt): the guide, the FAQ, every revision card and every published practice question in one file.
- [Official booking page on GOV.UK](${TEST.bookUrl})
`;

const cardText = (c: MapCard): string => {
	if (c.kind === 'table') return [`| ${(c.head ?? []).map(strip).join(' | ')} |`, `| ${(c.head ?? []).map(() => '---').join(' | ')} |`, ...(c.rows ?? []).map((r) => `| ${r.map(strip).join(' | ')} |`)].join('\n');
	if (c.kind === 'numbers') return c.items.map((it) => `- ${it.n}: ${strip(it.label ?? '')}`).join('\n');
	if (c.kind === 'rail') return c.items.map((it) => `- ${it.yr}: ${strip(it.html ?? it.text)}`).join('\n');
	return c.items.map((it) => `- ${strip(it.html ?? it.text)}`).join('\n');
};

export const llmsFull = () => {
	const out: string[] = [];
	out.push(`# ${SITE.name} — full text\n\n> ${SITE.tagline}.\n\nSource: ${SITE.url}/ · Official test information: ${TEST.bookUrl}\n`);
	out.push(`## The Life in the UK test\n\n- ${TEST.questions} multiple-choice questions in ${TEST.minutes} minutes.\n- Pass mark ${TEST.passPercent}%: at least ${TEST.pass} correct.\n- Fee ${TEST.fee} per attempt, booked on GOV.UK at least ${TEST.bookAheadDays} days ahead; bring the same photo ID you booked with.\n- Required for settlement (indefinite leave to remain) and British citizenship, ages ${TEST.ageFrom} to ${TEST.ageTo}. Under ${TEST.ageFrom}, 65 or over, or a doctor-confirmed long-term condition: exempt.\n- Fail: rebook after ${TEST.rebookDays} days, pay again, no limit on attempts. A pass never expires.\n- Based on the handbook "${TEST.handbook}".\n\nFull page: ${SITE.url}/life-in-the-uk-test/\n`);
	out.push(`## How ${SITE.name} works\n\n${HOW_IT_WORKS.map((s) => `${s.n}. ${s.t}. ${s.d}`).join('\n')}\n\nPricing: ${SITE.beta ? `free while in beta — all ${SITE.questions} questions and unlimited mocks included` : `free for ${SITE.free.questions} questions and ${SITE.free.mocks} mock exam; ${SITE.price} once unlocks all ${SITE.questions} questions and unlimited mocks`}. ${SITE.url}/pricing/\n`);
	out.push(`## FAQ\n\n${FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')}\n`);
	out.push(`## Revision notes\n`);
	for (const s of MAP) {
		out.push(`### ${s.title}\n\n${s.note}\n\nPage: ${SITE.url}/revise/${s.id}/\n`);
		for (const c of s.cards) {
			out.push(`#### ${c.title}\n\n${cardText(c)}`);
			if (c.cues.length) out.push(c.cues.map((q) => `> ${strip(q)}`).join('\n'));
			out.push('');
		}
	}
	out.push(`## Practice questions\n`);
	TOPICS.forEach((name, t) => {
		out.push(`### ${name}\n\nPage: ${SITE.url}/questions/${topicPage(t).path.split('/')[2]}/\n`);
		for (const q of samples(t)) {
			out.push(`Q: ${q.q}\n${q.o.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}\nAnswer: ${q.c.map((i) => String.fromCharCode(65 + i)).join(' and ')} — ${q.c.map((i) => q.o[i]).join('; ')}\nWhy: ${q.e}\n`);
		}
	});
	return out.join('\n');
};
