// Progress blob: everything a learner owns. Local-first; merged across devices on sign-in.
import type { ItemState } from '$lib/engine/scheduler';
import { fromLegacy } from '$lib/engine/scheduler';

export type Mock = { at: number; score: number; total: number; secs: number; wrong: string[] };
export type Day = { n: number; ok: number };
export type Progress = {
	v: 2;
	items: Record<string, ItemState>;
	exam?: string; // YYYY-MM-DD
	mocks: Mock[];
	days: Record<string, Day>; // YYYY-MM-DD → answers that day
	updatedAt: number;
};

export const empty = (): Progress => ({ v: 2, items: {}, mocks: [], days: {}, updatedAt: 0 });

export const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const examMs = (p: Progress) => (p.exam ? Date.parse(p.exam + 'T09:00:00') : undefined);

/** Parse any stored/exported blob: v2, or the legacy trainer export ({items:{idx:{b,due,s,w,f}}}). */
export function parse(raw: unknown, legacyIds: string[], now: number): Progress | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, unknown>;
	if (r.v === 2 && r.items && typeof r.items === 'object') {
		return { ...empty(), ...(r as Partial<Progress>), v: 2, items: r.items as Record<string, ItemState>, mocks: (r.mocks as Mock[]) ?? [], days: (r.days as Record<string, Day>) ?? {} };
	}
	if (r.items && typeof r.items === 'object' && !('v' in r)) {
		const items: Record<string, ItemState> = {};
		for (const [k, v] of Object.entries(r.items as Record<string, { b: number; due: number; s: number; w: number; f?: number }>)) {
			const id = legacyIds[Number(k)]; if (id && v) items[id] = fromLegacy(v, now);
		}
		return { ...empty(), items, updatedAt: now };
	}
	return null;
}

/** Union of two progress blobs: per item the later answer wins, mocks by timestamp, days by max. */
export function merge(a: Progress, b: Progress): Progress {
	const out = empty();
	for (const id of new Set([...Object.keys(a.items), ...Object.keys(b.items)])) {
		const x = a.items[id], y = b.items[id];
		out.items[id] = !x ? y : !y ? x : (y.last > x.last ? y : x.last > y.last ? x : (y.seen > x.seen ? y : x));
		if (x && y) out.items[id] = { ...out.items[id], flag: (x.flag || y.flag) ? 1 : 0 };
	}
	const mocks = new Map<number, Mock>();
	for (const m of [...a.mocks, ...b.mocks]) mocks.set(m.at, m);
	out.mocks = [...mocks.values()].sort((m, n) => m.at - n.at);
	for (const d of new Set([...Object.keys(a.days), ...Object.keys(b.days)])) {
		const x = a.days[d] ?? { n: 0, ok: 0 }, y = b.days[d] ?? { n: 0, ok: 0 };
		out.days[d] = x.n >= y.n ? x : y;
	}
	const newer = a.updatedAt >= b.updatedAt ? a : b;
	out.exam = newer.exam ?? a.exam ?? b.exam;
	out.updatedAt = Math.max(a.updatedAt, b.updatedAt);
	return out;
}

/** Streak of consecutive days with at least one answer, ending today or yesterday. */
export function streakDays(days: Record<string, Day>, now: number): number {
	let n = 0; let t = now;
	if (!days[dayKey(t)]) t -= 86_400_000;
	while (days[dayKey(t)]?.n) { n++; t -= 86_400_000; }
	return n;
}
