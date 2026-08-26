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
	newBudget?: number; // new questions allowed in this session (default: no cap)
	topic?: (id: string) => number; // when given, consecutive cards avoid sharing a topic
};

export const shuffle = <T,>(a: T[], rand: () => number): T[] => {
	for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
	return a;
};

/** Reorder in place so no two neighbours share a topic where the mix allows it (interleaving aids retention). */
export const interleave = (ids: string[], topic?: (id: string) => number): string[] => {
	if (!topic) return ids;
	for (let i = 1; i < ids.length; i++) {
		if (topic(ids[i]) !== topic(ids[i - 1])) continue;
		const j = ids.findIndex((id, k) => k > i && topic(id) !== topic(ids[i - 1]));
		if (j > 0) [ids[i], ids[j]] = [ids[j], ids[i]];
	}
	return ids;
};

export class Session {
	queue: Card[] = [];
	recent: string[] = [];
	newServed = 0;
	done = 0; firstTry = { ok: 0, n: 0 }; streak = 0; best = 0;
	constructor(public mode: Mode, private ctx: SessionCtx, seed: string[] = []) {
		if (mode === 'smart') this.refill(); else this.queue = interleave(shuffle(seed.slice(), ctx.rand), ctx.topic).map((id) => ({ id, attempted: false, needed: 1 }));
	}
	get length() { return this.queue.length; }

	/** Fill up to 15 cards: due-and-lapsed first, a few clean reviews, then new, then anything unproven. */
	refill(current?: string) {
		const { ids, state, now, rand } = this.ctx;
		const t = now();
		const avoid = new Set([...this.queue.map((c) => c.id), ...this.recent, ...(current ? [current] : [])]);
		const all = ids.filter((id) => !avoid.has(id));
		const cand = all.filter((id) => !isKnown(state(id)));
		const byDue = (a: string, b: string) => state(a).due - state(b).due;
		const LIMIT = 15, NEW = Math.max(0, (this.ctx.newBudget ?? Infinity) - this.newServed);
		let add = all.filter((id) => { const s = state(id); return s.lapses > 0 && isDue(s, t); }).sort(byDue).slice(0, LIMIT);
		if (add.length < LIMIT) {
			const clean = all.filter((id) => { const s = state(id); return s.lapses === 0 && isDue(s, t); }).sort(byDue);
			add = add.concat(clean.slice(0, Math.min(4, LIMIT - add.length)));
		}
		if (add.length < LIMIT) {
			const unseen = shuffle(cand.filter((id) => state(id).seen === 0), rand);
			const fresh = unseen.slice(0, Math.min(NEW, LIMIT - add.length)); this.newServed += fresh.length; add = add.concat(fresh);
		}
		if (add.length < LIMIT) {
			const clean2 = all.filter((id) => { const s = state(id); return s.lapses === 0 && isDue(s, t) && !add.includes(id); }).sort(byDue);
			add = add.concat(clean2.slice(0, LIMIT - add.length));
		}
		// Nothing due and the new budget is spent: keep working the unproven seen items; new only if budget remains.
		const pool = cand.filter((id) => state(id).seen > 0 || NEW > 0);
		if (!add.length) {
			let rest = pool.filter((id) => state(id).lapses > 0).sort((a, b) => (state(a).ivl - state(b).ivl) || (state(b).lapses - state(a).lapses));
			if (!rest.length) rest = pool.sort((a, b) => (state(a).ivl - state(b).ivl) || byDue(a, b));
			add = rest.slice(0, LIMIT);
		}
		if (!add.length) add = pool.slice(0, LIMIT);
		this.queue.push(...interleave(shuffle(add, rand), this.ctx.topic).map((id) => ({ id, attempted: false, needed: 1 })));
	}

	next(): Card | null {
		if (this.mode === 'smart' && this.queue.length < 3) this.refill();
		return this.queue.shift() ?? null;
	}

	/** Re-asks still owed for cards missed this session (served after the goal so a miss is never left hanging). */
	get pending() { return this.queue.filter((c) => c.attempted).length; }
	nextPending(): Card | null {
		const i = this.queue.findIndex((c) => c.attempted);
		return i < 0 ? null : this.queue.splice(i, 1)[0];
	}

	private reinsert(card: Card, min: number, max: number) {
		const gap = min + Math.floor(this.ctx.rand() * (max - min + 1));
		while (this.mode === 'smart' && this.queue.length < gap) { const before = this.queue.length; this.refill(card.id); if (this.queue.length === before) break; }
		this.queue.splice(Math.min(gap, this.queue.length), 0, card);
	}

	/** Record an answer. `schedule`: grade it (first try only). `recovered`: a missed card passed both re-asks. */
	answer(card: Card, correct: boolean): { schedule: boolean; recovered: boolean } {
		this.recent.push(card.id); if (this.recent.length > 10) this.recent.shift();
		const first = !card.attempted;
		let recovered = false;
		if (first) { this.firstTry.n++; if (correct) this.firstTry.ok++; }
		if (correct) {
			this.streak++; this.best = Math.max(this.best, this.streak);
			if (!first) { card.needed--; if (card.needed > 0) this.reinsert(card, 15, 20); else recovered = true; }
		} else {
			this.streak = 0;
			card.attempted = true; card.needed = 2;
			this.reinsert(card, 8, 12);
		}
		this.done++;
		return { schedule: first, recovered };
	}
}

export const emptyState = fresh;
