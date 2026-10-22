import { HttpError, handle, isRecord, json, readJson } from "../_shared/http.ts";
import { SLUG, loadOpenForm, type OpenForm } from "../_shared/forms.ts";
import { admin, getUserId, UPLOAD_BUCKET } from "../_shared/supabase.ts";
import { allFields, mimeAllowed, validateSubmission } from "../_shared/schema/index.ts";
import { rateLimit } from "../_shared/ratelimit.ts";

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

    rateLimit(req, body.slug);

    // Honeypot: real users never see or fill this field. Pretend success so bots learn nothing.
    if (typeof body.website === "string" && body.website.trim() !== "") {
      return json({ ok: true, id: crypto.randomUUID(), confirmation_message: null }, 201);
    }
    await verifyTurnstile(req, body.turnstileToken);

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

    // Asynchronously dispatch notifications (owner alert & respondent receipt) without blocking the response
    dispatchNotifications(form, answers, userId, id).catch((err) => {
      console.error("Failed to dispatch notifications:", err);
    });

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

/**
 * Optional Cloudflare Turnstile. Enforced only when TURNSTILE_SECRET_KEY is configured,
 * so local dev and self-hosts work without it.
 */
async function verifyTurnstile(req: Request, token: unknown): Promise<void> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return;
  if (typeof token !== "string" || token === "") throw new HttpError(400, "captcha_required");

  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for");
  if (ip) form.set("remoteip", ip.split(",")[0]!.trim());

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const result = (await res.json().catch(() => ({}))) as { success?: boolean };
  if (!result.success) throw new HttpError(400, "captcha_failed");
}

/**
 * Dispatches email notifications to form owner and/or email receipt to respondent.
 * Supports RESEND_API_KEY if configured, or falls back to logging/mocking in local/dev.
 */
async function dispatchNotifications(
  form: OpenForm,
  answers: Record<string, unknown>,
  userId: string | null,
  responseId: string,
): Promise<void> {
  const fields = allFields(form.schema);
  const fieldMap = new Map(fields.map((f) => [f.id, f]));

  // Build a readable summary of answers
  const answerEntries = Object.entries(answers)
    .map(([fieldId, val]) => {
      const f = fieldMap.get(fieldId);
      const label = f ? f.label : fieldId;
      const displayVal =
        val === null || val === undefined
          ? "(empty)"
          : typeof val === "object"
          ? JSON.stringify(val)
          : String(val);
      return `• ${label}: ${displayVal}`;
    })
    .join("\n");

  // 1. Owner notification
  if (form.settings.notifyOwnerOnSubmission) {
    let targetOwnerEmail = form.settings.notificationEmail;
    if (!targetOwnerEmail) {
      // Look up owner user email from auth.users via admin
      const { data: userRecord } = await admin.auth.admin.getUserById(form.ownerId);
      targetOwnerEmail = userRecord.user?.email || null;
    }

    if (targetOwnerEmail) {
      await sendEmail({
        to: targetOwnerEmail,
        subject: `New response received for "${form.title}"`,
        text: `You have received a new submission for your form "${form.title}".\n\nResponse ID: ${responseId}\n\nSubmission Details:\n${answerEntries}\n\nView and manage your responses on FormIT.`,
      });
    }
  }

  // 2. Respondent receipt (optional)
  if (form.settings.sendRespondentReceipt) {
    let respondentEmail: string | null = null;

    // Check specific question field configured for receipts
    if (form.settings.receiptEmailFieldId) {
      const fieldVal = answers[form.settings.receiptEmailFieldId];
      if (typeof fieldVal === "string" && fieldVal.includes("@")) {
        respondentEmail = fieldVal.trim();
      }
    }

    // Fallback: search for any email field answer if not explicitly set
    if (!respondentEmail) {
      for (const f of fields) {
        if (f.type === "short_text") {
          const val = answers[f.id];
          if (typeof val === "string" && val.includes("@")) {
            respondentEmail = val.trim();
            break;
          }
        }
      }
    }

    // Fallback: if respondent is signed in, get their auth email
    if (!respondentEmail && userId) {
      const { data: userRecord } = await admin.auth.admin.getUserById(userId);
      respondentEmail = userRecord.user?.email || null;
    }

    if (respondentEmail) {
      const confirmationMsg =
        form.settings.confirmationMessage || "Thank you for completing this form!";
      await sendEmail({
        to: respondentEmail,
        subject: `Receipt: Your response to "${form.title}"`,
        text: `${confirmationMsg}\n\nHere is a summary of the details you submitted:\n\n${answerEntries}\n\nForm: ${form.title}\nSubmission ID: ${responseId}`,
      });
    }
  }
}

/**
 * Universal email dispatcher: Sends via Resend if RESEND_API_KEY is present,
 * otherwise logs the email cleanly to the console.
 */
async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") || "FormIT <notifications@formit.app>";

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Resend API error:", res.status, errText);
      } else {
        console.log(`Email dispatched via Resend to ${to}: "${subject}"`);
      }
      return;
    } catch (err) {
      console.error("Error sending email via Resend:", err);
    }
  }

  // Local/Dev or no API key fallback: structured console log
  console.log(`[FormIT Email Notification Mock]
TO: ${to}
FROM: ${from}
SUBJECT: ${subject}
BODY:
${text}
--------------------------------------------------`);
}

