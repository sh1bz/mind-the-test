// Where the learner is. Tabs live in the URL hash; Train and Mock are full-screen states on top.
import { browser } from '$app/environment';

export type Tab = 'today' | 'map' | 'questions' | 'account';
export type Screen = 'tabs' | 'welcome' | 'train' | 'summary' | 'mock';
export type TrainKind = 'smart' | 'review' | 'new' | 'weak' | 'custom';
export type TrainSpec = { kind: TrainKind; topic: number | null; ids?: string[]; title: string };
export type SummarySpec = { answered: number; firstTry: number; best: number; before: number; after: number };

const TABS: Tab[] = ['today', 'map', 'questions', 'account'];
const fromHash = (): Tab => { const h = browser ? location.hash.replace(/^#\/?/, '') : ''; return (TABS as string[]).includes(h) ? (h as Tab) : 'today'; };

class Nav {
	tab = $state<Tab>(fromHash());
	screen = $state<Screen>('tabs');
	train = $state<TrainSpec>({ kind: 'smart', topic: null, title: "Today's session" });
	summary = $state<SummarySpec | null>(null);
	placement = $state(false);
	topic = $state<number | null>(null); // Today's line filter
	sheet = $state<string | null>(null); // map card id open in a sheet
	mapFocus = $state<string | null>(null); // section id the Map tab opens on

	constructor() {
		if (browser) addEventListener('hashchange', () => { this.tab = fromHash(); if (this.screen === 'tabs' || this.screen === 'summary') this.screen = 'tabs'; });
	}
	go(tab: Tab) { this.tab = tab; this.screen = 'tabs'; if (browser && location.hash !== '#' + tab) history.pushState(null, '', '#' + tab); }
	startTrain(spec: TrainSpec) { this.train = spec; this.screen = 'train'; this.sheet = null; }
	startMock(placement = false) { this.placement = placement; this.screen = 'mock'; }
	finishTrain(s: SummarySpec) { this.summary = s; this.screen = 'summary'; }
	home() { this.screen = 'tabs'; this.go('today'); }
	openMap(section: string) { this.mapFocus = section; this.go('map'); }
}
export const nav = new Nav();
