import { parseFormSchema, type FormSchema } from "./schema/index.ts";
import { HttpError } from "./http.ts";
import { admin } from "./supabase.ts";

export const SLUG = /^[a-z0-9][a-z0-9-]{2,62}$/;

export type OpenForm = {
  id: string;
  ownerId: string;
  title: string;
  schemaVersion: number;
  schema: FormSchema;
  settings: {
    /** oneResponsePerUser implies sign-in: anonymous respondents can't be deduplicated. */
    requireSignIn: boolean;
    oneResponsePerUser: boolean;
    confirmationMessage: string | null;
    notifyOwnerOnSubmission: boolean;
    notificationEmail: string | null;
    sendRespondentReceipt: boolean;
    receiptEmailFieldId: string | null;
  };
};

/** Load a form by slug and make sure it is currently accepting responses. */
export async function loadOpenForm(slug: string): Promise<OpenForm> {
  const { data, error } = await admin
    .from("forms")
    .select("id, owner_id, title, schema, schema_version, settings, status, opens_at, closes_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new HttpError(404, "form_not_found");

  const now = Date.now();
  const closed =
    data.status !== "open" ||
    (data.opens_at && Date.parse(data.opens_at) > now) ||
    (data.closes_at && Date.parse(data.closes_at) <= now);
  if (closed) throw new HttpError(403, "form_closed");

  const parsed = parseFormSchema(data.schema);
  if (!parsed.success) {
    console.error("stored form schema failed validation", data.id, parsed.issues);
    throw new HttpError(500, "form_invalid");
  }

  const s = (data.settings ?? {}) as Record<string, unknown>;
  const oneResponsePerUser = s.oneResponsePerUser === true;
  return {
    id: data.id,
    ownerId: data.owner_id,
    title: data.title || "Untitled Form",
    schemaVersion: data.schema_version,
    schema: parsed.data,
    settings: {
      requireSignIn: s.requireSignIn === true || oneResponsePerUser,
      oneResponsePerUser,
      confirmationMessage: typeof s.confirmationMessage === "string" ? s.confirmationMessage : null,
      notifyOwnerOnSubmission: s.notifyOwnerOnSubmission === true,
      notificationEmail: typeof s.notificationEmail === "string" && s.notificationEmail.trim() ? s.notificationEmail.trim() : null,
      sendRespondentReceipt: s.sendRespondentReceipt === true,
      receiptEmailFieldId: typeof s.receiptEmailFieldId === "string" ? s.receiptEmailFieldId : null,
    },
  };
}
