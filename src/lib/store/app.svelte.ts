// The one app store: progress in memory → localStorage on every mutation → Supabase (debounced)
// when signed in. Sign-in merges local progress into the account, so nothing is lost.
import { browser } from '$app/environment';
import { QUESTIONS } from '$lib/content';
import { fresh, grade, type ItemState } from '$lib/engine/scheduler';
import { empty, merge, parse, dayKey, examMs, type Progress, type Mock } from './progress';
import { supabase, supabaseEnabled } from './supabase';

const KEY = 'lifeuk-v2';
const LEGACY_KEY = 'lifeuk-trainer-v1';
const IDS = QUESTIONS.map((q) => q.id);

class AppStore {
	progress = $state<Progress>(empty());
	user = $state<{ id: string } | null>(null);
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
		if (supabaseEnabled) this.initAuth();
	}

	item(id: string): ItemState { return this.progress.items[id] ?? fresh(); }
	get exam() { return examMs(this.progress); }
	get cloud() { return supabaseEnabled; }

	// ---------- mutations ----------
	answer(id: string, correct: boolean, now = Date.now()) {
		this.progress.items[id] = grade(this.item(id), correct, now, this.exam);
		const d = (this.progress.days[dayKey(now)] ??= { n: 0, ok: 0 });
		d.n++; if (correct) d.ok++;
		this.persist();
	}
	relearn(id: string, now = Date.now()) { this.progress.items[id] = relearnItem(this.item(id), now, this.exam); this.persist(); }
	toggleFlag(id: string) { const s = this.item(id); this.progress.items[id] = { ...s, flag: s.flag ? 0 : 1 }; this.persist(); }
	setExam(date: string | undefined) { this.progress.exam = date || undefined; this.persist(); }
	addMock(m: Mock) { this.progress.mocks.push(m); this.persist(); }
	async reset() {
		this.cancelPush();
		if (this.user) { try { await supabase!.from('progress').delete().eq('user_id', this.user.id); } catch { /* the push below overwrites anyway */ } }
		this.progress = empty(); this.persist();
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
		this.user = data.session ? { id: data.session.user.id } : null;
		if (this.user) this.pull();
		supabase!.auth.onAuthStateChange((_e, session) => {
			const next = session ? { id: session.user.id } : null;
			const signedIn = !!next && !this.user;
			this.user = next;
			if (signedIn) this.pull();
			if (!next) this.sync = 'local';
		});
	}
	async signIn(email: string): Promise<string | null> {
		if (!supabaseEnabled) return 'Cloud sync is not configured.';
		const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
		return error ? error.message : null;
	}
	async signOut() { await supabase!.auth.signOut(); this.user = null; this.sync = 'local'; }
	async pull() {
		if (!this.user) return;
		this.sync = 'syncing';
		try {
			const { data, error } = await supabase!.from('progress').select('blob').eq('user_id', this.user.id).maybeSingle();
			if (error) throw error;
			const remote = data?.blob ? parse(data.blob, IDS, Date.now()) : null;
			this.progress = remote ? merge(this.progress, remote) : this.progress;
			if (browser) localStorage.setItem(KEY, JSON.stringify(this.progress));
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
		this.progress = empty();
		if (browser) { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); }
	}
}

export const app = new AppStore();
