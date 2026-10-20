import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.tsx";
import { inputClass } from "../features/renderer/fields/styles.ts";

interface LoginPageProps {
  defaultMode?: "signin" | "signup";
}

export function LoginPage({ defaultMode = "signin" }: LoginPageProps) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [method, setMethod] = useState<"password" | "magic-link">("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { session, signInWithPassword, signUpWithPassword, signInWithOtp } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const redirectUrl = searchParams.get("redirect") || "/";

  // If already authenticated, redirect to target
  if (session) {
    navigate(redirectUrl, { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (method === "magic-link") {
      setSubmitting(true);
      const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
        redirectUrl,
      )}`;
      const { error: otpErr } = await signInWithOtp(cleanEmail, callbackUrl);
      setSubmitting(false);

      if (otpErr) {
        setError(otpErr.message);
      } else {
        setMessage(`We sent a sign-in link to ${cleanEmail}. Check your inbox!`);
      }
      return;
    }

    // Password method
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setSubmitting(true);
      const { error: signUpErr, session: newSession } = await signUpWithPassword(
        cleanEmail,
        password,
      );
      setSubmitting(false);

      if (signUpErr) {
        setError(signUpErr.message);
      } else if (newSession) {
        navigate(redirectUrl, { replace: true });
      } else {
        setMessage(
          `Account created! Check ${cleanEmail} for a confirmation link to complete sign in.`,
        );
      }
    } else {
      setSubmitting(true);
      const { error: signInErr } = await signInWithPassword(cleanEmail, password);
      setSubmitting(false);

      if (signInErr) {
        setError(signInErr.message);
      } else {
        navigate(redirectUrl, { replace: true });
      }
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="inline-block text-center w-full">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xl shadow-md">
            F
          </div>
          <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-neutral-900">
            {mode === "signin" ? "Sign in to FormIT" : "Create your FormIT account"}
          </h2>
          <p className="mt-1 text-center text-sm text-neutral-600">
            Build, publish, and collect responses with ease.
          </p>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
          {/* Method Selector Tabs */}
          <div className="mb-6 flex rounded-lg border border-neutral-200 bg-neutral-50 p-1">
            <button
              type="button"
              onClick={() => {
                setMethod("password");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                method === "password"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("magic-link");
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                method === "magic-link"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Magic Link
            </button>
          </div>

          {/* Feedback banners */}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              <p className="font-medium">{message}</p>
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setEmail("");
                  setPassword("");
                }}
                className="mt-2 text-xs text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
              >
                Send again or use different email
              </button>
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Email address
                </label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="name@example.com"
                  disabled={submitting}
                />
              </div>

              {method === "password" && (
                <>
                  <div>
                    <label
                      htmlFor="auth-password"
                      className="block text-sm font-medium text-neutral-700 mb-1"
                    >
                      Password
                    </label>
                    <input
                      id="auth-password"
                      name="password"
                      type="password"
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      placeholder={
                        mode === "signup"
                          ? "At least 6 characters"
                          : "Your password"
                      }
                      disabled={submitting}
                    />
                  </div>

                  {mode === "signup" && (
                    <div>
                      <label
                        htmlFor="auth-confirm-password"
                        className="block text-sm font-medium text-neutral-700 mb-1"
                      >
                        Confirm password
                      </label>
                      <input
                        id="auth-confirm-password"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClass}
                        placeholder="Re-enter password"
                        disabled={submitting}
                      />
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Processing...</span>
                  </span>
                ) : method === "magic-link" ? (
                  "Send Magic Link"
                ) : mode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          )}

          {/* Mode toggle */}
          {method === "password" && !message && (
            <div className="mt-6 border-t border-neutral-100 pt-4 text-center text-sm text-neutral-600">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                      setMessage(null);
                    }}
                    className="font-medium text-indigo-600 hover:text-indigo-500 underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                      setMessage(null);
                    }}
                    className="font-medium text-indigo-600 hover:text-indigo-500 underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
