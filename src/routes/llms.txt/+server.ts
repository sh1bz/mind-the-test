import { llms } from '$lib/seo/text';
export const prerender = true;
export const trailingSlash = 'never';
export const GET = () => new Response(llms(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
