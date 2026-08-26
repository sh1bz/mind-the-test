// Exam readiness: the real Life in the UK test is 24 questions, 45 minutes, pass mark 18 (75%).
import type { ItemState } from './scheduler';
import { recall } from './scheduler';

export const EXAM_QUESTIONS = 24;
export const EXAM_PASS = 18;
export const EXAM_MINUTES = 45;

/** Probability of at least `k` successes in `n` trials with per-trial probability `p` (binomial). */
export function atLeast(n: number, k: number, p: number): number {
	let total = 0;
	for (let i = k; i <= n; i++) total += choose(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
	return total;
}
function choose(n: number, k: number) { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; }

export type Readiness = { recall: number; passProb: number; expectedScore: number };

/** Mean recall across the bank at time `at`, and the chance of passing a 24-question test drawn from it. */
export function readiness(states: ItemState[], at: number): Readiness {
	if (!states.length) return { recall: 0, passProb: 0, expectedScore: 0 };
	const mean = states.reduce((a, s) => a + recall(s, at), 0) / states.length;
	return { recall: mean, passProb: atLeast(EXAM_QUESTIONS, EXAM_PASS, mean), expectedScore: mean * EXAM_QUESTIONS };
}

/** How many new questions per day to see everything before the exam (default 20 with no date). */
export function newPerDay(unseen: number, examAt: number | undefined, now: number): number {
	if (!examAt) return 20;
	const days = Math.max(1, Math.ceil((examAt - now) / 86_400_000) - 1);
	return Math.min(60, Math.max(5, Math.ceil(unseen / days)));
}

/** Pick a 24-question mock: at least two per topic, the rest weighted like the bank, unseen/weak first. */
export function pickMock<T extends { id: string; t: number }>(bank: T[], state: (id: string) => ItemState, rand: () => number, at: number): T[] {
	const byTopic = new Map<number, T[]>();
	for (const q of bank) { const a = byTopic.get(q.t) ?? []; a.push(q); byTopic.set(q.t, a); }
	const weight = (q: T) => 1.2 - recall(state(q.id), at); // less-known questions are slightly more likely
	const draw = (pool: T[], n: number, taken: Set<string>) => {
		const out: T[] = [];
		let cand = pool.filter((q) => !taken.has(q.id));
		while (out.length < n && cand.length) {
			const total = cand.reduce((a, q) => a + weight(q), 0);
			let r = rand() * total; let pick = cand[cand.length - 1];
			for (const q of cand) { r -= weight(q); if (r <= 0) { pick = q; break; } }
			out.push(pick); taken.add(pick.id); cand = cand.filter((q) => q !== pick);
		}
		return out;
	};
	const taken = new Set<string>();
	const chosen: T[] = [];
	for (const pool of byTopic.values()) chosen.push(...draw(pool, Math.min(2, pool.length), taken));
	chosen.push(...draw(bank, EXAM_QUESTIONS - chosen.length, taken));
	return chosen.slice(0, EXAM_QUESTIONS);
}
