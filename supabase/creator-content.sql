-- ============================================================================
-- NETFRUIT — Rich creator content metadata (run ONCE in SQL Editor)
-- Age rating + content descriptors, participant credits, AI tools used,
-- per-episode banners and per-season covers.
-- ============================================================================

-- Series-level metadata
alter table series   add column if not exists age_rating    text not null default 'all';   -- all | 10 | 12 | 16 | 18
alter table series   add column if not exists content_flags text[] not null default '{}';   -- sex | violence | profanity | gore | drugs | horror | discrimination
alter table series   add column if not exists credits       jsonb;                          -- [{ role, name }]
alter table series   add column if not exists ai_tools      text[] not null default '{}';   -- e.g. Grok, Nano Banana, ElevenLabs
alter table series   add column if not exists season_covers jsonb;                          -- { "1": url, "2": url }

-- Per-episode banner / thumbnail
alter table episodes add column if not exists cover_url     text;
