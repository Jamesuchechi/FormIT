import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FormitLogo } from "../components/FormitLogo.tsx";
import { useAuth } from "../features/auth/AuthContext.tsx";

interface LoginPageProps {
  defaultMode?: "signin" | "signup";
}

export function LoginPage({ defaultMode = "signin" }: LoginPageProps) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [method, setMethod] = useState<"password" | "magic-link">("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Showcase interactive state
  const [previewSelected, setPreviewSelected] = useState<number>(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { session, signInWithPassword, signUpWithPassword, signInWithOtp } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const redirectUrl = searchParams.get("redirect") || "/";

  // Sync mode with prop if route changes
  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

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
    <main className="min-h-[calc(100vh-4rem)] bg-neutral-950 lg:bg-neutral-50 flex flex-col justify-center">
      <div className="grid lg:grid-cols-12 min-h-[calc(100vh-4rem)]">
        {/* Left Showcase Brand Panel (Dark Mode Vibe) */}
        <div className="relative hidden lg:flex lg:col-span-5 xl:col-span-6 flex-col justify-between p-12 bg-neutral-950 text-white overflow-hidden border-r border-neutral-800">
          {/* Ambient background glows */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.2) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <Link
              to="/"
              className="inline-flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1"
            >
              <FormitLogo size="md" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                    FormIT
                  </span>
                  <span className="text-[10px] uppercase font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
                    SaaS Engine
                  </span>
                </div>
                <span className="text-xs text-neutral-400">Forms that feel like software</span>
              </div>
            </Link>
          </div>

          {/* Middle Interactive Form Mockup Card */}
          <div className="relative z-10 my-8">
            <div className="max-w-md mx-auto bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-medium text-neutral-400">
                    ⚡ Live Respondent Experience
                  </span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">Step 2 of 4</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-neutral-800 h-1 rounded-full mb-5 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full w-1/2 rounded-full" />
              </div>

              <h3 className="text-sm font-semibold text-neutral-100 mb-1">
                How large is your product or engineering team?
              </h3>
              <p className="text-xs text-neutral-400 mb-4">
                Test the keyboard-first tactile navigation below.
              </p>

              {/* Interactive choice items */}
              <div className="space-y-2">
                {[
                  { id: 1, key: "1", label: "1 - 10 builders", desc: "Seed to Series A startups" },
                  { id: 2, key: "2", label: "11 - 50 builders", desc: "Scaling product teams" },
                  { id: 3, key: "3", label: "50+ enterprise", desc: "Multi-squad organizations" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreviewSelected(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs transition-all ${
                      previewSelected === item.id
                        ? "bg-indigo-950/60 border-indigo-500/80 text-white shadow-sm shadow-indigo-500/20"
                        : "bg-neutral-800/50 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          previewSelected === item.id
                            ? "bg-indigo-600 text-white"
                            : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                        }`}
                      >
                        {item.key}
                      </span>
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-[10px] text-neutral-400">{item.desc}</div>
                      </div>
                    </div>
                    {previewSelected === item.id && (
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
                <span>Press keys [1-3] to select</span>
                <span className="font-mono text-neutral-300">Enter ↵ next</span>
              </div>
            </div>
          </div>

          {/* Bottom Highlights & Metrics */}
          <div className="relative z-10 pt-4 border-t border-neutral-800/80">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-base font-bold text-white font-mono">7 kB</div>
                <div className="text-[11px] text-neutral-400">Zero-lag engine</div>
              </div>
              <div>
                <div className="text-base font-bold text-white font-mono">100%</div>
                <div className="text-[11px] text-neutral-400">Typed JSON schema</div>
              </div>
              <div>
                <div className="text-base font-bold text-white font-mono">Instant</div>
                <div className="text-[11px] text-neutral-400">Local draft autosave</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Card Panel */}
        <div className="lg:col-span-7 xl:col-span-6 flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-16 xl:px-24 bg-white lg:bg-neutral-50/50">
          <div className="w-full max-w-md mx-auto">
            {/* Mobile Brand Logo */}
            <div className="lg:hidden text-center mb-8">
              <Link to="/" className="inline-block">
                <FormitLogo size="lg" className="mx-auto" />
              </Link>
            </div>

            {/* Back link */}
            <div className="mb-6">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to FormIT
              </Link>
            </div>

            {/* Card Shell */}
            <div className="bg-white rounded-2xl border border-neutral-200/90 p-8 shadow-xl shadow-neutral-200/50">
              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                  {mode === "signin" ? "Sign in to FormIT" : "Create your FormIT account"}
                </h1>
                <p className="mt-1.5 text-xs text-neutral-500">
                  {mode === "signin"
                    ? "Welcome back. Access your forms, drafts, and responses."
                    : "Create modern keyboard-first forms with direct canvas editing."}
                </p>
              </div>

              {/* Method Selector Tabs */}
              <div className="mb-6 flex rounded-xl border border-neutral-200 bg-neutral-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMethod("password");
                    setError(null);
                    setMessage(null);
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
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
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
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
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-700"
                >
                  <svg
                    className="w-4 h-4 text-red-500 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}

              {message && (
                <div
                  role="status"
                  className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-800"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <svg
                      className="w-4 h-4 text-emerald-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMessage(null);
                      setEmail("");
                      setPassword("");
                    }}
                    className="mt-3 block text-[11px] font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
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
                      className="block text-xs font-medium text-neutral-700 mb-1.5"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <input
                        id="auth-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-neutral-300 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all disabled:opacity-60"
                        placeholder="name@example.com"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {method === "password" && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="auth-password"
                            className="block text-xs font-medium text-neutral-700"
                          >
                            Password
                          </label>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          </div>
                          <input
                            id="auth-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete={mode === "signup" ? "new-password" : "current-password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-neutral-300 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all disabled:opacity-60"
                            placeholder={
                              mode === "signup" ? "At least 6 characters" : "Your password"
                            }
                            disabled={submitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-neutral-400 hover:text-neutral-600"
                            tabIndex={-1}
                          >
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>

                      {mode === "signup" && (
                        <div>
                          <label
                            htmlFor="auth-confirm-password"
                            className="block text-xs font-medium text-neutral-700 mb-1.5"
                          >
                            Confirm password
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.8}
                                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                              </svg>
                            </div>
                            <input
                              id="auth-confirm-password"
                              name="confirmPassword"
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-neutral-300 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all disabled:opacity-60"
                              placeholder="Re-enter password"
                              disabled={submitting}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-2 flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60 cursor-pointer"
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

              {/* Mode toggle switcher */}
              {method === "password" && !message && (
                <div className="mt-6 border-t border-neutral-100 pt-5 text-center text-xs text-neutral-600">
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
                        className="font-semibold text-indigo-600 hover:text-indigo-500 underline underline-offset-2 ml-1 cursor-pointer"
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
                        className="font-semibold text-indigo-600 hover:text-indigo-500 underline underline-offset-2 ml-1 cursor-pointer"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Privacy & Trust micro-banner */}
            <div className="mt-6 text-center text-[11px] text-neutral-500 flex items-center justify-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>Protected with Supabase RLS & AES-256 encryption</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
