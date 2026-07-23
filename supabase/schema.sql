-- ============================================================================
-- NETFRUIT — Marketplace schema (Phase 0 foundation)
-- Run this ONCE in the Supabase dashboard → SQL Editor.
-- Safe to re-run: uses "if not exists" / "or replace" everywhere.
--
-- Model: creators publish series; each series is either a direct PURCHASE
-- (creator sets price, NETFRUIT takes a cut) or included in the NETFRUIT
-- SUBSCRIPTION (creator paid per-view). Pricing columns exist now but are NOT
-- enforced until Phase 2 (Stripe). Phase 1 runs everything as free.
-- ============================================================================

-- ---------- admins (you) ----------------------------------------------------
create table if not exists admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table admins enable row level security;
-- Only admins can read the admin list; nobody can self-insert (add yourself in SQL).
drop policy if exists "admins read" on admins;
create policy "admins read" on admins for select using (auth.uid() = user_id);

create or replace function is_admin() returns boolean language sql stable as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

-- ---------- creators (opt-in producer profile, 1:1 with an auth user) -------
create table if not exists creators (
  id          uuid primary key references auth.users on delete cascade,
  handle      text unique not null,
  display_name text not null,
  bio         text,
  avatar_url  text,
  is_pro      boolean not null default false,   -- Creator Pro subscription (Phase 2/3)
  created_at  timestamptz not null default now()
);
alter table creators enable row level security;
drop policy if exists "creators public read" on creators;
create policy "creators public read" on creators for select using (true);
drop policy if exists "creators self upsert" on creators;
create policy "creators self upsert" on creators for insert with check (auth.uid() = id);
drop policy if exists "creators self update" on creators;
create policy "creators self update" on creators for update using (auth.uid() = id);

-- ---------- series ----------------------------------------------------------
-- monetization: 'free' | 'purchase' | 'subscription'
-- status:       'draft' | 'pending' | 'published' | 'rejected'
create table if not exists series (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references creators on delete cascade,
  slug         text unique not null,
  title        text not null,
  synopsis     text,
  fruit        text,                 -- theme key (banana, strawberry, …)
  genres       text[] not null default '{}',
  tags         text[] not null default '{}',
  poster_url   text,
  maturity     text default 'PG',
  is_original  boolean not null default false,   -- NETFRUIT Originals (house flagship)
  monetization text not null default 'free',
  price_cents  integer,              -- for 'purchase'; null otherwise
  status       text not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists series_creator_idx on series(creator_id);
create index if not exists series_status_idx on series(status);
alter table series enable row level security;
-- Anyone can read PUBLISHED series; owners and admins can read all of their own.
drop policy if exists "series public read" on series;
create policy "series public read" on series for select
  using (status = 'published' or creator_id = auth.uid() or is_admin());
drop policy if exists "series owner insert" on series;
create policy "series owner insert" on series for insert with check (creator_id = auth.uid());
drop policy if exists "series owner update" on series;
create policy "series owner update" on series for update
  using (creator_id = auth.uid() or is_admin());
drop policy if exists "series owner delete" on series;
create policy "series owner delete" on series for delete
  using (creator_id = auth.uid() or is_admin());

-- ---------- episodes --------------------------------------------------------
create table if not exists episodes (
  id           uuid primary key default gen_random_uuid(),
  series_id    uuid not null references series on delete cascade,
  season       integer not null default 1,
  ep           integer not null,          -- episode number within the season
  number       integer not null,          -- global order within the series
  title        text not null,
  video_url    text not null,
  duration_sec integer not null default 0,
  subtitles    jsonb,                      -- { fr:[{start,end,text}], en:[…], es:[…] }
  baked_audio  boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (series_id, number)
);
create index if not exists episodes_series_idx on episodes(series_id);
alter table episodes enable row level security;
-- Readable when the parent series is readable (published, owned, or admin).
drop policy if exists "episodes read" on episodes;
create policy "episodes read" on episodes for select using (
  exists (select 1 from series s where s.id = series_id
          and (s.status = 'published' or s.creator_id = auth.uid() or is_admin()))
);
drop policy if exists "episodes owner write" on episodes;
create policy "episodes owner write" on episodes for all using (
  exists (select 1 from series s where s.id = series_id
          and (s.creator_id = auth.uid() or is_admin()))
) with check (
  exists (select 1 from series s where s.id = series_id
          and (s.creator_id = auth.uid() or is_admin()))
);

-- ---------- follows (viewer → creator) -------------------------------------
create table if not exists follows (
  viewer_id  uuid not null references auth.users on delete cascade,
  creator_id uuid not null references creators on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, creator_id)
);
alter table follows enable row level security;
drop policy if exists "follows self" on follows;
create policy "follows self" on follows for all
  using (viewer_id = auth.uid()) with check (viewer_id = auth.uid());

-- ---------- reports (moderation) -------------------------------------------
create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null,               -- 'series' | 'episode' | 'creator'
  target_id   uuid not null,
  reporter_id uuid references auth.users on delete set null,
  reason      text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table reports enable row level security;
drop policy if exists "reports insert" on reports;
create policy "reports insert" on reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "reports admin read" on reports;
create policy "reports admin read" on reports for select using (is_admin());

-- ---------- episode_stats (lightweight analytics) --------------------------
create table if not exists episode_stats (
  episode_id uuid primary key references episodes on delete cascade,
  views      bigint not null default 0,
  completes  bigint not null default 0
);
alter table episode_stats enable row level security;
drop policy if exists "stats public read" on episode_stats;
create policy "stats public read" on episode_stats for select using (true);
-- increments happen via a SECURITY DEFINER rpc so anon can't set arbitrary values
create or replace function bump_view(ep uuid, completed boolean default false)
returns void language plpgsql security definer as $$
begin
  insert into episode_stats (episode_id, views, completes)
  values (ep, 1, case when completed then 1 else 0 end)
  on conflict (episode_id) do update
    set views = episode_stats.views + 1,
        completes = episode_stats.completes + (case when completed then 1 else 0 end);
end $$;

-- ---------- Phase 2 (created now, unused until Stripe) ----------------------
-- Who can watch a 'purchase' series (direct sale) or via active NF subscription.
create table if not exists entitlements (
  user_id    uuid not null references auth.users on delete cascade,
  series_id  uuid not null references series on delete cascade,
  source     text not null,               -- 'purchase' | 'subscription' | 'free' | 'grant'
  created_at timestamptz not null default now(),
  primary key (user_id, series_id)
);
alter table entitlements enable row level security;
drop policy if exists "entitlements self read" on entitlements;
create policy "entitlements self read" on entitlements for select using (user_id = auth.uid());
