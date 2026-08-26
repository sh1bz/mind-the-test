import { describe, expect, it } from 'vitest';
import { locked, FREE_QUESTIONS, FREE_MOCKS } from './gate';

const g = (answered: number, mocks: number, paid = false) => ({ answered, mocks, paid });

describe('gate', () => {
	it('everything is free before 50 questions and 1 mock', () => {
		expect(locked(g(0, 0), 'session')).toBe(false);
		expect(locked(g(FREE_QUESTIONS - 1, 0), 'session')).toBe(false);
		expect(locked(g(0, FREE_MOCKS - 1), 'mock')).toBe(false);
	});
	it('locks new sessions at 50 answered and mocks after the first', () => {
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
});
