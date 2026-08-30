/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Cache the app shell and content so a session works without signal. Supabase calls are never cached.
// Navigations are network-first and bypass the HTTP cache (GitHub Pages sets max-age=600),
// so a new deploy shows on the next load; hashed build files are cache-first.
import { base, build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `mtt-${version}`;
const SHELL = base + '/';
const ASSETS = [...build, ...files, SHELL];

sw.addEventListener('install', (e) => {
	e.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' }))))
			.then(() => sw.skipWaiting())
	);
});
sw.addEventListener('activate', (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});
sw.addEventListener('fetch', (e) => {
	const url = new URL(e.request.url);
	if (e.request.method !== 'GET' || url.origin !== location.origin) return;
	e.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			if (e.request.mode === 'navigate') {
				try {
					const res = await fetch(e.request, { cache: 'no-cache' });
					if (res.ok) cache.put(SHELL, res.clone());
					return res;
				} catch {
					return (await cache.match(SHELL)) ?? Response.error();
				}
			}
			// env.js carries the public config (Supabase, pay link) and is NOT content-hashed, so a
			// cache-first copy can go stale and wrongly disable sign-in. Always try network first.
			if (url.pathname === base + '/_app/env.js') {
				try {
					const res = await fetch(e.request, { cache: 'no-cache' });
					if (res.ok) cache.put(e.request, res.clone());
					return res;
				} catch {
					return (await cache.match(e.request)) ?? Response.error();
				}
			}
			const hit = await cache.match(e.request);
			if (hit) return hit;
			try {
				const res = await fetch(e.request);
				if (res.ok && url.pathname.startsWith(base + '/_app/')) cache.put(e.request, res.clone());
				return res;
			} catch {
				return Response.error();
			}
		})()
	);
});
