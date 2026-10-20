import { createClient } from "npm:@supabase/supabase-js@2";

/** Service-role client. Bypasses RLS: never expose it, never return its rows unfiltered. */
export const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export const UPLOAD_BUCKET = "form-uploads";

/**
 * Resolve the caller from the Authorization header. Returns null for missing tokens, the
 * anon key, invalid tokens, and Supabase anonymous-auth users (none of which count as
 * "signed in").
 */
export async function getUserId(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user || data.user.is_anonymous) return null;
  return data.user.id;
}
