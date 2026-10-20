import { Link } from "react-router-dom";
import { FormitLogo } from "../components/FormitLogo.tsx";

export function NotFoundPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6 bg-neutral-50/50 text-center">
      <div className="max-w-md w-full rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl">
        <FormitLogo size="lg" className="mx-auto mb-4" />
        <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700 mb-3">
          Error 404
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Page not found
        </h1>
        <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
          The page or form you requested doesn&apos;t exist or might have been moved.
        </p>
        <div className="mt-6 pt-4 border-t border-neutral-100">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-violet-500 transition-all"
          >
            Return to FormIT Home
          </Link>
        </div>
      </div>
    </main>
  );
}
