import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.tsx";

export function Navbar() {
  const { session, user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-base shadow-sm">
            F
          </div>
          <span className="font-semibold text-lg tracking-tight text-neutral-900">
            FormIT
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {session && user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-neutral-600 sm:inline-block">
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400/30"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
