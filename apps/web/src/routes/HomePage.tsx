import { FIELD_REGISTRY, FIELD_TYPES } from "@formit/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CopyPlus,
  Cpu,
  GitBranch,
  Keyboard,
  Layers,
  Loader2,
  MousePointerClick,
  Plus,
  Search,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShareDialog } from "../components/ShareDialog.tsx";
import { FormitLogo } from "../components/FormitLogo.tsx";
import { GithubIcon } from "../components/icons.tsx";
import { useAuth } from "../features/auth/AuthContext.tsx";
import {
  createForm,
  deleteForm,
  duplicateForm,
  getUserForms,
  updateForm,
  type FormRecord,
} from "../lib/api.ts";

export function HomePage() {
  const { session } = useAuth();

  if (!session) {
    return <LandingView />;
  }

  return <DashboardView />;
}

/* ========================================================================= */
/* Modern High-End Landing Page                                              */
/* ========================================================================= */

function LandingView() {
  const [demoStep, setDemoStep] = useState<number>(1);
  const [demoRole, setDemoRole] = useState<string>("founder");
  const [demoSatisfaction, setDemoSatisfaction] = useState<number | null>(5);
  const [demoFeedback, setDemoFeedback] = useState<string>("");
  const [demoActiveView, setDemoActiveView] = useState<"fill" | "builder">("fill");

  return (
    <div className="relative overflow-hidden bg-neutral-50 min-h-screen">
      {/* Ambient background glow grid */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.18),rgba(255,255,255,0))] -z-10" />
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 lg:pt-24 lg:pb-28 text-center">
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-4 py-1.5 shadow-xs backdrop-blur-md mb-8 hover:border-indigo-300 transition-colors">
          <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
          <span className="text-xs font-semibold text-neutral-800">FormIT 1.0 Release</span>
          <span className="text-neutral-300">•</span>
          <span className="text-xs font-medium text-indigo-600 flex items-center gap-1">
            Keyboard-first software forms
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-neutral-900 max-w-4xl mx-auto leading-[1.1]">
          Build forms that feel like{" "}
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">
            software.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          The open-source form platform designed to replace clunky legacy surveys. Direct-canvas
          visual editing, tactile keyboard navigation, instant conditional branching, and versioned
          schemas.
        </p>

        {/* Hero CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 px-7 py-3.5 text-base font-semibold text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Start building free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white/90 px-6 py-3.5 text-base font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-400 transition-all"
          >
            Try interactive demo
          </a>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-neutral-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>100% Open Source (MIT)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Sub-millisecond keyboard speed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-4 w-4 text-indigo-600" />
            <span>Declarative versioned schemas</span>
          </div>
        </div>

        {/* Interactive Product Showcase Window */}
        <div id="demo" className="mt-16 sm:mt-20 scroll-mt-24">
          <div className="rounded-3xl border border-neutral-200/90 bg-white shadow-2xl shadow-neutral-300/40 overflow-hidden ring-1 ring-black/5 max-w-4xl mx-auto text-left">
            {/* Window Titlebar */}
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50/90 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 font-mono text-xs text-neutral-400 hidden sm:inline">
                  formit.sh/f/onboarding-survey
                </span>
              </div>

              {/* Demo Mode Toggle */}
              <div className="flex items-center gap-1 rounded-lg bg-neutral-200/70 p-1">
                <button
                  type="button"
                  onClick={() => setDemoActiveView("fill")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                    demoActiveView === "fill"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5 text-indigo-600" />
                  Respondent View
                </button>
                <button
                  type="button"
                  onClick={() => setDemoActiveView("builder")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                    demoActiveView === "builder"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <MousePointerClick className="h-3.5 w-3.5 text-violet-600" />
                  Canvas Editor View
                </button>
              </div>
            </div>

            {/* Interactive Demo Content */}
            <div className="p-6 sm:p-10 min-h-[460px] flex flex-col justify-between bg-white">
              {demoActiveView === "fill" ? (
                <>
                  {/* Top Step Progress Indicator */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-2">
                      <span className="inline-flex items-center gap-1.5 text-indigo-600">
                        <Sparkles className="h-3.5 w-3.5" />
                        Interactive Live Flow
                      </span>
                      <span>Step {demoStep} of 3</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-300"
                        style={{ width: `${(demoStep / 3) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Question Step 1 */}
                  {demoStep === 1 && (
                    <div className="my-8 space-y-4">
                      <div>
                        <span className="text-xs font-mono font-medium text-indigo-600 uppercase tracking-wider">
                          Question 1
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mt-1">
                          What best describes your primary role?
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1">
                          Select one option to see automatic transition.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        {[
                          {
                            id: "founder",
                            key: "1",
                            title: "Founder / Exec",
                            desc: "Building the vision",
                          },
                          {
                            id: "product",
                            key: "2",
                            title: "Product / Designer",
                            desc: "Designing user journeys",
                          },
                          {
                            id: "engineer",
                            key: "3",
                            title: "Engineer / Dev",
                            desc: "Architecting software",
                          },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setDemoRole(item.id);
                              setTimeout(() => setDemoStep(2), 250);
                            }}
                            className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                              demoRole === item.id
                                ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/30 shadow-xs"
                                : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/80"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded border border-neutral-300 bg-white font-mono text-[10px] font-bold text-neutral-500 shadow-xs">
                                {item.key}
                              </span>
                              {demoRole === item.id && (
                                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                              )}
                            </div>
                            <span className="font-semibold text-sm text-neutral-900">
                              {item.title}
                            </span>
                            <span className="text-xs text-neutral-500 mt-0.5">{item.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question Step 2 */}
                  {demoStep === 2 && (
                    <div className="my-8 space-y-4">
                      <div>
                        <span className="text-xs font-mono font-medium text-indigo-600 uppercase tracking-wider">
                          Question 2
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mt-1">
                          How important is sub-millisecond keyboard UX to you?
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1">
                          Rate from 1 (unimportant) to 5 (critical for high conversion).
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-3">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => {
                              setDemoSatisfaction(score);
                              setTimeout(() => setDemoStep(3), 250);
                            }}
                            className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border text-sm sm:text-base font-bold transition-all cursor-pointer ${
                              demoSatisfaction === score
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105"
                                : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100"
                            }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-neutral-400 max-w-sm pt-1">
                        <span>1 = Not important</span>
                        <span>5 = Absolute must</span>
                      </div>
                    </div>
                  )}

                  {/* Question Step 3 */}
                  {demoStep === 3 && (
                    <div className="my-8 space-y-4">
                      <div>
                        <span className="text-xs font-mono font-medium text-indigo-600 uppercase tracking-wider">
                          Question 3 (Final)
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 mt-1">
                          What frustrates you most with existing form builders?
                        </h3>
                        <p className="text-sm text-neutral-500 mt-1">
                          Type an answer below to test fluid response capture.
                        </p>
                      </div>

                      <div className="pt-2">
                        <textarea
                          rows={3}
                          value={demoFeedback}
                          onChange={(e) => setDemoFeedback(e.target.value)}
                          placeholder="e.g. Clunky pagination, slow loading times, ugly default styling..."
                          className="w-full rounded-xl border border-neutral-300 p-3.5 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Demo Navigation Footer */}
                  <div className="flex items-center justify-between pt-6 border-t border-neutral-100 text-xs text-neutral-500">
                    <div className="flex items-center gap-2">
                      <Keyboard className="h-4 w-4 text-neutral-400" />
                      <span>Press number keys or click to navigate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {demoStep > 1 && (
                        <button
                          type="button"
                          onClick={() => setDemoStep((s) => s - 1)}
                          className="rounded-lg px-3 py-1.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium transition-colors"
                        >
                          Back
                        </button>
                      )}
                      {demoStep < 3 ? (
                        <button
                          type="button"
                          onClick={() => setDemoStep((s) => s + 1)}
                          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-white font-medium hover:bg-indigo-500 transition-colors"
                        >
                          Next
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            alert(
                              "Demo flow completed! Create your free account to build real forms.",
                            );
                            setDemoStep(1);
                          }}
                          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-white font-medium hover:bg-emerald-500 transition-colors"
                        >
                          Complete Demo
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Canvas Editor View Simulation */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div>
                      <h4 className="font-bold text-neutral-900 text-base">
                        Direct-Canvas Visual Builder
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Edit titles, options, and rules in-situ without abstract dialog modals.
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      Autosaved
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border-2 border-indigo-500/80 bg-white p-4 shadow-sm ring-2 ring-indigo-500/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                          Multiple Choice Field
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px]">
                            Required
                          </span>
                          <span className="rounded bg-amber-50 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold">
                            Rules Attached
                          </span>
                        </div>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value="What best describes your primary role?"
                        className="w-full font-semibold text-neutral-900 bg-neutral-50 rounded-lg p-2 border border-neutral-200 text-sm"
                      />
                      <div className="mt-3 flex gap-2">
                        <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700 font-medium">
                          [1] Founder
                        </span>
                        <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700 font-medium">
                          [2] Product
                        </span>
                        <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-700 font-medium">
                          [3] Engineer
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-dashed border-neutral-300 p-3 text-center text-xs font-medium text-neutral-500 bg-neutral-50 hover:bg-neutral-100 transition-colors">
                      + Add question here (8 field types available)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section id="features" className="py-24 bg-white border-t border-neutral-200 scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Architected for Conversion
            </h2>
            <p className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900">
              Everything you need to build giant-killing forms.
            </p>
            <p className="mt-4 text-base text-neutral-600">
              Designed from first principles to solve slow load times, rigid styling, and broken
              conditional jumps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Direct-Canvas In-Situ Editing */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 sm:p-8 hover:border-neutral-300 hover:shadow-sm transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 mb-5">
                <MousePointerClick className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Direct-Canvas In-Situ Editing</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                No detached edit modals. Click directly onto your questions, choices, and
                descriptions on the canvas. What you see is exactly what respondents experience.
              </p>
            </div>

            {/* Bento Card 2: Keyboard-First UX */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 sm:p-8 hover:border-neutral-300 hover:shadow-sm transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 mb-5">
                <Keyboard className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Keyboard-First Tactile UX</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Fly through questions without lifting hands from the keyboard. Automatic hotkeys{" "}
                <code className="font-mono text-xs bg-white px-1 py-0.5 rounded border border-neutral-200">
                  [1]
                </code>
                ,{" "}
                <code className="font-mono text-xs bg-white px-1 py-0.5 rounded border border-neutral-200">
                  [2]
                </code>
                , and smooth auto-advance.
              </p>
            </div>

            {/* Bento Card 3: Cycle-Free Branching */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 sm:p-8 hover:border-neutral-300 hover:shadow-sm transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 mb-5">
                <GitBranch className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Cycle-Free Branching Logic</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Show or hide questions dynamically based on previous answers. Strict predecessor
                scoping guarantees zero circular dependency loops or corrupted logic.
              </p>
            </div>

            {/* Bento Card 4: Hybrid Multi-Step Pacing */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 sm:p-8 hover:border-neutral-300 hover:shadow-sm transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-5">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Hybrid Multi-Step Pacing</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Group questions into thematic sections or present one question at a time. Animated
                step bars keep respondents motivated until completion.
              </p>
            </div>

            {/* Bento Card 5: Draft Autosaving */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 sm:p-8 hover:border-neutral-300 hover:shadow-sm transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 mb-5">
                <RotateCcw className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Local & Cloud Draft Autosave</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Respondents never lose progress if a tab accidentally closes. Offline local storage
                caching with instant cloud synchronization for authenticated users.
              </p>
            </div>

            {/* Bento Card 6: Zero Bloat & Instant Loading */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 sm:p-8 hover:border-neutral-300 hover:shadow-sm transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600 mb-5">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Ultra-Lightweight 7 kB Engine</h3>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                No 500 kB telemetry scripts or sluggish widgets. Clean, optimized bundle sizes that
                load instantly even on flaky mobile connections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section
        id="comparison"
        className="py-24 bg-neutral-50 border-t border-neutral-200 scroll-mt-16"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              The Modern Difference
            </h2>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-neutral-900">
              Why teams switch to FormIT.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 p-4 sm:p-6 bg-neutral-100/60 border-b border-neutral-200 text-xs sm:text-sm font-bold text-neutral-900">
              <div>Capability</div>
              <div className="text-neutral-500">Legacy Form Builders</div>
              <div className="text-indigo-600">FormIT</div>
            </div>

            {[
              {
                feature: "Editing Paradigm",
                legacy: "Clunky list of form controls in dialogs",
                formit: "Direct-canvas in-situ visual editing",
              },
              {
                feature: "Respondent Navigation",
                legacy: "Mouse-required scrolling & clicking",
                formit: "Keyboard-first with number keys & auto-advance",
              },
              {
                feature: "Branching Logic",
                legacy: "Paywalled or prone to circular errors",
                formit: "Visual rule builder with guaranteed safety",
              },
              {
                feature: "Client Bundle Size",
                legacy: "400 kB - 1 MB heavy payload",
                formit: "~7 kB ultra-fast core runtime",
              },
              {
                feature: "Licensing & Ownership",
                legacy: "Expensive per-seat monthly subscription",
                formit: "100% Free & Open Source (Self-hostable)",
              },
            ].map((row, idx) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 p-4 sm:p-6 text-xs sm:text-sm items-center ${
                  idx % 2 === 1 ? "bg-neutral-50/50" : "bg-white"
                }`}
              >
                <div className="font-semibold text-neutral-900">{row.feature}</div>
                <div className="text-neutral-500">{row.legacy}</div>
                <div className="font-semibold text-indigo-600 flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{row.formit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Field Registry Showcase */}
      <section className="py-20 bg-white border-t border-neutral-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            8 Built-in Production Field Types
          </h3>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {FIELD_TYPES.map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-medium text-neutral-800 shadow-2xs hover:border-indigo-300 hover:bg-white transition-all"
              >
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                <span>{FIELD_REGISTRY[t].label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pre-Footer Call to Action */}
      <section className="py-20 bg-neutral-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <FormitLogo size="lg" className="mx-auto mb-6" />
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Build forms your respondents will actually love.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-neutral-400 max-w-xl mx-auto">
            Get started in seconds. Create your first keyboard-first form with our visual
            direct-canvas builder.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition-all"
            >
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/jamesuchechi/formit"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/80 px-6 py-3.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 hover:text-white transition-all"
            >
              <GithubIcon className="h-4 w-4" />
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="border-t border-neutral-200 bg-white py-12 text-xs text-neutral-500">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <FormitLogo size="xs" showWordmark />
            <span className="text-neutral-300">|</span>
            <span>MIT Licensed Open Source Software</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <a href="#features" className="hover:text-neutral-900 transition-colors">
              Features
            </a>
            <a href="#demo" className="hover:text-neutral-900 transition-colors">
              Interactive Demo
            </a>
            <a
              href="https://github.com/jamesuchechi/formit"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ========================================================================= */
/* Authenticated Forms Dashboard View                                        */
/* ========================================================================= */

function DashboardView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [shareTarget, setShareTarget] = useState<FormRecord | null>(null);

  const {
    data: forms,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["user-forms"],
    queryFn: getUserForms,
  });

  const createMutation = useMutation({
    mutationFn: () => createForm({ title: "Untitled Form" }),
    onSuccess: (newForm) => {
      queryClient.invalidateQueries({ queryKey: ["user-forms"] });
      navigate(`/forms/${newForm.id}/edit`);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-forms"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "closed" }) =>
      updateForm(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-forms"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-forms"] });
    },
  });

  const needle = query.trim().toLowerCase();
  const visibleForms = (forms ?? []).filter(
    (f) => !needle || f.title.toLowerCase().includes(needle) || f.slug.includes(needle),
  );

  const totalResponses = useMemo(
    () => (forms ?? []).reduce((sum, f) => sum + (f.responseCount ?? 0), 0),
    [forms],
  );
  const openCount = useMemo(
    () => (forms ?? []).filter((f) => f.status === "open").length,
    [forms],
  );

  function handleDelete(form: FormRecord) {
    if (
      window.confirm(
        `Are you sure you want to delete "${form.title}"? All responses will be permanently removed.`,
      )
    ) {
      deleteMutation.mutate(form.id);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
              Forms
            </h1>
            {!isLoading && forms && forms.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-neutral-200/80 px-2.5 py-0.5 text-xs font-bold text-neutral-700">
                {forms.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Create, manage, and inspect real-time responses across your workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 transition-all cursor-pointer"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New Form
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div
          className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-busy="true"
          aria-label="Loading your forms"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-2xl border border-neutral-200 bg-white p-5"
            >
              <div className="h-4 w-16 rounded-full bg-neutral-100" />
              <div className="mt-6 h-5 w-2/3 rounded bg-neutral-100" />
              <div className="mt-2 h-3 w-1/3 rounded bg-neutral-100" />
              <div className="mt-10 h-3 w-1/2 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      )}

      {/* Toolbar / Search & Quick Metrics */}
      {!isLoading && !isError && forms && forms.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search forms by title or slug..."
              aria-label="Search forms"
              className="w-full rounded-xl border border-neutral-200/90 bg-white/90 py-2 pl-9 pr-3 text-sm text-neutral-900 shadow-2xs placeholder:text-neutral-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-emerald-700 font-semibold shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {openCount} Live
            </span>
            <span className="text-neutral-300">•</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200/80 px-2.5 py-1 text-neutral-600 shadow-2xs">
              <Users className="h-3 w-3 text-neutral-400" />
              {totalResponses} {totalResponses === 1 ? "response" : "responses"}
            </span>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <p className="font-semibold">Unable to load forms</p>
          <p className="mt-1 text-sm">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && forms && forms.length === 0 && (
        <div className="mt-12 rounded-3xl border-2 border-dashed border-neutral-200 bg-white p-12 text-center">
          <FormitLogo size="xl" className="mx-auto mb-4" />
          <h2 className="text-lg font-bold text-neutral-900">No forms yet</h2>
          <p className="mt-1 text-sm text-neutral-500 max-w-sm mx-auto">
            Get started by creating your very first form with our visual direct-canvas builder.
          </p>
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create your first form
          </button>
        </div>
      )}

      {/* Forms Grid */}
      {!isLoading && !isError && forms && forms.length > 0 && visibleForms.length === 0 && (
        <p className="mt-10 text-center text-sm text-neutral-500">
          No forms match &ldquo;{query}&rdquo;.
        </p>
      )}
      {!isLoading && !isError && visibleForms.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleForms.map((form) => {
            const updatedDate = new Date(form.updatedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={form.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white/95 backdrop-blur-xs p-5 shadow-xs hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-300/80 transition-all duration-200"
              >
                <div>
                  {/* Status & Menu */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        form.status === "open"
                          ? "bg-emerald-50 text-emerald-700"
                          : form.status === "closed"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          form.status === "open"
                            ? "bg-emerald-500"
                            : form.status === "closed"
                              ? "bg-rose-500"
                              : "bg-neutral-400"
                        }`}
                      />
                      {form.status.toUpperCase()}
                    </span>

                    <div className="flex items-center gap-1">
                      {form.status !== "draft" && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form.status === "open"}
                          aria-label={form.status === "open" ? "Close form" : "Reopen form"}
                          title={form.status === "open" ? "Close form" : "Reopen form"}
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({
                              id: form.id,
                              status: form.status === "open" ? "closed" : "open",
                            })
                          }
                          className={`relative mr-1 h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${
                            form.status === "open" ? "bg-emerald-500" : "bg-neutral-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                              form.status === "open" ? "left-[1.1rem]" : "left-0.5"
                            }`}
                          />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShareTarget(form)}
                        title="Share form"
                        aria-label="Share form"
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateMutation.mutate(form.id)}
                        disabled={duplicateMutation.isPending}
                        title="Duplicate form"
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors disabled:opacity-50"
                      >
                        <CopyPlus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(form)}
                        title="Delete form"
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Form Title */}
                  <Link
                    to={`/forms/${form.id}/edit`}
                    className="block group-hover:text-indigo-600 transition-colors"
                  >
                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-indigo-600 line-clamp-1">
                      {form.title || "Untitled Form"}
                    </h3>
                  </Link>
                  <p className="mt-1 text-xs text-neutral-400 font-mono truncate">/f/{form.slug}</p>
                </div>

                {/* Footer Stats & Actions */}
                <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/forms/${form.id}/responses`}
                      className="flex items-center gap-1 hover:text-indigo-600"
                      title="View responses"
                    >
                      <Users className="h-3.5 w-3.5" />
                      {form.responseCount ?? 0}{" "}
                      {form.responseCount === 1 ? "response" : "responses"}
                    </Link>
                    <span className="flex items-center gap-1" title="Last updated">
                      <Clock className="h-3.5 w-3.5" />
                      {updatedDate}
                    </span>
                  </div>

                  <Link
                    to={`/forms/${form.id}/edit`}
                    className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    Open Builder →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {shareTarget && (
        <ShareDialog
          slug={shareTarget.slug}
          title={shareTarget.title}
          status={shareTarget.status}
          onClose={() => setShareTarget(null)}
          onPublish={() => statusMutation.mutate({ id: shareTarget.id, status: "open" })}
        />
      )}
    </main>
  );
}
