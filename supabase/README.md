# Members area: backend and setup

The members area lets church members sign in, see the rotas, mark the dates they are away, ask for and take swaps, and get an email reminder the week before they are on. Admins invite people and edit the What's on page without touching the HTML.

**No real names go in until the PCC has agreed the plan and the privacy notice** (see the PRIORITY section of the main README). Until then, use the demo or a local Supabase with the made-up people in `seed.sql`.

## What is where

- `supabase/migrations/20261021000000_members_area.sql` - the whole database: tables, row-level security, the actions the pages call, and the starting content (the AV rota and the current Coming up dates)
- `supabase/functions/` - four edge functions, for the jobs that need the secret key:
  - `invite-member` - admins invite someone (sends the invite email, approves them, puts them on teams)
  - `remove-member` - admins remove someone and everything held about them
  - `delete-me` - anyone deletes their own account
  - `send-reminders` - run once a day: emails everyone on a rota in the next seven days, once, and clears out old records
- `supabase/templates/` - the sign-in and invite emails
- `supabase/seed.sql` - made-up people for a local database only
- `supabase/tests/members.test.mjs` - end-to-end checks of who can do what (local only)
- `supabase/config.toml` - settings for running it all locally with the Supabase CLI
- `members/` - the pages: `index.html` (sign in, your dates, swaps, away dates), `rota.html`, `editor.html`, `people.html`, `account.html`, `privacy.html` (draft notice for the PCC)
- `members/config.js` - the project address and public key. **Empty means demo mode**
- `members/api.js` - all reads and writes, plus the demo version that runs in the browser
- `members/app.js`, `members/members.css` - drawing the pages
- `members/vendor/supabase-2.117.2.js` - the Supabase browser library (MIT licence), kept here so the site does not depend on a CDN
- `live-content.js` - fills Coming up, notices and service details on `events.html` from the database. If the database is not set up or cannot be reached, the dates written in the HTML stay

## Who can do what

- **Visitors** see published Coming up events, current notices and the service details. Nothing else
- **Members** (invited and approved) see names on every rota, their own contact details, ask for swaps on their own dates, take swaps on their own teams, and manage their own away dates
- **Rota leads** (per rota) also see their team's contact details and away dates, add dates, put people on and take them off, manage the team and the jobs on their rota
- **Admins** do everything, but only after their two-step code (an authenticator app) in that session. Without it they are treated as a member

All of this is enforced by the database (row-level security), not just hidden in the pages. The publishable key in `members/config.js` is safe to publish for that reason. The service role key must never go in the site or in git.

## Try the demo

With `members/config.js` empty, run the site locally (`python -m http.server 8000` in the repo folder) and open http://localhost:8000/members/. The bar at the top switches between a member, the AV rota lead and an admin. Any email signs in, and any six numbers work as the admin's two-step code. Changes stay in that browser; "Start the demo again" resets it.

## Setting up the real project

1. **Create the project** at supabase.com: a new project in the London region (eu-west-2), with a strong database password kept in a password manager. The free plan is enough for a church this size. At the time of writing, free projects pause after a week without any use and can be restored from the dashboard; the What's on page and the daily reminders count as use.
2. **Create the database.** Either run `npx supabase login`, `npx supabase link --project-ref <ref>` and `npx supabase db push` from the repo folder, or paste the migration file into the dashboard's SQL editor and run it. Do not run `seed.sql` on the real project.
3. **Sign-in settings** (dashboard, Authentication):
   - Sign-ups: turn off "Allow new users to sign up". People only get in by invite
   - URL configuration: Site URL `https://<the site>/members/`, and add `https://<the site>/members/**` to the redirect URLs
   - Email templates: paste `templates/magic_link.html` into Magic Link (subject "Your sign-in link for St Michael's") and `templates/invite.html` into Invite user (subject "You're invited to the St Michael's members area")
   - SMTP: Supabase's own email is only for testing and is heavily limited. Add custom SMTP, for example Resend (host `smtp.resend.com`, port 465, user `resend`, password a Resend API key) with a sender address on the church's domain
   - Multi-factor: make sure TOTP (authenticator app) is enabled
4. **Deploy the functions**: `npx supabase functions deploy invite-member remove-member delete-me send-reminders`, then set their secrets:
   ```
   npx supabase secrets set SITE_URL=https://<the site> RESEND_API_KEY=re_... MAIL_FROM="St Michael's Penkridge <rota@<church domain>>" CRON_SECRET=<a long random string>
   ```
   `ALLOWED_ORIGIN=https://<the site>` is optional and narrows who can call the functions from a browser.
5. **Daily reminders**: in Database, Extensions, turn on `pg_cron` and `pg_net`, then run this in the SQL editor (times are UTC, so this is 8 or 9am in the UK):
   ```sql
   select cron.schedule('rota-reminders', '0 8 * * *', $$
     select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
       body := '{}'::jsonb
     );
   $$);
   ```
6. **Connect the site**: put the Project URL and the publishable (anon) key from Project Settings, API Keys into `members/config.js` and commit it.
7. **The first admin**: invite yourself from the dashboard (Authentication, Users, Invite user), then run:
   ```sql
   update public.profiles set approved = true, is_admin = true, full_name = '<your name>'
   where id = (select id from auth.users where email = '<your email>');
   ```
   Accept the invite, open My details, turn on two-step sign-in, and invite everyone else from People.
8. **Check it**: sign in as yourself, add a test event in the Page editor and see it on What's on, invite a second address you own, put it on the AV rota, ask for a swap from one account and take it from the other, then remove the test account.

## Running it locally

Needs Docker and the Supabase CLI (`npx supabase`).

1. `npx supabase start`, then `npx supabase db reset` (creates the database and loads the made-up people)
2. Put the local API URL and anon key that `supabase start` prints into `members/config.js`, but do not commit them
3. `python -m http.server 8000` and open http://127.0.0.1:8000/members/. Sign-in emails go to the local mail viewer that `supabase start` lists
4. Functions: create `supabase/functions/.env` (it is git-ignored) with `SITE_URL=http://127.0.0.1:8000`, `CRON_SECRET=local`, `RESEND_API_KEY` and `MAIL_FROM`, then `npx supabase functions serve`
5. Tests: `npm install`, then `SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... CRON_SECRET=local npm run test:members`. They refuse to run against anything but a local address

## Looking after it

- **Someone leaves**: People, Remove. Their account, contact details, team places, dates and away dates are deleted
- **An admin loses their phone**: another admin cannot reset it from the site. In the SQL editor: `delete from auth.mfa_factors where user_id = (select id from auth.users where email = '<their email>');` then they set two-step up again
- **There must always be one admin**: the site will not let the last admin remove themselves
- **Old records** are cleared every day: rota dates after 13 months, finished swaps after 3 months, away dates a month after they end, unanswered requests to join after 60 days, the change log after 12 months
- **Adding the other rotas** (readers, coffee, flowers, welcomers): People, Rotas, Add the rota, then choose its lead on the rota's page

## Still to do

- The real jobs on the AV rota (it starts with one, "Screens")
- Emailing the team when someone asks for a swap
- PCC approval, the privacy notice finished and published, and the real project set up as above
