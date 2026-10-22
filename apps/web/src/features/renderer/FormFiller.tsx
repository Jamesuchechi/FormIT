import { useEffect, useMemo, useRef } from "react";
import type { FillApi, PublicForm, SubmitExtras } from "../../lib/api.ts";
import { FieldRenderer } from "./FieldRenderer.tsx";
import { Turnstile } from "./Turnstile.tsx";
import { useFillState } from "./useFillState.ts";

type Props = { form: PublicForm; api: FillApi; userId?: string };

const primary =
  "rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60";
const secondary =
  "rounded-lg border border-neutral-300 bg-white px-5 py-2.5 font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400/40";

export function FormFiller({ form, api, userId }: Props) {
  // Spam protection: a honeypot field humans never see, and an optional Turnstile token.
  const honeypotRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<string | null>(null);
  const guardedApi = useMemo<FillApi>(
    () => ({
      ...api,
      submit: (slug, answers) => {
        const extras: SubmitExtras = {};
        if (honeypotRef.current?.value) extras.website = honeypotRef.current.value;
        if (tokenRef.current) extras.turnstileToken = tokenRef.current;
        return Object.keys(extras).length > 0
          ? api.submit(slug, answers, extras)
          : api.submit(slug, answers);
      },
    }),
    [api],
  );
  const s = useFillState(form, guardedApi, userId);
  const headerRef = useRef<HTMLElement>(null);

  // Bring the top of the form back into view when paging.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headerRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [s.step]);

  if (s.status === "done") {
    return (
      <div
        role="status"
        className="rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm"
      >
        <h1 className="text-2xl font-semibold">{form.title}</h1>
        <p className="mt-4 text-neutral-700">{s.confirmation}</p>
      </div>
    );
  }

  const current = s.sections[s.step];
  const total = s.sections.length;
  const submitting = s.status === "submitting";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (s.isLast) void s.submit();
        else s.next();
      }}
      className="space-y-6"
    >
      {/* Honeypot: hidden from people and assistive tech, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <header ref={headerRef} className="scroll-mt-4">
        <h1 className="text-3xl font-semibold">{form.title}</h1>
        {form.schema.description && (
          <p className="mt-2 whitespace-pre-line text-neutral-600">{form.schema.description}</p>
        )}
      </header>

      {total > 1 && (
        <div>
          <div className="mb-1 flex justify-between text-sm text-neutral-500">
            <span>
              Page {s.step + 1} of {total}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={s.step + 1}
            aria-label="Form progress"
            className="h-1.5 overflow-hidden rounded-full bg-neutral-200"
          >
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${((s.step + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {current && (
        <section key={current.section.id} className="space-y-4">
          {(current.section.title || current.section.description) && (
            <div>
              {current.section.title && (
                <h2 className="text-xl font-medium">{current.section.title}</h2>
              )}
              {current.section.description && (
                <p className="mt-1 text-neutral-600">{current.section.description}</p>
              )}
            </div>
          )}
          {current.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={s.answers[field.id]}
              errors={s.errors[field.id]}
              onChange={(v) => s.setValue(field.id, v)}
              onUpload={s.upload}
            />
          ))}
        </section>
      )}

      {s.formError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {s.formError}
        </div>
      )}

      {s.isLast && <Turnstile onToken={(t) => (tokenRef.current = t)} />}

      <div className="flex items-center justify-between gap-3">
        {s.step > 0 ? (
          <button type="button" onClick={s.back} className={secondary} disabled={submitting}>
            Back
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className={primary} disabled={submitting}>
          {s.isLast ? (submitting ? "Submitting…" : "Submit") : "Next"}
        </button>
      </div>
    </form>
  );
}
