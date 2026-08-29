// The free tier: 25 answered questions and 1 mock. Reviews of seen questions are always free.
export const FREE_QUESTIONS = 25;
export const FREE_MOCKS = 1;
export const PRICE = '£4.99';
export type Gate = { answered: number; mocks: number; paid: boolean };
export type Want = 'session' | 'mock' | 'review';

/** True when the learner must pay before `want` can start. */
export function locked(g: Gate, want: Want): boolean {
	if (g.paid || want === 'review') return false;
	if (want === 'mock') return g.mocks >= FREE_MOCKS;
	return g.answered >= FREE_QUESTIONS;
}
/** The free part is used up for sessions, mocks, or both. */
export const freeUsed = (g: Gate) => ({ questions: Math.min(g.answered, FREE_QUESTIONS), mocks: Math.min(g.mocks, FREE_MOCKS) });
