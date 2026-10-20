import { HttpError, handle, isRecord, json, readJson } from "../_shared/http.ts";
import { SLUG, loadOpenForm } from "../_shared/forms.ts";
import { admin, getUserId, UPLOAD_BUCKET } from "../_shared/supabase.ts";
import { allFields, mimeAllowed } from "../_shared/schema/index.ts";

/**
 * POST /functions/v1/create-upload-url
 * Body: { slug, fieldId, fileName, mime, size }
 *
 * 200 { path, token, signedUrl }
 *
 * Client then uploads directly to storage:
 *   supabase.storage.from("form-uploads").uploadToSignedUrl(path, token, file)
 * and puts { path, name, size, mime } in its answers for submit-response.
 */
Deno.serve(
  handle(async (req) => {
    const body = await readJson(req, 10_000);
    if (
      !isRecord(body) ||
      typeof body.slug !== "string" ||
      !SLUG.test(body.slug) ||
      typeof body.fieldId !== "string" ||
      typeof body.fileName !== "string" ||
      typeof body.mime !== "string" ||
      typeof body.size !== "number"
    ) {
      throw new HttpError(400, "invalid_request");
    }

    const form = await loadOpenForm(body.slug);
    if (form.settings.requireSignIn && !(await getUserId(req))) {
      throw new HttpError(401, "sign_in_required");
    }

    const field = allFields(form.schema).find((f) => f.id === body.fieldId);
    if (!field || field.type !== "file_upload") throw new HttpError(404, "field_not_found");

    const { maxSizeMb, accept } = field.validation;
    if (!Number.isFinite(body.size) || body.size <= 0) throw new HttpError(400, "invalid_request");
    if (body.size > maxSizeMb * 1024 * 1024) throw new HttpError(422, "file_too_large");
    if (!mimeAllowed(body.mime, accept)) throw new HttpError(422, "file_type_not_allowed");

    // Safe, unguessable object key scoped to this form and field.
    const safeName = body.fileName.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100) || "file";
    const path = `${form.id}/${field.id}/${crypto.randomUUID()}-${safeName}`;

    const { data, error } = await admin.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("createSignedUploadUrl failed", error);
      throw new HttpError(500, "internal_error");
    }
    return json({ path: data.path, token: data.token, signedUrl: data.signedUrl });
  }),
);
