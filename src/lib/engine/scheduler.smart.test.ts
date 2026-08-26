import { describe, it, expect } from 'vitest';
import { DAY, fresh, grade, isKnown, relearn } from './scheduler';

const T0 = Date.UTC(2026, 7, 26, 9);
const mid = () => 0.5; // no fuzz

describe('scheduler improvements', () => {
	it('an in-session recovery graduates a missed question to 1 day', () => {
		const missed = grade(fresh(), false, T0);
		expect(missed.ivl).toBe(0);
		const r = relearn(missed, T0 + 5 * 60_000);
		expect(r.ivl).toBe(1);
		expect(r.reps).toBe(1);
		expect(r.due).toBe(T0 + 5 * 60_000 + DAY);
		expect(r.ease).toBe(missed.ease);
	});
	it('relearn does nothing to a question that was not missed', () => {
		const ok = grade(fresh(), true, T0);
		expect(relearn(ok, T0 + 1000)).toEqual(ok);
	});
	it('an overdue question answered correctly earns credit for the real gap', () => {
		let s = grade(fresh(), true, T0, undefined, mid); // 1 day
		s = grade(s, true, T0 + DAY, undefined, mid); // 3 days
		const late = grade(s, true, T0 + DAY + 12 * DAY, undefined, mid); // came back 12 days later, still knew it
		expect(late.ivl).toBe(Math.round(12 * s.ease)); // not 3 × ease
		const onTime = grade(s, true, T0 + DAY + 3 * DAY, undefined, mid);
		expect(onTime.ivl).toBe(Math.round(3 * s.ease));
	});
	it('fuzz moves intervals of 3+ days by at most 5% either way', () => {
		let s = grade(fresh(), true, T0, undefined, mid);
		s = grade(s, true, T0 + DAY, undefined, mid);
		s = grade(s, true, T0 + 4 * DAY, undefined, mid); // 3 × 2.6 = 7.8 → 8
		const lo = grade(s, true, T0 + 12 * DAY, undefined, () => 0);
		const hi = grade(s, true, T0 + 12 * DAY, undefined, () => 1);
		const base = Math.round(8 * s.ease);
		expect(lo.ivl).toBe(Math.round(base * 0.95));
		expect(hi.ivl).toBe(Math.round(base * 1.05));
	});
	it('three correct reviews count as known even when the exam cap keeps intervals short', () => {
		const exam = T0 + 8 * DAY; // cap = 4 days, so ivl can never reach 7
		let s = grade(fresh(), true, T0, exam, mid);
		s = grade(s, true, T0 + DAY, exam, mid);
		expect(isKnown(s)).toBe(false);
		s = grade(s, true, T0 + 4 * DAY, exam, mid);
		expect(s.ivl).toBeLessThan(7);
		expect(isKnown(s)).toBe(true);
	});
});
