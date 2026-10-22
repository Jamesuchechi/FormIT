import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  isValidSlug,
  parseFormSchema,
  type AnswerValue,
  type FileAnswer,
  type FormSchema,
} from "@formit/schema";
import { ApiError } from "./errors.ts";
import { supabase } from "./supabase.ts";

export { ApiError };

export const UPLOAD_BUCKET = "form-uploads";

async function call<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => ({}));
      throw new ApiError(payload.error ?? "unknown_error", error.context.status, payload.details);
    }
    throw new ApiError("network_error", 0);
  }
  return data as T;
}

export type PublicForm = {
  id: string;
  slug: string;
  title: string;
  schema: FormSchema;
  schemaVersion: number;
  requireSignIn: boolean;
  confirmationMessage: string | null;
};

/** Load an open form for the fill page. Null when it doesn't exist, is closed, or is out of schedule. */
export async function getPublicForm(slug: string): Promise<PublicForm | null> {
  const { data, error } = await supabase.rpc("get_public_form", { p_slug: slug });
  if (error) throw error;
  if (!data) return null;

  const parsed = parseFormSchema(data.schema);
  if (!parsed.success) throw new ApiError("form_invalid", 500);

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    schema: parsed.data,
    schemaVersion: data.schema_version,
    requireSignIn: data.require_sign_in,
    confirmationMessage: data.confirmation_message,
  };
}

/** Check if a slug is available for a new or renamed form. */
export async function isSlugAvailable(slug: string, currentFormId?: string): Promise<boolean> {
  let query = supabase.from("forms").select("id").eq("slug", slug);
  if (currentFormId) {
    query = query.neq("id", currentFormId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data === null;
}

/** Optional anti-spam fields sent alongside a submission. */
export type SubmitExtras = { website?: string; turnstileToken?: string };

export function submitResponse(
  slug: string,
  answers: Record<string, unknown>,
  extras?: SubmitExtras,
) {
  return call<{ ok: true; id: string; confirmation_message: string | null }>("submit-response", {
    slug,
    answers,
    ...extras,
  });
}

/** Upload one file for a file_upload field and return the answer object to submit. */
export async function uploadFile(slug: string, fieldId: string, file: File): Promise<FileAnswer> {
  const { path, token } = await call<{ path: string; token: string }>("create-upload-url", {
    slug,
    fieldId,
    fileName: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
  });

  const { error } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
  if (error) throw new ApiError("upload_failed", 0);

  return { path, name: file.name, size: file.size, mime: file.type || "application/octet-stream" };
}

/** Generate a signed download URL for an uploaded file (form owner only). */
export async function getFileDownloadUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data) throw new ApiError("download_failed", 0);
  return data.signedUrl;
}

/** The API surface the fill page needs. Injected so the renderer can be tested and previewed. */
export type FillApi = {
  submit: (
    slug: string,
    answers: Record<string, unknown>,
    extras?: SubmitExtras,
  ) => Promise<{ ok: true; id: string; confirmation_message: string | null }>;
  upload: (slug: string, fieldId: string, file: File) => Promise<FileAnswer>;
};

export const defaultFillApi: FillApi = { submit: submitResponse, upload: uploadFile };

/* ------------------------------------------------------------------ */
/* Owner Form Management API                                           */
/* ------------------------------------------------------------------ */

export type FormSettings = {
  requireSignIn?: boolean;
  oneResponsePerUser?: boolean;
  maxResponses?: number;
  confirmationMessage?: string;
  notifyOwnerOnSubmission?: boolean;
  notificationEmail?: string;
  sendRespondentReceipt?: boolean;
  receiptEmailFieldId?: string;
};

export type FormRecord = {
  id: string;
  ownerId: string;
  slug: string;
  title: string;
  schema: FormSchema;
  schemaVersion: number;
  settings: FormSettings;
  status: "draft" | "open" | "closed";
  opensAt: string | null;
  closesAt: string | null;
  createdAt: string;
  updatedAt: string;
  responseCount?: number;
};

function mapFormRow(row: Record<string, unknown>): FormRecord {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    slug: String(row.slug),
    title: String(row.title),
    schema: row.schema as FormSchema,
    schemaVersion: Number(row.schema_version),
    settings: (row.settings || {}) as FormSettings,
    status: row.status as "draft" | "open" | "closed",
    opensAt: (row.opens_at as string | null) ?? null,
    closesAt: (row.closes_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/** Get all forms owned by the current authenticated user. */
export async function getUserForms(): Promise<FormRecord[]> {
  const { data: rows, error } = await supabase
    .from("forms")
    .select("*, responses:responses(count)")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  const list = (rows || []) as unknown as Array<
    Record<string, unknown> & { responses?: Array<{ count: number }> }
  >;
  return list.map((row) => ({
    ...mapFormRow(row),
    responseCount: row.responses?.[0]?.count ?? 0,
  }));
}

/** Get a single form by its ID for editing in the builder. */
export async function getOwnerForm(id: string): Promise<FormRecord | null> {
  const { data: row, error } = await supabase.from("forms").select("*").eq("id", id).maybeSingle();

  if (error) throw error;
  if (!row) return null;
  return mapFormRow(row);
}

/** Create a new form with a fresh blank schema. */
export async function createForm(params: {
  title?: string;
  schema?: FormSchema;
  slug?: string;
}): Promise<FormRecord> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new ApiError("sign_in_required", 401);

  const title = params.title?.trim() || "Untitled form";
  const slug = params.slug || `form-${crypto.randomUUID().slice(0, 8)}`;

  const schema = params.schema || {
    title,
    sections: [
      {
        id: `s_${crypto.randomUUID().slice(0, 8)}`,
        title: "Section 1",
        fields: [
          {
            id: `f_${crypto.randomUUID().slice(0, 8)}`,
            type: "short_text" as const,
            label: "Untitled question",
            required: false,
            validation: {},
          },
        ],
      },
    ],
  };

  const { data, error } = await supabase
    .from("forms")
    .insert({
      owner_id: userRes.user.id,
      title,
      slug,
      schema,
      settings: {},
      status: "draft",
    })
    .select()
    .single();

  if (error) throw error;
  return mapFormRow(data);
}

/** Update an existing form's schema, title, settings, or status. */
export async function updateForm(
  id: string,
  updates: {
    title?: string;
    slug?: string;
    schema?: FormSchema;
    settings?: FormSettings;
    status?: "draft" | "open" | "closed";
    opensAt?: string | null;
    closesAt?: string | null;
  },
): Promise<FormRecord> {
  const patch: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    const cleanTitle = updates.title.trim();
    // Guard against check constraint: char_length(title) between 1 and 200
    patch.title = cleanTitle.length > 0 ? cleanTitle.slice(0, 200) : "Untitled form";
  }

  if (updates.slug !== undefined) {
    const cleanSlug = updates.slug.trim().toLowerCase();
    // Guard against check constraint: slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'
    if (isValidSlug(cleanSlug)) {
      patch.slug = cleanSlug;
    }
  }

  if (updates.schema !== undefined) {
    patch.schema = updates.schema;
  }

  if (updates.settings !== undefined) {
    patch.settings = updates.settings;
  }

  if (updates.status !== undefined) {
    // Guard against check constraint: status in ('draft', 'open', 'closed')
    if (["draft", "open", "closed"].includes(updates.status)) {
      patch.status = updates.status;
    }
  }

  // Guard against scheduling constraints: opens_at < closes_at
  if (updates.opensAt !== undefined) {
    patch.opens_at = updates.opensAt ? updates.opensAt : null;
  }
  if (updates.closesAt !== undefined) {
    patch.closes_at = updates.closesAt ? updates.closesAt : null;
  }

  if (patch.opens_at && patch.closes_at) {
    const openTime = new Date(patch.opens_at as string).getTime();
    const closeTime = new Date(patch.closes_at as string).getTime();
    if (!isNaN(openTime) && !isNaN(closeTime) && openTime >= closeTime) {
      delete patch.closes_at;
    }
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from("forms").update(patch).eq("id", id).select().single();

  if (error) throw error;
  return mapFormRow(data);
}

/** Delete a form and cascade its responses and versions. */
export async function deleteForm(id: string): Promise<void> {
  const { error } = await supabase.from("forms").delete().eq("id", id);
  if (error) throw error;
}

/** Duplicate an existing form with fresh ids. */
export async function duplicateForm(id: string): Promise<FormRecord> {
  const original = await getOwnerForm(id);
  if (!original) throw new ApiError("form_not_found", 404);

  return createForm({
    title: `${original.title} (Copy)`,
    schema: {
      ...original.schema,
      title: `${original.title} (Copy)`,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Owner Responses API                                                 */
/* ------------------------------------------------------------------ */

export type ResponseRecord = {
  id: string;
  respondentId: string | null;
  schemaVersion: number;
  answers: Record<string, AnswerValue | undefined>;
  submittedAt: string;
};

function mapResponseRow(row: Record<string, unknown>): ResponseRecord {
  return {
    id: String(row.id),
    respondentId: (row.respondent_id as string | null) ?? null,
    schemaVersion: Number(row.schema_version),
    answers: (row.answers || {}) as ResponseRecord["answers"],
    submittedAt: String(row.submitted_at),
  };
}

/** Every schema version a response may have been submitted against (owner only). */
export async function getFormVersions(formId: string): Promise<Record<number, FormSchema>> {
  const { data, error } = await supabase
    .from("form_versions")
    .select("version, schema")
    .eq("form_id", formId);
  if (error) throw error;
  const out: Record<number, FormSchema> = {};
  for (const row of data ?? []) {
    const parsed = parseFormSchema(row.schema);
    if (parsed.success) out[row.version as number] = parsed.data;
  }
  return out;
}

export type ResponseSort = { key: "submitted_at" | string; ascending: boolean };

/** One page of responses plus the total count. Sort key is `submitted_at` or a field id. */
export async function getResponsesPage(
  formId: string,
  opts: { page: number; pageSize: number; sort: ResponseSort },
): Promise<{ rows: ResponseRecord[]; total: number }> {
  const from = opts.page * opts.pageSize;
  const orderCol = opts.sort.key === "submitted_at" ? "submitted_at" : `answers->>${opts.sort.key}`;
  const { data, error, count } = await supabase
    .from("responses")
    .select("*", { count: "exact" })
    .eq("form_id", formId)
    .order(orderCol, { ascending: opts.sort.ascending })
    .order("id", { ascending: true })
    .range(from, from + opts.pageSize - 1);
  if (error) throw error;
  return { rows: (data ?? []).map(mapResponseRow), total: count ?? 0 };
}

/**
 * Async generator over all responses, newest first, in keyset-stable batches.
 * Used by CSV export and summaries so large forms never load in one request.
 */
export async function* iterateResponses(
  formId: string,
  batchSize = 1000,
): AsyncGenerator<ResponseRecord[]> {
  for (let from = 0; ; from += batchSize) {
    const { data, error } = await supabase
      .from("responses")
      .select("*")
      .eq("form_id", formId)
      .order("submitted_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + batchSize - 1);
    if (error) throw error;
    const rows = (data ?? []).map(mapResponseRow);
    if (rows.length > 0) yield rows;
    if (rows.length < batchSize) return;
  }
}

export async function deleteResponse(id: string): Promise<void> {
  const { error } = await supabase.from("responses").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteAllResponses(formId: string): Promise<void> {
  const { error } = await supabase.from("responses").delete().eq("form_id", formId);
  if (error) throw error;
}
