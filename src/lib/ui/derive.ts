// Pure helpers the screens share: plan counts, topic stats, dates, milestones.
import { QUESTIONS, TOPICS, BY_ID, type Question } from '$lib/content';
import { isDue, isKnown, isNew, isWeak, isSlipping, isAlmostStuck, type ItemState, DAY } from '$lib/engine/scheduler';
const HOUR = 3_600_000;
import { newPerDay, readiness, EXAM_PASS } from '$lib/engine/readiness';
import type { Progress } from '$lib/store/progress';

export type StateOf = (id: string) => ItemState;

export const pool = (topic: number | null) => (topic === null ? QUESTIONS : QUESTIONS.filter((q) => q.t === topic));

export function plan(p: Progress, state: StateOf, now: number, topic: number | null = null) {
	const qs = pool(topic);
	let due = 0, unseen = 0, weak = 0, soon = 0, soonAt = Infinity;
	for (const q of qs) {
		const s = state(q.id);
		if (isDue(s, now)) due++; if (isNew(s)) unseen++; if (isWeak(s)) weak++;
		// Misses come back in minutes: count them so a fresh session does not read as "0 to review".
		if (s.seen > 0 && s.due > now && s.due <= now + HOUR) { soon++; soonAt = Math.min(soonAt, s.due); }
	}
	const exam = p.exam ? Date.parse(p.exam + 'T09:00:00') : undefined;
	const fresh = Math.min(unseen, newPerDay(unseen, exam && exam > now ? exam : undefined, now));
	const minutes = Math.max(1, Math.round(((due + fresh) * 25) / 60));
	return { due, fresh, weak, unseen, minutes, soon, soonAt };
}

export function topicStats(state: StateOf) {
	return TOPICS.map((name, t) => {
		const qs = QUESTIONS.filter((q) => q.t === t);
		const known = qs.filter((q) => isKnown(state(q.id))).length;
		return { t, name, known, total: qs.length };
	});
}

export const known = (state: StateOf) => QUESTIONS.filter((q) => isKnown(state(q.id))).length;
/** Mastered — locked in. */
export const stuck = known;
export const answered = (state: StateOf) => QUESTIONS.filter((q) => !isNew(state(q.id))).length;
/** How many questions sit in each state of the loop. Every question lands in exactly one bucket. */
export function stateCounts(state: StateOf) {
	let stuck = 0, almost = 0, learn = 0, slip = 0, unseen = 0;
	for (const q of QUESTIONS) {
		const s = state(q.id);
		if (isNew(s)) unseen++;
		else if (isKnown(s)) stuck++;
		else if (isSlipping(s)) slip++;
		else if (isAlmostStuck(s)) almost++;
		else learn++;
	}
	return { stuck, almost, learn, slip, unseen, answered: QUESTIONS.length - unseen, total: QUESTIONS.length };
}
/** The ids of everything currently slipping — a one-tap session to catch them. */
export const slippingIds = (state: StateOf, topic: number | null = null) =>
	pool(topic).filter((q) => isSlipping(state(q.id))).map((q) => q.id);
/** A plain-English call on test-day chance. */
export function verdict(passProb: number): { label: string; tone: string } {
	if (passProb >= 0.8) return { label: "You're ready", tone: 'var(--green)' };
	if (passProb >= 0.55) return { label: 'Almost ready', tone: 'var(--orange)' };
	return { label: 'Keep training', tone: 'var(--red)' };
}
/** Seen at least once but not yet known. */
export const learning = (state: StateOf) => QUESTIONS.filter((q) => { const s = state(q.id); return !isNew(s) && !isKnown(s); }).length;
export const ready = (state: StateOf, now: number) => readiness(QUESTIONS.map((q) => state(q.id)), now);

const midnight = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
// Whole calendar days until the exam (today = 0), so the count does not change at 9am.
export const daysLeft = (exam: number | undefined, now: number) => (exam ? Math.round((midnight(exam) - midnight(now)) / DAY) : undefined);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (m: number) => MONTHS[m];
export const fmtDay = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`; };
export const fmtLong = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
export const isoDate = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export const fmtIn = (ms: number) => {
	if (ms <= 0) return 'now';
	const m = Math.round(ms / 60_000); if (m < 60) return `${m} min`;
	const h = Math.round(ms / 3_600_000); if (h < 36) return `${h} h`;
	return `${Math.round(ms / DAY)} d`;
};
export const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Badge for a question row: when it comes back, or known. */
export function dueBadge(s: ItemState, now: number): { text: string; cls: string } {
	if (isNew(s)) return { text: 'new', cls: '' };
	if (isSlipping(s)) return { text: 'slipping', cls: 'w' };
	if (isKnown(s)) return { text: 'stuck', cls: 'k' };
	if (isAlmostStuck(s)) return { text: 'almost', cls: '' };
	if (s.due <= now) return { text: 'due', cls: '' };
	return { text: fmtIn(s.due - now), cls: '' };
}

export const correctText = (q: Question) => q.c.map((i) => q.o[i]).join(' · ');

/** Milestones on the learner's line, in order. */
export type Milestone = { id: string; label: string; state: 'done' | 'next' | 'todo'; when?: string };
export function milestones(p: Progress, state: StateOf, now: number): Milestone[] {
	const k = known(state);
	const r = ready(state, now);
	const passed = p.mocks.filter((m) => m.score >= EXAM_PASS);
	const lastThree = p.mocks.slice(-3);
	const firstDay = Object.keys(p.days).sort()[0];
	const defs: { id: string; label: string; hit: boolean }[] = [
		{ id: 'first', label: 'First session', hit: !!firstDay },
		{ id: 'k100', label: '100 known', hit: k >= 100 },
		{ id: 'mock1', label: passed.length ? `First mock passed · ${passed[0].score}/${passed[0].total}` : 'First mock passed', hit: passed.length > 0 },
		{ id: 'k200', label: '200 known', hit: k >= 200 },
		{ id: 'p80', label: 'Ready to pass', hit: r.passProb >= 0.8 },
		{ id: 'mock3', label: 'Three mocks passed in a row', hit: lastThree.length === 3 && lastThree.every((m) => m.score >= EXAM_PASS) },
		{ id: 'k300', label: '300 known', hit: k >= 300 }
	];
	let nextSet = false;
	const out: Milestone[] = defs.map((d) => {
		if (d.hit) {
			const at = d.id === 'first' && firstDay ? Date.parse(firstDay + 'T12:00:00') : d.id === 'mock1' ? passed[0]?.at : p.ms[d.id];
			return { id: d.id, label: d.label, state: 'done', when: at ? fmtDay(at) : undefined };
		}
		if (!nextSet) { nextSet = true; return { id: d.id, label: d.label, state: 'next' }; }
		return { id: d.id, label: d.label, state: 'todo' };
	});
	out.push({ id: 'exam', label: 'Test day', state: 'todo', when: p.exam ? fmtLong(p.exam).replace(/ \d{4}$/, '') : '—' });
	return out;
}

/** Record newly reached milestones (called after a session or mock). Returns the ids that were just reached. */
export function stampMilestones(p: Progress, state: StateOf, now: number): string[] {
	const hit: string[] = [];
	for (const m of milestones(p, state, now)) if (m.state === 'done' && !p.ms[m.id] && m.id !== 'first' && m.id !== 'mock1' && m.id !== 'exam') { p.ms[m.id] = now; hit.push(m.id); }
	return hit;
}

/** Shuffle a question's options with a stable order for this presentation; returns display index → original index. */
export function optionOrder(q: Question, rand: () => number): number[] {
	const idx = q.o.map((_, i) => i);
	for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
	return idx;
}

export const questionById = (id: string) => BY_ID[id];
