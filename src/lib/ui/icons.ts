// Line icons (24-box, stroke). Used inside <Ic> tiles and the tab bar.
export const ICONS = {
	review: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4.5h4.5"/>',
	plus: '<path d="M12 5v14M5 12h14"/>',
	warn: '<path d="M12 4 2.5 20h19L12 4z"/><path d="M12 10v4M12 17.5v.5"/>',
	clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
	check: '<path d="M5 12.5 9.5 17 19 7"/>',
	heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
	star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"/>',
	globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17"/>',
	column: '<path d="M4 20h16M6 17V10M10 17V10M14 17V10M18 17V10M3.5 10 12 4.5 20.5 10z"/>',
	building: '<path d="M5 20V6l7-3 7 3v14"/><path d="M9 20v-5h6v5M9 9h1M14 9h1M9 12h1M14 12h1"/>',
	scales: '<path d="M12 4v16M6 20h12M4 8h16"/><path d="M7 8l-3 6a3 3 0 0 0 6 0zM17 8l-3 6a3 3 0 0 0 6 0z"/>',
	ball: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c-4 4-4 13 0 17M12 3.5c4 4 4 13 0 17M4 9.5h16M4 14.5h16"/>',
	flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
	trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6"/>',
	calendar: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8 3v4M16 3v4"/>',
	cloud: '<path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 9a4.5 4.5 0 0 1 0 9z"/>',
	download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
	upload: '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>',
	trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6"/>',
	person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
	list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
	map: '<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
	house: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>',
	search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
	book: '<path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/>',
	bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
	mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>'
} as const;
export type IconName = keyof typeof ICONS;
export const TOPIC_ICONS: IconName[] = ['star', 'globe', 'column', 'building', 'scales', 'ball'];
