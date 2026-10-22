import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { FillApi, PublicForm, SubmitExtras } from "../../lib/api.ts";
import { FieldRenderer } from "./FieldRenderer.tsx";
import { Turnstile } from "./Turnstile.tsx";
import { useFillState } from "./useFillState.ts";

type Props = {
  form: PublicForm;
  api: FillApi;
  userId?: string;
  initialAnswers?: Record<string, unknown>;
  editKey?: string | null;
};

export function FormFiller({ form, api, userId, initialAnswers, editKey }: Props) {
  // Spam protection: a honeypot field humans never see, and an optional Turnstile token.
  const honeypotRef = useRef<HTMLInputElement>(null);
  const tokenRef = useRef<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const guardedApi = useMemo<FillApi>(
    () => ({
      ...api,
      submit: (slug, answers, extras) => {
        const combinedExtras: SubmitExtras = { ...extras };
        if (honeypotRef.current?.value) combinedExtras.website = honeypotRef.current.value;
        if (tokenRef.current) combinedExtras.turnstileToken = tokenRef.current;
        return Object.keys(combinedExtras).length > 0
          ? api.submit(slug, answers, combinedExtras)
          : api.submit(slug, answers);
      },
    }),
    [api],
  );
  const s = useFillState(form, guardedApi, userId, initialAnswers, editKey);
  const headerRef = useRef<HTMLElement>(null);

  const theme = form.schema.theme;
  const accentColor = theme?.accentColor || "#4f46e5";
  const fontClass =
    theme?.font === "serif"
      ? "font-serif"
      : theme?.font === "mono"
        ? "font-mono"
        : "font-sans";

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
    const editUrl = s.editKey
      ? `${window.location.origin}/f/${form.slug}?edit=${s.editKey}`
      : null;

    return (
      <div
        role="status"
        className={`rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center shadow-sm text-neutral-900 dark:text-neutral-100 ${fontClass}`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-4">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold">{form.title}</h1>
        <p className="mt-4 text-neutral-700 dark:text-neutral-300">{s.confirmation}</p>

        {form.allowResponseEditing && s.editKey && editUrl && (
          <div className="mt-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-5 text-left">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-neutral-500 dark:text-neutral-400">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Response editing enabled
                </h2>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  You can edit your response later using this private link. Keep it safe to prevent others from altering your submission.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(editUrl).then(() => {
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                  >
                    {copiedLink ? "✓ Copied to clipboard" : "Copy private edit link"}
                  </button>
                  <a
                    href={`/f/${form.slug}?edit=${s.editKey}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-3 py-1.5 text-xs font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-white/90 transition-colors"
                  >
                    Edit your response
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
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
      style={{ "--accent-color": accentColor } as CSSProperties}
      className={`space-y-6 ${fontClass}`}
    >
      {/* Honeypot: hidden from people and assistive tech, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {/* Header Image Banner if configured */}
      {theme?.headerImage && (
        <div className="relative overflow-hidden rounded-2xl mb-6 max-h-56 w-full shadow-xs border border-neutral-200/80 dark:border-neutral-800">
          <img
            src={theme.headerImage}
            alt="Form header banner"
            className="w-full h-40 sm:h-48 object-cover"
          />
        </div>
      )}

      <header ref={headerRef} className="scroll-mt-4">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
          {form.title}
        </h1>
        {form.schema.description && (
          <p className="mt-2 whitespace-pre-line text-neutral-600 dark:text-neutral-400">
            {form.schema.description}
          </p>
        )}
      </header>

      {total > 1 && (
        <div>
          <div className="mb-1 flex justify-between text-sm text-neutral-500 dark:text-neutral-400">
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
            className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
          >
            <div
              className="h-full transition-all"
              style={{
                backgroundColor: accentColor,
                width: `${((s.step + 1) / total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {current && (
        <section key={current.section.id} className="space-y-4">
          {(current.section.title || current.section.description) && (
            <div>
              {current.section.title && (
                <h2 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">
                  {current.section.title}
                </h2>
              )}
              {current.section.description && (
                <p className="mt-1 text-neutral-600 dark:text-neutral-400">
                  {current.section.description}
                </p>
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
          className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-300"
        >
          {s.formError}
        </div>
      )}

      {s.isLast && <Turnstile onToken={(t) => (tokenRef.current = t)} />}

      <div className="flex items-center justify-between gap-3">
        {s.step > 0 ? (
          <button
            type="button"
            onClick={s.back}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-5 py-2.5 font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400/40 cursor-pointer disabled:opacity-60"
            disabled={submitting}
          >
            Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          style={{ backgroundColor: accentColor }}
          className="rounded-lg px-5 py-2.5 font-medium text-white shadow-xs hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 transition-all cursor-pointer"
          disabled={submitting}
        >
          {s.isLast
            ? submitting
              ? editKey
                ? "Updating…"
                : "Submitting…"
              : editKey
                ? "Update response"
                : "Submit"
            : "Next"}
        </button>
      </div>
    </form>
  );
}
