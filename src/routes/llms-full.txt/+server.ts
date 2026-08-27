import { llmsFull } from '$lib/seo/text';
export const prerender = true;
export const trailingSlash = 'never';
export const GET = () => new Response(llmsFull(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
