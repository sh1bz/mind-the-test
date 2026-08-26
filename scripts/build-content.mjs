// Builds src/lib/content/{questions,map}.json from the two source pages in scripts/source.
// Run: npm run content
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from 'node-html-parser';

const OUT = 'src/lib/content';
mkdirSync(OUT, { recursive: true });

// ---------- questions ----------
const trainer = readFileSync('scripts/source/trainer.html', 'utf8');
const raw = JSON.parse(trainer.match(/const DATA = (\[.*?\]);\n/s)[1]);
const seen = new Map();
const questions = [];
for (const q of raw) {
	const key = q.q.trim().toLowerCase();
	if (seen.has(key)) continue;
	seen.set(key, true);
	questions.push({ id: `q${String(questions.length + 1).padStart(3, '0')}`, q: q.q.trim(), o: q.o, c: q.c, e: q.e.trim(), t: q.t });
}

// ---------- map ----------
const html = readFileSync('scripts/source/index.html', 'utf8');
const root = parse(html);
const SECTION_TOPIC = { values: 0, geo: 1, history: 2, gov: 3, law: 4, culture: 5, numbers: null, traps: null };
const inner = (el) => el.innerHTML.replace(/\s+/g, ' ').trim();
const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const slug = (s) => s.toLowerCase().replace(/&amp;/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const sections = [];
for (const sec of root.querySelectorAll('section')) {
	const id = sec.getAttribute('id');
	const title = text(sec.querySelector('h2'));
	const tab = sec.querySelector('.tab');
	const color = tab ? (tab.getAttribute('style') || '').match(/var\(--(\w+)\)/)?.[1] : 'ink';
	const note = sec.querySelector('.sec-note') ? inner(sec.querySelector('.sec-note')) : '';
	const cards = [];
	const pushCard = (c) => { c.id = `${id}.${slug(c.title)}`; cards.push(c); };

	for (const card of sec.querySelectorAll('.card')) {
		const t = text(card.querySelector('h3'));
		const items = card.querySelectorAll('ul > li').map((li) => ({ html: inner(li), text: text(li) }));
		const cues = card.querySelectorAll('.cue').map((c) => { c.querySelector('.tag')?.remove(); return inner(c); });
		pushCard({ title: t, kind: 'list', items, cues });
	}
	for (const era of sec.querySelectorAll('.era')) {
		const t = text(era.querySelector('.era-name'));
		const items = era.querySelectorAll('.stop').map((s) => {
			const yr = s.querySelector('.yr'); const y = yr ? text(yr) : ''; yr?.remove();
			return { yr: y, html: inner(s), text: text(s) };
		});
		const cues = era.querySelectorAll('.cue').map((c) => { c.querySelector('.tag')?.remove(); return inner(c); });
		pushCard({ title: t, kind: 'rail', items, cues });
	}
	const nums = sec.querySelectorAll('.num');
	if (nums.length) pushCard({ title: 'Numbers', kind: 'numbers', items: nums.map((n) => ({ n: text(n.querySelector('.n')), label: inner(n.querySelector('.l')), text: text(n) })), cues: [] });
	for (const tbl of sec.querySelectorAll('table')) {
		const t = tbl.querySelector('caption') ? text(tbl.querySelector('caption')) : 'Table';
		const head = tbl.querySelectorAll('thead th').map(text);
		const rows = tbl.querySelectorAll('tbody tr').map((tr) => tr.querySelectorAll('td').map(inner));
		pushCard({ title: t, kind: 'table', head, rows, items: rows.map((r) => ({ text: r.join(' ').replace(/<[^>]+>/g, '') })), cues: [] });
	}
	sections.push({ id, title, color, note, topic: SECTION_TOPIC[id] ?? null, cards });
}

// ---------- link every question to the best-matching card ----------
const STOP = new Set('the a an of in on and or to is was for by with which what who when where how many much did does are were from as at it its that this these those be been has have had not no yes uk british britain one two three four five following true false statement correct name'.split(' '));
const tok = (s) => (s.toLowerCase().replace(/[’']/g, '').match(/[a-z0-9]{3,}/g) || []).filter((w) => !STOP.has(w));
const cardIndex = [];
for (const s of sections) for (const c of s.cards) {
	const words = new Set(tok(c.title + ' ' + c.items.map((i) => i.text).join(' ')));
	cardIndex.push({ id: c.id, topic: s.topic, words, size: words.size });
}
let unlinked = 0;
for (const q of questions) {
	const qw = new Set(tok(q.q + ' ' + q.c.map((i) => q.o[i]).join(' ') + ' ' + q.e));
	let best = null, bestScore = 0;
	for (const c of cardIndex) {
		let hit = 0; for (const w of qw) if (c.words.has(w)) hit++;
		if (!hit) continue;
		let score = hit / Math.sqrt(c.size) * (c.topic === q.t ? 1.5 : c.topic === null ? 0.9 : 0.5);
		if (score > bestScore) { bestScore = score; best = c.id; }
	}
	if (best && bestScore >= 0.35) q.card = best; else unlinked++;
}

writeFileSync(`${OUT}/questions.json`, JSON.stringify(questions));
writeFileSync(`${OUT}/map.json`, JSON.stringify(sections));
console.log(`questions ${questions.length} (deduped from ${raw.length}), unlinked ${unlinked}; sections ${sections.length}, cards ${cardIndex.length}`);
