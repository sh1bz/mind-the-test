import { describe, it, expect } from 'vitest';
import { merge, parse, empty, streakDays, dayKey } from './progress';
import { fresh, grade } from '$lib/engine/scheduler';

const T0 = Date.UTC(2026, 7, 26, 9);
describe('progress', () => {
	it('merge keeps the later answer per item, unions mocks and flags', () => {
		const a = empty(), b = empty();
		a.items.q1 = grade(fresh(), true, T0); b.items.q1 = grade(grade(fresh(), true, T0), true, T0 + 86400000);
		a.items.q2 = { ...grade(fresh(), false, T0), flag: 1 }; b.items.q2 = grade(fresh(), true, T0 - 1);
		a.mocks = [{ at: 1, score: 10, total: 24, secs: 1, wrong: [] }]; b.mocks = [{ at: 1, score: 10, total: 24, secs: 1, wrong: [] }, { at: 2, score: 20, total: 24, secs: 1, wrong: [] }];
		a.exam = '2026-09-10'; a.updatedAt = 5; b.updatedAt = 3;
		const m = merge(a, b);
		expect(m.items.q1.ivl).toBe(3); expect(m.items.q2.lapses).toBe(1); expect(m.items.q2.flag).toBe(1);
		expect(m.mocks.length).toBe(2); expect(m.exam).toBe('2026-09-10'); expect(m.updatedAt).toBe(5);
	});
	it('parses a legacy trainer export by index', () => {
		const p = parse({ items: { 0: { b: 4, due: T0, s: 5, w: 1 }, 7: { b: 0, due: 0, s: 0, w: 0 } }, totalAnswers: 5 }, ['q001', 'q002', 'q003', 'q004', 'q005', 'q006', 'q007', 'q008'], T0)!;
		expect(p.v).toBe(2); expect(p.items.q001.ivl).toBe(7); expect(p.items.q008.seen).toBe(0);
		expect(parse('nope', [], T0)).toBeNull();
	});
	it('streak counts back from today or yesterday', () => {
		const d = (k: number) => dayKey(T0 - k * 86400000);
		expect(streakDays({ [d(0)]: { n: 3, ok: 2 }, [d(1)]: { n: 1, ok: 1 }, [d(3)]: { n: 1, ok: 1 } }, T0)).toBe(2);
		expect(streakDays({ [d(1)]: { n: 1, ok: 1 }, [d(2)]: { n: 1, ok: 1 } }, T0)).toBe(2);
		expect(streakDays({ [d(2)]: { n: 1, ok: 1 } }, T0)).toBe(0);
	});
});

describe('progress regressions', () => {
	it('a cleared exam date stays cleared after merge', () => {
		const a = empty(), b = empty(); a.exam = '2026-09-10'; a.updatedAt = 1; b.updatedAt = 2;
		expect(merge(a, b).exam).toBeUndefined();
	});
	it('dayKey uses local time', () => {
		const d = new Date(2026, 7, 26, 0, 30);
		expect(dayKey(d.getTime())).toBe('2026-08-26');
	});
	it('sanitizes bad item values on import', () => {
		const p = parse({ v: 2, items: { q001: { reps: 'x', ease: 99, ivl: -3, seen: 2, flag: 'y' } } }, [], T0)!;
		expect(p.items.q001).toMatchObject({ reps: 0, ease: 3, ivl: 0, seen: 2, flag: 1 });
	});
});
