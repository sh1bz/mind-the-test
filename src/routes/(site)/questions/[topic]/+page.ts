import { error } from '@sveltejs/kit';
import { TOPIC_SLUGS, topicIndex } from '$lib/seo/site';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => TOPIC_SLUGS.map((topic) => ({ topic }));

export const load: PageLoad = ({ params }) => {
	const t = topicIndex(params.topic);
	if (t < 0) error(404, 'No such topic');
	return { t, slug: params.topic };
};
