-- St Michael and All Angels, Penkridge: members area
--
-- People, rotas, swaps, away dates and the editable parts of the public pages.
-- Every table has row-level security switched on. Supabase grants the anon and
-- authenticated roles access to tables in "public" by default, so a table with
-- no policy is closed to everyone except the service role (edge functions).
--
-- Three levels of access:
--   member     anyone invited and approved. Sees rotas and notices, marks away
--              dates, asks for and takes swaps
--   rota lead  a member who leads a particular rota (rota_members.is_lead).
--              Plans that rota: dates, jobs, who is on
--   admin      profiles.is_admin, and only once they have signed in with their
--              two-step code (aal2). Manages people, all rotas and page content
--
-- Store the minimum: a name, an email address and optionally a phone number.
-- Nothing about addresses, dates of birth, health, children or safeguarding.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  is_admin boolean not null default false,
  -- set by an admin (through the invite function). Even if public sign-ups were
  -- switched on by mistake, an unapproved account sees nothing
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.profiles is 'One row per member. Names are visible to other approved members.';

-- Contact details sit in their own table so they can be shown to fewer people
-- than names: the person themselves, admins and the leads of their rotas
create table public.contact_details (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null default '' check (char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 20)
);

-- ---------------------------------------------------------------------------
-- Rotas
-- ---------------------------------------------------------------------------

create table public.rotas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,40}$'),
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 300),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

-- The jobs on a rota, for example "Screens" on the AV rota
create table public.rota_positions (
  id uuid primary key default gen_random_uuid(),
  rota_id uuid not null references public.rotas (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  needed smallint not null default 1 check (needed between 1 and 10),
  sort integer not null default 0
);
create index on public.rota_positions (rota_id);

-- Who is on each team, and who leads it
create table public.rota_members (
  rota_id uuid not null references public.rotas (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  is_lead boolean not null default false,
  primary key (rota_id, profile_id)
);
create index on public.rota_members (profile_id);

-- Services are shared by every rota: one Sunday has an AV team, readers, coffee
create table public.services (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  title text not null default 'Holy Communion' check (char_length(title) between 1 and 80),
  notes text not null default '' check (char_length(notes) <= 300),
  created_at timestamptz not null default now()
);
create index on public.services (starts_at);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  position_id uuid not null references public.rota_positions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (service_id, position_id, profile_id)
);
create index on public.assignments (profile_id);
create index on public.assignments (position_id);

-- Dates someone cannot do, as a range ("away 3 to 17 August")
create table public.away_dates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  check (ends_on >= starts_on and ends_on - starts_on <= 366)
);
create index on public.away_dates (profile_id);

create table public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  note text not null default '' check (char_length(note) <= 200),
  status text not null default 'open' check (status in ('open', 'taken', 'cancelled')),
  taken_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index swap_requests_one_open on public.swap_requests (assignment_id) where status = 'open';

-- Which reminder emails have gone out, so nobody gets the same one twice
create table public.reminder_log (
  assignment_id uuid primary key references public.assignments (id) on delete cascade,
  sent_at timestamptz not null default now()
);

-- People asking to join. An admin approves (sends an invite) or declines
create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 1 and 80),
  email text not null check (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  message text not null default '' check (char_length(message) <= 300),
  created_at timestamptz not null default now()
);
create unique index access_requests_email on public.access_requests (lower(email));

-- ---------------------------------------------------------------------------
-- Editable parts of the public pages
-- ---------------------------------------------------------------------------

-- "Coming up" on the What's on page
create table public.events (
  id uuid primary key default gen_random_uuid(),
  starts_on date not null,
  start_time time,
  title text not null check (char_length(title) between 1 and 80),
  summary text not null default '' check (char_length(summary) <= 300),
  published boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null
);
create index on public.events (starts_on);

-- Short notices at the top of What's on, shown between two dates
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 600),
  show_from date not null default current_date,
  show_until date,
  published boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  check (show_until is null or show_until >= show_from)
);

-- Single lines of text on the public pages, such as when Messy Church meets
create table public.site_text (
  key text primary key check (key ~ '^[a-z0-9_]{1,40}$'),
  label text not null,
  help text not null default '',
  value text not null default '' check (char_length(value) <= 400),
  sort integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null
);

-- Who changed what. Admins can read it; nobody can edit it
create table public.activity_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid references public.profiles (id) on delete set null,
  table_name text not null,
  action text not null,
  row_id text
);
create index on public.activity_log (at desc);

-- ---------------------------------------------------------------------------
-- Who is asking? Small helpers used by the policies below
-- ---------------------------------------------------------------------------

-- An approved member is signed in
create function public.is_member() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.approved
  );
$$;

-- An admin who has also passed their two-step check this session
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.approved and p.is_admin
  ) and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

create function public.in_rota(r uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_member() and exists (
    select 1 from public.rota_members m where m.rota_id = r and m.profile_id = (select auth.uid())
  );
$$;

create function public.leads_rota(r uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or (public.is_member() and exists (
    select 1 from public.rota_members m
    where m.rota_id = r and m.profile_id = (select auth.uid()) and m.is_lead
  ));
$$;

create function public.leads_any_rota() returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or (public.is_member() and exists (
    select 1 from public.rota_members m where m.profile_id = (select auth.uid()) and m.is_lead
  ));
$$;

-- Leads see the contact details and away dates of people on their teams
create function public.leads_person(person uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_member() and exists (
    select 1
    from public.rota_members mine
    join public.rota_members theirs on theirs.rota_id = mine.rota_id
    where mine.profile_id = (select auth.uid()) and mine.is_lead and theirs.profile_id = person
  );
$$;

create function public.rota_of_position(pos uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select rota_id from public.rota_positions where id = pos;
$$;

create function public.rota_of_assignment(a uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.rota_id from public.assignments x join public.rota_positions p on p.id = x.position_id where x.id = a;
$$;

-- What the members area needs to know about the person signed in
create function public.my_access() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'signed_in', (select auth.uid()) is not null,
    'approved', coalesce(p.approved, false),
    'admin_account', coalesce(p.is_admin and p.approved, false),
    'admin', public.is_admin(),
    'aal', coalesce((select auth.jwt() ->> 'aal'), ''),
    'full_name', coalesce(p.full_name, ''),
    'leads', coalesce((select jsonb_agg(m.rota_id) from public.rota_members m where m.profile_id = p.id and m.is_lead), '[]'::jsonb),
    'rotas', coalesce((select jsonb_agg(m.rota_id) from public.rota_members m where m.profile_id = p.id), '[]'::jsonb)
  )
  from (select 1) one
  left join public.profiles p on p.id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- New accounts
-- ---------------------------------------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80));
  insert into public.contact_details (profile_id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.contact_details set email = coalesce(new.email, '') where profile_id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Rules that the policies cannot express on their own
-- ---------------------------------------------------------------------------

-- Only people on a team can be put on its rota
create function public.check_assignment() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.rota_members m
    join public.rota_positions p on p.rota_id = m.rota_id
    where p.id = new.position_id and m.profile_id = new.profile_id
  ) then
    raise exception 'That person is not on this rota''s team' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger assignments_team_check
  before insert or update on public.assignments
  for each row execute function public.check_assignment();

-- Taking someone off a team also takes them off that rota's future dates
create function public.remove_future_assignments() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.assignments a
  using public.rota_positions p, public.services s
  where a.position_id = p.id and a.service_id = s.id
    and p.rota_id = old.rota_id and a.profile_id = old.profile_id and s.starts_at > now();
  return old;
end;
$$;

create trigger rota_members_tidy
  after delete on public.rota_members
  for each row execute function public.remove_future_assignments();

-- Keep updated_at honest on the page content
create function public.touch_updated() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

create trigger events_touch before insert or update on public.events
  for each row execute function public.touch_updated();
create trigger notices_touch before insert or update on public.notices
  for each row execute function public.touch_updated();
create trigger site_text_touch before insert or update on public.site_text
  for each row execute function public.touch_updated();

-- Record who changed what
create function public.log_activity() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  rid text;
begin
  if tg_table_name = 'rota_members' then
    rid := coalesce(new.rota_id, old.rota_id)::text || ':' || coalesce(new.profile_id, old.profile_id)::text;
  elsif tg_table_name = 'site_text' then
    rid := coalesce(new.key, old.key);
  else
    rid := coalesce(new.id, old.id)::text;
  end if;
  insert into public.activity_log (actor, table_name, action, row_id)
  values ((select auth.uid()), tg_table_name, lower(tg_op), rid);
  return coalesce(new, old);
end;
$$;

create trigger events_log after insert or update or delete on public.events
  for each row execute function public.log_activity();
create trigger notices_log after insert or update or delete on public.notices
  for each row execute function public.log_activity();
create trigger site_text_log after update on public.site_text
  for each row execute function public.log_activity();
create trigger rota_members_log after insert or update or delete on public.rota_members
  for each row execute function public.log_activity();
create trigger assignments_log after insert or update or delete on public.assignments
  for each row execute function public.log_activity();
create trigger services_log after insert or update or delete on public.services
  for each row execute function public.log_activity();

create function public.log_admin_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin or new.approved is distinct from old.approved then
    insert into public.activity_log (actor, table_name, action, row_id)
    values ((select auth.uid()), 'profiles',
            case when new.is_admin is distinct from old.is_admin
                 then (case when new.is_admin then 'made admin' else 'admin removed' end)
                 else (case when new.approved then 'approved' else 'unapproved' end) end,
            new.id::text);
  end if;
  return new;
end;
$$;

create trigger profiles_log after update on public.profiles
  for each row execute function public.log_admin_change();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.contact_details enable row level security;
alter table public.rotas enable row level security;
alter table public.rota_positions enable row level security;
alter table public.rota_members enable row level security;
alter table public.services enable row level security;
alter table public.assignments enable row level security;
alter table public.away_dates enable row level security;
alter table public.swap_requests enable row level security;
alter table public.reminder_log enable row level security;
alter table public.access_requests enable row level security;
alter table public.events enable row level security;
alter table public.notices enable row level security;
alter table public.site_text enable row level security;
alter table public.activity_log enable row level security;

-- Belt and braces: the anonymous role only ever needs the public page content
revoke all on all tables in schema public from anon;
grant select on public.events, public.notices, public.site_text to anon;

-- profiles: members see names; you can change your own name; admin flags go
-- through set_admin() so nobody can make themselves an admin
create policy "Members see names" on public.profiles
  for select to authenticated using (public.is_member() or id = (select auth.uid()));
create policy "Edit your own name" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- contact_details
create policy "See contact details you need" on public.contact_details
  for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin() or public.leads_person(profile_id));
create policy "Edit your own phone number" on public.contact_details
  for update to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin())
  with check (profile_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.contact_details from authenticated;
grant update (phone) on public.contact_details to authenticated;

-- rotas and their jobs
create policy "Members see rotas" on public.rotas
  for select to authenticated using (public.is_member());
create policy "Admins add rotas" on public.rotas
  for insert to authenticated with check (public.is_admin());
create policy "Leads rename their rota" on public.rotas
  for update to authenticated using (public.leads_rota(id)) with check (public.leads_rota(id));
create policy "Admins remove rotas" on public.rotas
  for delete to authenticated using (public.is_admin());
revoke update on public.rotas from authenticated;
grant update (name, description, sort) on public.rotas to authenticated;

create policy "Members see jobs" on public.rota_positions
  for select to authenticated using (public.is_member());
create policy "Leads add jobs" on public.rota_positions
  for insert to authenticated with check (public.leads_rota(rota_id));
create policy "Leads change jobs" on public.rota_positions
  for update to authenticated using (public.leads_rota(rota_id)) with check (public.leads_rota(rota_id));
create policy "Leads remove jobs" on public.rota_positions
  for delete to authenticated using (public.leads_rota(rota_id));
revoke update on public.rota_positions from authenticated;
grant update (name, needed, sort) on public.rota_positions to authenticated;

-- teams: read here, change through set_rota_member()
create policy "Members see teams" on public.rota_members
  for select to authenticated using (public.is_member());
revoke insert, update, delete on public.rota_members from authenticated;

-- services
create policy "Members see services" on public.services
  for select to authenticated using (public.is_member());
create policy "Leads add services" on public.services
  for insert to authenticated with check (public.leads_any_rota());
create policy "Leads change services" on public.services
  for update to authenticated using (public.leads_any_rota()) with check (public.leads_any_rota());
create policy "Admins remove services" on public.services
  for delete to authenticated using (public.is_admin());

-- assignments: everyone can see who is on when; leads plan their own rota
create policy "Members see who is on" on public.assignments
  for select to authenticated using (public.is_member());
create policy "Leads put people on" on public.assignments
  for insert to authenticated with check (public.leads_rota(public.rota_of_position(position_id)));
create policy "Leads take people off" on public.assignments
  for delete to authenticated using (public.leads_rota(public.rota_of_position(position_id)));
revoke update on public.assignments from authenticated;

-- away dates: your own, and leads see their team's
create policy "See away dates" on public.away_dates
  for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin() or public.leads_person(profile_id));
create policy "Add your away dates" on public.away_dates
  for insert to authenticated
  with check (public.is_member() and (profile_id = (select auth.uid()) or public.is_admin()));
create policy "Remove your away dates" on public.away_dates
  for delete to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin());
revoke update on public.away_dates from authenticated;

-- swaps: the team can see them; changes go through the swap functions
create policy "Team sees swaps" on public.swap_requests
  for select to authenticated
  using (requested_by = (select auth.uid()) or public.in_rota(public.rota_of_assignment(assignment_id)) or public.leads_rota(public.rota_of_assignment(assignment_id)));
revoke insert, update, delete on public.swap_requests from authenticated;

-- reminder_log: edge functions only (no policies)
revoke all on public.reminder_log from authenticated;

-- access requests: admins only; people ask through request_access()
create policy "Admins see requests" on public.access_requests
  for select to authenticated using (public.is_admin());
create policy "Admins clear requests" on public.access_requests
  for delete to authenticated using (public.is_admin());
revoke insert, update on public.access_requests from authenticated;

-- page content: the public sees what is published; admins edit
create policy "Public sees published events" on public.events
  for select to anon, authenticated using (published or public.is_admin());
create policy "Admins add events" on public.events
  for insert to authenticated with check (public.is_admin());
create policy "Admins change events" on public.events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins remove events" on public.events
  for delete to authenticated using (public.is_admin());

create policy "Public sees current notices" on public.notices
  for select to anon, authenticated
  using ((published and show_from <= current_date and (show_until is null or show_until >= current_date)) or public.is_admin());
create policy "Admins add notices" on public.notices
  for insert to authenticated with check (public.is_admin());
create policy "Admins change notices" on public.notices
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins remove notices" on public.notices
  for delete to authenticated using (public.is_admin());

create policy "Public sees page text" on public.site_text
  for select to anon, authenticated using (true);
create policy "Admins change page text" on public.site_text
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.site_text from authenticated;
revoke update on public.site_text from authenticated;
grant update (value) on public.site_text to authenticated;

create policy "Admins see activity" on public.activity_log
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.activity_log from authenticated;

-- ---------------------------------------------------------------------------
-- Actions (called from the members area as /rest/v1/rpc/<name>)
-- ---------------------------------------------------------------------------

-- Anyone can ask to join. It never says whether an email is already known
create function public.request_access(p_name text, p_email text, p_message text default '')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  clean_email text := lower(trim(p_email));
begin
  if char_length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Please give your name' using errcode = '22023';
  end if;
  if clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Please give a valid email address' using errcode = '22023';
  end if;
  -- a simple brake on floods of junk requests
  if (select count(*) from public.access_requests where created_at > now() - interval '1 day') >= 30 then
    raise exception 'Too many requests today. Please try again tomorrow or call the parish office' using errcode = '54000';
  end if;
  if exists (select 1 from public.contact_details where lower(email) = clean_email) then
    return;
  end if;
  insert into public.access_requests (full_name, email, message)
  values (left(trim(p_name), 80), clean_email, left(coalesce(trim(p_message), ''), 300))
  on conflict ((lower(email))) do nothing;
end;
$$;

-- Add someone to a team, take them off, or make them a lead.
-- Leads manage their own team; only admins choose who leads
create function public.set_rota_member(p_rota uuid, p_profile uuid, p_member boolean, p_lead boolean default false)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  current_lead boolean;
begin
  if not public.leads_rota(p_rota) then
    raise exception 'Only the rota lead or an admin can change this team' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile and approved) then
    raise exception 'That person is not an approved member' using errcode = '22023';
  end if;
  select is_lead into current_lead from public.rota_members where rota_id = p_rota and profile_id = p_profile;

  if not p_member then
    if current_lead and not public.is_admin() then
      raise exception 'Only an admin can take a lead off the team' using errcode = '42501';
    end if;
    delete from public.rota_members where rota_id = p_rota and profile_id = p_profile;
    return;
  end if;

  if coalesce(current_lead, false) is distinct from coalesce(p_lead, false) and not public.is_admin() then
    raise exception 'Only an admin can choose who leads a rota' using errcode = '42501';
  end if;
  insert into public.rota_members (rota_id, profile_id, is_lead)
  values (p_rota, p_profile, coalesce(p_lead, false))
  on conflict (rota_id, profile_id) do update set is_lead = excluded.is_lead;
end;
$$;

-- Make someone an admin or stop them being one. There is always one admin left
create function public.set_admin(p_profile uuid, p_admin boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can do this' using errcode = '42501';
  end if;
  if not p_admin and (select count(*) from public.profiles where is_admin and approved and id <> p_profile) = 0 then
    raise exception 'There must always be at least one admin' using errcode = '22023';
  end if;
  update public.profiles set is_admin = p_admin where id = p_profile and approved;
end;
$$;

-- Ask the team to cover one of your dates
create function public.request_swap(p_assignment uuid, p_note text default '')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not public.is_member() then
    raise exception 'Please sign in' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.assignments a join public.services s on s.id = a.service_id
    where a.id = p_assignment and a.profile_id = (select auth.uid()) and s.starts_at > now()
  ) then
    raise exception 'You can only ask for a swap on your own future dates' using errcode = '42501';
  end if;
  insert into public.swap_requests (assignment_id, requested_by, note)
  values (p_assignment, (select auth.uid()), left(coalesce(trim(p_note), ''), 200))
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'You have already asked for a swap on this date' using errcode = '23505';
end;
$$;

create function public.cancel_swap(p_swap uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.swap_requests
  set status = 'cancelled', resolved_at = now()
  where id = p_swap and status = 'open'
    and (requested_by = (select auth.uid()) or public.leads_rota(public.rota_of_assignment(assignment_id)));
  if not found then
    raise exception 'That swap request is not open, or it is not yours to cancel' using errcode = '42501';
  end if;
end;
$$;

-- Take someone's date. The date moves to you straight away
create function public.take_swap(p_swap uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  req public.swap_requests%rowtype;
  asg public.assignments%rowtype;
  rota uuid;
begin
  select * into req from public.swap_requests where id = p_swap for update;
  if not found or req.status <> 'open' then
    raise exception 'Someone has already taken this date, or the request was cancelled' using errcode = '22023';
  end if;
  select * into asg from public.assignments where id = req.assignment_id for update;
  rota := public.rota_of_position(asg.position_id);
  if not public.in_rota(rota) then
    raise exception 'Only people on this team can take the date' using errcode = '42501';
  end if;
  if req.requested_by = (select auth.uid()) then
    raise exception 'You cannot take your own date' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.assignments
    where service_id = asg.service_id and position_id = asg.position_id and profile_id = (select auth.uid())
  ) then
    raise exception 'You are already down for this job on that date' using errcode = '22023';
  end if;
  if not exists (select 1 from public.services where id = asg.service_id and starts_at > now()) then
    raise exception 'That date has passed' using errcode = '22023';
  end if;

  update public.assignments set profile_id = (select auth.uid()) where id = asg.id;
  delete from public.reminder_log where assignment_id = asg.id;
  update public.swap_requests
  set status = 'taken', taken_by = (select auth.uid()), resolved_at = now()
  where id = p_swap;
end;
$$;

-- Add a run of Sundays, for example the next eight, leaving out the third Sunday
create function public.add_sundays(p_from date, p_weeks integer, p_time time default '10:30',
                                   p_title text default 'Holy Communion', p_skip_third boolean default true)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  d date;
  added integer := 0;
  n integer := 0;
begin
  if not public.leads_any_rota() then
    raise exception 'Only rota leads and admins can add dates' using errcode = '42501';
  end if;
  if p_weeks < 1 or p_weeks > 26 then
    raise exception 'Choose between 1 and 26 weeks' using errcode = '22023';
  end if;
  d := p_from + ((7 - extract(dow from p_from)::integer) % 7);
  while n < p_weeks loop
    if not (p_skip_third and extract(day from d)::integer between 15 and 21) then
      if not exists (
        select 1 from public.services
        where starts_at = (d + p_time) at time zone 'Europe/London'
      ) then
        insert into public.services (starts_at, title)
        values ((d + p_time) at time zone 'Europe/London', left(p_title, 80));
        added := added + 1;
      end if;
      n := n + 1;
    end if;
    d := d + 7;
  end loop;
  return added;
end;
$$;

-- Everything held about you, for a data request
create function public.my_data()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'contact_details', (select to_jsonb(c) from public.contact_details c where c.profile_id = (select auth.uid())),
    'teams', coalesce((select jsonb_agg(jsonb_build_object('rota', r.name, 'lead', m.is_lead))
                       from public.rota_members m join public.rotas r on r.id = m.rota_id
                       where m.profile_id = (select auth.uid())), '[]'::jsonb),
    'dates', coalesce((select jsonb_agg(jsonb_build_object('service', s.title, 'starts_at', s.starts_at, 'rota', r.name, 'job', p.name) order by s.starts_at)
                       from public.assignments a
                       join public.services s on s.id = a.service_id
                       join public.rota_positions p on p.id = a.position_id
                       join public.rotas r on r.id = p.rota_id
                       where a.profile_id = (select auth.uid())), '[]'::jsonb),
    'away_dates', coalesce((select jsonb_agg(jsonb_build_object('from', starts_on, 'to', ends_on))
                            from public.away_dates where profile_id = (select auth.uid())), '[]'::jsonb),
    'swap_requests', coalesce((select jsonb_agg(jsonb_build_object('note', note, 'status', status, 'created_at', created_at))
                               from public.swap_requests where requested_by = (select auth.uid())), '[]'::jsonb)
  )
  where (select auth.uid()) is not null;
$$;

-- Clear out old records. Run daily by the send-reminders function
create function public.tidy_old_data()
returns void
language sql security definer set search_path = ''
as $$
  delete from public.services where starts_at < now() - interval '13 months';
  delete from public.swap_requests where status <> 'open' and resolved_at < now() - interval '3 months';
  delete from public.away_dates where ends_on < current_date - 30;
  delete from public.access_requests where created_at < now() - interval '60 days';
  delete from public.activity_log where at < now() - interval '12 months';
  delete from public.events where starts_on < current_date - 400;
$$;

-- Who needs a reminder: everyone on a service in the next seven days who has not had one
create function public.due_reminders()
returns table (assignment_id uuid, email text, full_name text, rota text, job text, service text, starts_at timestamptz, rota_slug text)
language sql stable security definer set search_path = ''
as $$
  select a.id, c.email, p.full_name, r.name, rp.name, s.title, s.starts_at, r.slug
  from public.assignments a
  join public.services s on s.id = a.service_id
  join public.rota_positions rp on rp.id = a.position_id
  join public.rotas r on r.id = rp.rota_id
  join public.profiles p on p.id = a.profile_id
  join public.contact_details c on c.profile_id = a.profile_id
  where s.starts_at > now() and s.starts_at <= now() + interval '7 days'
    and p.approved and c.email <> ''
    and not exists (select 1 from public.reminder_log l where l.assignment_id = a.id)
  order by s.starts_at;
$$;

-- Postgres lets anyone run a function unless told otherwise
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.is_member(), public.is_admin(), public.in_rota(uuid), public.leads_rota(uuid),
  public.leads_any_rota(), public.leads_person(uuid), public.rota_of_position(uuid),
  public.rota_of_assignment(uuid), public.my_access(), public.set_rota_member(uuid, uuid, boolean, boolean),
  public.set_admin(uuid, boolean), public.request_swap(uuid, text), public.cancel_swap(uuid),
  public.take_swap(uuid), public.add_sundays(date, integer, time, text, boolean), public.my_data()
  to authenticated;
grant execute on function public.request_access(text, text, text) to anon, authenticated;
-- the policies on public content call is_admin() for anonymous visitors too
grant execute on function public.is_admin() to anon;
grant execute on function public.tidy_old_data(), public.due_reminders() to service_role;

-- ---------------------------------------------------------------------------
-- Starting content
-- ---------------------------------------------------------------------------

insert into public.rotas (slug, name, description, sort) values
  ('av', 'AV team', 'Running the words on the screens (PowerPoint) for the 10:30 service.', 1);

insert into public.rota_positions (rota_id, name, needed, sort)
select id, 'Screens', 1, 1 from public.rotas where slug = 'av';

insert into public.site_text (key, label, help, value, sort) values
  ('messy_church_when', 'Messy Church: when it meets', 'For example "Second Saturday of the month, 3:30 to 5:30". Leave empty to point people to Facebook.', '', 1),
  ('coffee_morning_when', 'Coffee mornings: when they are', 'For example "Every Wednesday, 10 to 12". Leave empty to point people to Facebook.', '', 2),
  ('third_sunday', 'Third Sunday of the month', 'What happens on the third Sunday. Leave empty to point people to Facebook.', '', 3);

insert into public.events (starts_on, title, summary) values
  ('2026-11-08', 'Remembrance Sunday', 'We remember those who have died in war, with two minutes'' silence.'),
  ('2026-11-29', 'Advent Sunday', 'The start of the church year, and the four weeks of getting ready for Christmas.'),
  ('2026-12-24', 'Christmas Eve', 'Services on Christmas Eve. Times go up nearer the day.'),
  ('2026-12-25', 'Christmas Day', 'Celebrate Christmas morning at St Michael''s. Times go up nearer the day.');

-- The starting content above was not changed by anyone, so start the log clean
truncate public.activity_log;
