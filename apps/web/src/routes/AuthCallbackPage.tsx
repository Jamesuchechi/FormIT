import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase.ts";

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const redirectUrl = searchParams.get("redirect") || "/";

  useEffect(() => {
    // Check if URL has error parameters
    const hash = window.location.hash;
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const description =
        params.get("error_description") || "Authentication link invalid or expired.";
      setError(description);
      return;
    }

    let active = true;

    // Check existing session or wait for auth state change
    void supabase.auth.getSession().then(({ data, error: sessionErr }) => {
      if (!active) return;
      if (sessionErr) {
        setError(sessionErr.message);
        return;
      }
      if (data.session) {
        navigate(redirectUrl, { replace: true });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_IN" && session) {
        navigate(redirectUrl, { replace: true });
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, redirectUrl]);

  if (error) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 text-xl font-bold">
            !
          </div>
          <h1 className="mt-4 text-xl font-semibold text-neutral-900">
            Sign-in link failed
          </h1>
          <p className="mt-2 text-sm text-neutral-600">{error}</p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-[50vh] flex-col items-center justify-center p-8"
      aria-busy="true"
      aria-label="Completing authentication"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      <h1 className="mt-4 text-base font-medium text-neutral-900">
        Signing you in...
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Please wait while we verify your session.
      </p>
    </main>
  );
}
