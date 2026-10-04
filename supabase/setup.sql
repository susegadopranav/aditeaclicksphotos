-- Paste this whole file into Supabase → SQL Editor → New query → Run. Safe to run once.

-- 1. The updates table
create table public.updates (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  image_path text not null,            -- base name; files are "<image_path>-800.jpg" and "<image_path>-1600.jpg"
  caption    text,
  w          int,
  h          int,
  author_id  uuid not null default auth.uid() references auth.users (id) on delete cascade
);
create index updates_created_at_idx on public.updates (created_at desc);

-- 2. Row Level Security: everyone may read, only the signed-in owner may write
alter table public.updates enable row level security;

create policy "Anyone can read updates"
  on public.updates for select using (true);

create policy "Owner can add updates"
  on public.updates for insert to authenticated
  with check (auth.uid() = author_id);

create policy "Owner can edit updates"
  on public.updates for update to authenticated
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "Owner can delete updates"
  on public.updates for delete to authenticated
  using (auth.uid() = author_id);

-- 3. Public image bucket: 5 MB per file, JPEG only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('updates', 'updates', true, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

-- Public buckets can be read by anyone through their URL; only signed-in users may change files.
create policy "Signed-in users can upload images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'updates');

create policy "Signed-in users can delete images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'updates');
