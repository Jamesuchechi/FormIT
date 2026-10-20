import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useSession } from "../features/auth/useSession.ts";
import { FormFiller } from "../features/renderer/FormFiller.tsx";
import { defaultFillApi, getPublicForm } from "../lib/api.ts";

const SLUG = /^[a-z0-9][a-z0-9-]{2,62}$/;

function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children && <p className="mt-2 text-neutral-600">{children}</p>}
    </div>
  );
}

export function FillPage() {
  const { slug = "" } = useParams();
  const valid = SLUG.test(slug);

  const {
    data: form,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["public-form", slug],
    queryFn: () => getPublicForm(slug),
    enabled: valid,
  });
  const { session, loading: sessionLoading } = useSession();

  let content: ReactNode;
  if (!valid || form === null) {
    content = (
      <Notice title="This form isn't available">
        It may be closed, not open yet, or the link may be wrong.
      </Notice>
    );
  } else if (isError) {
    content = (
      <Notice title="Couldn't load this form">
        <button type="button" onClick={() => void refetch()} className="underline">
          Try again
        </button>
      </Notice>
    );
  } else if (isPending || sessionLoading) {
    content = (
      <div className="space-y-4" aria-busy="true" aria-label="Loading form">
        <div className="h-9 w-2/3 animate-pulse rounded bg-neutral-200" />
        <div className="h-32 animate-pulse rounded-xl bg-neutral-200" />
        <div className="h-32 animate-pulse rounded-xl bg-neutral-200" />
      </div>
    );
  } else if (form.requireSignIn && !session) {
    // TODO(auth): link to the sign-in page once auth routes exist.
    content = (
      <Notice title="Sign in required">You need to sign in to respond to this form.</Notice>
    );
  } else {
    content = <FormFiller form={form} api={defaultFillApi} />;
  }

  return <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">{content}</main>;
}
