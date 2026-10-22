# FormIT TODO

Legend: `[ ]` todo, `[x]` done, `[~]` in progress. Order within a phase is build order.

---

## v1: ship a usable Forms clone

### Phase 0: Foundations

- [x] Monorepo setup (pnpm workspaces: `apps/web`, `packages/schema`)
- [x] Vite + React + TS + Tailwind, ESLint, Prettier, Vitest
- [x] Supabase local dev, migrations folder, seed script (migrations and full development seed written)
- [x] CI: lint, type-check, unit tests on PR
- [x] Auth: email/password + magic link, protected routes

### Phase 1: Schema package (`packages/schema`)

- [x] TypeScript types for `Form`, `Section`, `Field`, `Rule`
- [x] Field type registry (one definition per type: defaults, validator, renderer key)
- [x] Schema → Zod compiler (all 8 field types, required/optional, bounds)
- [x] Logic engine: `isVisible(field, answers)` with `eq/neq/gt/lt/contains`, `all/any`
- [x] `stripHidden(schema, answers)` to drop answers for hidden fields
- [x] Schema integrity check: unique ids, rules reference existing earlier fields, no cycles
- [x] Unit tests for all of the above

### Phase 2: Database and security

- [x] Migrations: `forms`, `form_versions`, `responses`, indexes, versioning triggers
- [~] RLS (run `supabase db reset` and write the tests): owner full access; `get_public_form()` for public reads; no direct response inserts (written, untested)
- [x] Edge Function `submit-response`: status/schedule/cap checks, set `dedupe_key` when `oneResponsePerUser`, `validateSubmission` from `@formit/schema`, verify every file `path` belongs to this form and field
- [x] Storage bucket for uploads, `create-upload-url` function, size and MIME limits (re-verified from storage at submit time)
- [x] `submit_response()` SQL function: atomic status/schedule/cap/version/dedupe checks
- [ ] Edge Function tests (`deno test`) for submit-response and create-upload-url
- [x] Orphaned upload cleanup (`cleanup_orphaned_uploads()` scheduled function deleting objects unreferenced after 24h)
- [x] Owner-side signed download URLs for response files (RLS storage policy + `getFileDownloadUrl`)
- [x] Rate limiting on both functions (per IP and per form via `ratelimit.ts`)
- [x] Slug generation and collision handling (`generateSlug`, `resolveSlugCollision`, `isSlugAvailable`)
- [ ] RLS test suite (owner, other user, anon)

### Phase 3: Renderer and fill page

- [x] Field components for all 8 types
- [x] Section pagination with progress indicator (hidden sections skipped)
- [x] Live conditional logic in the fill flow
- [x] Client-side validation with inline errors, focus on first error
- [x] Autosave draft: localStorage for everyone, DB-backed drafts (`response_drafts`) for signed-in users
- [x] Closed / not-yet-open states show "isn't available"; cap-reached is only discovered on submit (`get_public_form` doesn't expose it)
- [x] Confirmation page with custom message
- [x] Mobile-first layout, full ARIA wiring, keyboard navigation & screen reader accessibility
- [x] Component tests for the fill flow (13)
- [x] Sign-in routes and UI (email/password, magic link, redirect support)
- [x] Code-split the bundle (route lazy loading + vendor manualChunks; all chunks < 230 kB)
- [ ] Playwright E2E: open form, fill with conditional logic, submit, see it in the database

### Phase 4: Builder

- [x] Builder shell: canvas, field palette, inspector panel (Argon visual direct-canvas design)
- [x] Add, delete, duplicate, reorder fields (@dnd-kit sortable with tactile question cards)
- [x] Sections: add, delete, reorder, section titles and field groupings
- [x] Inspector: label, help text, required switch, options editor, type-specific validation rules
- [x] Conditional logic UI (visual rule builder scoped strictly to preceding fields)
- [x] Live interactive preview using FormFiller with desktop & mobile viewport toggles
- [x] Debounced autosave builder state to Supabase, publish/status toggles, share link modal
- [x] Undo/redo with 50-step history stack and keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z, Escape)
- [x] Settings panel: sign-in requirement, one response per user, response cap, custom slug with real-time collision check, custom confirmation message
- [x] Full unit test suite for builder state, header, palette, canvas, and inspector (10 tests)

### Phase 5: Responses and results

- [x] Responses table: pagination (25/page), server-side sort (submitted time and answer columns), per-column display by field type
- [x] Single-response detail view (side drawer, file downloads via signed URLs)
- [x] Summary view: bar + pie for choice fields, histogram + average for scales, text list for open answers
- [x] Render old responses against the right `form_versions` schema
- [x] CSV export (batched 1000 rows, Blob-assembled, formula-injection safe, handles large forms)
- [x] Delete response, delete all responses
- [x] Open/close toggle and response count on dashboard (also toggle on the responses page)
- [x] Unit tests for results helpers (5)

### Phase 6: Polish and launch

- [x] Dashboard: list, search, duplicate form, delete with confirm
- [x] Share dialog: copy link, QR code (canvas render & download, integrated in dashboard and builder)
- [x] Empty states, loading skeletons, error boundaries
- [x] Basic spam protection (honeypot trap field, server-side silent discard, optional Cloudflare Turnstile)
- [ ] E2E suite: build, fill, submit, view, export
- [ ] Deploy (Vercel + Supabase cloud), custom domain, error monitoring
- [ ] README screenshots, license (MIT added), tag `v1.0.0`

---

## v1.1: quality of life

- [x] Form templates (contact, feedback, RSVP, job application, event registration)
- [x] Themes: accent color, font, header image, dark mode on fill page
- [x] Email notification to owner on new response
- [x] Email receipt to respondent (optional per form)
- [ ] Response editing by respondent via a private edit link
- [ ] Question bank: save and reuse field definitions
- [ ] Import from CSV / paste a list of options
- [ ] "Other" option on choice fields
- [ ] Choice shuffling and randomized option order
- [ ] Per-field description images
- [ ] Keyboard shortcuts in builder

## v2: collaboration and intelligence

- [ ] Collaborators (viewer, editor) with invite flow
- [ ] Teams / workspaces
- [ ] Comments on fields while editing
- [ ] Version history UI with restore
- [ ] Quiz mode: correct answers, points, instant or deferred scoring, feedback per answer
- [ ] Grid / matrix questions, ranking questions, signature field
- [ ] Branching to sections ("go to section X based on answer")
- [ ] Calculated fields and hidden fields (URL params prefill, e.g. `?source=email`)
- [ ] AI form generation from a prompt or pasted doc
- [ ] AI results summary: themes in open-ended answers, sentiment, outliers
- [ ] AI-suggested validation and question cleanup
- [ ] Analytics: completion rate, drop-off per field, median time to complete
- [ ] Cross-tab filtering in results (e.g. rating by department)

## v3: platform

- [ ] Webhooks with signing and retry
- [ ] Public REST API and API keys
- [ ] Integrations: Google Sheets, Slack, Notion, Airtable, Zapier/Make
- [ ] Embeddable widget (inline, popup, full-page) and `<script>` embed
- [ ] Custom domains per workspace, remove branding
- [ ] Payments field (Stripe)
- [ ] Multi-language forms with per-language labels
- [ ] Partial-response capture (save abandoned forms)
- [ ] Audit log, SSO, data retention policies
- [ ] Self-hosted distribution (docker-compose)
- [ ] Usage plans and billing

---

## Technical debt and hardening (ongoing)

- [ ] ReDoS hardening for owner-supplied regex (RE2 or time-boxed worker) before public sign-ups
- [x] Response cap race: fixed by row-locking inside `submit_response()`
- [ ] Load test submit function (target: sustained burst on a single popular form)
- [ ] Decide when to denormalize answers for SQL analytics (materialized view or a `response_answers` table)
- [ ] Accessibility audit (WCAG AA) on builder and fill page
- [ ] GDPR basics: export and delete a respondent's data
- [ ] Backup and restore drill
- [ ] Observability: structured logs from Edge Functions, submit success/failure metrics

---

## Future: MeetIT integration (after both products exist)

- [ ] Shared auth between FormIT and MeetIT
- [ ] Push a FormIT poll or form into a live MeetIT room
- [ ] Live results panel streaming responses during a call
- [ ] Attach forms to a meeting (intake, interview scorecard)
- [ ] Post-call feedback form sent automatically on meeting end
- [ ] Link responses to meeting session and participant

---

## Open questions

- Name: **FormIT** vs FormPRO (leaning FormIT, matches the IT family)
- Anonymous respondents: store any identifier at all (hashed IP for dedupe), or none?
- One-per-user enforcement for anonymous forms: cookie, fingerprint, or skip?
- File uploads: per-form storage quota?
- When to move answers out of JSONB for analytics
