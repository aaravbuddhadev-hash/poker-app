-- Riverline: accounts and cloud sync.
--
-- Run this once in the Supabase SQL editor (or with `supabase db push`).
-- Every table has row-level security: a signed-in user can only ever read or
-- write their own rows. The browser uses the public "publishable" key, so
-- these policies are what keep accounts apart.

-- ---------------------------------------------------------------------------
-- Sessions: one row per recorded session.
-- ---------------------------------------------------------------------------
create table public.sessions (
  user_id           uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id                text        not null check (char_length(id) between 1 and 80),
  date              date        not null,
  mode              text        not null check (mode in ('simple', 'detailed')),
  net_cents         bigint      not null check (abs(net_cents) <= 100000000000),
  start_cents       bigint      check (start_cents between 0 and 100000000000),
  end_cents         bigint      check (end_cents between 0 and 100000000000),
  duration_minutes  integer     check (duration_minutes between 1 and 2880),
  game_type         text        check (char_length(game_type) <= 40),
  notes             text        check (char_length(notes) <= 2000),
  -- Client clock: decides which edit wins when two devices change the same session.
  created_at        timestamptz not null,
  updated_at        timestamptz not null,
  -- Deletes are kept as tombstones so other devices learn about them.
  deleted_at        timestamptz,
  -- Server clock: lets each device fetch only what changed since its last sync.
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id),
  -- Detailed entries must agree with their start and end amounts.
  check (mode = 'simple' or (start_cents is not null and end_cents is not null and net_cents = end_cents - start_cents))
);

create index sessions_user_changes on public.sessions (user_id, server_updated_at);

-- Stamp the server time on every write, and never let an older edit replace a
-- newer one (a device that was offline may push stale changes later).
create function public.sessions_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null; -- keep the newer row
  end if;
  new.server_updated_at := now();
  return new;
end;
$$;

create trigger sessions_before_write
  before insert or update on public.sessions
  for each row execute function public.sessions_before_write();

alter table public.sessions enable row level security;

create policy "Read own sessions" on public.sessions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own sessions" on public.sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Change own sessions" on public.sessions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Remove own sessions" on public.sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Progress: one document per user (lessons, puzzles, quizzes, achievements).
-- Devices merge it client-side; see src/sync/progressMerge.ts.
-- ---------------------------------------------------------------------------
create table public.progress (
  user_id    uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  doc        jsonb       not null default '{}'::jsonb check (pg_column_size(doc) < 1000000),
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "Read own progress" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own progress" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Change own progress" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Let people delete their own account. Their sessions and progress go with it
-- (on delete cascade).
-- ---------------------------------------------------------------------------
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
