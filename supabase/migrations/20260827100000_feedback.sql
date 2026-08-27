-- One row per feedback card sent: an NPS score (0–10) and one free-text line, asked once after the
-- first mock. Anyone can insert (guests too); nobody reads it from the app — read it in the dashboard.
create table if not exists public.feedback (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references auth.users (id) on delete set null,
	email text,
	score smallint check (score between 0 and 10),
	text text check (char_length(text) <= 1000),
	answered integer,
	mocks integer,
	mock_score integer,
	created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "anyone inserts feedback" on public.feedback;
create policy "anyone inserts feedback" on public.feedback for insert to anon, authenticated
	with check (user_id is null or user_id = auth.uid());
