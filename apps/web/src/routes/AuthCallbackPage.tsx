import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FormitLogo } from "../components/FormitLogo.tsx";
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
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6 bg-neutral-50/50">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-8 shadow-xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-neutral-900">
            Sign-in link verification failed
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600">{error}</p>
          <div className="mt-6 pt-4 border-t border-neutral-100">
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-violet-500 transition-all"
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
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6 bg-neutral-50/50"
      aria-busy="true"
      aria-label="Completing authentication"
    >
      <div className="max-w-sm w-full rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl text-center">
        <FormitLogo size="lg" className="mx-auto mb-4" />
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent my-4" />
        <h1 className="text-base font-semibold text-neutral-900">
          Verifying your secure session...
        </h1>
        <p className="mt-1.5 text-xs text-neutral-500">
          Redirecting you to your FormIT workspace in just a moment.
        </p>
      </div>
    </main>
  );
}
