import { isValidSlug } from "@formit/schema";
import { Check, Globe, Lock, ShieldCheck, Timer } from "lucide-react";
import { useState } from "react";
import { isSlugAvailable } from "../../lib/api.ts";
import type { BuilderActions, BuilderState } from "./types.ts";

interface FormSettingsTabProps {
  state: BuilderState;
  actions: BuilderActions;
}

export function FormSettingsTab({ state, actions }: FormSettingsTabProps) {
  const { form } = state;
  const [slugInput, setSlugInput] = useState(form.slug);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSaved, setSlugSaved] = useState(false);

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
    <div className="flex-1 bg-neutral-50 p-6 sm:p-10 overflow-y-auto min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Form Settings</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Configure access control, response limits, scheduling, and sharing settings.
          </p>
        </div>

        {/* Status Card */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-neutral-900">Form Lifecycle & Status</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
                className={`flex flex-col text-left p-3.5 rounded-lg border transition-all ${
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
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900">Shareable URL Slug</h3>
          <p className="text-xs text-neutral-500">
            Customize the public link where respondents fill this form.
          </p>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400 bg-neutral-100 rounded-lg px-3 py-2 border border-neutral-200">
              {window.location.origin}/f/
            </span>
            <input
              type="text"
              value={slugInput}
              onChange={(e) => {
                setSlugInput(e.target.value);
                setSlugError(null);
              }}
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-mono text-neutral-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="custom-form-slug"
            />
            <button
              type="button"
              onClick={handleSaveSlug}
              disabled={slugChecking || slugInput === form.slug}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
            >
              {slugChecking ? "Checking..." : slugSaved ? <Check className="h-4 w-4" /> : "Save Slug"}
            </button>
          </div>

          {slugError && <p className="text-xs text-red-600 mt-1">{slugError}</p>}
        </div>

        {/* Access Control & Deduplication */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-neutral-900">Access & Security</h3>
          </div>

          <div className="space-y-4 divide-y divide-neutral-100 text-xs">
            {/* Require Sign In */}
            <div className="flex items-center justify-between pt-1">
              <div>
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
                className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* One Response Per User */}
            <div className="flex items-center justify-between pt-4">
              <div>
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
                className="h-4 w-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Limits & Scheduling */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-neutral-900">Limits & Response Caps</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label htmlFor="setting-maxresponses" className="font-medium text-neutral-900 block mb-1">
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
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
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
    </div>
  );
}
