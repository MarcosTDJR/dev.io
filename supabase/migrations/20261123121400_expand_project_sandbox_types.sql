alter table public.projects
  drop constraint if exists projects_sandbox_type_check;

alter table public.projects
  add constraint projects_sandbox_type_check
  check (sandbox_type in (
    'auto', 'html', 'javascript', 'css', 'python', 'ruby', 'archive', 'source'
  ));

notify pgrst, 'reload schema';
