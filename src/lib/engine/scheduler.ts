// Spaced-repetition scheduler: SM-2 ease + interval, a 0.9 retention forgetting curve,
// and an optional exam date that compresses intervals so nothing is due after the test.

export type ItemState = {
	reps: number; // consecutive correct reviews since the last lapse
	lapses: number; // total wrong answers
	ease: number; // SM-2 ease factor, 1.3 .. 3.0
	ivl: number; // current interval in days (0 = relearning)
	due: number; // ms timestamp
	last: number; // ms timestamp of last answer (0 = never)
	seen: number; // total answers
	flag: 0 | 1;
};

export const DAY = 86_400_000;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const RELEARN_MS = 10 * 60_000; // wrong answer: due again in 10 minutes
export const FIRST_IVL = 1; // first correct answer: 1 day
export const SECOND_IVL = 3;
export const KNOWN_IVL = 7; // interval at which a question counts as "known"

export const fresh = (): ItemState => ({ reps: 0, lapses: 0, ease: 2.5, ivl: 0, due: 0, last: 0, seen: 0, flag: 0 });

export const isNew = (s: ItemState) => s.seen === 0;
// Known = a week-long interval, or three correct reviews in a row (the exam cap can keep intervals short).
export const isKnown = (s: ItemState) => s.ivl >= KNOWN_IVL || s.reps >= 3;
export const isDue = (s: ItemState, now: number) => s.seen > 0 && s.due <= now;
export const isWeak = (s: ItemState) => s.lapses >= 2 && !isKnown(s);

/** Probability the answer is still recalled at time `at` (0.9 at exactly one interval). */
export function recall(s: ItemState, at: number): number {
	if (s.seen === 0) return 0.3; // guess rate on a 4-option question, slightly generous
	if (s.ivl === 0) return 0.45; // in relearning
	const elapsed = Math.max(0, at - s.last) / DAY;
	return Math.pow(0.9, elapsed / s.ivl);
}

/** Apply a first-try answer. `exam` (ms) caps the interval so the review lands before the test. */
export function grade(s: ItemState, correct: boolean, now: number, exam?: number, rand: () => number = Math.random): ItemState {
	const n = { ...s, seen: s.seen + 1, last: now };
	if (!correct) {
		n.lapses++;
		n.reps = 0;
		n.ease = Math.max(MIN_EASE, n.ease - 0.2);
		n.ivl = 0;
		n.due = now + RELEARN_MS;
		return n;
	}
	n.reps++;
	if (n.reps === 1) n.ivl = FIRST_IVL;
	else if (n.reps === 2) n.ivl = SECOND_IVL;
	else {
		// Credit the real gap: a question still remembered after being overdue earns a longer interval.
		const elapsed = s.last ? (now - s.last) / DAY : 0;
		n.ivl = Math.round(Math.max(n.ivl, elapsed) * n.ease);
	}
	n.ease = Math.min(MAX_EASE, n.ease + 0.05);
	// ±5% fuzz so questions learned together do not all fall due on the same day.
	if (n.ivl >= 3) n.ivl = Math.max(1, Math.round(n.ivl * (0.95 + 0.1 * rand())));
	if (exam && exam > now) {
		const daysLeft = Math.max(1, Math.floor((exam - now) / DAY));
		// Never schedule past the day before the exam; keep at least one more pass inside the window.
		n.ivl = Math.max(1, Math.min(n.ivl, Math.max(1, Math.floor(daysLeft / 2))));
	}
	n.due = now + n.ivl * DAY;
	return n;
}

/** Legacy trainer zones (lifeuk-trainer-v1: b 0..5) → ItemState. */
/** In-session recovery: a missed question answered correctly on both re-asks graduates from
 *  "10 minutes" to a 1-day interval, so the session's work counts. Ease is unchanged. */
export function relearn(s: ItemState, now: number, exam?: number): ItemState {
	if (s.seen === 0 || s.ivl !== 0 || s.reps !== 0) return s;
	const ivl = exam && exam > now ? Math.max(1, Math.min(FIRST_IVL, Math.floor((exam - now) / DAY / 2))) : FIRST_IVL;
	return { ...s, reps: 1, ivl, last: now, due: now + ivl * DAY };
}

export function fromLegacy(l: { b: number; due: number; s: number; w: number; f?: number }, now: number): ItemState {
	const ivl = [0, 0, 1, 3, 7, 14][Math.min(5, Math.max(0, l.b))];
	const reps = l.b >= 2 ? l.b - 1 : 0;
	return {
		reps, lapses: l.w, ease: Math.max(MIN_EASE, 2.5 - 0.2 * l.w), ivl,
		due: l.due || now, last: l.due ? l.due - ivl * DAY : now, seen: l.s, flag: l.f ? 1 : 0
	};
}
