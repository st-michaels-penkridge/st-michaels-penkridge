// Delete your own account and everything held about you.
// Body: {}
import { countOtherAdmins, getCaller, handle, HttpError, json, serviceClient } from "../_shared/common.ts";

Deno.serve(handle(async (req) => {
  const caller = await getCaller(req);
  const db = serviceClient();

  const { data: me } = await db.from("profiles").select("is_admin").eq("id", caller.user.id).maybeSingle();
  if (me?.is_admin && (await countOtherAdmins(db, caller.user.id)) === 0) {
    throw new HttpError(400, "You are the only admin. Make someone else an admin first, then delete your account");
  }

  const { error } = await db.auth.admin.deleteUser(caller.user.id);
  if (error) {
    console.error("delete-me failed", error);
    throw new HttpError(500, "Something went wrong. Please try again.");
  }
  return json({ ok: true });
}));
