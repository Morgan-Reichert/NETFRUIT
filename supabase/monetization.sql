-- ============================================================================
-- NETFRUIT — Monetization schema (Phase 2 foundation)
-- Run ONCE in Supabase → SQL Editor (after schema.sql). Idempotent.
--
-- Hybrid model: FREE (ad-supported) · TOKENS (pay-per-episode) · PREMIUM (sub).
-- Creator revenue = ad pool (55%) + token unlocks (70%) + subscription pool
-- (60% split pro-rata by real watch time). Live money movement is added later
-- via Stripe (needs the owner's Stripe account); this is the data + logic base.
-- ============================================================================

-- Per-episode price in tokens (0 = free / ad-supported)
alter table episodes add column if not exists token_cost int not null default 0;
-- Series-level token price applied to new episodes, and premium inclusion
alter table series add column if not exists episode_token_cost int not null default 0;
alter table series add column if not exists in_premium boolean not null default false;

-- ---- viewer wallet: token balance + premium status -------------------------
create table if not exists wallets (
  user_id           uuid primary key references auth.users on delete cascade,
  tokens_balance    int not null default 0,
  is_premium        boolean not null default false,
  premium_until     timestamptz,
  stripe_customer_id text,
  updated_at        timestamptz not null default now()
);
alter table wallets enable row level security;
drop policy if exists "wallet self" on wallets;
create policy "wallet self" on wallets for select using (user_id = auth.uid());

-- ---- watch history: powers subscription pro-rata payout --------------------
create table if not exists watch_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete cascade,
  episode_id    uuid references episodes on delete cascade,
  series_id     uuid references series on delete set null,
  creator_id    uuid references creators on delete set null,
  watch_time_sec int not null default 0,
  unlocked_via  text not null default 'FREE',   -- FREE | AD | TOKEN | SUBSCRIPTION
  created_at    timestamptz not null default now()
);
create index if not exists watch_history_creator_idx on watch_history(creator_id, created_at);
alter table watch_history enable row level security;
drop policy if exists "watch self write" on watch_history;
create policy "watch self write" on watch_history for insert with check (user_id = auth.uid());
drop policy if exists "watch self read" on watch_history;
create policy "watch self read" on watch_history for select using (user_id = auth.uid());

-- ---- transactions: token purchases, subs, unlocks --------------------------
create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  amount_units int not null,                 -- tokens, or cents for money
  currency    text not null default 'tokens',-- 'tokens' | 'eur'
  type        text not null,                 -- TOKEN_PURCHASE | SUBSCRIPTION | EPISODE_UNLOCK
  gateway     text,                          -- STRIPE_WEB | APPLE_IAP | GOOGLE_IAP
  series_id   uuid, episode_id uuid, creator_id uuid,
  created_at  timestamptz not null default now()
);
create index if not exists tx_creator_idx on transactions(creator_id, created_at);
alter table transactions enable row level security;
drop policy if exists "tx self read" on transactions;
create policy "tx self read" on transactions for select using (user_id = auth.uid());

-- ---- creator payouts: computed monthly -------------------------------------
create table if not exists payouts (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid not null references creators on delete cascade,
  period             text not null,                 -- 'YYYY-MM'
  ad_cents           int not null default 0,
  token_cents        int not null default 0,
  subscription_cents int not null default 0,
  total_cents        int generated always as (ad_cents + token_cents + subscription_cents) stored,
  status             text not null default 'pending', -- pending | paid
  created_at         timestamptz not null default now(),
  unique (creator_id, period)
);
alter table payouts enable row level security;
drop policy if exists "payouts creator read" on payouts;
create policy "payouts creator read" on payouts for select using (creator_id = auth.uid() or is_admin());

-- ============================================================================
-- SIMULATION RPCs (no Stripe yet) — wallet, top-up, premium, unlock.
-- SECURITY DEFINER so token math + creator credit happen server-side, safely.
-- ============================================================================

-- Create the caller's wallet with 100 starter tokens on first touch.
create or replace function ensure_wallet()
returns wallets language plpgsql security definer as $$
declare w wallets;
begin
  insert into wallets (user_id, tokens_balance) values (auth.uid(), 100)
    on conflict (user_id) do nothing;
  select * into w from wallets where user_id = auth.uid();
  return w;
end $$;

-- Simulated top-up (Stripe will replace the funding source later).
create or replace function add_tokens(n int)
returns wallets language plpgsql security definer as $$
declare w wallets;
begin
  insert into wallets (user_id, tokens_balance) values (auth.uid(), greatest(0, n))
    on conflict (user_id) do update set tokens_balance = wallets.tokens_balance + greatest(0, n), updated_at = now();
  insert into transactions(user_id, amount_units, currency, type, gateway)
    values (auth.uid(), greatest(0, n), 'tokens', 'TOKEN_PURCHASE', 'SIMULATION');
  select * into w from wallets where user_id = auth.uid();
  return w;
end $$;

-- Simulated premium toggle.
create or replace function set_premium(on_ boolean)
returns wallets language plpgsql security definer as $$
declare w wallets;
begin
  insert into wallets (user_id, is_premium) values (auth.uid(), on_)
    on conflict (user_id) do update set is_premium = on_, updated_at = now();
  select * into w from wallets where user_id = auth.uid();
  return w;
end $$;

-- Unlock a series (via one of its episodes). Premium covers premium series;
-- token series are bought with tokens and credit the creator 70% (as a tx).
-- Returns: PREMIUM | ALREADY | UNLOCKED | INSUFFICIENT | NEEDS_PREMIUM | NOTFOUND
create or replace function unlock_series(sid uuid)
returns text language plpgsql security definer as $$
declare cost int; mon text; cid uuid; bal int; prem boolean;
begin
  select s.episode_token_cost, s.monetization, s.creator_id into cost, mon, cid
    from series s where s.id = sid;
  if mon is null then return 'NOTFOUND'; end if;

  perform ensure_wallet();
  select tokens_balance, is_premium into bal, prem from wallets where user_id = auth.uid();

  if exists (select 1 from entitlements where user_id = auth.uid() and series_id = sid) then
    return 'ALREADY';
  end if;

  if mon = 'free' then
    insert into entitlements(user_id, series_id, source) values (auth.uid(), sid, 'free') on conflict do nothing;
    return 'UNLOCKED';
  elsif mon = 'subscription' then
    if not prem then return 'NEEDS_PREMIUM'; end if;
    insert into entitlements(user_id, series_id, source) values (auth.uid(), sid, 'subscription') on conflict do nothing;
    return 'PREMIUM';
  else -- purchase (tokens)
    if bal < cost then return 'INSUFFICIENT'; end if;
    update wallets set tokens_balance = tokens_balance - cost, updated_at = now() where user_id = auth.uid();
    insert into entitlements(user_id, series_id, source) values (auth.uid(), sid, 'purchase') on conflict do nothing;
    insert into transactions(user_id, amount_units, currency, type, gateway, series_id, creator_id)
      values (auth.uid(), cost, 'tokens', 'EPISODE_UNLOCK', 'SIMULATION', sid, cid);
    return 'UNLOCKED';
  end if;
end $$;
