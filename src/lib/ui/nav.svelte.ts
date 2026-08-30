// Where the learner is. Tabs live in the URL hash; Train and Mock are full-screen states on top.
import { browser } from '$app/environment';
import { app } from '$lib/store/app.svelte';
import { locked, type Want } from '$lib/engine/gate';
import { plan } from '$lib/ui/derive';

export type Tab = 'today' | 'map' | 'questions' | 'account';
export type Screen = 'tabs' | 'welcome' | 'train' | 'summary' | 'mock';
export type TrainKind = 'smart' | 'review' | 'new' | 'weak' | 'custom';
export type TrainSpec = { kind: TrainKind; topic: number | null; ids?: string[]; title: string };
export type SummarySpec = { answered: number; firstTry: number; best: number; before: number; after: number };

const TABS: Tab[] = ['today', 'map', 'questions', 'account'];
const fromHash = (): Tab => { const h = browser ? location.hash.replace(/^#\/?/, '') : ''; return (TABS as string[]).includes(h) ? (h as Tab) : 'today'; };

/** Reviews of seen questions are free; anything that brings new questions is a session. */
function wantOf(spec: TrainSpec): Want {
	if (spec.kind === 'review' || spec.kind === 'weak') return 'review';
	if (spec.kind === 'custom') return spec.ids?.every((id) => app.item(id).seen > 0) ? 'review' : 'session';
	if (spec.kind === 'smart' && plan(app.progress, (id) => app.item(id), Date.now(), spec.topic).fresh === 0) return 'review';
	return 'session';
}

class Nav {
	tab = $state<Tab>(fromHash());
	screen = $state<Screen>('tabs');
	train = $state<TrainSpec>({ kind: 'smart', topic: null, title: 'Training' });
	summary = $state<SummarySpec | null>(null);
	placement = $state(false);
	topic = $state<number | null>(null); // Today's line filter
	sheet = $state<string | null>(null); // map card id open in a sheet
	mapFocus = $state<string | null>(null); // section id the Map tab opens on
	onboarding = $state(false); // "How it works" reopened from Account
	paywall = $state<'gate' | 'thanks' | null>(null); // unlock sheet: the gate, or the return from Stripe

	constructor() {
		if (browser) addEventListener('hashchange', () => { this.tab = fromHash(); if (this.screen === 'tabs' || this.screen === 'summary') this.screen = 'tabs'; });
	}
	go(tab: Tab) { this.tab = tab; this.screen = 'tabs'; if (browser && location.hash !== '#' + tab) history.pushState(null, '', '#' + tab); }
	startTrain(spec: TrainSpec) {
		if (locked(app.gate, wantOf(spec))) { this.paywall = 'gate'; return; }
		this.train = spec; this.screen = 'train'; this.sheet = null;
	}
	startMock(placement = false) {
		if (locked(app.gate, 'mock')) { this.paywall = 'gate'; return; }
		this.placement = placement; this.screen = 'mock';
	}
	finishTrain(s: SummarySpec) { this.summary = s; this.screen = 'summary'; }
	home() { this.screen = 'tabs'; this.go('today'); }
	showOnboarding() { this.go('today'); this.onboarding = true; }
	openMap(section: string) { this.mapFocus = section; this.go('map'); }
}
export const nav = new Nav();
