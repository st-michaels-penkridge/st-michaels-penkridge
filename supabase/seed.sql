-- Made-up people and dates for trying the members area on a local Supabase.
-- The Supabase CLI runs this only on a local database ("supabase db reset").
-- Never run it on the real project. Every name and address here is invented.

do $$
declare
  people jsonb := '[
    {"id": "00000000-0000-4000-8000-000000000001", "name": "Alex Morgan",    "email": "alex.morgan@example.org"},
    {"id": "00000000-0000-4000-8000-000000000002", "name": "Ruth Ashby",     "email": "ruth.ashby@example.org"},
    {"id": "00000000-0000-4000-8000-000000000003", "name": "Daniel Okafor",  "email": "daniel.okafor@example.org"},
    {"id": "00000000-0000-4000-8000-000000000004", "name": "Margaret Hill",  "email": "margaret.hill@example.org"},
    {"id": "00000000-0000-4000-8000-000000000005", "name": "Sam Patel",      "email": "sam.patel@example.org"},
    {"id": "00000000-0000-4000-8000-000000000006", "name": "Joy Bennett",    "email": "joy.bennett@example.org"},
    {"id": "00000000-0000-4000-8000-000000000007", "name": "Peter Lowe",     "email": "peter.lowe@example.org"},
    {"id": "00000000-0000-4000-8000-000000000008", "name": "Helen Ward",     "email": "helen.ward@example.org"}
  ]';
  p jsonb;
  av uuid;
  screens uuid;
  i integer := 0;
  s record;
begin
  for p in select * from jsonb_array_elements(people) loop
    insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change,
                            email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values ('00000000-0000-0000-0000-000000000000', (p->>'id')::uuid, 'authenticated', 'authenticated',
            p->>'email', now(), '{"provider": "email", "providers": ["email"]}',
            jsonb_build_object('full_name', p->>'name'), now(), now(), '', '', '', '', '', '', '', '');
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (p->>'id', (p->>'id')::uuid,
            jsonb_build_object('sub', p->>'id', 'email', p->>'email', 'email_verified', true),
            'email', now(), now(), now());
  end loop;

  update public.profiles set approved = true;
  update public.profiles set is_admin = true where id = '00000000-0000-4000-8000-000000000001';

  select id into av from public.rotas where slug = 'av';
  select id into screens from public.rota_positions where rota_id = av order by sort limit 1;

  insert into public.rota_members (rota_id, profile_id, is_lead)
  select av, (x->>'id')::uuid, (x->>'id') = '00000000-0000-4000-8000-000000000002'
  from jsonb_array_elements(people) x
  where (x->>'id') <> '00000000-0000-4000-8000-000000000001';

  -- The next eight Sundays at 10:30, leaving out the third Sunday of the month
  for s in
    select d::date as d
    from generate_series(current_date + ((7 - extract(dow from current_date)::integer) % 7), current_date + 70, interval '7 days') d
    where extract(day from d)::integer not between 15 and 21
    limit 8
  loop
    insert into public.services (starts_at, title)
    values ((s.d + time '10:30') at time zone 'Europe/London', 'Holy Communion');
  end loop;

  -- Share the dates round the team
  for s in select id from public.services order by starts_at loop
    insert into public.assignments (service_id, position_id, profile_id)
    select s.id, screens, m.profile_id
    from public.rota_members m
    where m.rota_id = av
    order by m.profile_id
    offset (i % 7) limit 1;
    i := i + 1;
  end loop;

  insert into public.away_dates (profile_id, starts_on, ends_on)
  values ('00000000-0000-4000-8000-000000000004', current_date + 20, current_date + 34);

  insert into public.access_requests (full_name, email, message)
  values ('Chris Adeyemi', 'chris.adeyemi@example.org', 'I help with coffee after the service and would like to see the rota.');

  insert into public.notices (title, body, show_from)
  values ('Car park resurfacing', 'The church car park is closed on Saturday while it is resurfaced. Please park on St Michael''s Square.', current_date);

  truncate public.activity_log;
end;
$$;
