import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.tsx";

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center p-8"
        aria-busy="true"
        aria-label="Checking authentication"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-sm text-neutral-500">Checking session...</p>
      </div>
    );
  }

  if (!session) {
    const redirectPath = encodeURIComponent(
      location.pathname + location.search + location.hash,
    );
    return <Navigate to={`/login?redirect=${redirectPath}`} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
