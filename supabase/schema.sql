-- Life in the UK — Supabase schema. Run in the SQL editor of the project.
-- Sign-in is magic-link email (Supabase Auth). The app stores no name, no profile: one row
-- per user holding the progress blob, readable and writable only by that user (RLS).

create table if not exists public.progress (
	user_id uuid primary key references auth.users (id) on delete cascade,
	blob jsonb not null default '{}'::jsonb,
	updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "own progress select" on public.progress;
create policy "own progress select" on public.progress for select using (auth.uid() = user_id);
drop policy if exists "own progress insert" on public.progress;
create policy "own progress insert" on public.progress for insert with check (auth.uid() = user_id);
drop policy if exists "own progress update" on public.progress;
create policy "own progress update" on public.progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own progress delete" on public.progress;
create policy "own progress delete" on public.progress for delete using (auth.uid() = user_id);

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
alter table public.entitlements add column if not exists claimed_at timestamptz;
