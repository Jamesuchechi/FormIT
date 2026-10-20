import { HttpError, handle, isRecord, json, readJson } from "../_shared/http.ts";
import { SLUG, loadOpenForm, type OpenForm } from "../_shared/forms.ts";
import { admin, getUserId, UPLOAD_BUCKET } from "../_shared/supabase.ts";
import { allFields, mimeAllowed, validateSubmission } from "../_shared/schema/index.ts";

/**
 * POST /functions/v1/submit-response
 * Body: { slug: string, answers: Record<fieldId, value> }
 *
 * 201 { ok: true, id, confirmation_message }
 * 4xx { error: <code>, details? }   (422 validation_failed carries { [fieldId]: string[] })
 */
Deno.serve(
  handle(async (req) => {
    const body = await readJson(req);
    if (!isRecord(body) || typeof body.slug !== "string" || !SLUG.test(body.slug)) {
      throw new HttpError(400, "invalid_request");
    }

    const form = await loadOpenForm(body.slug);
    const userId = await getUserId(req);
    if (form.settings.requireSignIn && !userId) throw new HttpError(401, "sign_in_required");

    // Same code the browser runs, now authoritative: required, types, bounds, option ids,
    // conditional logic, hidden-field stripping, unknown-field rejection.
    const result = validateSubmission(form.schema, body.answers);
    if (!result.success) throw new HttpError(422, "validation_failed", result.errors);

    const answers = await verifyUploads(form, result.data);

    // Status, schedule, response cap, schema version and dedupe are enforced atomically
    // inside the submit_response() SQL function (row-locked on the form).
    const { data: id, error } = await admin.rpc("submit_response", {
      p_form_id: form.id,
      p_schema_version: form.schemaVersion,
      p_answers: answers,
      p_respondent: userId,
      p_dedupe: form.settings.oneResponsePerUser,
    });
    if (error) throw mapRpcError(error);

    return json({ ok: true, id, confirmation_message: form.settings.confirmationMessage }, 201);
  }),
);

/**
 * File answers arrive as client-declared { path, name, size, mime }. Never trust them:
 * the path must live under this form + field, the object must exist, and size/mime are
 * re-read from storage and re-checked against the field's limits.
 */
async function verifyUploads(
  form: OpenForm,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const out = { ...data };

  for (const field of allFields(form.schema)) {
    if (field.type !== "file_upload" || !(field.id in out)) continue;

    const files = out[field.id] as { path: string; name: string }[];
    const dir = `${form.id}/${field.id}`;
    const maxBytes = field.validation.maxSizeMb * 1024 * 1024;
    const verified = [];

    for (const file of files) {
      const prefix = `${dir}/`;
      const name = file.path.slice(prefix.length);
      if (!file.path.startsWith(prefix) || !name || name.includes("/") || name.includes("..")) {
        throw new HttpError(422, "validation_failed", { [field.id]: ["Invalid file reference"] });
      }

      const { data: objects, error } = await admin.storage
        .from(UPLOAD_BUCKET)
        .list(dir, { search: name, limit: 100 });
      if (error) throw error;

      const object = objects?.find((o) => o.name === name);
      const size = Number(object?.metadata?.size ?? NaN);
      const mime = String(object?.metadata?.mimetype ?? "");
      if (!object || !Number.isFinite(size)) {
        throw new HttpError(422, "validation_failed", { [field.id]: [`${file.name} was not uploaded`] });
      }
      if (size > maxBytes) {
        throw new HttpError(422, "validation_failed", {
          [field.id]: [`${file.name} exceeds ${field.validation.maxSizeMb} MB`],
        });
      }
      if (!mimeAllowed(mime, field.validation.accept)) {
        throw new HttpError(422, "validation_failed", {
          [field.id]: [`${file.name} is not an accepted file type`],
        });
      }

      verified.push({ path: file.path, name: file.name, size, mime });
    }
    out[field.id] = verified;
  }
  return out;
}

function mapRpcError(error: { code?: string; message: string }): HttpError {
  if (error.code === "23505") return new HttpError(409, "already_submitted");
  switch (error.message) {
    case "form_not_found":
      return new HttpError(404, "form_not_found");
    case "form_closed":
      return new HttpError(403, "form_closed");
    case "response_limit_reached":
      return new HttpError(403, "response_limit_reached");
    case "schema_changed":
      return new HttpError(409, "schema_changed"); // form was edited mid-fill: client should reload
    default:
      console.error("submit_response failed", error);
      return new HttpError(500, "internal_error");
  }
}
