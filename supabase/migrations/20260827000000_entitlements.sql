-- One row per email that paid the one-off unlock. Written only by the Stripe webhook
-- (service role). A signed-in user can read their own row, keyed on the JWT email.
create table if not exists public.entitlements (
	email text primary key,
	paid_at timestamptz not null default now(),
	stripe_session text,
	amount integer
);

alter table public.entitlements enable row level security;

drop policy if exists "own entitlement select" on public.entitlements;
create policy "own entitlement select" on public.entitlements for select
	using (email = lower(coalesce(auth.jwt() ->> 'email', '')));
