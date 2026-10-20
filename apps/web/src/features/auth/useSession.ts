import type { Session } from "@supabase/supabase-js";
import { useAuth } from "./AuthContext.tsx";

/** Current Supabase session. `loading` is true until the first read resolves. */
export function useSession(): { session: Session | null; loading: boolean } {
  const { session, loading } = useAuth();
  return { session, loading };
}
