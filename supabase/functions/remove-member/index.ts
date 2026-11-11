// Remove someone from the members area for good (admins only).
// Body: { profile_id }
// Deletes their account, which also removes their name, contact details,
// teams, dates, away dates and swap requests.
import { countOtherAdmins, handle, HttpError, isUuid, json, logActivity, readJson, requireAdmin, serviceClient } from "../_shared/common.ts";

Deno.serve(handle(async (req) => {
  const caller = await requireAdmin(req);
  const body = await readJson(req);
  const profileId = body.profile_id;
  if (!isUuid(profileId)) throw new HttpError(400, "Choose who to remove");
  if (profileId === caller.user.id) {
    throw new HttpError(400, "To remove your own account, use Delete my account on My details");
  }

  const db = serviceClient();
  const { data: target } = await db.from("profiles").select("is_admin").eq("id", profileId).maybeSingle();
  if (!target) throw new HttpError(404, "That person is not in the members area");
  if (target.is_admin && (await countOtherAdmins(db, profileId)) === 0) {
    throw new HttpError(400, "There must always be at least one admin");
  }

  const { error } = await db.auth.admin.deleteUser(profileId);
  if (error) {
    console.error("remove-member delete failed", error);
    throw new HttpError(500, "Something went wrong. Please try again.");
  }
  await logActivity(db, caller.user.id, "removed", profileId);
  return json({ ok: true });
}));
