// Session queue: what to ask next, and the in-session re-ask rules
// (a wrong answer comes back 8–12 cards later, then once more 15–20 later).
import type { ItemState } from './scheduler';
import { fresh, isDue, isKnown } from './scheduler';

export type Card = { id: string; attempted: boolean; needed: number };
export type Mode = 'smart' | 'weak' | 'wrong' | 'custom' | 'mock';

export type SessionCtx = {
	ids: string[]; // the pool (already topic-filtered)
	state: (id: string) => ItemState;
	now: () => number;
	rand: () => number;
	newPerRefill?: number;
};

export const shuffle = <T,>(a: T[], rand: () => number): T[] => {
	for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
	return a;
};

export class Session {
	queue: Card[] = [];
	recent: string[] = [];
	done = 0; firstTry = { ok: 0, n: 0 }; streak = 0; best = 0;
	constructor(public mode: Mode, private ctx: SessionCtx, seed: string[] = []) {
		if (mode === 'smart') this.refill(); else this.queue = shuffle(seed.slice(), ctx.rand).map((id) => ({ id, attempted: false, needed: 1 }));
	}
	get length() { return this.queue.length; }

	/** Fill up to 15 cards: due-and-lapsed first, a few clean reviews, then new, then anything unproven. */
	refill() {
		const { ids, state, now, rand } = this.ctx;
		const t = now();
		const avoid = new Set([...this.queue.map((c) => c.id), ...this.recent]);
		const cand = ids.filter((id) => !avoid.has(id) && !isKnown(state(id)));
		const byDue = (a: string, b: string) => state(a).due - state(b).due;
		const LIMIT = 15, NEW = this.ctx.newPerRefill ?? LIMIT;
		let add = cand.filter((id) => { const s = state(id); return s.lapses > 0 && isDue(s, t); }).sort(byDue).slice(0, LIMIT);
		if (add.length < LIMIT) {
			const clean = cand.filter((id) => { const s = state(id); return s.lapses === 0 && isDue(s, t); }).sort(byDue);
			add = add.concat(clean.slice(0, Math.min(4, LIMIT - add.length)));
		}
		if (add.length < LIMIT) {
			const unseen = shuffle(cand.filter((id) => state(id).seen === 0), rand);
			add = add.concat(unseen.slice(0, Math.min(NEW, LIMIT - add.length)));
		}
		if (add.length < LIMIT) {
			const clean2 = cand.filter((id) => { const s = state(id); return s.lapses === 0 && isDue(s, t) && !add.includes(id); }).sort(byDue);
			add = add.concat(clean2.slice(0, LIMIT - add.length));
		}
		if (!add.length) {
			let rest = cand.filter((id) => state(id).lapses > 0).sort((a, b) => (state(a).ivl - state(b).ivl) || (state(b).lapses - state(a).lapses));
			if (!rest.length) rest = cand.sort((a, b) => (state(a).ivl - state(b).ivl) || byDue(a, b));
			add = rest.slice(0, LIMIT);
		}
		if (!add.length) {
			const inQ = new Set(this.queue.map((c) => c.id));
			add = ids.filter((id) => !inQ.has(id) && !isKnown(state(id))).slice(0, LIMIT);
		}
		this.queue.push(...shuffle(add, rand).map((id) => ({ id, attempted: false, needed: 1 })));
	}

	next(): Card | null {
		if (this.mode === 'smart' && this.queue.length < 3) this.refill();
		return this.queue.shift() ?? null;
	}

	private reinsert(card: Card, min: number, max: number) {
		const gap = min + Math.floor(this.ctx.rand() * (max - min + 1));
		while (this.mode === 'smart' && this.queue.length < gap) { const before = this.queue.length; this.refill(); if (this.queue.length === before) break; }
		this.queue.splice(Math.min(gap, this.queue.length), 0, card);
	}

	/** Record an answer. Returns whether this answer should be graded by the scheduler (first try only). */
	answer(card: Card, correct: boolean): { schedule: boolean } {
		this.recent.push(card.id); if (this.recent.length > 10) this.recent.shift();
		const first = !card.attempted;
		if (first) { this.firstTry.n++; if (correct) this.firstTry.ok++; }
		if (correct) {
			this.streak++; this.best = Math.max(this.best, this.streak);
			if (!first) { card.needed--; if (card.needed > 0) this.reinsert(card, 15, 20); }
		} else {
			this.streak = 0;
			card.attempted = true; card.needed = 2;
			this.reinsert(card, 8, 12);
		}
		this.done++;
		return { schedule: first };
	}
}

export const emptyState = fresh;
