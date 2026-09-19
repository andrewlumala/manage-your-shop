-- Kikuubo Wholesale Tracker — shared workspace sync schema
--
-- Everyone who logs in (via Supabase Auth — see the app's Login screen)
-- shares the SAME data: one inventory, one sales log, one set of debtors,
-- across every device. There's no per-user data split — accounts exist to
-- gate who can get in and, later, who did what, not to separate workspaces.
--
-- Run this once in your Supabase project's SQL Editor (Project → SQL Editor
-- → New query → paste this whole file → Run). Safe to re-run — it drops and
-- recreates the policy each time.

create table if not exists workspace_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table workspace_data enable row level security;

-- Only a signed-in user (any account created via Supabase Auth on this
-- project) can read or write. Anonymous requests — i.e. someone who only
-- has the public URL/anon key but no login — are rejected by RLS.
drop policy if exists "Allow anon full access" on workspace_data;
drop policy if exists "Allow authenticated full access" on workspace_data;
create policy "Allow authenticated full access"
  on workspace_data
  for all
  to authenticated
  using (true)
  with check (true);

-- Enables live updates: when one device saves, every other open tab/device
-- receives the change automatically instead of needing a manual refresh.
alter publication supabase_realtime add table workspace_data;

-- Optional but recommended once your team has accounts set up: in the
-- Supabase dashboard under Authentication → Sign In / Providers → Email,
-- turn OFF "Allow new users to sign up". That stops anyone else who finds
-- this app's URL from creating their own account — from then on, only you
-- can add staff, via Authentication → Users → Invite user.

-- IMPORTANT — what this policy does and doesn't protect:
-- This RLS policy only checks that a request comes from a signed-in user —
-- it does not check their role (owner vs staff). Role-based restrictions
-- (staff can't see cost prices, can't delete records, can't reach Settings,
-- etc.) are enforced by the app's interface only. A staff member who opens
-- their browser's developer tools and calls the Supabase API directly could
-- still read or write anything an owner could, bypassing the app's UI
-- entirely. Treat roles here as "keeps honest people from seeing/doing
-- things that aren't their job," not as a hard security boundary against a
-- technically determined staff member. A true per-role database boundary
-- would need the policy itself to check each request's role against a
-- proper relational team table — a larger change than this file makes.
