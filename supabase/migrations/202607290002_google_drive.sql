begin;

alter table public.applications
  add column if not exists drive_file_id text,
  add column if not exists drive_docx_link text,
  add column if not exists drive_docx_download_link text,
  add column if not exists drive_upload_error text;

comment on column public.applications.drive_file_id is 'Native Google Docs file ID for the generated resume.';
comment on column public.applications.drive_docx_link is 'Google Docs editor/viewer link.';
comment on column public.applications.drive_docx_download_link is 'Google Docs DOCX export link.';
comment on column public.applications.drive_upload_error is 'Most recent Google Drive upload error, cleared after a successful upload.';

notify pgrst, 'reload schema';

commit;
