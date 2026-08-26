import { describe, it, expect } from 'vitest';
import { fresh, grade, recall, isKnown, isDue, DAY, RELEARN_MS, fromLegacy } from './scheduler';

const T0 = Date.UTC(2026, 7, 26, 9);

describe('scheduler', () => {
	it('grows intervals 1 → 3 → ease×', () => {
		let s = grade(fresh(), true, T0);
		expect(s.ivl).toBe(1); expect(s.due).toBe(T0 + DAY);
		s = grade(s, true, T0 + DAY);
		expect(s.ivl).toBe(3);
		s = grade(s, true, T0 + 4 * DAY);
		expect(s.ivl).toBe(Math.round(3 * 2.6)); // ease rose 0.05 twice
		expect(isKnown(s)).toBe(true);
	});
	it('a wrong answer resets to relearning, lowers ease, keeps lapses', () => {
		let s = grade(grade(fresh(), true, T0), true, T0 + DAY);
		s = grade(s, false, T0 + 2 * DAY);
		expect(s.ivl).toBe(0); expect(s.reps).toBe(0); expect(s.lapses).toBe(1);
		expect(s.ease).toBeCloseTo(2.4);
		expect(s.due).toBe(T0 + 2 * DAY + RELEARN_MS);
		expect(isKnown(s)).toBe(false);
	});
	it('never schedules past half the days to the exam', () => {
		let s = fresh();
		for (let i = 0; i < 6; i++) s = grade(s, true, T0 + i * DAY, T0 + 6 * DAY);
		expect(s.ivl).toBeLessThanOrEqual(3);
		expect(s.due).toBeLessThanOrEqual(T0 + 6 * DAY);
	});
	it('recall decays to 0.9 at one interval', () => {
		const s = grade(grade(fresh(), true, T0), true, T0 + DAY); // ivl 3
		expect(recall(s, T0 + DAY)).toBeCloseTo(1);
		expect(recall(s, T0 + 4 * DAY)).toBeCloseTo(0.9);
		expect(recall(fresh(), T0)).toBe(0.3);
	});
	it('isDue needs a seen item whose due has passed', () => {
		expect(isDue(fresh(), T0)).toBe(false);
		const s = grade(fresh(), true, T0);
		expect(isDue(s, T0 + DAY - 1)).toBe(false);
		expect(isDue(s, T0 + DAY)).toBe(true);
	});
	it('migrates legacy zones', () => {
		const s = fromLegacy({ b: 4, due: T0 + DAY, s: 6, w: 1, f: 1 }, T0);
		expect(s.ivl).toBe(7); expect(isKnown(s)).toBe(true); expect(s.flag).toBe(1); expect(s.lapses).toBe(1);
		expect(fromLegacy({ b: 0, due: 0, s: 0, w: 0 }, T0).seen).toBe(0);
	});
});

describe('scheduler regressions', () => {
	it('a past exam date no longer caps intervals', () => {
		let s = fresh();
		for (let i = 0; i < 4; i++) s = grade(s, true, T0 + i * DAY, T0 - DAY);
		expect(s.ivl).toBeGreaterThan(3);
	});
});
