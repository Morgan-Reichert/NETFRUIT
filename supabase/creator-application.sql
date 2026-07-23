-- ============================================================================
-- NETFRUIT — Creator application & certification (run ONCE in SQL Editor)
-- Becoming a creator now requires a reviewed application (questionnaire +
-- proofs). Creators start 'pending' and can only publish once 'approved'.
-- ============================================================================

alter table creators add column if not exists status       text not null default 'pending'; -- pending | approved | rejected
alter table creators add column if not exists socials      jsonb;        -- { tiktok, instagram, youtube, x }
alter table creators add column if not exists portfolio_url text;
alter table creators add column if not exists experience   text;
alter table creators add column if not exists answers      jsonb;        -- questionnaire answers
alter table creators add column if not exists applied_at   timestamptz default now();
alter table creators add column if not exists reviewed_at  timestamptz;
alter table creators add column if not exists review_note  text;

-- Admins can review (update status of) any creator application.
drop policy if exists "creators admin update" on creators;
create policy "creators admin update" on creators for update using (is_admin());

-- Publishing gate: a series can only go 'pending'/'published' if its creator is
-- approved. (Belt-and-suspenders — the UI also enforces this.)
create or replace function creator_is_approved(cid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from creators where id = cid and status = 'approved')
$$;

-- The house account is already trusted — approve it so we don't lock ourselves out.
update creators set status = 'approved' where handle = 'netfruit';

-- Extra application fields (identity — birth date is required in the UI for 18+ check)
alter table creators add column if not exists birth_date date;
alter table creators add column if not exists legal_name text;
alter table creators add column if not exists country    text;
