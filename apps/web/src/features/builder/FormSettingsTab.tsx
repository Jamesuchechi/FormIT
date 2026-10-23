import { isValidSlug, allFields } from "@formit/schema";
import { Check, Globe, Lock, Mail, ShieldCheck, Timer } from "lucide-react";
import { useMemo, useState } from "react";
import { isSlugAvailable } from "../../lib/api.ts";
import type { BuilderActions, BuilderState } from "./types.ts";

interface FormSettingsTabProps {
  state: BuilderState;
  actions: BuilderActions;
}

export function FormSettingsTab({ state, actions }: FormSettingsTabProps) {
  const { form, schema } = state;
  const [slugInput, setSlugInput] = useState(form.slug);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSaved, setSlugSaved] = useState(false);

  // Find fields that could be email inputs (short_text with email format, or label mentioning email)
  const availableEmailFields = useMemo(() => {
    const list = allFields(schema);
    return list.filter((f) => {
      if (f.type !== "short_text") return false;
      const fmt = (f as { validation?: { format?: string } }).validation?.format;
      const labelLower = f.label.toLowerCase();
      return fmt === "email" || labelLower.includes("email") || labelLower.includes("e-mail");
    });
  }, [schema]);

  async function handleSaveSlug() {
    const clean = slugInput.trim().toLowerCase();
    if (clean === form.slug) return;

    if (!isValidSlug(clean)) {
      setSlugError("Slug must be 3-63 lowercase alphanumeric characters or hyphens.");
      return;
    }

    setSlugChecking(true);
    setSlugError(null);
    try {
      const available = await isSlugAvailable(clean, form.id);
      if (!available) {
        setSlugError("This URL slug is already taken. Choose another.");
        return;
      }
      const ok = await actions.updateSlug(clean);
      if (ok) {
        setSlugSaved(true);
        setTimeout(() => setSlugSaved(false), 2000);
      } else {
        setSlugError("Failed to update slug.");
      }
    } catch {
      setSlugError("Error checking slug availability.");
    } finally {
      setSlugChecking(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Form Settings</h2>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500">
          Configure access control, response limits, scheduling, and sharing settings.
        </p>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-neutral-900">Form Lifecycle & Status</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {[
            {
              id: "draft",
              label: "Draft",
              desc: "Only you can see and edit this form.",
            },
            {
              id: "open",
              label: "Live / Open",
              desc: "Accepting responses from the public.",
            },
            {
              id: "closed",
              label: "Closed",
              desc: "Form link shows 'no longer accepting responses'.",
            },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => actions.updateStatus(s.id as "draft" | "open" | "closed")}
              className={`flex flex-col text-left p-3 sm:p-3.5 rounded-lg border transition-all cursor-pointer ${
                form.status === s.id
                  ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <span className="text-xs font-semibold text-neutral-900">{s.label}</span>
              <span className="mt-1 text-[11px] text-neutral-500 leading-tight">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom URL Slug Card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-xs space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Shareable URL Slug</h3>
        <p className="text-xs text-neutral-500">
          Customize the public link where respondents fill this form.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex flex-1 items-center rounded-lg border border-neutral-300 bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 overflow-hidden min-w-0">
            <span className="text-xs font-mono text-neutral-500 bg-neutral-100/80 px-2.5 sm:px-3 py-2 border-r border-neutral-200 select-none truncate max-w-[130px] xs:max-w-none flex-shrink-0">
              {typeof window !== "undefined" ? window.location.origin : ""}/f/
            </span>
            <input
              type="text"
              value={slugInput}
              onChange={(e) => {
                setSlugInput(e.target.value);
                setSlugError(null);
              }}
              className="flex-1 min-w-0 px-2.5 sm:px-3 py-2 text-xs font-mono text-neutral-900 outline-none bg-transparent"
              placeholder="custom-form-slug"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveSlug}
            disabled={slugChecking || slugInput === form.slug}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors flex-shrink-0 cursor-pointer min-h-[38px] flex items-center justify-center"
          >
            {slugChecking ? (
              "Checking..."
            ) : slugSaved ? (
              <Check className="h-4 w-4" />
            ) : (
              "Save Slug"
            )}
          </button>
        </div>

        {slugError && <p className="text-xs text-red-600 mt-1">{slugError}</p>}
      </div>

      {/* Access Control & Deduplication */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-neutral-900">Access & Security</h3>
        </div>

        <div className="space-y-4 divide-y divide-neutral-100 text-xs">
          {/* Require Sign In */}
          <div className="flex items-start justify-between gap-3 pt-1">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="setting-signin"
                className="font-medium text-neutral-900 block cursor-pointer"
              >
                Require sign in
              </label>
              <p className="text-neutral-500">
                Respondents must be logged in with a FormIT account to respond.
              </p>
            </div>
            <input
              id="setting-signin"
              type="checkbox"
              checked={form.settings.requireSignIn ?? false}
              onChange={(e) => actions.updateSettings({ requireSignIn: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0 mt-0.5"
            />
          </div>

          {/* One Response Per User */}
          <div className="flex items-start justify-between gap-3 pt-4">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="setting-oneperuser"
                className="font-medium text-neutral-900 block cursor-pointer"
              >
                Limit to 1 response per person
              </label>
              <p className="text-neutral-500">
                Enforces race-free deduplication using verified respondent IDs.
              </p>
            </div>
            <input
              id="setting-oneperuser"
              type="checkbox"
              checked={form.settings.oneResponsePerUser ?? false}
              onChange={(e) => actions.updateSettings({ oneResponsePerUser: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0 mt-0.5"
            />
          </div>

          {/* Allow Response Editing */}
          <div className="flex items-start justify-between gap-3 pt-4 border-t border-neutral-100">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="setting-allowediting"
                className="font-medium text-neutral-900 block cursor-pointer"
              >
                Allow response editing via private link
              </label>
              <p className="text-neutral-500">
                Respondents receive a secure private edit link to update their submission after completing the form.
              </p>
            </div>
            <input
              id="setting-allowediting"
              type="checkbox"
              checked={form.settings.allowResponseEditing ?? false}
              onChange={(e) =>
                actions.updateSettings({ allowResponseEditing: e.target.checked })
              }
              className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0 mt-0.5"
            />
          </div>
        </div>
      </div>

      {/* Email Notifications & Receipts */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-neutral-900">Email Notifications</h3>
        </div>
        <p className="text-xs text-neutral-500">
          Get instant alerts when people respond, and optionally send an automated confirmation receipt copy to the respondent.
        </p>

        <div className="space-y-4 text-xs pt-1">
          {/* Owner notification toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="setting-notifyowner"
                className="font-medium text-neutral-900 block cursor-pointer"
              >
                Notify me on every new response
              </label>
              <p className="text-neutral-500">
                Dispatches an email summary alert to you whenever someone submits this form.
              </p>
            </div>
            <input
              id="setting-notifyowner"
              type="checkbox"
              checked={form.settings.notifyOwnerOnSubmission ?? false}
              onChange={(e) =>
                actions.updateSettings({ notifyOwnerOnSubmission: e.target.checked })
              }
              className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0 mt-0.5"
            />
          </div>

          {form.settings.notifyOwnerOnSubmission && (
            <div className="pl-0 sm:pl-4 border-l-2 border-indigo-200 py-1 space-y-1">
              <label
                htmlFor="setting-notification-email"
                className="font-medium text-neutral-800 block text-[11px]"
              >
                Notification recipient email (optional, defaults to your account email)
              </label>
              <input
                id="setting-notification-email"
                type="email"
                value={form.settings.notificationEmail ?? ""}
                onChange={(e) =>
                  actions.updateSettings({ notificationEmail: e.target.value })
                }
                placeholder="owner@example.com"
                className="w-full sm:w-80 max-w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Respondent receipt toggle */}
          <div className="border-t border-neutral-100 pt-3 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="setting-sendreceipt"
                className="font-medium text-neutral-900 block cursor-pointer"
              >
                Send email receipt to respondent
              </label>
              <p className="text-neutral-500">
                Sends an automated confirmation email with their submission details to their email address.
              </p>
            </div>
            <input
              id="setting-sendreceipt"
              type="checkbox"
              checked={form.settings.sendRespondentReceipt ?? false}
              onChange={(e) =>
                actions.updateSettings({ sendRespondentReceipt: e.target.checked })
              }
              className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0 mt-0.5"
            />
          </div>

          {form.settings.sendRespondentReceipt && (
            <div className="pl-0 sm:pl-4 border-l-2 border-indigo-200 py-1 space-y-2">
              <label
                htmlFor="setting-receipt-field"
                className="font-medium text-neutral-800 block text-[11px]"
              >
                Select email question in your form
              </label>
              {availableEmailFields.length > 0 ? (
                <select
                  id="setting-receipt-field"
                  value={form.settings.receiptEmailFieldId ?? ""}
                  onChange={(e) =>
                    actions.updateSettings({
                      receiptEmailFieldId: e.target.value || undefined,
                    })
                  }
                  className="w-full sm:w-80 max-w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Choose email field --</option>
                  {availableEmailFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label} ({f.id})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800">
                  No email questions found in your form. Add a Short Text question with "Email" format to send receipts to respondents.
                </div>
              )}
              <p className="text-[11px] text-neutral-400">
                If respondent is signed in, their account email will be used as a fallback if the selected field is left empty.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Limits & Scheduling */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-neutral-900">Limits & Response Caps</h3>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label
              htmlFor="setting-maxresponses"
              className="font-medium text-neutral-900 block mb-1"
            >
              Maximum Responses Cap (Optional)
            </label>
            <input
              id="setting-maxresponses"
              type="number"
              min={1}
              value={form.settings.maxResponses ?? ""}
              onChange={(e) =>
                actions.updateSettings({
                  maxResponses: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full sm:w-48 rounded-lg border border-neutral-300 px-3 py-2 text-xs"
              placeholder="Unlimited"
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              Form automatically stops accepting submissions once this limit is reached.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Message */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-neutral-900">Confirmation Message</h3>
        </div>
        <p className="text-xs text-neutral-500">
          Displayed to respondents immediately after they submit their response.
        </p>
        <textarea
          rows={3}
          value={form.settings.confirmationMessage ?? ""}
          onChange={(e) => actions.updateSettings({ confirmationMessage: e.target.value })}
          placeholder="Your response has been recorded. Thank you!"
          className="w-full rounded-lg border border-neutral-300 p-3 text-xs text-neutral-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}
