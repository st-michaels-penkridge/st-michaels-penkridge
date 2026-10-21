// End-to-end checks for the members area, run against a LOCAL Supabase only.
//
//   supabase start && supabase db reset        (loads the made-up people in seed.sql)
//   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
//   CRON_SECRET=... npm run test:members
//
// It signs in as the made-up people, tries things each level should and should
// not be able to do, and creates and deletes test accounts. It refuses to run
// against anything that is not on this computer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { authenticator } from "otplib";

const URL = process.env.SUPABASE_URL ?? "";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL)) {
  console.error("These tests create and delete accounts, so they only run against a local Supabase (http://127.0.0.1:54321).");
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const service = createClient(URL, SERVICE, opts);
const anon = () => createClient(URL, ANON, opts);

const ALEX = "alex.morgan@example.org"; // admin
const RUTH = "ruth.ashby@example.org"; // AV lead
const DANIEL = "daniel.okafor@example.org"; // member
const SAM = "sam.patel@example.org"; // member

async function signIn(email) {
  const { data, error } = await service.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const client = anon();
  const { error: e2 } = await client.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: "email" });
  if (e2) throw e2;
  return client;
}

async function twoStep(client) {
  const { data: factors } = await client.auth.mfa.listFactors();
  let factor = factors.totp.find((f) => f.status === "verified");
  let secret = factorSecrets.get(factor?.id);
  if (!factor) {
    const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Test " + Date.now() });
    if (error) throw error;
    factor = data;
    secret = data.totp.secret;
    factorSecrets.set(data.id, secret);
  }
  const { error } = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code: authenticator.generate(secret) });
  if (error) throw error;
}
const factorSecrets = new Map();

const rpc = async (client, name, args) => client.rpc(name, args);
const avRota = async (client) => (await client.from("rotas").select("id").eq("slug", "av").single()).data.id;

test("the public can read page content but nothing private", async () => {
  const visitor = anon();
  const events = await visitor.from("events").select("title");
  assert.equal(events.error, null);
  assert.ok(events.data.length > 0);
  for (const table of ["profiles", "contact_details", "assignments", "access_requests", "away_dates"]) {
    const r = await visitor.from(table).select("*");
    assert.ok(r.error || r.data.length === 0, `${table} should be closed to the public`);
  }
  const edit = await visitor.from("events").update({ title: "Changed" }).neq("title", "");
  assert.ok(edit.error || (edit.data ?? []).length === 0);
});

test("anyone can ask to join, and it never says who is already a member", async () => {
  const visitor = anon();
  assert.equal((await rpc(visitor, "request_access", { p_name: "Test Person", p_email: "test.person@example.org", p_message: "Hello" })).error, null);
  assert.equal((await rpc(visitor, "request_access", { p_name: "Alex", p_email: ALEX, p_message: "" })).error, null);
  const bad = await rpc(visitor, "request_access", { p_name: "X", p_email: "not-an-email", p_message: "" });
  assert.ok(bad.error);
  const { data } = await service.from("access_requests").select("email");
  assert.ok(data.some((r) => r.email === "test.person@example.org"));
  assert.ok(!data.some((r) => r.email === ALEX));
});

test("sign-in links only work for people who have been invited", async () => {
  const stranger = anon();
  const { error } = await stranger.auth.signInWithOtp({ email: "stranger@example.org", options: { shouldCreateUser: false } });
  assert.ok(error, "a stranger should not get an account");
  const { data } = await service.from("contact_details").select("email").eq("email", "stranger@example.org");
  assert.equal(data.length, 0);
});

test("a member sees names and rotas but not other people's contact details", async () => {
  const daniel = await signIn(DANIEL);
  const names = await daniel.from("profiles").select("full_name");
  assert.ok(names.data.length >= 7);
  const contacts = await daniel.from("contact_details").select("email");
  assert.deepEqual(contacts.data.map((c) => c.email), [DANIEL]);
  const away = await daniel.from("away_dates").select("*");
  assert.equal(away.data.length, 0, "Margaret's away dates are not Daniel's business");
  const mine = await daniel.from("assignments").select("id");
  assert.ok(mine.data.length > 0);
});

test("a member cannot make themselves an admin or a lead, or edit the public pages", async () => {
  const daniel = await signIn(DANIEL);
  const { data: { user } } = await daniel.auth.getUser();
  const r1 = await daniel.from("profiles").update({ is_admin: true }).eq("id", user.id);
  assert.ok(r1.error);
  const r2 = await rpc(daniel, "set_rota_member", { p_rota: await avRota(daniel), p_profile: user.id, p_member: true, p_lead: true });
  assert.ok(r2.error);
  const r3 = await daniel.from("events").update({ title: "Changed" }).neq("title", "").select();
  assert.equal(r3.data?.length ?? 0, 0);
  const r4 = await daniel.from("assignments").delete().neq("id", "00000000-0000-0000-0000-000000000000").select();
  assert.equal(r4.data?.length ?? 0, 0);
});

test("a member can change their own name and phone number, and nobody else's", async () => {
  const daniel = await signIn(DANIEL);
  const { data: { user } } = await daniel.auth.getUser();
  const ok = await daniel.from("contact_details").update({ phone: "07000 000000" }).eq("profile_id", user.id).select();
  assert.equal(ok.data.length, 1);
  const theirs = await daniel.from("profiles").update({ full_name: "Changed" }).neq("id", user.id).select();
  assert.equal(theirs.data.length, 0);
});

test("swaps: ask, and someone else on the team takes the date", async () => {
  const daniel = await signIn(DANIEL);
  const sam = await signIn(SAM);
  const { data: { user: d } } = await daniel.auth.getUser();
  const { data: { user: s } } = await sam.auth.getUser();
  const { data: mine } = await daniel
    .from("assignments").select("id, service_id, services!inner(starts_at)").eq("profile_id", d.id)
    .gt("services.starts_at", new Date().toISOString()).limit(1);
  assert.equal(mine.length, 1, "Daniel needs a future date in the seed");

  const ask = await rpc(daniel, "request_swap", { p_assignment: mine[0].id, p_note: "Away that weekend" });
  assert.equal(ask.error, null);
  const again = await rpc(daniel, "request_swap", { p_assignment: mine[0].id, p_note: "" });
  assert.ok(again.error, "only one open request per date");

  const own = await rpc(daniel, "take_swap", { p_swap: ask.data });
  assert.ok(own.error, "you cannot take your own date");

  const seen = await sam.from("swap_requests").select("id").eq("status", "open");
  assert.ok(seen.data.some((r) => r.id === ask.data), "the team can see the request");

  const take = await rpc(sam, "take_swap", { p_swap: ask.data });
  assert.equal(take.error, null);
  const { data: after } = await service.from("assignments").select("profile_id").eq("id", mine[0].id).single();
  assert.equal(after.profile_id, s.id);
  const twice = await rpc(sam, "take_swap", { p_swap: ask.data });
  assert.ok(twice.error);
});

test("someone not on the team cannot take a swap", async () => {
  const sam = await signIn(SAM);
  const alex = await signIn(ALEX); // admin, not on the AV team in the seed
  const { data: { user: s } } = await sam.auth.getUser();
  const { data: mine } = await sam
    .from("assignments").select("id, services!inner(starts_at)").eq("profile_id", s.id)
    .gt("services.starts_at", new Date().toISOString()).limit(1);
  const ask = await rpc(sam, "request_swap", { p_assignment: mine[0].id, p_note: "" });
  assert.equal(ask.error, null);
  const take = await rpc(alex, "take_swap", { p_swap: ask.data });
  assert.ok(take.error);
  assert.equal((await rpc(sam, "cancel_swap", { p_swap: ask.data })).error, null);
});

test("a rota lead plans their rota and sees their team's contact details", async () => {
  const ruth = await signIn(RUTH);
  const av = await avRota(ruth);
  const contacts = await ruth.from("contact_details").select("email");
  assert.ok(contacts.data.length >= 7);
  const added = await rpc(ruth, "add_sundays", { p_from: "2027-03-01", p_weeks: 2 });
  assert.equal(added.error, null);
  const { data: services } = await ruth.from("services").select("id").gte("starts_at", "2027-03-01").order("starts_at").limit(1);
  const { data: pos } = await ruth.from("rota_positions").select("id").eq("rota_id", av).limit(1);
  const { data: { user: r } } = await ruth.auth.getUser();
  const put = await ruth.from("assignments").insert({ service_id: services[0].id, position_id: pos[0].id, profile_id: r.id }).select();
  assert.equal(put.error, null);
  const lead = await rpc(ruth, "set_rota_member", { p_rota: av, p_profile: r.id, p_member: true, p_lead: false });
  assert.ok(lead.error, "only an admin changes who leads");
  const evt = await ruth.from("events").insert({ starts_on: "2027-01-01", title: "Lead event" }).select();
  assert.ok(evt.error || evt.data.length === 0);
});

test("admins need their two-step code before admin tools work", async () => {
  const alex = await signIn(ALEX);
  assert.equal((await rpc(alex, "is_admin")).data, false);
  const before = await alex.from("access_requests").select("id");
  assert.equal(before.data.length, 0);
  const inv = await alex.functions.invoke("invite-member", { body: { email: "x@example.org", full_name: "X" } });
  assert.ok(inv.error, "invite should be refused without two-step");

  await twoStep(alex);
  assert.equal((await rpc(alex, "is_admin")).data, true);
  const after = await alex.from("access_requests").select("id");
  assert.ok(after.data.length > 0);
  const evt = await alex.from("events").insert({ starts_on: "2027-01-06", title: "Epiphany test" }).select();
  assert.equal(evt.error, null);
  const visitor = anon();
  const pub = await visitor.from("events").select("title").eq("title", "Epiphany test");
  assert.equal(pub.data.length, 1);
  await alex.from("events").delete().eq("id", evt.data[0].id);
  const log = await alex.from("activity_log").select("table_name, action").eq("table_name", "events");
  assert.ok(log.data.length >= 2);
});

test("an admin invites someone, who can then sign in, and later delete their own account", async () => {
  const alex = await signIn(ALEX);
  await twoStep(alex);
  const av = await avRota(alex);
  const email = `invited.${Date.now()}@example.org`;
  const inv = await alex.functions.invoke("invite-member", { body: { email, full_name: "Invited Person", rota_ids: [av] } });
  assert.equal(inv.error, null, inv.error && (await inv.error.context?.text?.()));
  const { data: profile } = await service.from("profiles").select("approved, full_name").eq("id", inv.data.user_id).single();
  assert.equal(profile.approved, true);
  assert.equal(profile.full_name, "Invited Person");
  const { data: team } = await service.from("rota_members").select("rota_id").eq("profile_id", inv.data.user_id);
  assert.deepEqual(team.map((t) => t.rota_id), [av]);

  const person = await signIn(email);
  const access = await rpc(person, "my_access");
  assert.equal(access.data.approved, true);
  const exported = await rpc(person, "my_data");
  assert.equal(exported.data.profile.full_name, "Invited Person");

  const del = await person.functions.invoke("delete-me", { body: {} });
  assert.equal(del.error, null);
  const { data: gone } = await service.from("profiles").select("id").eq("id", inv.data.user_id);
  assert.equal(gone.length, 0);
});

test("an admin removes someone, but never the last admin", async () => {
  const alex = await signIn(ALEX);
  await twoStep(alex);
  const { data: { user: a } } = await alex.auth.getUser();
  const self = await alex.functions.invoke("remove-member", { body: { profile_id: a.id } });
  assert.ok(self.error);
  const last = await rpc(alex, "set_admin", { p_profile: a.id, p_admin: false });
  assert.ok(last.error, "cannot remove the only admin");
  const selfDelete = await alex.functions.invoke("delete-me", { body: {} });
  assert.ok(selfDelete.error, "the only admin cannot delete themselves");

  const email = `leaver.${Date.now()}@example.org`;
  const inv = await alex.functions.invoke("invite-member", { body: { email, full_name: "Leaver" } });
  assert.equal(inv.error, null);
  const rm = await alex.functions.invoke("remove-member", { body: { profile_id: inv.data.user_id } });
  assert.equal(rm.error, null);
  const { data: gone } = await service.from("profiles").select("id").eq("id", inv.data.user_id);
  assert.equal(gone.length, 0);
});

test("reminders go out once for the next seven days", { skip: !CRON_SECRET }, async () => {
  const call = () => fetch(`${URL}/functions/v1/send-reminders`, {
    method: "POST",
    headers: { "x-cron-secret": CRON_SECRET, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: "{}",
  }).then((r) => r.json());
  const { data: due } = await service.rpc("due_reminders");
  const first = await call();
  assert.equal(first.sent, due.length);
  const second = await call();
  assert.equal(second.sent, 0, "nobody gets the same reminder twice");
  const wrong = await fetch(`${URL}/functions/v1/send-reminders`, { method: "POST", headers: { "x-cron-secret": "wrong" } });
  assert.equal(wrong.status, 401);
});
