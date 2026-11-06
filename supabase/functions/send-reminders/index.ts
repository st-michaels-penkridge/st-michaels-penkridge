// Email everyone who is on a rota in the next seven days, once.
// Run once a day by a Supabase cron job (see supabase/README.md), which sends
// the header  x-cron-secret: <CRON_SECRET>.
// Also clears out old records (tidy_old_data).
import { cors, json, serviceClient, SITE_URL } from "../_shared/common.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_API_URL = Deno.env.get("RESEND_API_URL") ?? "https://api.resend.com/emails";
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "";

interface Due {
  assignment_id: string;
  email: string;
  full_name: string;
  rota: string;
  job: string;
  service: string;
  starts_at: string;
  rota_slug: string;
}

function when(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" }),
    time: d.toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }),
  };
}

function message(r: Due) {
  const { day, time } = when(r.starts_at);
  const first = r.full_name.split(" ")[0] || "there";
  const link = `${SITE_URL}/members/rota.html?rota=${encodeURIComponent(r.rota_slug)}`;
  return {
    subject: `Reminder: ${r.rota} on ${day}`,
    text: [
      `Hello ${first},`,
      "",
      `This is a reminder that you are on the ${r.rota} rota (${r.job}) for ${r.service} on ${day} at ${time}.`,
      "",
      `If you can no longer make it, ask the team for a swap here: ${link}`,
      "",
      "Thank you,",
      "St Michael and All Angels, Penkridge",
      "",
      "You get this email because you are on a rota at St Michael's. To stop, ask the rota lead or the parish office to take you off the rota.",
    ].join("\n"),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return json({ error: "Not allowed" }, 401);
  }
  if (!RESEND_API_KEY || !MAIL_FROM || !SITE_URL) {
    return json({ error: "Email is not set up yet: add the RESEND_API_KEY, MAIL_FROM and SITE_URL secrets" }, 500);
  }

  const db = serviceClient();
  const { data, error } = await db.rpc("due_reminders");
  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  const failed: string[] = [];
  for (const r of (data ?? []) as Due[]) {
    const m = message(r);
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: MAIL_FROM, to: [r.email], subject: m.subject, text: m.text }),
    });
    if (res.ok) {
      await db.from("reminder_log").insert({ assignment_id: r.assignment_id });
      sent++;
    } else {
      failed.push(r.assignment_id);
      console.error("Reminder not sent", r.assignment_id, res.status, await res.text());
    }
  }

  const tidy = await db.rpc("tidy_old_data");
  if (tidy.error) console.error("Tidy failed", tidy.error.message);

  return json({ ok: failed.length === 0, sent, failed: failed.length });
});
