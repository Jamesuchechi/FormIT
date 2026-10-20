import { FIELD_REGISTRY, FIELD_TYPES } from "@formit/schema";
import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.tsx";

export function HomePage() {
  const { session, user } = useAuth();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          FormIT v1 Pre-release
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Design forms, collect responses, analyze data.
        </h1>
        <p className="mt-3 text-lg text-neutral-600 max-w-2xl">
          A modern form builder and survey platform built on versioned schemas,
          conditional logic, and Supabase.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          {session ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-700">
                Signed in as <strong className="font-semibold">{user?.email}</strong>
              </span>
            </div>
          ) : (
            <>
              <Link
                to="/signup"
                className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                Create free account
              </Link>
              <Link
                to="/login"
                className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400/40"
              >
                Sign in
              </Link>
            </>
          )}
        </div>

        <hr className="my-10 border-neutral-200" />

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Supported Field Types
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {FIELD_TYPES.map((t) => (
              <li
                key={t}
                className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700"
              >
                {FIELD_REGISTRY[t].label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
