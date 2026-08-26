/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Cache the app shell and content so a session works without signal. Supabase calls are never cached.
import { base, build, files, version } from "$service-worker";

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `mtt-${version}`;
const ASSETS = [...build, ...files, base + "/"];

sw.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => sw.skipWaiting())); });
sw.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => sw.clients.claim())); });
sw.addEventListener('fetch', (e) => {
	const url = new URL(e.request.url);
	if (e.request.method !== 'GET' || url.origin !== location.origin) return;
	e.respondWith((async () => {
		const cache = await caches.open(CACHE);
		const hit = await cache.match(e.request);
		if (hit) return hit;
		try {
			const res = await fetch(e.request);
			if (res.ok && (e.request.mode === 'navigate' || url.pathname.startsWith(base + "/_app/"))) cache.put(e.request, res.clone());
			return res;
		} catch {
			return (await cache.match(base + "/")) ?? Response.error();
		}
	})());
});
