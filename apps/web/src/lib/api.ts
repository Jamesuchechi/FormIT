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
