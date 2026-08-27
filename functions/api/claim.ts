// Cloudflare Pages Function: POST /api/claim  { session_id }
// Back from Stripe Checkout: verifies the session with Stripe, records the entitlement, and returns a one-time
// Supabase magic-link token so the buyer is signed in without opening an email. Each session can be claimed once.
// Secrets: STRIPE_SECRET_KEY (restricted: Checkout Sessions read), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
type Env = { STRIPE_SECRET_KEY: string; SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string };
type Ctx = { request: Request; env: Env };
const MAX_AGE = 3600; // seconds since checkout

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
	if (!env.STRIPE_SECRET_KEY || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'not configured' }, 500);
	let sid = '';
	try { sid = String(((await request.json()) as { session_id?: string }).session_id ?? ''); } catch { /* fallthrough */ }
	if (!/^cs_(live|test)_[A-Za-z0-9]{20,}$/.test(sid)) return json({ error: 'bad session' }, 400);

	const sr = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sid}`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
	if (!sr.ok) return json({ error: 'unknown session' }, 404);
	const s = (await sr.json()) as { id: string; created: number; payment_status: string; amount_total?: number; customer_details?: { email?: string | null }; customer_email?: string | null };
	const email = (s.customer_details?.email ?? s.customer_email ?? '').trim().toLowerCase();
	if (s.payment_status !== 'paid' || !email) return json({ error: 'not paid' }, 402);
	if (Date.now() / 1000 - s.created > MAX_AGE) return json({ error: 'expired' }, 410);

	const sb = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
	const rest = `${env.SUPABASE_URL}/rest/v1/entitlements`;
	const prev = await fetch(`${rest}?email=eq.${encodeURIComponent(email)}&select=claimed_at,stripe_session`, { headers: sb });
	const rows = prev.ok ? ((await prev.json()) as { claimed_at: string | null; stripe_session: string | null }[]) : [];
	if (rows[0]?.claimed_at && rows[0].stripe_session === s.id) return json({ error: 'already claimed' }, 409);
	const up = await fetch(rest, {
		method: 'POST',
		headers: { ...sb, Prefer: 'resolution=merge-duplicates' },
		body: JSON.stringify({ email, stripe_session: s.id, amount: s.amount_total ?? null, claimed_at: new Date().toISOString() })
	});
	if (!up.ok) return json({ error: 'supabase ' + up.status }, 500);

	// A magic-link token the client redeems with verifyOtp. Creates the user when the email is new.
	let link = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, { method: 'POST', headers: sb, body: JSON.stringify({ type: 'magiclink', email }) });
	if (!link.ok) {
		const pw = crypto.randomUUID() + crypto.randomUUID();
		link = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, { method: 'POST', headers: sb, body: JSON.stringify({ type: 'signup', email, password: pw }) });
	}
	if (!link.ok) return json({ error: 'auth ' + link.status }, 500);
	const l = (await link.json()) as { hashed_token?: string; properties?: { hashed_token?: string; verification_type?: string }; verification_type?: string };
	const token_hash = l.hashed_token ?? l.properties?.hashed_token;
	const type = (l.verification_type ?? l.properties?.verification_type ?? 'magiclink') === 'signup' ? 'signup' : 'magiclink';
	if (!token_hash) return json({ error: 'no token' }, 500);
	return json({ email, token_hash, type });
}
