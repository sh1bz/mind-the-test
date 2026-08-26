import { describe, it, expect } from 'vitest';
import { atLeast, readiness, newPerDay, pickMock } from './readiness';
import { fresh, grade } from './scheduler';

const T0 = Date.UTC(2026, 7, 26, 9);
describe('readiness', () => {
	it('binomial pass probability', () => {
		expect(atLeast(24, 18, 1)).toBeCloseTo(1);
		expect(atLeast(24, 18, 0.3)).toBeLessThan(0.001);
		expect(atLeast(24, 18, 0.9)).toBeGreaterThan(0.98);
		expect(atLeast(24, 18, 0.75)).toBeCloseTo(0.58, 1);
	});
	it('untouched bank ≈ guess rate, mastered bank ≈ certain pass', () => {
		expect(readiness(Array(400).fill(fresh()), T0).passProb).toBeLessThan(0.001);
		let k = fresh(); for (let i = 0; i < 3; i++) k = grade(k, true, T0 - (8 - i * 3) * 86400000);
		const r = readiness(Array(400).fill(k), T0);
		expect(r.recall).toBeGreaterThan(0.9); expect(r.passProb).toBeGreaterThan(0.98);
	});
	it('new per day spreads unseen across the days left', () => {
		expect(newPerDay(400, undefined, T0)).toBe(20);
		expect(newPerDay(400, T0 + 21 * 86400000, T0)).toBe(20);
		expect(newPerDay(400, T0 + 3 * 86400000, T0)).toBe(60);
		expect(newPerDay(10, T0 + 30 * 86400000, T0)).toBe(5);
	});
	it('mock has 24 unique questions with every topic represented', () => {
		const bank = Array.from({ length: 200 }, (_, i) => ({ id: `q${i}`, t: i % 6 }));
		let seed = 7; const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
		const m = pickMock(bank, () => fresh(), rand, T0);
		expect(m.length).toBe(24);
		expect(new Set(m.map((q) => q.id)).size).toBe(24);
		for (let t = 0; t < 6; t++) expect(m.filter((q) => q.t === t).length).toBeGreaterThanOrEqual(2);
	});
});
