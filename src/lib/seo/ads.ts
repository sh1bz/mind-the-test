// Google Ads conversion tracking. Inert until PUBLIC_GADS_ID is set at build time.
// Consent Mode v2 with everything denied by default: no cookies are written, the tag sends
// cookieless pings and Ads models the conversions. No banner needed for that.
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

const ID = env.PUBLIC_GADS_ID ?? '';
const LABEL: Record<Kind, string | undefined> = {
	unlock: env.PUBLIC_GADS_UNLOCK,
	start: env.PUBLIC_GADS_START,
	date: env.PUBLIC_GADS_DATE
};
export type Kind = 'unlock' | 'start' | 'date';
export const adsEnabled = !!ID;

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } }

/** Inject the Google tag once per page load. Safe to call on every page. */
export function loadAds() {
	if (!browser || !ID || window.gtag) return;
	window.dataLayer = window.dataLayer || [];
	window.gtag = function () { window.dataLayer!.push(arguments); };
	window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
	window.gtag('js', new Date());
	window.gtag('config', ID, { allow_google_signals: false });
	const s = document.createElement('script');
	s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
	document.head.appendChild(s);
}

/** Report a conversion once per device per kind. Value only for the unlock. */
export function convert(kind: Kind, value?: number) {
	if (!browser || !ID || !LABEL[kind]) return;
	const key = 'lifeuk-conv-' + kind;
	try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch { /* fine */ }
	loadAds();
	window.gtag?.('event', 'conversion', { send_to: `${ID}/${LABEL[kind]}`, ...(value ? { value, currency: 'GBP' } : {}) });
}
