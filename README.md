# FormIT

A form builder and survey platform: design a form, share a link, collect responses, analyze results. Think Google Forms, built to be extended.

> **Status:** pre-v1, in active development. See [TODO.md](./TODO.md) for the roadmap.

---

## Features

### v1 scope

- **Builder**: drag-and-drop field ordering, sections, required flags, per-field validation
- **Field types**: short text, long text, multiple choice, checkboxes, dropdown, linear scale, date, file upload
- **Conditional logic**: show/hide fields based on earlier answers (rules stored as data, not code)
- **Public fill page**: one shareable link, autosave drafts, custom confirmation message
- **Access control**: anonymous or sign-in-required, optional one response per user
- **Lifecycle**: draft / open / closed, optional open and close schedule, response cap
- **Responses**: table view, per-question summary charts, single-response view, CSV export
- **Schema versioning**: editing a live form never corrupts existing responses

### Not in v1

Quizzes and scoring, collaborators, themes, webhooks, templates, and integrations. See [TODO.md](./TODO.md).

---

## Stack

| Layer         | Choice                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| Frontend      | React + Vite + TypeScript                                              |
| Styling       | Tailwind CSS                                                           |
| Server state  | TanStack Query                                                         |
| Drag and drop | dnd-kit                                                                |
| Validation    | Zod (generated from the form schema, shared by client and server)      |
| Charts        | Recharts                                                               |
| Backend       | Supabase (Postgres, Auth, Row Level Security, Storage, Edge Functions) |
| Testing       | Vitest, Playwright                                                     |

---

## Architecture

### Core idea: the form is data

A form is a versioned JSON document. The builder writes it, the renderer reads it, and the validator is generated from it. Nothing about a specific form lives in code.

```
Builder UI ──writes──▶ forms.schema (JSONB)
                           │
         ┌─────────────────┼──────────────────┐
         ▼                 ▼                  ▼
   Form renderer     Zod validator     Results/analytics
   (fill page)    (client + server)    (keyed by field id)
```

### Schema shape

```ts
// Stored in forms.schema. The form's id/slug/status live in table columns, not in the document.
type FormSchema = {
  title: string;
  description?: string;
  sections: Section[];
};

type Section = {
  id: string;
  title?: string;
  fields: Field[];
};

type Field = {
  id: string; // stable, never reused; answers key off this
  type: FieldType;
  label: string;
  helpText?: string;
  required: boolean;
  options?: { id: string; label: string }[]; // choice-based fields
  validation?: Validation; // min/max, length, regex, file size/type
  visibleIf?: Rule; // conditional logic
};

type Rule =
  | {
      field: string;
      op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "answered" | "unanswered";
      value?: unknown;
    }
  | { all: Rule[] }
  | { any: Rule[] };
```

Rules:

- **Answers key off `field.id`, never the label.** Renaming a question must not orphan data.
- **Field ids are immutable.** Deleting a field and adding a new one produces a new id.
- **Hidden fields are not validated and not stored.** The server re-evaluates `visibleIf` against submitted answers. A rule only sees answers from fields that are themselves visible, so hiding a question hides its dependents.
- **Rules may only reference earlier fields.** This rules out self-reference and cycles and makes evaluation a single forward pass.
- **Unknown field ids in a submission are rejected** (tampering); hidden-field answers are dropped silently (a legitimate client can race a rule change).

### Data model

Full DDL, triggers and RLS live in [`supabase/migrations/20260101000000_init.sql`](./supabase/migrations/20260101000000_init.sql). Summary:

- `forms`: owner, slug, `schema` (JSONB), `schema_version`, `settings` (JSONB), `status`, optional open/close times.
- `form_versions`: append-only history. A trigger bumps `schema_version` and snapshots the schema only when it changes **after the first response exists**; before that, edits overwrite the current version in place. Clients can never set `schema_version`.
- `responses`: `answers` JSONB keyed by field id, plus `schema_version` (FK to `form_versions`, so every answer is always renderable).
- `submit_response()` (second migration): the only way a response row is created. It locks the form row and, in one step, checks status, schedule, response cap and schema version, then inserts. Callable by the service role only.
- `responses.dedupe_key`: set by the submit function to the respondent id **only** when the form has `oneResponsePerUser` on. A partial unique index on `(form_id, dedupe_key)` then enforces the rule race-free without blocking forms that allow repeat submissions.

### Security model (RLS)

- Owners have full access to their own forms and all responses to them.
- `forms` has no public SELECT policy. Respondents load a form through `get_public_form(slug)`, a security-definer function that returns only title, schema, version, and two safe settings, and only while the form is open and inside its schedule. `owner_id` and the raw settings object are never exposed.
- Response inserts go through the `submit-response` Edge Function, never direct table access. It re-validates the payload with the same `validateSubmission` the browser uses, verifies uploads against storage, then calls `submit_response()` for the atomic checks.
- File uploads go to a private `form-uploads` bucket with no client policies. `create-upload-url` issues signed upload URLs under `{formId}/{fieldId}/{uuid}-{name}`; `submit-response` re-reads size and MIME from storage and rejects paths outside that form and field.
- Respondents cannot read other respondents' answers.

---

## Project structure

```
formit/
├── apps/
│   └── web/                      # React + Vite app
│       ├── vercel.json           # SPA rewrite
│       └── src/
│           ├── routes/           # HomePage, FillPage (/f/:slug), NotFoundPage
│           ├── features/
│           │   ├── renderer/     # FormFiller, FieldRenderer, useFillState, draft storage
│           │   │   └── fields/   # one input component per field type
│           │   ├── auth/         # useSession (sign-in UI still to come)
│           │   ├── builder/      # (planned) editor canvas, palette, inspector
│           │   └── responses/    # (planned) table, charts, export
│           └── lib/              # api.ts (Edge Function + RPC client), errors.ts, supabase.ts
├── packages/
│   └── schema/              # shared: types, Zod generator, logic engine
├── scripts/
│   └── sync-schema.mjs         # copies packages/schema/src into the functions' _shared dir
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20260101000000_init.sql
│   │   └── 20260102000000_submit_and_storage.sql
│   ├── functions/
│   │   ├── _shared/            # cors, http, supabase client, form loader (+ generated schema/)
│   │   ├── submit-response/
│   │   └── create-upload-url/
│   └── seed.sql
├── TODO.md
└── README.md
```

`packages/schema` is the heart of the project. It owns the types, the schema-to-Zod compiler, and the conditional-logic evaluator, and it is imported by both the web app and the Edge Functions.

---

## Fill page

`/f/:slug` loads the form through `get_public_form()` and renders it with `FormFiller`.

- **`useFillState`** owns all behavior: answers, visibility (`computeVisibility`), pagination, validation, draft autosave, and submit. UI components are dumb.
- **Pagination:** one page per section. Sections whose questions are all hidden are skipped, and the progress bar only counts visible pages. **Next** validates the current page only; **Submit** validates everything and jumps to the first page with an error.
- **Validation:** the same `validateSubmission` the server runs. Server-side `validation_failed` errors are mapped back onto fields.
- **Drafts:** debounced to `localStorage` per `slug` + `schema_version`, restored on load, cleared on submit. Draft keys for questions that no longer exist are dropped on restore.
- **Dependency injection:** `FormFiller` takes an `api` prop (`submit`, `upload`), so it is testable without Supabase and reusable for the builder's live preview.
- **Accessibility:** label/`for` for single controls, `fieldset`/`legend` for option groups, `aria-describedby` for help and error text, `aria-invalid` and `aria-required` on inputs, `role="alert"` on errors, first invalid field is focused, `role="progressbar"` for paging.

---

## Edge Functions

Both functions accept anonymous respondents and do their own auth, so `verify_jwt = false` in `config.toml`. Validation code is shared with the browser: `pnpm functions:sync` copies `packages/schema/src` into `supabase/functions/_shared/schema/` (generated, gitignored) and every `functions:*` script runs it first.

### `POST /functions/v1/submit-response`

```jsonc
// request
{ "slug": "my-form", "answers": { "<fieldId>": "<value>" } }

// 201
{ "ok": true, "id": "<uuid>", "confirmation_message": "Thanks!" }

// 422 validation_failed
{ "error": "validation_failed", "details": { "<fieldId>": ["This field is required"] } }
```

| Status | `error`                                 | Meaning                                                      |
| ------ | --------------------------------------- | ------------------------------------------------------------ |
| 400    | `invalid_request`, `invalid_json`       | Malformed body                                               |
| 401    | `sign_in_required`                      | Form requires sign-in (also implied by `oneResponsePerUser`) |
| 403    | `form_closed`, `response_limit_reached` | Not open, outside schedule, or cap hit                       |
| 404    | `form_not_found`                        | Unknown slug                                                 |
| 409    | `already_submitted`                     | `oneResponsePerUser` and this user already responded         |
| 409    | `schema_changed`                        | Form was edited mid-fill; reload and retry                   |
| 413    | `payload_too_large`                     | Body over 1 MB                                               |
| 422    | `validation_failed`                     | Per-field errors in `details`                                |

### `POST /functions/v1/create-upload-url`

```jsonc
// request
{ "slug": "my-form", "fieldId": "resume", "fileName": "cv.pdf", "mime": "application/pdf", "size": 120345 }

// 200
{ "path": "<formId>/resume/<uuid>-cv.pdf", "token": "...", "signedUrl": "..." }
```

Upload with `supabase.storage.from("form-uploads").uploadToSignedUrl(path, token, file)`, then submit `{ path, name, size, mime }` as the field's answer. `apps/web/src/lib/api.ts` wraps this as `uploadFile()`.

### Secrets

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically. Set `ALLOWED_ORIGIN` for CORS (see `supabase/.env.example`).

---

## Getting started

### Prerequisites

- Node 20+
- pnpm
- Supabase CLI (and Docker for local Supabase)

### Setup

```bash
git clone <repo-url> formit && cd formit
pnpm install

supabase start                 # local Postgres, Auth, Storage
supabase db reset              # applies migrations and seed

cp supabase/.env.example supabase/.env.local
pnpm functions:serve           # serves both Edge Functions locally (syncs the schema package first)

cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

### Environment variables

```bash
# apps/web/.env.local
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<from `supabase status`>
```

Never ship the service role key to the client. It is only used inside Edge Functions.

### Scripts

| Command                    | What it does                                   |
| -------------------------- | ---------------------------------------------- |
| `pnpm dev`                 | Run the web app                                |
| `pnpm test`                | Unit tests (schema package, logic engine)      |
| `pnpm test:e2e`            | Playwright flows (build, fill, submit, export) |
| `pnpm lint`                | ESLint and type-check                          |
| `supabase functions serve` | Run Edge Functions locally                     |

---

## Testing priorities

1. **Logic engine**: rule evaluation, nested `all`/`any`, hidden-field handling. Pure functions, heavily tested.
2. **Schema → Zod**: every field type, required and optional, validation bounds.
3. **Submit function**: closed form, over cap, duplicate respondent, tampered payload, hidden field smuggled into answers.
4. **Fill flow** (done): conditional show/hide, required blocking, hidden answers not submitted, section skipping, draft restore/clear, server error mapping, retry, file upload and type rejection. React Testing Library with an injected fake API.
5. **E2E**: build a form with conditional logic, fill it, verify results.

---

## Design decisions

- **JSONB over normalized field tables.** Forms are read and written as whole documents, the schema evolves often, and there are no cross-form field queries in v1. Revisit if analytics need SQL over answers at scale.
- **Server-side validation is authoritative.** The client validator exists for UX only.
- **Row lock on submit.** `submit_response()` locks the form row so the response cap is exact. Submissions to one form serialize for a few milliseconds; fine for v1, revisit if a single form takes sustained high throughput.
- **Owner-supplied regex is a ReDoS surface.** Patterns are capped at 200 chars and input at 1,000 chars, but a hostile pattern can still be slow. Revisit with RE2 or a time-boxed worker before opening public sign-ups.
- **Versioned schemas.** Every publish after the first response creates a new `form_versions` row, so results render against the schema each answer was submitted under.

---

## Roadmap

See [TODO.md](./TODO.md). Next up after v1: quizzes and scoring, collaborators, templates, webhooks, and an embeddable widget.

---

## License

TBD
