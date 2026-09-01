import { describe, expect, it } from 'vitest';
import { locked as lockedBeta, FREE_QUESTIONS, FREE_MOCKS, type Gate, type Want } from './gate';

// The pure gate, with the beta switch pinned off so these tests hold whatever .env says.
const locked = (g: Gate, want: Want) => lockedBeta(g, want, false);

const g = (answered: number, mocks: number, paid = false) => ({ answered, mocks, paid });

describe('gate', () => {
	it('everything is free before 25 questions and 1 mock', () => {
		expect(locked(g(0, 0), 'session')).toBe(false);
		expect(locked(g(FREE_QUESTIONS - 1, 0), 'session')).toBe(false);
		expect(locked(g(0, FREE_MOCKS - 1), 'mock')).toBe(false);
	});
	it('locks new sessions at 25 answered and mocks after the first', () => {
		expect(locked(g(FREE_QUESTIONS, 0), 'session')).toBe(true);
		expect(locked(g(0, FREE_MOCKS), 'mock')).toBe(true);
	});
	it('sessions and mocks lock independently', () => {
		expect(locked(g(FREE_QUESTIONS, 0), 'mock')).toBe(false);
		expect(locked(g(0, FREE_MOCKS), 'session')).toBe(false);
	});
	it('reviews stay free after the gate', () => {
		expect(locked(g(400, 9), 'review')).toBe(false);
	});
	it('paid unlocks all', () => {
		expect(locked(g(400, 9, true), 'session')).toBe(false);
		expect(locked(g(400, 9, true), 'mock')).toBe(false);
	});

	it('free beta unlocks everything', () => {
		expect(lockedBeta(g(400, 9), 'session', true)).toBe(false);
		expect(lockedBeta(g(400, 9), 'mock', true)).toBe(false);
	});
});
