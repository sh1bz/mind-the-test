// Pings IndexNow (Bing, Yandex, DuckDuckGo, Naver) with every URL in the live sitemap.
// Run after each deploy: npm run indexnow. Key file: static/aa8103a94a78bb888bcf66c1cdaba16b.txt
const HOST = 'untilitsticks.com';
const KEY = 'aa8103a94a78bb888bcf66c1cdaba16b';
const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const res = await fetch('https://api.indexnow.org/indexnow', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json; charset=utf-8' },
	body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList })
});
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} URLs`);
if (res.status >= 300) process.exit(1);
