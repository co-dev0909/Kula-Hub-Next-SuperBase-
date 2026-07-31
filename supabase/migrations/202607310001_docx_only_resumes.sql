begin;

-- Resume generation now produces DOCX files only. Keep the legacy PDF column
-- so existing file references can still be removed when an application or
-- profile is deleted, but do not require it for queue readiness or recovery.
comment on column public.applications.resume_pdf_path is
  'Legacy PDF path retained only for cleanup of resumes generated before DOCX-only generation.';

update storage.buckets
set allowed_mime_types = array[
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
where id = 'resumes';

create or replace function public.claim_next_pending_application_for_user(queue_user_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_application_id uuid;
begin
  if queue_user_id is null or (
    coalesce((select auth.role()), '') <> 'service_role'
    and queue_user_id <> (select auth.uid())
  ) then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(queue_user_id::text, 0)
  );

  update public.applications as application
  set
    status = case
      when application.resume_word_path is not null
      then case
        when application.queue_previous_status in (
          'Downloaded'::public.application_status,
          'Applied'::public.application_status
        ) then application.queue_previous_status
        else 'Generated'::public.application_status
      end
      else 'Failed'::public.application_status
    end,
    generation_error = case
      when application.resume_word_path is null
      then 'Automatic resume generation was interrupted before completion.'
      else null
    end,
    drive_upload_error = case
      when application.resume_word_path is not null
        and application.drive_upload_error = '__DRIVE_UPLOAD_IN_PROGRESS__'
        and (
          application.drive_file_id is null
          or application.drive_docx_link is null
        )
      then 'Automatic Google Drive upload was interrupted before completion.'
      else null
    end,
    queue_previous_status = null
  where application.user_id = queue_user_id
    and application.status = 'Generating'::public.application_status
    and application.updated_at < pg_catalog.now() - interval '6 minutes';

  if exists (
    select 1
    from public.applications as application
    where application.user_id = queue_user_id
      and application.status = 'Generating'::public.application_status
  ) then
    return null;
  end if;

  select application.id
  into next_application_id
  from public.applications as application
  where application.user_id = queue_user_id
    and application.status = 'Pending'::public.application_status
  order by application.created_at asc, application.id asc
  limit 1
  for update skip locked;

  if next_application_id is null then
    return null;
  end if;

  update public.applications as application
  set
    status = 'Generating'::public.application_status,
    generation_error = null,
    drive_upload_error = case
      when application.resume_word_path is not null
        and (
          application.drive_file_id is null
          or application.drive_docx_link is null
        )
      then '__DRIVE_UPLOAD_IN_PROGRESS__'
      else null
    end
  where application.id = next_application_id
    and application.user_id = queue_user_id;

  return next_application_id;
end;
$$;

notify pgrst, 'reload schema';

commit;
