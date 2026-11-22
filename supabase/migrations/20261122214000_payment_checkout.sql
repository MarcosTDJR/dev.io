create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  project_id uuid not null,
  seller_id uuid not null,
  kind text not null check (kind in ('purchase', 'donation')),
  amount numeric(10, 2) not null check (amount >= 1 and amount <= 1000000),
  currency text not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'pending'
    check (status in ('pending', 'in_process', 'approved', 'rejected', 'cancelled', 'refunded')),
  preference_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_buyer_created_idx
  on public.payment_orders (buyer_id, created_at desc);

create table if not exists public.mercadopago_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  collector_id text not null,
  token_ciphertext text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_oauth_states (
  state_hash text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists public.payment_transactions (
  payment_id text primary key,
  order_id uuid not null references public.payment_orders (id) on delete cascade,
  status text not null,
  payment_method_id text,
  updated_at timestamptz not null default now()
);

alter table public.payment_orders enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.mercadopago_accounts enable row level security;
alter table public.payment_oauth_states enable row level security;
revoke all on public.payment_orders, public.payment_transactions,
  public.mercadopago_accounts, public.payment_oauth_states
  from anon, authenticated;
grant select on public.payment_orders to authenticated;

drop policy if exists "Buyers can read their payment orders" on public.payment_orders;
create policy "Buyers can read their payment orders"
  on public.payment_orders for select to authenticated
  using (buyer_id = (select auth.uid()));

drop policy if exists "Users can save projects to their library" on public.library;
create policy "Users can save free projects to their library"
  on public.library for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.projects as project
      where project.id = library.project_id
        and (
          project.owner_id = (select auth.uid())
          or project.price = 'Grátis'
        )
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
            and (
              project.price = 'Grátis'
              or exists (
                select 1
                from public.payment_orders as payment_order
                where payment_order.project_id = project.id
                  and payment_order.buyer_id = (select auth.uid())
                  and payment_order.status = 'approved'
                  and payment_order.kind = 'purchase'
              )
            )
          )
        )
    )
  );
