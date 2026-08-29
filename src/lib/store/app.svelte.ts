// The one app store: progress in memory → localStorage on every mutation → Supabase (debounced)
// when signed in. Sign-in merges local progress into the account, so nothing is lost.
import { browser } from '$app/environment';
import { QUESTIONS } from '$lib/content';
import { fresh, grade, relearn as relearnItem, type ItemState } from '$lib/engine/scheduler';
import { empty, merge, parse, dayKey, examMs, type Progress, type Mock } from './progress';
import { supabase, supabaseEnabled } from './supabase';
import { convert } from '$lib/seo/ads';

const KEY = 'lifeuk-v2';
const PAID_KEY = 'lifeuk-paid';
const LEGACY_KEY = 'lifeuk-trainer-v1';
const IDS = QUESTIONS.map((q) => q.id);

class AppStore {
	progress = $state<Progress>(empty());
	user = $state<{ id: string; email: string | null } | null>(null);
	/** One-off unlock. Source of truth is Supabase `entitlements`; cached here so the app works offline. */
	paid = $state(false);
	sync = $state<'local' | 'syncing' | 'synced' | 'offline'>('local');
	storageOk = $state(true);
	private timer: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		if (!browser) return;
		try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); } catch { this.storageOk = false; }
		for (const key of [KEY, LEGACY_KEY]) {
			try { const raw = localStorage.getItem(key); const p = raw ? parse(JSON.parse(raw), IDS, Date.now()) : null; if (p) { this.progress = p; break; } } catch { /* unreadable copy: start fresh */ }
		}
		if (this.exam && this.exam < Date.now() - 86_400_000) { this.progress.exam = undefined; }
		try { this.paid = localStorage.getItem(PAID_KEY) === '1'; } catch { /* fine */ }
		if (supabaseEnabled) this.initAuth();
	}

	item(id: string): ItemState { return this.progress.items[id] ?? fresh(); }
	get exam() { return examMs(this.progress); }
	get cloud() { return supabaseEnabled; }
	get answered() { let n = 0; for (const s of Object.values(this.progress.items)) if (s.seen > 0) n++; return n; }
	get gate() { return { answered: this.answered, mocks: this.progress.mocks.length, paid: this.paid }; }

	// ---------- mutations ----------
	answer(id: string, correct: boolean, now = Date.now()) {
		if (this.answered === 0) convert('start');
		this.progress.items[id] = grade(this.item(id), correct, now, this.exam);
		const d = (this.progress.days[dayKey(now)] ??= { n: 0, ok: 0 });
		d.n++; if (correct) d.ok++;
		this.persist();
	}
	/** Count the wrong options picked (original indices); any wrong answer, first try or re-ask. */
	recordMiss(id: string, picks: number[]) {
		const s = this.item(id); const miss = (s.miss ?? []).slice();
		for (const i of picks) { if (i >= 0 && i < 8) miss[i] = (miss[i] ?? 0) + 1; }
		for (let i = 0; i < miss.length; i++) miss[i] = miss[i] ?? 0;
		this.progress.items[id] = { ...s, miss }; this.persist();
	}
	relearn(id: string, now = Date.now()) { this.progress.items[id] = relearnItem(this.item(id), now, this.exam); this.persist(); }
	toggleFlag(id: string) { const s = this.item(id); this.progress.items[id] = { ...s, flag: s.flag ? 0 : 1 }; this.persist(); }
	setExam(date: string | undefined) { this.progress.exam = date || undefined; this.persist(); if (date) convert('date'); }
	addMock(m: Mock) { this.progress.mocks.push(m); this.persist(); }
	/** The feedback card shows once, after the first mock, and never again once sent or skipped (a reset does not bring it back). */
	get askFeedback() { return this.progress.mocks.length === 1 && !this.progress.fb; }
	/** Contact support: a free-text message, optional reply email. Stored with the feedback rows. */
	async sendSupport(replyEmail: string | null, text: string): Promise<boolean> {
		if (!supabaseEnabled || !text.trim()) return false;
		const last = this.progress.mocks[this.progress.mocks.length - 1];
		try {
			const { error } = await supabase!.from('feedback').insert({ user_id: this.user?.id ?? null, email: replyEmail || this.user?.email || null, score: null, text: '[support] ' + text.trim().slice(0, 2000), answered: this.answered, mocks: this.progress.mocks.length, mock_score: last?.score ?? null });
			return !error;
		} catch { return false; }
	}
	async sendFeedback(score: number | null, text: string) {
		this.progress.fb = Date.now(); this.persist();
		if (!supabaseEnabled || (score === null && !text)) return;
		const last = this.progress.mocks[this.progress.mocks.length - 1];
		try {
			await supabase!.from('feedback').insert({ user_id: this.user?.id ?? null, email: this.user?.email ?? null, score, text: text || null, answered: this.answered, mocks: this.progress.mocks.length, mock_score: last?.score ?? null });
		} catch { /* best effort: the card is gone either way */ }
	}
	async reset() {
		this.cancelPush();
		if (this.user) { try { await supabase!.from('progress').delete().eq('user_id', this.user.id); } catch { /* the push below overwrites anyway */ } }
		this.progress = { ...empty(), resetAt: Date.now(), ...(this.progress.fb ? { fb: this.progress.fb } : {}) }; this.persist();
	}
	private cancelPush() { if (this.timer) { clearTimeout(this.timer); this.timer = null; } }
	importBlob(raw: string): boolean {
		try { const p = parse(JSON.parse(raw), IDS, Date.now()); if (!p) return false; this.progress = merge(this.progress, p); this.persist(); return true; }
		catch { return false; }
	}
	exportBlob() { return JSON.stringify(this.progress); }

	// ---------- persistence ----------
	persist() {
		this.progress.updatedAt = Date.now();
		if (browser) try { localStorage.setItem(KEY, JSON.stringify(this.progress)); } catch { this.storageOk = false; }
		if (this.user) { if (this.timer) clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 800); }
	}

	// ---------- auth + sync ----------
	private async initAuth() {
		const { data } = await supabase!.auth.getSession();
		this.user = data.session ? { id: data.session.user.id, email: data.session.user.email ?? null } : null;
		if (this.user) { this.pull(); this.checkPaid(); }
		supabase!.auth.onAuthStateChange((_e, session) => {
			const next = session ? { id: session.user.id, email: session.user.email ?? null } : null;
			const signedIn = !!next && !this.user;
			this.user = next;
			if (signedIn) { this.pull(); this.checkPaid(); }
			if (!next) this.sync = 'local';
		});
	}
	async signIn(email: string): Promise<string | null> {
		if (!supabaseEnabled) return 'Cloud sync is not configured.';
		const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
		if (!error) this.linkError = null;
		return error ? error.message : null;
	}
	/** Why the last email link did not sign the user in; shown above the sign-in form. */
	linkError = $state<string | null>(null);
	/** A link from the email: the page verifies it here, so a mail scanner that fetches the URL cannot use it up. */
	async verifyLink(token_hash: string, type: string): Promise<boolean> {
		if (!supabase) return false;
		this.linkError = null;
		const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as 'email' });
		if (error) this.linkError = 'That link has expired or was already used. Request a new one.';
		return !error;
	}
	async signOut() { await supabase!.auth.signOut(); this.user = null; this.sync = 'local'; this.setPaid(false); }
	private setPaid(v: boolean) { this.paid = v; try { if (v) localStorage.setItem(PAID_KEY, '1'); else localStorage.removeItem(PAID_KEY); } catch { /* fine */ } }
	/** A master/comp code unlocks locally, without Stripe. Returns true when it matched. */
	redeemCode(code: string): boolean {
		if (code.trim() === '280614') { this.setPaid(true); return true; }
		return false;
	}
	/** Re-read the entitlement for the signed-in email. Returns the new value; null when offline. */
	async checkPaid(): Promise<boolean | null> {
		if (!this.user) return null;
		try {
			const { data, error } = await supabase!.from('entitlements').select('email').limit(1);
			if (error) throw error;
			const v = (data?.length ?? 0) > 0; this.setPaid(v); return v;
		} catch { return null; }
	}
	/** Back from Stripe with a session id: the server verifies it and hands back a one-time sign-in token. */
	claiming = $state(false);
	async claimSession(sid: string): Promise<boolean> {
		if (!supabase) return false;
		this.claiming = true;
		try {
			const r = await fetch('/api/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sid }) });
			if (!r.ok) return false;
			const { token_hash, type } = (await r.json()) as { token_hash: string; type: 'magiclink' | 'signup' };
			const { error } = await supabase.auth.verifyOtp({ token_hash, type });
			if (error) return false;
			this.setPaid(true);
			return true;
		} catch { return false; } finally { this.claiming = false; }
	}
	/** After Stripe redirects back: the webhook can lag a few seconds, so poll. */
	async claim(tries = 8): Promise<boolean> {
		for (let i = 0; i < tries; i++) {
			if (await this.checkPaid()) return true;
			await new Promise((r) => setTimeout(r, 2000));
		}
		return this.paid;
	}
	/** Local progress belongs to the last account that synced it; a different account starts from the server copy, never a merge. */
	private owner(): string | null { try { return localStorage.getItem(KEY + ':owner'); } catch { return null; } }
	private setOwner(id: string) { try { localStorage.setItem(KEY + ':owner', id); } catch { /* private mode */ } }
	async pull() {
		if (!this.user) return;
		this.sync = 'syncing';
		try {
			const { data, error } = await supabase!.from('progress').select('blob').eq('user_id', this.user.id).maybeSingle();
			if (error) throw error;
			const remote = data?.blob ? parse(data.blob, IDS, Date.now()) : null;
			const owner = this.owner();
			const foreign = owner !== null && owner !== this.user.id;
			this.progress = remote ? (foreign ? remote : merge(this.progress, remote)) : foreign ? empty() : this.progress;
			this.setOwner(this.user.id);
			if (browser) try { localStorage.setItem(KEY, JSON.stringify(this.progress)); } catch { /* quota or private mode */ }
			await this.push();
		} catch { this.sync = 'offline'; }
	}
	async push() {
		if (!this.user) return;
		this.sync = 'syncing';
		try {
			const { error } = await supabase!.from('progress').upsert({ user_id: this.user.id, blob: $state.snapshot(this.progress), updated_at: new Date().toISOString() });
			if (error) throw error;
			this.sync = 'synced';
		} catch { this.sync = 'offline'; }
	}
	/** Delete the account's data on the server, sign out, and clear this device. */
	async deleteEverything() {
		this.cancelPush();
		if (this.user) { try { await supabase!.from('progress').delete().eq('user_id', this.user.id); } catch { /* best effort */ } await this.signOut(); }
		this.progress = empty(); this.setPaid(false);
		if (browser) { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); }
	}
}

export const app = new AppStore();
