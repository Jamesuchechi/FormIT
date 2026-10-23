import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { Navbar } from "./components/Navbar.tsx";
import { AuthProvider } from "./features/auth/AuthContext.tsx";
import { RequireAuth } from "./features/auth/RequireAuth.tsx";

const HomePage = lazy(() => import("./routes/HomePage.tsx").then((m) => ({ default: m.HomePage })));
const FillPage = lazy(() => import("./routes/FillPage.tsx").then((m) => ({ default: m.FillPage })));
const LoginPage = lazy(() =>
  import("./routes/LoginPage.tsx").then((m) => ({ default: m.LoginPage })),
);
const AuthCallbackPage = lazy(() =>
  import("./routes/AuthCallbackPage.tsx").then((m) => ({ default: m.AuthCallbackPage })),
);
const BuilderPage = lazy(() =>
  import("./routes/BuilderPage.tsx").then((m) => ({ default: m.BuilderPage })),
);
const ResponsesPage = lazy(() =>
  import("./routes/ResponsesPage.tsx").then((m) => ({ default: m.ResponsesPage })),
);
const InviteAcceptPage = lazy(() =>
  import("./routes/InviteAcceptPage.tsx").then((m) => ({ default: m.InviteAcceptPage })),
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
      <div className="min-h-screen bg-slate-50/70 text-neutral-900 flex flex-col selection:bg-indigo-500 selection:text-white">
        <ErrorBoundary>
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
                    <div className="relative flex-1">
                      {/* Ambient subtle background glow and micro-grid */}
                      <div
                        className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.06),rgba(255,255,255,0))]"
                        aria-hidden="true"
                      />
                      <div
                        className="fixed inset-0 pointer-events-none -z-10 opacity-30 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
                        aria-hidden="true"
                      />
                      <Suspense fallback={<PageLoading />}>
                        <Routes>
                          <Route path="/" element={<HomePage />} />
                          <Route
                            path="/forms/:id/responses"
                            element={
                              <RequireAuth>
                                <ResponsesPage />
                              </RequireAuth>
                            }
                          />
                          <Route path="/login" element={<LoginPage defaultMode="signin" />} />
                          <Route path="/signup" element={<LoginPage defaultMode="signup" />} />
                          <Route path="/auth/callback" element={<AuthCallbackPage />} />
                          <Route path="/invite/:token" element={<InviteAcceptPage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Suspense>
                    </div>
                  </>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </AuthProvider>
  );
}
