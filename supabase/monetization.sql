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
