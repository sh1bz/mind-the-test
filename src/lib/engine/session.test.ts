import { describe, it, expect } from 'vitest';
import { Session } from './session';
import { fresh, grade, type ItemState } from './scheduler';

const T0 = Date.UTC(2026, 7, 26, 9);
const mk = (n: number, states: Record<string, ItemState> = {}) => {
	const ids = Array.from({ length: n }, (_, i) => `q${i}`);
	let seed = 1;
	const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
	return { ids, states, ctx: { ids, state: (id: string) => states[id] ?? fresh(), now: () => T0, rand } };
};

describe('session', () => {
	it('smart mode starts with up to 15 cards and keeps refilling', () => {
		const { ctx } = mk(50);
		const s = new Session('smart', ctx);
		expect(s.length).toBe(15);
		for (let i = 0; i < 40; i++) { const c = s.next()!; s.answer(c, true); }
		expect(s.done).toBe(40);
		expect(s.next()).not.toBeNull();
	});
	it('a wrong answer comes back 8–12 cards later and needs two confirmations', () => {
		const { ctx } = mk(60);
		const s = new Session('smart', ctx);
		const c = s.next()!;
		expect(s.answer(c, false).schedule).toBe(true);
		let pos = 0; let again: typeof c | null = null;
		while (pos < 30) { const n = s.next()!; pos++; if (n.id === c.id) { again = n; break; } s.answer(n, true); }
		expect(pos).toBeGreaterThanOrEqual(9); expect(pos).toBeLessThanOrEqual(13);
		expect(s.answer(again!, true).schedule).toBe(false);
		expect(again!.needed).toBe(1);
		pos = 0; let third = false;
		while (pos < 30) { const n = s.next()!; pos++; if (n.id === c.id) { third = true; break; } s.answer(n, true); }
		expect(third).toBe(true); expect(pos).toBeGreaterThanOrEqual(16); expect(pos).toBeLessThanOrEqual(21);
	});
	it('known questions retire from smart mode; due lapsed ones come first', () => {
		const states: Record<string, ItemState> = {};
		let k = fresh(); for (let i = 0; i < 3; i++) k = grade(k, true, T0 - (10 - i * 3) * 86400000);
		for (let i = 0; i < 20; i++) states[`q${i}`] = k; // known, ivl 8
		let lapsed = grade(fresh(), false, T0 - 3600000); // due 10 min after, i.e. now
		states.q20 = lapsed;
		const { ctx } = mk(22, states);
		const s = new Session('smart', ctx);
		const ids = s.queue.map((c) => c.id);
		expect(ids).toContain('q20'); expect(ids).toContain('q21');
		expect(ids.some((id) => Number(id.slice(1)) < 20)).toBe(false);
	});
	it('custom mode serves exactly the seed, shuffled', () => {
		const { ctx } = mk(10);
		const s = new Session('custom', ctx, ['q1', 'q2', 'q3']);
		const out: string[] = []; let c; while ((c = s.next())) { s.answer(c, true); out.push(c.id); }
		expect(out.sort()).toEqual(['q1', 'q2', 'q3']);
	});
});
