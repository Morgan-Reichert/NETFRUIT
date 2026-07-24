-- ============================================================================
-- NETFRUIT — Admin back-office: support/report tickets, sanctions, account
-- metrics. Run ONCE in SQL Editor (after schema.sql + monetization.sql).
-- ============================================================================

-- ---- support / report tickets ----------------------------------------------
create table if not exists tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete set null,
  category    text not null default 'support',   -- support | report | appeal
  subject     text not null,
  body        text,
  target_type text,  target_id uuid,             -- content report target
  status      text not null default 'open',      -- open | in_progress | resolved | closed
  priority    text not null default 'normal',    -- low | normal | high
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tickets_status_idx on tickets(status, created_at desc);
alter table tickets enable row level security;
drop policy if exists "ticket own insert" on tickets;
create policy "ticket own insert" on tickets for insert with check (user_id = auth.uid());
drop policy if exists "ticket own read" on tickets;
create policy "ticket own read" on tickets for select using (user_id = auth.uid() or is_admin());
drop policy if exists "ticket admin update" on tickets;
create policy "ticket admin update" on tickets for update using (is_admin());

create table if not exists ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references tickets on delete cascade,
  author_id  uuid references auth.users on delete set null,
  body       text not null,
  is_staff   boolean not null default false,
  created_at timestamptz not null default now()
);
alter table ticket_messages enable row level security;
drop policy if exists "tmsg read" on ticket_messages;
create policy "tmsg read" on ticket_messages for select using (
  is_admin() or exists (select 1 from tickets t where t.id = ticket_id and t.user_id = auth.uid()));
drop policy if exists "tmsg insert" on ticket_messages;
create policy "tmsg insert" on ticket_messages for insert with check (
  author_id = auth.uid() and (is_admin() or exists (select 1 from tickets t where t.id = ticket_id and t.user_id = auth.uid())));

-- ---- sanctions -------------------------------------------------------------
create table if not exists sanctions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  kind       text not null,                      -- warning | suspension | ban
  reason     text,
  issued_by  uuid,
  starts_at  timestamptz not null default now(),
  expires_at timestamptz,                         -- null = permanent
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists sanctions_user_idx on sanctions(user_id, active);
alter table sanctions enable row level security;
drop policy if exists "sanction own read" on sanctions;
create policy "sanction own read" on sanctions for select using (user_id = auth.uid() or is_admin());

-- Viewer: is the caller currently banned/suspended? Returns kind or null.
create or replace function my_sanction()
returns table(kind text, reason text, expires_at timestamptz)
language sql stable as $$
  select kind, reason, expires_at from sanctions
  where user_id = auth.uid() and active and kind in ('ban','suspension')
    and (expires_at is null or expires_at > now())
  order by created_at desc limit 1
$$;

-- ---- admin RPCs (SECURITY DEFINER, guarded by is_admin) ---------------------
create or replace function admin_accounts()
returns table(user_id uuid, email text, created_at timestamptz, is_creator boolean,
              creator_status text, series_watched bigint, seconds_watched bigint,
              open_tickets bigint, active_sanction text)
language sql security definer as $$
  select u.id, u.email::text, u.created_at,
    (c.id is not null), c.status,
    coalesce(w.sw, 0), coalesce(w.sec, 0),
    coalesce(tk.n, 0),
    s.kind
  from auth.users u
  left join creators c on c.id = u.id
  left join (select user_id, count(distinct series_id) sw, sum(watch_time_sec) sec
             from watch_history group by user_id) w on w.user_id = u.id
  left join (select user_id, count(*) n from tickets where status in ('open','in_progress') group by user_id) tk on tk.user_id = u.id
  left join lateral (select kind from sanctions where user_id = u.id and active
                     and (expires_at is null or expires_at > now()) order by created_at desc limit 1) s on true
  where is_admin()
  order by u.created_at desc
$$;

create or replace function sanction_user(uid uuid, kind_ text, reason_ text, days int)
returns text language plpgsql security definer as $$
begin
  if not is_admin() then return 'FORBIDDEN'; end if;
  update sanctions set active = false where user_id = uid and active;
  if kind_ <> 'none' then
    insert into sanctions(user_id, kind, reason, issued_by, expires_at)
      values (uid, kind_, reason_, auth.uid(),
              case when days > 0 then now() + make_interval(days => days) else null end);
  end if;
  return 'OK';
end $$;
