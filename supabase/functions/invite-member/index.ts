// Invite someone to the members area (admins only).
// Body: { email, full_name, rota_ids?: string[], request_id?: string }
// Sends the invite email, approves the account, puts them on the chosen teams
// and clears their access request if there was one.
import { handle, HttpError, isUuid, json, logActivity, readJson, requireAdmin, serviceClient, SITE_URL } from "../_shared/common.ts";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(handle(async (req) => {
  const caller = await requireAdmin(req);
  const body = await readJson(req);

  const email = String(body.email ?? "").trim().toLowerCase();
  const fullName = String(body.full_name ?? "").trim().slice(0, 80);
  const rotaIds = Array.isArray(body.rota_ids) ? body.rota_ids.filter(isUuid) : [];
  const requestId = isUuid(body.request_id) ? body.request_id : null;
  if (!EMAIL.test(email) || email.length > 254) throw new HttpError(400, "Please give a valid email address");
  if (!fullName) throw new HttpError(400, "Please give their name");

  const db = serviceClient();
  const { data: known, error: lookupError } = await db
    .from("contact_details").select("profile_id").eq("email", email).maybeSingle();
  if (lookupError) throw new HttpError(500, lookupError.message);

  let userId: string;
  if (known) {
    userId = known.profile_id;
  } else {
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: SITE_URL ? `${SITE_URL}/members/` : undefined,
    });
    if (error || !data.user) throw new HttpError(400, error?.message ?? "The invite could not be sent");
    userId = data.user.id;
  }

  const { error: approveError } = await db
    .from("profiles").update({ approved: true, full_name: fullName }).eq("id", userId);
  if (approveError) throw new HttpError(500, approveError.message);

  if (rotaIds.length) {
    const { error } = await db.from("rota_members").upsert(
      rotaIds.map((rota_id) => ({ rota_id, profile_id: userId })),
      { onConflict: "rota_id,profile_id", ignoreDuplicates: true },
    );
    if (error) throw new HttpError(400, error.message);
  }

  if (requestId) await db.from("access_requests").delete().eq("id", requestId);
  else await db.from("access_requests").delete().eq("email", email);

  await logActivity(db, caller.user.id, known ? "approved" : "invited", userId);
  return json({ ok: true, user_id: userId, already_had_account: Boolean(known) });
}));
