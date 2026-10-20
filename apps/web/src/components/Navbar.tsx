import { ArrowRight, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.tsx";
import { FormitLogo } from "./FormitLogo.tsx";
import { GithubIcon } from "./icons.tsx";

export function Navbar() {
  const { session, user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center group">
            <FormitLogo showWordmark size="sm" />
          </Link>

          {/* Nav links (visible on larger screens) */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-neutral-600">
            <a
              href="#features"
              className="rounded-lg px-3 py-1.5 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              Features
            </a>
            <a
              href="#demo"
              className="rounded-lg px-3 py-1.5 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              Interactive Demo
            </a>
            <a
              href="#comparison"
              className="rounded-lg px-3 py-1.5 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              Why FormIT
            </a>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/jamesuchechi/formit"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub Repository"
            className="hidden sm:inline-flex items-center justify-center rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <GithubIcon className="h-4 w-4" />
          </a>

          {session && user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Forms
              </Link>
              <span className="hidden text-xs text-neutral-500 md:inline-block max-w-[140px] truncate">
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400/30 transition-all cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/20 active:scale-95 transition-all"
              >
                Get Started
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
