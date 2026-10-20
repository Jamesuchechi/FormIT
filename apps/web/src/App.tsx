import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar.tsx";
import { AuthProvider } from "./features/auth/AuthContext.tsx";
import { RequireAuth } from "./features/auth/RequireAuth.tsx";

const HomePage = lazy(() =>
  import("./routes/HomePage.tsx").then((m) => ({ default: m.HomePage })),
);
const FillPage = lazy(() =>
  import("./routes/FillPage.tsx").then((m) => ({ default: m.FillPage })),
);
const LoginPage = lazy(() =>
  import("./routes/LoginPage.tsx").then((m) => ({ default: m.LoginPage })),
);
const AuthCallbackPage = lazy(() =>
  import("./routes/AuthCallbackPage.tsx").then((m) => ({ default: m.AuthCallbackPage })),
);
const BuilderPage = lazy(() =>
  import("./routes/BuilderPage.tsx").then((m) => ({ default: m.BuilderPage })),
);
const NotFoundPage = lazy(() =>
  import("./routes/NotFoundPage.tsx").then((m) => ({ default: m.NotFoundPage })),
);

function PageLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center p-8"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            {/* Public fill page without main navbar distraction */}
            <Route path="/f/:slug" element={<FillPage />} />

            {/* Dedicated full-screen builder workspace */}
            <Route
              path="/forms/:id/edit"
              element={
                <RequireAuth>
                  <BuilderPage />
                </RequireAuth>
              }
            />

            {/* Standard app pages with navbar */}
            <Route
              path="*"
              element={
                <>
                  <Navbar />
                  <div className="flex-1">
                    <Suspense fallback={<PageLoading />}>
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<LoginPage defaultMode="signin" />} />
                        <Route path="/signup" element={<LoginPage defaultMode="signup" />} />
                        <Route path="/auth/callback" element={<AuthCallbackPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </Suspense>
                  </div>
                </>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </AuthProvider>
  );
}
