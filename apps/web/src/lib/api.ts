import { FunctionsHttpError } from "@supabase/supabase-js";
import { parseFormSchema, type FileAnswer, type FormSchema } from "@formit/schema";
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

export function submitResponse(slug: string, answers: Record<string, unknown>) {
  return call<{ ok: true; id: string; confirmation_message: string | null }>("submit-response", {
    slug,
    answers,
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
  const { data: row, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

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
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.slug !== undefined) patch.slug = updates.slug;
  if (updates.schema !== undefined) patch.schema = updates.schema;
  if (updates.settings !== undefined) patch.settings = updates.settings;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.opensAt !== undefined) patch.opens_at = updates.opensAt;
  if (updates.closesAt !== undefined) patch.closes_at = updates.closesAt;

  const { data, error } = await supabase
    .from("forms")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

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
