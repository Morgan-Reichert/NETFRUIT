-- ============================================================================
-- NETFRUIT — Series promotion (run ONCE in SQL Editor, after monetization.sql)
-- Creators spend tokens to boost a series: it gets a "Sponsorisé" badge and a
-- featured row for the duration.
-- ============================================================================

create table if not exists promotions (
  id           uuid primary key default gen_random_uuid(),
  series_id    uuid not null references series on delete cascade,
  creator_id   uuid not null references creators on delete cascade,
  tokens_spent int not null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null
);
create index if not exists promotions_active_idx on promotions(series_id, expires_at);
alter table promotions enable row level security;
drop policy if exists "promotions public read" on promotions;
create policy "promotions public read" on promotions for select using (true);

-- Spend tokens to promote one of your own series for N days. SECURITY DEFINER.
-- Returns: OK | NOT_OWNER | INSUFFICIENT
create or replace function promote_series(sid uuid, days int, tokens int)
returns text language plpgsql security definer as $$
declare cid uuid; bal int;
begin
  select creator_id into cid from series where id = sid and creator_id = auth.uid();
  if cid is null then return 'NOT_OWNER'; end if;
  perform ensure_wallet();
  select tokens_balance into bal from wallets where user_id = auth.uid();
  if bal < tokens then return 'INSUFFICIENT'; end if;
  update wallets set tokens_balance = tokens_balance - tokens, updated_at = now() where user_id = auth.uid();
  insert into promotions(series_id, creator_id, tokens_spent, expires_at)
    values (sid, cid, tokens, now() + make_interval(days => days));
  insert into transactions(user_id, amount_units, currency, type, gateway, series_id, creator_id)
    values (auth.uid(), tokens, 'tokens', 'PROMOTION', 'SIMULATION', sid, cid);
  return 'OK';
end $$;
