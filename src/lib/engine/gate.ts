// The free tier: 25 answered questions and 1 mock. Reviews of seen questions are always free.
import { PUBLIC_FREE_BETA } from '$env/static/public';

export const FREE_QUESTIONS = 25;
export const FREE_MOCKS = 1;
export const PRICE = '£4.99';
/** Everything is free while we learn whether people come back. Unset PUBLIC_FREE_BETA to restore the gate. */
export const FREE_BETA = PUBLIC_FREE_BETA === '1';
export type Gate = { answered: number; mocks: number; paid: boolean };
export type Want = 'session' | 'mock' | 'review';

/** True when the learner must pay before `want` can start. */
export function locked(g: Gate, want: Want, beta = FREE_BETA): boolean {
	if (beta || g.paid || want === 'review') return false;
	if (want === 'mock') return g.mocks >= FREE_MOCKS;
	return g.answered >= FREE_QUESTIONS;
}
/** The free part is used up for sessions, mocks, or both. */
export const freeUsed = (g: Gate) => ({ questions: Math.min(g.answered, FREE_QUESTIONS), mocks: Math.min(g.mocks, FREE_MOCKS) });
