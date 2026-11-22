alter table public.projects
  add column if not exists accept_donations boolean not null default false;

grant insert (
  id,
  owner_id,
  name,
  description,
  category,
  version,
  price,
  file_name,
  file_path,
  file_size,
  file_type,
  sandbox_type,
  accept_donations
) on public.projects to authenticated;

grant update (name, description, category, version, price, accept_donations)
  on public.projects to authenticated;

notify pgrst, 'reload schema';
