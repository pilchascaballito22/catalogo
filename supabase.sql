-- =========================================================
-- PILCHAS CABALLITO 22 / SUPABASE
-- Ejecutá este SQL en Supabase > SQL Editor.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric,
  category text not null,
  description text default '',
  sizes text[] default '{}',
  images text[] default '{}',
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
on public.products for select
to anon, authenticated
using (active = true);

drop policy if exists "authenticated admins can read all products" on public.products;
create policy "authenticated admins can read all products"
on public.products for select
to authenticated
using (true);

drop policy if exists "authenticated admins can insert products" on public.products;
create policy "authenticated admins can insert products"
on public.products for insert
to authenticated
with check (true);

drop policy if exists "authenticated admins can update products" on public.products;
create policy "authenticated admins can update products"
on public.products for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated admins can delete products" on public.products;
create policy "authenticated admins can delete products"
on public.products for delete
to authenticated
using (true);

-- STORAGE
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public can view product images" on storage.objects;
create policy "public can view product images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "authenticated admins can upload product images" on storage.objects;
create policy "authenticated admins can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

drop policy if exists "authenticated admins can update product images" on storage.objects;
create policy "authenticated admins can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

drop policy if exists "authenticated admins can delete product images" on storage.objects;
create policy "authenticated admins can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images');
