import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { FormitLogo } from "../components/FormitLogo.tsx";
import { useSession } from "../features/auth/useSession.ts";
import { FormFiller } from "../features/renderer/FormFiller.tsx";
import { defaultFillApi, getPublicForm, getResponseForEdit } from "../lib/api.ts";
import { ApiError } from "../lib/errors.ts";

const SLUG = /^[a-z0-9][a-z0-9-]{2,62}$/;

function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center shadow-sm text-neutral-900 dark:text-neutral-100">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children && <p className="mt-2 text-neutral-600 dark:text-neutral-400">{children}</p>}
    </div>
  );
}

export function FillPage() {
  const { slug = "" } = useParams();
  const location = useLocation();
  const valid = SLUG.test(slug);

  const editKey = new URLSearchParams(location.search).get("edit");

  // Query public form if not in edit mode
  const {
    data: form,
    isPending: formPending,
    isError: formIsError,
    refetch: refetchForm,
  } = useQuery({
    queryKey: ["public-form", slug],
    queryFn: () => getPublicForm(slug),
    enabled: valid && !editKey,
  });

  // Query existing response if in edit mode
  const {
    data: editData,
    isPending: editPending,
    isError: editIsError,
    error: editErr,
    refetch: refetchEdit,
  } = useQuery({
    queryKey: ["response-edit", editKey],
    queryFn: () => getResponseForEdit(editKey!),
    enabled: Boolean(editKey),
  });

  const { session, loading: sessionLoading } = useSession();

  // Dark mode resolution based on form theme setting
  const [isSystemDark, setIsSystemDark] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setIsSystemDark(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const currentForm = editKey ? editData?.form : form;
  const themeMode = currentForm?.schema?.theme?.darkMode ?? "auto";
  const isDarkMode = themeMode === "dark" || (themeMode === "auto" && isSystemDark);

  let content: ReactNode;

  if (editKey) {
    if (editPending || sessionLoading) {
      content = (
        <div className="space-y-4" aria-busy="true" aria-label="Loading response">
          <div className="h-9 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        </div>
      );
    } else if (editIsError) {
      if (editErr instanceof ApiError && editErr.code === "editing_disabled") {
        content = (
          <Notice title="Response editing disabled">
            The creator of this form has disabled response editing.
          </Notice>
        );
      } else if (editErr instanceof ApiError && editErr.code === "form_closed") {
        content = (
          <Notice title="This form is closed">
            This form is no longer accepting responses or edits.
          </Notice>
        );
      } else {
        content = (
          <Notice title="Couldn't load response">
            <button
              type="button"
              onClick={() => void refetchEdit()}
              className="underline cursor-pointer"
            >
              Try again
            </button>
          </Notice>
        );
      }
    } else if (!editData) {
      content = (
        <Notice title="Response not found">
          The response you are trying to edit could not be found, or the edit link is invalid.
        </Notice>
      );
    } else if (editData.form.requireSignIn && !session) {
      const redirectUrl = encodeURIComponent(location.pathname + location.search);
      content = (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center shadow-sm text-neutral-900 dark:text-neutral-100">
          <h1 className="text-xl font-semibold">Sign in required</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            The creator of this form requires you to sign in before responding.
          </p>
          <Link
            to={`/login?redirect=${redirectUrl}`}
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            Sign in to respond
          </Link>
        </div>
      );
    } else {
      content = (
        <div className="space-y-6">
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/40 p-4 text-sm text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold" aria-hidden="true">
              ℹ️
            </span>
            <div>
              <p className="font-medium">Editing previous submission</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                You are updating your response submitted on{" "}
                {new Date(editData.submittedAt).toLocaleDateString()}. Changes will update your existing
                answers.
              </p>
            </div>
          </div>
          <FormFiller
            form={editData.form}
            api={defaultFillApi}
            userId={session?.user.id}
            initialAnswers={editData.answers}
            editKey={editKey}
          />
        </div>
      );
    }
  } else if (!valid || form === null) {
    content = (
      <Notice title="This form isn't available">
        It may be closed, not open yet, or the link may be wrong.
      </Notice>
    );
  } else if (formIsError) {
    content = (
      <Notice title="Couldn't load this form">
        <button
          type="button"
          onClick={() => void refetchForm()}
          className="underline cursor-pointer"
        >
          Try again
        </button>
      </Notice>
    );
  } else if (formPending || sessionLoading) {
    content = (
      <div className="space-y-4" aria-busy="true" aria-label="Loading form">
        <div className="h-9 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  } else if (form.requireSignIn && !session) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    content = (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center shadow-sm text-neutral-900 dark:text-neutral-100">
        <h1 className="text-xl font-semibold">Sign in required</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          The creator of this form requires you to sign in before responding.
        </p>
        <Link
          to={`/login?redirect=${redirectUrl}`}
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          Sign in to respond
        </Link>
      </div>
    );
  } else {
    content = <FormFiller form={form} api={defaultFillApi} userId={session?.user.id} />;
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDarkMode ? "dark bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"
      }`}
    >
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12 flex flex-col min-h-screen justify-between">
        <div>{content}</div>
        <footer className="mt-12 pb-6 text-center">
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          >
            <span>Powered by</span>
            <FormitLogo size="xs" showWordmark />
          </Link>
        </footer>
      </main>
    </div>
  );
}
