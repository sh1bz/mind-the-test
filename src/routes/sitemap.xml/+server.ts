import { sitemap } from '$lib/seo/text';
export const prerender = true;
export const trailingSlash = 'never';
export const GET = () => new Response(sitemap(new Date().toISOString().slice(0, 10)), { headers: { 'Content-Type': 'application/xml' } });
