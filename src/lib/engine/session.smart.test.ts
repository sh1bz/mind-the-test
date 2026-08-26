import { describe, it, expect } from 'vitest';
import { Session, interleave } from './session';
import { fresh, DAY, type ItemState } from './scheduler';

const T0 = Date.UTC(2026, 7, 26, 9);
const lcg = () => { let seed = 7; return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; };

describe('session improvements', () => {
	it('reports recovery only after both re-asks are answered correctly', () => {
		const ids = Array.from({ length: 40 }, (_, i) => `q${i}`);
		const s = new Session('smart', { ids, state: () => fresh(), now: () => T0, rand: lcg() });
		const first = s.next()!;
		expect(s.answer(first, false)).toEqual({ schedule: true, recovered: false });
		let card = s.next()!;
		while (card.id !== first.id) { s.answer(card, true); card = s.next()!; }
		expect(s.answer(card, true)).toEqual({ schedule: false, recovered: false });
		card = s.next()!;
		while (card.id !== first.id) { s.answer(card, true); card = s.next()!; }
		expect(s.answer(card, true)).toEqual({ schedule: false, recovered: true });
	});
	it('interleaves topics so neighbours differ whenever the mix allows', () => {
		const topic = (id: string) => Number(id[1]);
		const out = interleave(['a1', 'b1', 'c1', 'd2', 'e2', 'f2', 'g3'], topic);
		for (let i = 1; i < out.length; i++) expect(topic(out[i])).not.toBe(topic(out[i - 1]));
		expect(out.slice().sort()).toEqual(['a1', 'b1', 'c1', 'd2', 'e2', 'f2', 'g3']);
	});
	it('interleave leaves an impossible mix in a valid order', () => {
		expect(interleave(['a1', 'b1', 'c1'], () => 1)).toEqual(['a1', 'b1', 'c1']);
	});
	it('a custom session with a topic map never repeats a topic back to back when it can avoid it', () => {
		const ids = ['a1', 'b1', 'c2', 'd2', 'e3', 'f3'];
		const s = new Session('custom', { ids, state: () => fresh(), now: () => T0, rand: lcg(), topic: (id) => Number(id[1]) }, ids);
		const order = s.queue.map((c) => Number(c.id[1]));
		for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1]);
	});
});

describe('session goal', () => {
	it('serves the re-asks owed for missed cards after the goal is reached', () => {
		const ids = Array.from({ length: 40 }, (_, i) => `q${i}`);
		const s = new Session('smart', { ids, state: () => fresh(), now: () => T0, rand: lcg() });
		const first = s.next()!;
		s.answer(first, false);
		expect(s.pending).toBe(1);
		const p = s.nextPending()!;
		expect(p.id).toBe(first.id);
		expect(p.attempted).toBe(true);
		expect(s.pending).toBe(0);
		expect(s.nextPending()).toBeNull();
	});
});

it('serves due known items and caps new questions per session', () => {
	const now = 1_000_000_000_000;
	const known: ItemState = { ...fresh(), reps: 4, ivl: 14, seen: 4, last: now - 15 * DAY, due: now - DAY };
	const states: Record<string, ItemState> = { k: known };
	const ids = ['k', ...Array.from({ length: 30 }, (_, i) => `n${i}`)];
	const s = new Session('smart', { ids, state: (id) => states[id] ?? fresh(), now: () => now, rand: () => 0.5, newBudget: 3 });
	const served: string[] = [];
	for (let c = s.next(); c && served.length < 40; c = s.next()) { served.push(c.id); s.answer(c, true); }
	expect(served).toContain('k');
	expect(served.filter((id) => id.startsWith('n')).length).toBe(3);
});
