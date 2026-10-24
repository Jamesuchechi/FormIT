import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { allFields, gradeQuizSubmission } from "@formit/schema";
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

    const isQuiz = Boolean(form.settings?.quiz?.enabled);
    const scoringMode = form.settings?.quiz?.scoringMode || "instant";
    const showCorrectAnswers = form.settings?.quiz?.showCorrectAnswers !== false;
    const showFeedback = form.settings?.quiz?.showFeedback !== false;

    const quizResult = isQuiz && scoringMode === "instant"
      ? gradeQuizSubmission(form.schema, s.answers)
      : null;

    const schemaFields = allFields(form.schema);
    const fieldMap = new Map(schemaFields.map((f) => [f.id, f]));

    const formatAnswer = (fieldId: string, val: unknown): string => {
      if (val === undefined || val === null || val === "") return "(No answer)";
      const field = fieldMap.get(fieldId);
      if (field && "options" in field && field.options) {
        const optMap = new Map(field.options.map((o) => [o.id, o.label]));
        if (field.type === "ranking" && Array.isArray(val)) {
          return val.map((id, i) => `${i + 1}. ${optMap.get(id) || id}`).join(" → ");
        }
        if (Array.isArray(val)) {
          return val.map((id) => optMap.get(id) || id).join(", ");
        }
        return optMap.get(String(val)) || String(val);
      }
      if (Array.isArray(val)) return val.join(", ");
      return String(val);
    };

    return (
      <div
        role="status"
        className={`rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 text-neutral-900 dark:text-neutral-100 shadow-sm ${fontClass}`}
      >
        <div className="text-center">
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
          <p className="mt-3 text-neutral-700 dark:text-neutral-300">{s.confirmation}</p>
        </div>

        {/* Deferred quiz mode notice */}
        {isQuiz && scoringMode === "deferred" && (
          <div className="mt-6 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Quiz submitted! Scores and answers will be released later by the form creator.
            </p>
          </div>
        )}

        {/* Instant quiz score banner and breakdown */}
        {quizResult && (
          <div className="mt-8 space-y-6 text-left">
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/20 p-6 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Quiz Result
              </span>
              <div className="mt-2 text-4xl sm:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
                {quizResult.score} <span className="text-2xl font-medium text-neutral-400">/ {quizResult.totalPoints} pts</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                {quizResult.percentage}% Score
              </p>
            </div>

            {quizResult.items.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Question Breakdown
                </h2>
                {quizResult.items.map((res) => {
                  const activeFeedback = res.isCorrect
                    ? res.feedback?.correct || res.feedback?.general
                    : res.feedback?.incorrect || res.feedback?.general;

                  return (
                    <div
                      key={res.fieldId}
                      className={`rounded-xl border p-4 sm:p-5 transition-colors ${
                        res.isCorrect
                          ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10"
                          : "border-red-200 dark:border-red-800/60 bg-red-50/20 dark:bg-red-950/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                res.isCorrect
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {res.isCorrect ? "✓ Correct" : "✕ Incorrect"}
                            </span>
                            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                              {res.pointsEarned} / {res.pointsPossible} pts
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {res.label}
                          </h3>
                        </div>
                      </div>

                      <div className="mt-3 text-xs sm:text-sm space-y-1.5">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-neutral-500 dark:text-neutral-400">Your answer:</span>
                          <span
                            className={
                              res.isCorrect
                                ? "text-emerald-800 dark:text-emerald-300 font-medium"
                                : "text-red-800 dark:text-red-300 line-through"
                            }
                          >
                            {formatAnswer(res.fieldId, res.userAnswer)}
                          </span>
                        </div>

                        {!res.isCorrect && showCorrectAnswers && res.correctAnswer !== undefined && (
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              Correct answer:
                            </span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                              {formatAnswer(res.fieldId, res.correctAnswer)}
                            </span>
                          </div>
                        )}

                        {showFeedback && activeFeedback && (
                          <div className="mt-2.5 pt-2 border-t border-neutral-200/60 dark:border-neutral-800/80 text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100/50 dark:bg-neutral-800/40 p-2.5 rounded-lg">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 block mb-0.5">
                              Feedback:
                            </span>
                            {activeFeedback}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Response editing enabled
                </h2>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  You can edit your response later using this private link. Keep it safe to prevent others from altering your submission.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(editUrl).then(() => {
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      });
                    }}
                    className="inline-flex min-h-[44px] justify-center items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors active:scale-95"
                  >
                    {copiedLink ? "✓ Copied to clipboard" : "Copy private edit link"}
                  </button>
                  <a
                    href={`/f/${form.slug}?edit=${s.editKey}`}
                    className="inline-flex min-h-[44px] justify-center items-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-xs sm:text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-white/90 transition-colors active:scale-95"
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
      {/* Header Image Banner if configured */}
      {theme?.headerImage && (
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl mb-6 max-h-56 w-full shadow-xs border border-neutral-200/80 dark:border-neutral-800">
          <img
            src={theme.headerImage}
            alt="Form header banner"
            className="w-full h-36 sm:h-48 md:h-56 object-cover"
          />
        </div>
      )}

      <header ref={headerRef} className="scroll-mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {form.title}
        </h1>
        {form.schema.description && (
          <p className="mt-2 whitespace-pre-line text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {form.schema.description}
          </p>
        )}
      </header>

      {total > 1 && (
        <div>
          <div className="mb-1.5 flex justify-between items-center text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
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
            className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
          >
            <div
              className="h-full transition-all duration-300"
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
            <div className="pt-1">
              {current.section.title && (
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {current.section.title}
                </h2>
              )}
              {current.section.description && (
                <p className="mt-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
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

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {s.step > 0 ? (
          <button
            type="button"
            onClick={s.back}
            className="inline-flex min-h-[48px] justify-center items-center rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-6 py-3 text-base font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400/40 cursor-pointer disabled:opacity-60 active:scale-[0.98] transition-all"
            disabled={submitting}
          >
            Back
          </button>
        ) : (
          <span className="hidden sm:inline" />
        )}
        <button
          type="submit"
          style={{ backgroundColor: accentColor }}
          className="inline-flex min-h-[48px] justify-center items-center rounded-xl px-6 py-3 text-base font-semibold text-white shadow-xs hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 active:scale-[0.98] transition-all cursor-pointer"
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
