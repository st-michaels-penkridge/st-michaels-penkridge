-- Pictures on the home page notice board, such as the newsletter or a poster.
-- Admins upload them in the page editor and choose the crop: the shape of the
-- frame, which part of the picture shows (focus) and how far it is zoomed in.
-- The public sees a picture between the dates chosen, like a notice.

create table public.board_pictures (
  id uuid primary key default gen_random_uuid(),
  -- the file in the notice-board storage bucket, named by the page editor
  path text not null unique check (path ~ '^[a-z0-9-]{1,64}\.(jpg|webp)$'),
  alt text not null check (char_length(alt) between 1 and 200),
  caption text not null default '' check (char_length(caption) <= 120),
  shape text not null default 'portrait' check (shape in ('portrait', 'square', 'landscape')),
  zoom numeric(3, 2) not null default 1 check (zoom between 1 and 3),
  focus_x smallint not null default 50 check (focus_x between 0 and 100),
  focus_y smallint not null default 50 check (focus_y between 0 and 100),
  show_from date not null default current_date,
  show_until date,
  published boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  check (show_until is null or show_until >= show_from)
);

create trigger board_pictures_touch before insert or update on public.board_pictures
  for each row execute function public.touch_updated();
create trigger board_pictures_log after insert or update or delete on public.board_pictures
  for each row execute function public.log_activity();

alter table public.board_pictures enable row level security;
grant select on public.board_pictures to anon;

create policy "Public sees current pictures" on public.board_pictures
  for select to anon, authenticated
  using ((published and show_from <= current_date and (show_until is null or show_until >= current_date)) or public.is_admin());
create policy "Admins add pictures" on public.board_pictures
  for insert to authenticated with check (public.is_admin());
create policy "Admins change pictures" on public.board_pictures
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins remove pictures" on public.board_pictures
  for delete to authenticated using (public.is_admin());

-- The files. Anyone can view them (they are on the public home page); only
-- admins can add, replace or remove them. The page editor shrinks each picture
-- to 1600px and saves it as a JPEG before upload, which also strips any
-- location data from the camera.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notice-board', 'notice-board', true, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Admins upload notice board pictures" on storage.objects
  for insert to authenticated with check (bucket_id = 'notice-board' and public.is_admin());
create policy "Admins replace notice board pictures" on storage.objects
  for update to authenticated using (bucket_id = 'notice-board' and public.is_admin())
  with check (bucket_id = 'notice-board' and public.is_admin());
create policy "Admins remove notice board pictures" on storage.objects
  for delete to authenticated using (bucket_id = 'notice-board' and public.is_admin());
