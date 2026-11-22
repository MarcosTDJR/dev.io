create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null,
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_path text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists is_blocked boolean not null default false;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null,
  version text not null,
  price text not null default 'Grátis',
  file_name text not null,
  file_path text not null unique,
  file_size bigint not null check (file_size > 0 and file_size <= 104857600),
  file_type text not null default 'application/octet-stream',
  sandbox_type text not null default 'auto'
    check (sandbox_type in (
      'auto', 'html', 'javascript', 'css', 'python', 'ruby', 'archive', 'source'
    )),
  is_blocked boolean not null default false,
  accept_donations boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists is_blocked boolean not null default false;
alter table public.projects
  add column if not exists accept_donations boolean not null default false;
alter table public.projects
  drop constraint if exists projects_sandbox_type_check;
alter table public.projects
  add constraint projects_sandbox_type_check
  check (sandbox_type in (
    'auto', 'html', 'javascript', 'css', 'python', 'ruby', 'archive', 'source'
  ));

create table if not exists public.library (
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists projects_created_at_idx
  on public.projects (created_at desc);
create index if not exists projects_owner_id_idx
  on public.projects (owner_id);
create index if not exists library_user_added_at_idx
  on public.library (user_id, added_at desc);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
begin
  requested_username := lower(
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      'user_' || substr(new.id::text, 1, 8)
    )
  );
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    requested_username,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.library enable row level security;

revoke select on public.profiles from anon, authenticated;
grant select (id, username, display_name, bio, avatar_path, created_at)
  on public.profiles to anon, authenticated;
grant select on public.projects to anon, authenticated;
grant update (username, display_name, bio, avatar_path)
  on public.profiles to authenticated;
grant insert (
  id, owner_id, name, description, category, version, price, file_name,
  file_path, file_size, file_type, sandbox_type, accept_donations
) on public.projects to authenticated;
grant update (name, description, category, version, price, accept_donations)
  on public.projects to authenticated;
grant delete on public.projects to authenticated;
grant select, insert, delete on public.library to authenticated;

create or replace function public.is_current_user_blocked()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select profiles.is_blocked
      from public.profiles
      where profiles.id = (select auth.uid())
    ),
    false
  );
$$;

revoke all on function public.is_current_user_blocked() from public;
grant execute on function public.is_current_user_blocked() to authenticated;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using (
    id = (select auth.uid())
    and not (select public.is_current_user_blocked())
  )
  with check (
    id = (select auth.uid())
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Projects are publicly readable" on public.projects;
create policy "Projects are publicly readable"
  on public.projects for select
  using (not is_blocked or owner_id = (select auth.uid()));

drop policy if exists "Users can create their own projects" on public.projects;
create policy "Users can create their own projects"
  on public.projects for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
  on public.projects for update to authenticated
  using (
    owner_id = (select auth.uid())
    and not (select public.is_current_user_blocked())
  )
  with check (
    owner_id = (select auth.uid())
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
  on public.projects for delete to authenticated
  using (
    owner_id = (select auth.uid())
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can view their library" on public.library;
create policy "Users can view their library"
  on public.library for select to authenticated
  using (
    user_id = (select auth.uid())
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can save projects to their library" on public.library;
create policy "Users can save projects to their library"
  on public.library for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can remove projects from their library" on public.library;
create policy "Users can remove projects from their library"
  on public.library for delete to authenticated
  using (
    user_id = (select auth.uid())
    and not (select public.is_current_user_blocked())
  );

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('devio-project-files', 'devio-project-files', false, 104857600),
  ('devio-avatars', 'devio-avatars', false, 2097152)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = null;

drop policy if exists "Authenticated users can read project files" on storage.objects;
create policy "Authenticated users can read project files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'devio-project-files'
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can upload project files in their folder" on storage.objects;
create policy "Users can upload project files in their folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'devio-project-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can delete project files in their folder" on storage.objects;
create policy "Users can delete project files in their folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'devio-project-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can read their avatars" on storage.objects;
create policy "Users can read their avatars"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'devio-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can upload their avatars" on storage.objects;
create policy "Users can upload their avatars"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'devio-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can update their avatars" on storage.objects;
create policy "Users can update their avatars"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'devio-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_current_user_blocked())
  )
  with check (
    bucket_id = 'devio-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can delete their avatars" on storage.objects;
create policy "Users can delete their avatars"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'devio-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_current_user_blocked())
  );
