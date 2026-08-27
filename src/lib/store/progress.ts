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
	ms: Record<string, number>; // milestone id → when it was first reached
	updatedAt: number;
	resetAt?: number; // a reset on any device wipes older data everywhere on merge
	fb?: number; // when the feedback card was sent or skipped; asked once, on any device
};

export const empty = (): Progress => ({ v: 2, items: {}, mocks: [], days: {}, ms: {}, updatedAt: 0 });

export const dayKey = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const examMs = (p: Progress) => (p.exam ? Date.parse(p.exam + 'T09:00:00') : undefined);

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
/** Coerce an item from any source into a valid ItemState. */
export function sanitize(v: Record<string, unknown>): ItemState {
	const f = fresh();
	return {
		reps: Math.max(0, num(v.reps, f.reps)), lapses: Math.max(0, num(v.lapses, f.lapses)),
		ease: Math.min(MAX_EASE, Math.max(MIN_EASE, num(v.ease, f.ease))), ivl: Math.max(0, num(v.ivl, f.ivl)),
		due: num(v.due, f.due), last: num(v.last, f.last), seen: Math.max(0, num(v.seen, f.seen)), flag: v.flag ? 1 : 0,
		...(Array.isArray(v.miss) && v.miss.some((n) => num(n, 0) > 0) ? { miss: v.miss.slice(0, 8).map((n) => Math.max(0, Math.floor(num(n, 0)))) } : {})
	};
}

/** Per-option max of two miss-count arrays. */
export const mergeMiss = (a?: number[], b?: number[]): number[] | undefined => {
	if (!a) return b; if (!b) return a;
	const out = Array.from({ length: Math.max(a.length, b.length) }, (_, i) => Math.max(a[i] ?? 0, b[i] ?? 0));
	return out;
};

/** Parse any stored/exported blob: v2, or the legacy trainer export ({items:{idx:{b,due,s,w,f}}}). */
export function parse(raw: unknown, legacyIds: string[], now: number): Progress | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, unknown>;
	if (r.v === 2 && r.items && typeof r.items === 'object') {
		const items: Record<string, ItemState> = {};
		for (const [id, v] of Object.entries(r.items as Record<string, unknown>)) if (v && typeof v === 'object') items[id] = sanitize(v as Record<string, unknown>);
		const exam = typeof r.exam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.exam) ? r.exam : undefined;
		const resetAt = num(r.resetAt, 0);
		const fb = num(r.fb, 0);
		return { v: 2, items, exam, mocks: Array.isArray(r.mocks) ? (r.mocks as Mock[]) : [], days: r.days && typeof r.days === 'object' ? (r.days as Record<string, Day>) : {}, ms: r.ms && typeof r.ms === 'object' ? (r.ms as Record<string, number>) : {}, updatedAt: num(r.updatedAt, 0), ...(resetAt ? { resetAt } : {}), ...(fb ? { fb } : {}) };
	}
	if (r.items && typeof r.items === 'object' && !('v' in r)) {
		const items: Record<string, ItemState> = {};
		for (const [k, v] of Object.entries(r.items as Record<string, { b: number; due: number; s: number; w: number; f?: number }>)) {
			const id = legacyIds[Number(k)]; if (id && v) items[id] = sanitize(fromLegacy(v, now) as unknown as Record<string, unknown>);
		}
		return { ...empty(), items, updatedAt: now };
	}
	return null;
}

/** Union of two progress blobs: per item the later answer wins, mocks by timestamp, days by max. */
export function merge(a: Progress, b: Progress): Progress {
	const out = empty();
	const cut = Math.max(a.resetAt ?? 0, b.resetAt ?? 0);
	if (cut) out.resetAt = cut;
	const live = (s?: ItemState) => (s && s.last >= cut ? s : undefined);
	for (const id of new Set([...Object.keys(a.items), ...Object.keys(b.items)])) {
		const x = live(a.items[id]), y = live(b.items[id]);
		if (!x && !y) continue;
		out.items[id] = !x ? y! : !y ? x : (y.last > x.last ? y : x.last > y.last ? x : (y.seen > x.seen ? y : x));
		if (x && y) { const miss = mergeMiss(x.miss, y.miss); out.items[id] = { ...out.items[id], flag: (x.flag || y.flag) ? 1 : 0, ...(miss ? { miss } : {}) }; }
	}
	const mocks = new Map<number, Mock>();
	for (const m of [...a.mocks, ...b.mocks]) if (m.at >= cut) mocks.set(m.at, m);
	out.mocks = [...mocks.values()].sort((m, n) => m.at - n.at);
	const cutDay = cut ? dayKey(cut) : '';
	for (const d of new Set([...Object.keys(a.days), ...Object.keys(b.days)])) {
		if (d < cutDay) continue;
		const x = a.days[d] ?? { n: 0, ok: 0 }, y = b.days[d] ?? { n: 0, ok: 0 };
		out.days[d] = x.n >= y.n ? x : y;
	}
	for (const k of new Set([...Object.keys(a.ms ?? {}), ...Object.keys(b.ms ?? {})])) { const at = Math.min(a.ms?.[k] ?? Infinity, b.ms?.[k] ?? Infinity); if (at >= cut) out.ms[k] = at; }
	const newer = a.updatedAt >= b.updatedAt ? a : b;
	out.exam = newer.exam;
	const fb = Math.max(a.fb ?? 0, b.fb ?? 0);
	if (fb) out.fb = fb;
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
