begin;

create extension if not exists pgcrypto;

-- A previous SQL Editor run may have created one or more enum types before
-- stopping. Treat those existing types as valid so this migration can repair
-- that partial setup without deleting Auth users or other project data.
do $$
begin
  create type public.user_role as enum ('admin', 'user', 'bidder');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.profile_status as enum ('active', 'deactive');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.application_status as enum ('Pending', 'Generating', 'Generated', 'Downloaded', 'Applied', 'Failed');
exception
  when duplicate_object then null;
end
$$;

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  role public.user_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null default '',
  location text not null default '',
  linkedin text not null default '',
  educations jsonb not null default '[]'::jsonb,
  experiences jsonb not null default '[]'::jsonb,
  template text not null default '1',
  profile_status public.profile_status not null default 'deactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_link text not null,
  job_title text not null,
  company_name text not null,
  job_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, job_link)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  job_title text not null,
  company text not null,
  job_posted_date text,
  is_closed boolean not null default false,
  job_category text,
  seniority_level text,
  country text,
  employment_type text,
  industry_domain text,
  job_url text not null,
  description text not null default '',
  resume_pdf_path text,
  resume_word_path text,
  cv_path text,
  date_applied timestamptz,
  status public.application_status not null default 'Pending',
  generation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, job_title, company)
);

create index profiles_user_id_idx on public.profiles(user_id);
create index jobs_user_id_idx on public.jobs(user_id);
create index jobs_profile_id_idx on public.jobs(profile_id);
create index applications_user_status_idx on public.applications(user_id, status);
create index applications_profile_id_idx on public.applications(profile_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs
for each row execute function public.set_updated_at();
create trigger applications_updated_at before update on public.applications
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- Include accounts created before this migration was installed.
insert into public.user_profiles (id, first_name, last_name)
select
  id,
  coalesce(raw_user_meta_data ->> 'first_name', ''),
  coalesce(raw_user_meta_data ->> 'last_name', '')
from auth.users
on conflict (id) do nothing;

alter table public.user_profiles enable row level security;
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

grant select, update on public.user_profiles to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert, update, delete on public.applications to authenticated;

create policy "users read own account" on public.user_profiles for select to authenticated
using ((select auth.uid()) = id);
create policy "users update own account" on public.user_profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "users read own profiles" on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users create own profiles" on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "users update own profiles" on public.profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own profiles" on public.profiles for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "users read own jobs" on public.jobs for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users create own jobs" on public.jobs for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "users update own jobs" on public.jobs for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own jobs" on public.jobs for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "users read own applications" on public.applications for select to authenticated
using ((select auth.uid()) = user_id);
create policy "users create own applications" on public.applications for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "users update own applications" on public.applications for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own applications" on public.applications for delete to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 52428800, array[
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf'
]) on conflict (id) do nothing;

create policy "users read own resume files" on storage.objects for select to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users upload own resume files" on storage.objects for insert to authenticated
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users update own resume files" on storage.objects for update to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own resume files" on storage.objects for delete to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Make newly created tables immediately visible through the hosted Data API.
notify pgrst, 'reload schema';

commit;
