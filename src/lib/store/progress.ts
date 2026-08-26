// Progress blob: everything a learner owns. Local-first; merged across devices on sign-in.
import type { ItemState } from '$lib/engine/scheduler';
import { fromLegacy, fresh, MIN_EASE, MAX_EASE } from '$lib/engine/scheduler';

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

export const dayKey = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const examMs = (p: Progress) => (p.exam ? Date.parse(p.exam + 'T09:00:00') : undefined);

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
/** Coerce an item from any source into a valid ItemState. */
export function sanitize(v: Record<string, unknown>): ItemState {
	const f = fresh();
	return {
		reps: Math.max(0, num(v.reps, f.reps)), lapses: Math.max(0, num(v.lapses, f.lapses)),
		ease: Math.min(MAX_EASE, Math.max(MIN_EASE, num(v.ease, f.ease))), ivl: Math.max(0, num(v.ivl, f.ivl)),
		due: num(v.due, f.due), last: num(v.last, f.last), seen: Math.max(0, num(v.seen, f.seen)), flag: v.flag ? 1 : 0
	};
}

/** Parse any stored/exported blob: v2, or the legacy trainer export ({items:{idx:{b,due,s,w,f}}}). */
export function parse(raw: unknown, legacyIds: string[], now: number): Progress | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, unknown>;
	if (r.v === 2 && r.items && typeof r.items === 'object') {
		const items: Record<string, ItemState> = {};
		for (const [id, v] of Object.entries(r.items as Record<string, unknown>)) if (v && typeof v === 'object') items[id] = sanitize(v as Record<string, unknown>);
		const exam = typeof r.exam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.exam) ? r.exam : undefined;
		return { v: 2, items, exam, mocks: Array.isArray(r.mocks) ? (r.mocks as Mock[]) : [], days: r.days && typeof r.days === 'object' ? (r.days as Record<string, Day>) : {}, updatedAt: num(r.updatedAt, 0) };
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
	out.exam = newer.exam;
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
