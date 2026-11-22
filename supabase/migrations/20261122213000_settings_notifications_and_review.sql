alter table public.projects
  add column if not exists review_status text not null default 'approved';
alter table public.projects
  add column if not exists review_note text;
alter table public.projects
  drop constraint if exists projects_review_status_check;
alter table public.projects
  add constraint projects_review_status_check
  check (review_status in ('pending', 'approved', 'rejected'));
alter table public.projects
  alter column review_status set default 'pending';

create table if not exists public.profile_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  is_public boolean not null default true,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  reduce_motion boolean not null default false,
  notify_reviews boolean not null default true,
  notify_downloads boolean not null default true,
  notify_followers boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.profile_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.create_settings_for_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_settings_after_profile_insert on public.profiles;
create trigger create_settings_after_profile_insert
  after insert on public.profiles
  for each row execute function public.create_settings_for_new_profile();

alter table public.profile_settings enable row level security;
revoke all on public.profile_settings from anon, authenticated;
grant select, insert, update on public.profile_settings to authenticated;

drop policy if exists "Users can read their settings" on public.profile_settings;
create policy "Users can read their settings"
  on public.profile_settings for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can create their settings" on public.profile_settings;
create policy "Users can create their settings"
  on public.profile_settings for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their settings" on public.profile_settings;
create policy "Users can update their settings"
  on public.profile_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.is_profile_public(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select settings.is_public
      from public.profile_settings as settings
      where settings.user_id = target_user_id
    ),
    true
  );
$$;

revoke all on function public.is_profile_public(uuid) from public;
grant execute on function public.is_profile_public(uuid) to anon, authenticated;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (
    id = (select auth.uid())
    or (select public.is_profile_public(id))
  );

drop policy if exists "Projects are publicly readable" on public.projects;
create policy "Projects are publicly readable"
  on public.projects for select
  using (
    owner_id = (select auth.uid())
    or (
      not is_blocked
      and review_status = 'approved'
      and (select public.is_profile_public(owner_id))
    )
  );

drop policy if exists "Authenticated users can read project files"
  on storage.objects;
create policy "Authenticated users can read project files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'devio-project-files'
    and not (select public.is_current_user_blocked())
    and exists (
      select 1
      from public.projects as project
      where project.file_path = storage.objects.name
        and (
          project.owner_id = (select auth.uid())
          or (
            project.review_status = 'approved'
            and not project.is_blocked
            and (select public.is_profile_public(project.owner_id))
          )
        )
    )
  );

drop policy if exists "Users can follow profiles" on public.profile_follows;
create policy "Users can follow profiles"
  on public.profile_follows for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and follower_id <> followed_id
    and (select public.is_profile_public(followed_id))
    and not (select public.is_current_user_blocked())
  );

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  kind text not null check (
    kind in ('new_follower', 'project_download', 'project_approved', 'project_rejected')
  ),
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists "Users can mark their notifications read" on public.notifications;
create policy "Users can mark their notifications read"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

create or replace function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  follower_name text;
  enabled boolean;
begin
  select coalesce(nullif(profile.username, ''), profile.display_name)
    into follower_name
  from public.profiles as profile
  where profile.id = new.follower_id;

  select settings.notify_followers into enabled
  from public.profile_settings as settings
  where settings.user_id = new.followed_id;

  if coalesce(enabled, true) then
    insert into public.notifications (
      recipient_id, actor_id, kind, title, message
    )
    values (
      new.followed_id,
      new.follower_id,
      'new_follower',
      'Novo seguidor',
      '@' || coalesce(follower_name, 'alguém') || ' começou a seguir você.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_profile_follow on public.profile_follows;
create trigger notify_profile_follow
  after insert on public.profile_follows
  for each row execute function public.notify_new_follower();

create or replace function public.notify_project_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  enabled boolean;
begin
  if old.review_status = 'pending'
     and new.review_status in ('approved', 'rejected')
     and new.review_status is distinct from old.review_status then
    select settings.notify_reviews into enabled
    from public.profile_settings as settings
    where settings.user_id = new.owner_id;

    if coalesce(enabled, true) then
      insert into public.notifications (
        recipient_id, project_id, kind, title, message
      )
      values (
        new.owner_id,
        new.id,
        case new.review_status
          when 'approved' then 'project_approved'
          else 'project_rejected'
        end,
        case new.review_status
          when 'approved' then 'Projeto aprovado'
          else 'Projeto recusado'
        end,
        case new.review_status
          when 'approved' then 'Seu projeto "' || new.name || '" foi aprovado e já está público.'
          else 'Seu projeto "' || new.name || '" não foi aprovado. ' ||
            coalesce(nullif(new.review_note, ''), 'Revise o projeto e as diretrizes antes de reenviar.')
        end
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_project_review_status on public.projects;
create trigger notify_project_review_status
  after update of review_status on public.projects
  for each row execute function public.notify_project_review();

create table if not exists public.project_downloads (
  downloader_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (downloader_id, project_id)
);

alter table public.project_downloads enable row level security;
revoke all on public.project_downloads from anon, authenticated;

create or replace function public.record_project_download(target_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  downloader_id uuid := auth.uid();
  project_owner_id uuid;
  project_name text;
  downloader_name text;
  enabled boolean;
  recorded_project_id uuid;
begin
  if downloader_id is null then
    raise exception 'Authentication required';
  end if;

  select project.owner_id, project.name
    into project_owner_id, project_name
  from public.projects as project
  where project.id = target_project_id
    and project.review_status = 'approved'
    and not project.is_blocked;

  if project_owner_id is null then
    raise exception 'Project is unavailable';
  end if;

  if project_owner_id = downloader_id then
    return;
  end if;

  insert into public.project_downloads (downloader_id, project_id)
  values (downloader_id, target_project_id)
  on conflict (downloader_id, project_id) do nothing
  returning project_id into recorded_project_id;

  if recorded_project_id is null then
    return;
  end if;

  select settings.notify_downloads into enabled
  from public.profile_settings as settings
  where settings.user_id = project_owner_id;

  if coalesce(enabled, true) then
    select coalesce(nullif(profile.username, ''), profile.display_name)
      into downloader_name
    from public.profiles as profile
    where profile.id = downloader_id;

    insert into public.notifications (
      recipient_id, actor_id, project_id, kind, title, message
    )
    values (
      project_owner_id,
      downloader_id,
      target_project_id,
      'project_download',
      'Novo download',
      '@' || coalesce(downloader_name, 'alguém') ||
        ' fez o download do projeto "' || project_name || '".'
    );
  end if;
end;
$$;

revoke all on function public.record_project_download(uuid) from public;
grant execute on function public.record_project_download(uuid) to authenticated;
