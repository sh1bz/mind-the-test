/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Cache the app shell and content so a session works without signal. Supabase calls are never cached.
// Navigations are network-first so a new deploy shows on the next load; hashed build files are cache-first.
import { base, build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `mtt-${version}`;
const SHELL = base + '/';
const ASSETS = [...build, ...files, SHELL];

sw.addEventListener('install', (e) => {
	e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' })))).then(() => sw.skipWaiting()));
});
sw.addEventListener('activate', (e) => {
	e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => sw.clients.claim()));
});
sw.addEventListener('fetch', (e) => {
	const url = new URL(e.request.url);
	if (e.request.method !== 'GET' || url.origin !== location.origin) return;
	e.respondWith((async () => {
		const cache = await caches.open(CACHE);
		if (e.request.mode === 'navigate') {
			try {
				XX				if (res.ok) cache.put(SHELL, res.clone());
				return res;
			} catch {
				return (await cache.match(SHELL)) ?? Response.error();
			}
		}
		const hit = await cache.match(e.request);
		if (hit) return hit;
		try {
			XX			if (res.ok && url.pathname.startsWith(base + '/_app/')) cache.put(e.request, res.clone());
			return res;
		} catch {
			return Response.error();
		}
	})());
});
