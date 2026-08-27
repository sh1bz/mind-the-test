// Every route is prerendered to static HTML so crawlers that do not run JavaScript still read the
// page. The app on / hydrates over its landing; the (site) pages are plain content.
export const ssr = true;
export const prerender = true;
export const trailingSlash = 'always';
