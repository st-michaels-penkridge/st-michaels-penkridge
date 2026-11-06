// Shared bits for the members area edge functions
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.117.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// The address of the public site, for links in emails, e.g. https://www.penkridgechurch.org.uk
export const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");

// Sign-in uses a bearer token rather than cookies, so any origin is safe here.
// Set ALLOWED_ORIGIN to the site's address to narrow it anyway
export const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Full access, used only after the caller has been checked
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface Caller {
  user: User;
  // Acts as the caller, so the database's own rules apply to it
  db: SupabaseClient;
}

// Who sent this request? Checked with the sign-in service, not just decoded
export async function getCaller(req: Request): Promise<Caller> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new HttpError(401, "Please sign in");
  const db = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Please sign in again");
  return { user: data.user, db };
}

// Admin, and signed in with their two-step code this session
export async function requireAdmin(req: Request): Promise<Caller> {
  const caller = await getCaller(req);
  const { data, error } = await caller.db.rpc("is_admin");
  if (error || data !== true) {
    throw new HttpError(403, "Only an admin who has signed in with their two-step code can do this");
  }
  return caller;
}

export async function countOtherAdmins(db: SupabaseClient, notId: string): Promise<number> {
  const { count, error } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_admin", true)
    .eq("approved", true)
    .neq("id", notId);
  if (error) throw new HttpError(500, error.message);
  return count ?? 0;
}

export async function logActivity(db: SupabaseClient, actor: string, action: string, rowId: string) {
  await db.from("activity_log").insert({ actor, table_name: "profiles", action, row_id: rowId });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body as Record<string, unknown> : {};
  } catch {
    throw new HttpError(400, "The request was not valid JSON");
  }
}

// Wrap a handler with CORS, POST-only and tidy error replies
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    if (req.method !== "POST") return json({ error: "Use POST" }, 405);
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}
