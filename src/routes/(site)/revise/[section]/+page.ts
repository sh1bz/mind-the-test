import { error } from '@sveltejs/kit';
import { MAP } from '$lib/content';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => MAP.map((s) => ({ section: s.id }));

export const load: PageLoad = ({ params }) => {
	const section = MAP.find((s) => s.id === params.section);
	if (!section) error(404, 'No such section');
	return { section };
};
