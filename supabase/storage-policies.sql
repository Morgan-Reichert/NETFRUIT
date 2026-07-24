-- ============================================================================
-- NETFRUIT — Storage policies for creator self-serve upload (Phase 1)
-- Run ONCE in Supabase → SQL Editor (after schema.sql).
-- The 'episodes' bucket is public-read already; these add authenticated WRITE.
-- Files live under  <creator-uid>/<series-slug>/<file>  so each creator can
-- only write inside their own folder.
-- ============================================================================

-- Authenticated users may upload into their own top-level folder.
drop policy if exists "creator upload own folder" on storage.objects;
create policy "creator upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'episodes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ...and update/replace files in their own folder. WITH CHECK is required so
-- that `upsert: true` (INSERT ... ON CONFLICT UPDATE) is allowed to overwrite.
drop policy if exists "creator update own folder" on storage.objects;
create policy "creator update own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'episodes'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'episodes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ...and delete their own files.
drop policy if exists "creator delete own folder" on storage.objects;
create policy "creator delete own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'episodes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT policy is REQUIRED for `upsert: true` uploads (the storage API reads
-- the existing row to resolve the conflict). The bucket is public anyway.
drop policy if exists "episodes read objects" on storage.objects;
create policy "episodes read objects" on storage.objects
  for select using (bucket_id = 'episodes');
