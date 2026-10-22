import type { AuthError } from "@supabase/supabase-js";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { supabase } from "../../lib/supabase.ts";
import { LoginPage } from "../../routes/LoginPage.tsx";
import { AuthProvider, useAuth } from "./AuthContext.tsx";
import { RequireAuth } from "./RequireAuth.tsx";

// Mock supabase.auth methods
vi.mock("../../lib/supabase.ts", () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        })),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signInWithOtp: vi.fn(),
        signOut: vi.fn(),
      },
    },
  };
});

function TestConsumer() {
  const { session, user, signOut } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{session ? "signed-in" : "signed-out"}</span>
      <span data-testid="user-email">{user?.email || "none"}</span>
      <button onClick={() => void signOut()}>Sign out</button>
    </div>
  );
}

describe("AuthContext and AuthProvider", () => {
  it("renders with signed-out state by default", async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("signed-out");
    });
    expect(screen.getByTestId("user-email")).toHaveTextContent("none");
  });
});

describe("RequireAuth", () => {
  it("redirects to /login when unauthenticated", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <div>Secret Dashboard</div>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
      expect(screen.queryByText("Secret Dashboard")).not.toBeInTheDocument();
    });
  });
});

describe("LoginPage", () => {
  it("renders sign in form with email and password", () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByRole("heading", { name: /sign in to formit/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("switches to magic link mode", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Magic Link" }));

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Magic Link" })).toBeInTheDocument();
  });

  it("handles sign in with invalid credentials", async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: {
        message: "Invalid login credentials",
        name: "AuthApiError",
        status: 400,
      } as AuthError,
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    await user.type(screen.getByLabelText(/email address/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid login credentials");
    });
  });

  it("sends magic link and displays confirmation message", async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Magic Link" }));
    await user.type(screen.getByLabelText(/email address/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Send Magic Link" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/we sent a sign-in link/i);
    });
  });

  it("switches to sign up mode and validates matching passwords", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(
      screen.getByRole("heading", { name: /create your formit account/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email address/i), "newuser@example.com");
    await user.type(screen.getByLabelText(/^password/i), "secret123");
    await user.type(screen.getByLabelText(/confirm password/i), "secret456");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.");
    });
  });
});
