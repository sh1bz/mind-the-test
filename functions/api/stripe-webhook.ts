// Cloudflare Pages Function: POST /api/stripe-webhook
// Verifies the Stripe signature, then records the payer's email in Supabase `entitlements`.
// Secrets (wrangler pages secret put): STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
type Env = { STRIPE_WEBHOOK_SECRET: string; SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string };
type Ctx = { request: Request; env: Env };

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

async function verify(body: string, header: string | null, secret: string): Promise<boolean> {
	if (!header) return false;
	const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
	const t = parts.t, v1 = parts.v1;
	if (!t || !v1) return false;
	if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
	const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const sig = hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${body}`)));
	if (sig.length !== v1.length) return false;
	let diff = 0;
	for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ v1.charCodeAt(i);
	return diff === 0;
}

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
	if (!env.STRIPE_WEBHOOK_SECRET || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return new Response('not configured', { status: 500 });
	const body = await request.text();
	if (!(await verify(body, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET))) return new Response('bad signature', { status: 400 });
	const event = JSON.parse(body) as { type: string; data: { object: { id: string; payment_status?: string; amount_total?: number; customer_details?: { email?: string | null }; customer_email?: string | null } } };
	if (event.type !== 'checkout.session.completed') return new Response('ignored', { status: 200 });
	const s = event.data.object;
	const email = (s.customer_details?.email ?? s.customer_email ?? '').trim().toLowerCase();
	if (!email || s.payment_status !== 'paid') return new Response('no paid email', { status: 200 });
	const r = await fetch(`${env.SUPABASE_URL}/rest/v1/entitlements`, {
		method: 'POST',
		headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
		body: JSON.stringify({ email, stripe_session: s.id, amount: s.amount_total ?? null })
	});
	if (!r.ok) return new Response('supabase ' + r.status, { status: 500 });
	return new Response('ok', { status: 200 });
}
