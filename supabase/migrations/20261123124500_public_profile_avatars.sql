drop policy if exists "Anyone can read avatars for public profiles"
  on storage.objects;
create policy "Anyone can read avatars for public profiles"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'devio-avatars'
    and exists (
      select 1
      from public.profiles
      where profiles.avatar_path = storage.objects.name
        and (select public.is_profile_public(profiles.id))
    )
  );
