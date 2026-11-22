create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followed_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint profile_follows_not_self check (follower_id <> followed_id)
);

create index if not exists profile_follows_followed_id_idx
  on public.profile_follows (followed_id, created_at desc);

alter table public.profile_follows enable row level security;
grant select on public.profile_follows to anon, authenticated;
grant insert, delete on public.profile_follows to authenticated;

drop policy if exists "Profile follows are publicly readable"
  on public.profile_follows;
create policy "Profile follows are publicly readable"
  on public.profile_follows for select
  using (true);

drop policy if exists "Users can follow profiles"
  on public.profile_follows;
create policy "Users can follow profiles"
  on public.profile_follows for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and follower_id <> followed_id
    and not (select public.is_current_user_blocked())
  );

drop policy if exists "Users can unfollow profiles"
  on public.profile_follows;
create policy "Users can unfollow profiles"
  on public.profile_follows for delete to authenticated
  using (
    follower_id = (select auth.uid())
    and not (select public.is_current_user_blocked())
  );
