-- Karaoke UPDS · Supabase schema
-- Ejecutar completo en Supabase > SQL Editor. RLS habilitado en todas las tablas.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 role text not null default 'customer' check (role in ('customer','admin','staff')),
 created_at timestamptz not null default now()
);
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,full_name,role)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''), 'customer')
 on conflict(id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
 for each row execute procedure public.handle_new_user();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','staff'));
$$;
create table if not exists public.reservations (
 id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 code text not null unique, customer_name text not null, customer_phone text not null,
 customer_email text, room_id text not null, booking_date date not null,
 start_time time not null, duration_hours integer not null check(duration_hours between 1 and 6),
 people integer not null check(people between 1 and 15), occasion text, notes text,
 status text not null default 'pendiente', songs jsonb not null default '[]',
 items jsonb not null default '[]', amounts jsonb not null default '{}',
 payment jsonb not null default '{}', payload jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists reservations_user_date_idx on public.reservations(user_id,booking_date desc);
create index if not exists reservations_date_room_idx on public.reservations(booking_date,room_id);

create table if not exists public.songs (
 id bigint primary key, title text not null, artist text not null, genre text,
 album text, cover_url text, audio_url text, lyrics text,
 lyrics_timing jsonb not null default '[]', active boolean not null default true
);
create table if not exists public.menu_products (
 id bigint primary key, title text not null, description text, price numeric(10,2) not null check(price>=0),
 category text, product_type text not null check(product_type in ('snack','drink')),
 image_url text, active boolean not null default true
);

alter table public.profiles enable row level security;
alter table public.reservations enable row level security;
alter table public.songs enable row level security;
alter table public.menu_products enable row level security;

drop policy if exists "profile self or staff read" on public.profiles;
create policy "profile self or staff read" on public.profiles for select to authenticated
 using(id=auth.uid() or public.is_staff());
-- El cliente no puede cambiar su propio rol. Solo staff puede hacerlo.
create or replace function public.block_role_escalation()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.role <> old.role and not public.is_staff() then
   raise exception 'No tienes permiso para cambiar roles';
 end if;
 return new;
end; $$;
drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard before update on public.profiles
 for each row execute procedure public.block_role_escalation();

drop policy if exists "customer reads own reservations" on public.reservations;
create policy "customer reads own reservations" on public.reservations for select to authenticated
 using(user_id=auth.uid() or public.is_staff());
drop policy if exists "customer creates own reservations" on public.reservations;
create policy "customer creates own reservations" on public.reservations for insert to authenticated
 with check(user_id=auth.uid() and status='pendiente');
drop policy if exists "customer updates own pending reservations" on public.reservations;
drop policy if exists "staff updates reservations" on public.reservations;
create policy "staff updates reservations" on public.reservations for update to authenticated
 using(public.is_staff()) with check(public.is_staff());
drop policy if exists "staff deletes reservations" on public.reservations;
create policy "staff deletes reservations" on public.reservations for delete to authenticated
 using(public.is_staff());

drop policy if exists "public reads active songs" on public.songs;
create policy "public reads active songs" on public.songs for select to anon,authenticated using(active or public.is_staff());
drop policy if exists "staff manages songs" on public.songs;
create policy "staff manages songs" on public.songs for all to authenticated using(public.is_staff()) with check(public.is_staff());
drop policy if exists "public reads active menu" on public.menu_products;
create policy "public reads active menu" on public.menu_products for select to anon,authenticated using(active or public.is_staff());
drop policy if exists "staff manages menu" on public.menu_products;
create policy "staff manages menu" on public.menu_products for all to authenticated using(public.is_staff()) with check(public.is_staff());

-- Crear al menos un usuario desde Registro y promoverlo manualmente a administrador:
-- update public.profiles set role='admin' where id=(select id from auth.users where email='TU_CORREO@DOMINIO.COM');
