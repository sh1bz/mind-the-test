// JSON-LD builders. Every id is an absolute URL so the graph links across pages.
import { SITE, TEST, FAQ } from './site';
import type { Question } from '$lib/content';

const id = (p: string) => SITE.url + p;

export const organization = () => ({
	'@type': 'Organization',
	'@id': id('/#organization'),
	name: SITE.name,
	url: SITE.url + '/',
	logo: { '@type': 'ImageObject', url: id('/icon-512.png'), width: 512, height: 512 }
});

export const website = () => ({
	'@type': 'WebSite',
	'@id': id('/#website'),
	name: SITE.name,
	url: SITE.url + '/',
	description: SITE.description,
	inLanguage: 'en-GB',
	publisher: { '@id': id('/#organization') }
});

export const webapp = () => ({
	'@type': ['WebApplication', 'SoftwareApplication'],
	'@id': id('/#app'),
	name: SITE.name,
	url: SITE.url + '/',
	description: SITE.description,
	applicationCategory: 'EducationalApplication',
	operatingSystem: 'Any',
	browserRequirements: 'Requires JavaScript',
	inLanguage: 'en-GB',
	isAccessibleForFree: true,
	offers: [
		{ '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'GBP', description: `${SITE.free.questions} questions and ${SITE.free.mocks} mock exam` },
		{ '@type': 'Offer', name: 'Unlock', price: SITE.priceNumber, priceCurrency: 'GBP', description: `All ${SITE.questions} questions and unlimited mock exams, one payment`, url: id('/pricing/') }
	],
	about: { '@type': 'Thing', name: 'Life in the UK test', sameAs: TEST.bookUrl },
	publisher: { '@id': id('/#organization') }
});

export const breadcrumb = (trail: { name: string; path: string }[]) => ({
	'@type': 'BreadcrumbList',
	itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: id(t.path) }))
});

export const webpage = (p: { path: string; title: string; description: string }) => ({
	'@type': 'WebPage',
	'@id': id(p.path),
	url: id(p.path),
	name: p.title,
	description: p.description,
	inLanguage: 'en-GB',
	isPartOf: { '@id': id('/#website') },
	about: { '@type': 'Thing', name: 'Life in the UK test', sameAs: TEST.bookUrl }
});

export const article = (p: { path: string; title: string; description: string }, updated: string) => ({
	'@type': 'Article',
	'@id': id(p.path + '#article'),
	headline: p.title,
	description: p.description,
	mainEntityOfPage: id(p.path),
	inLanguage: 'en-GB',
	dateModified: updated,
	author: { '@id': id('/#organization') },
	publisher: { '@id': id('/#organization') },
	image: id(SITE.ogImage),
	about: { '@type': 'Thing', name: 'Life in the UK test', sameAs: TEST.bookUrl }
});

export const faqPage = (items: { q: string; a: string }[] = FAQ) => ({
	'@type': 'FAQPage',
	mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
});

/** Google's "practice problems" shape: a Quiz whose parts are multiple-choice Questions. */
export const quiz = (name: string, topic: string, path: string, qs: Question[]) => ({
	'@type': 'Quiz',
	'@id': id(path + '#quiz'),
	name,
	about: { '@type': 'Thing', name: topic },
	educationalLevel: 'beginner',
	assesses: `Life in the UK test: ${topic}`,
	educationalAlignment: [{ '@type': 'AlignmentObject', alignmentType: 'educationalSubject', targetName: 'Life in the UK test' }],
	hasPart: qs.map((q) => ({
		'@type': 'Question',
		eduQuestionType: 'Multiple choice',
		learningResourceType: 'Practice problem',
		name: q.q,
		text: q.q,
		suggestedAnswer: q.o.map((o, i) => ({ '@type': 'Answer', position: i, text: o })).filter((_, i) => !q.c.includes(i)),
		acceptedAnswer: q.c.map((i) => ({ '@type': 'Answer', position: i, text: q.o[i], comment: { '@type': 'Comment', text: q.e } }))
	}))
});
