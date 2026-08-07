-- Keep this migration outside an explicit transaction because PostgreSQL
-- requires concurrent index creation to run on its own.
create index concurrently if not exists applications_user_created_at_desc_idx
  on public.applications (user_id, created_at desc, id desc);

analyze public.applications;
