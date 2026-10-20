import { supabase } from "../../lib/supabase.ts";

const key = (slug: string, version: number) => `formit:draft:${slug}:v${version}`;

/** Drafts live in localStorage. Every access is guarded: storage can be disabled or full. */
export function loadLocalDraft(slug: string, version: number): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key(slug, version));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export const loadDraft = loadLocalDraft;

/** Fetch remote draft from Supabase for authenticated respondents. */
export async function loadRemoteDraft(
  formId: string,
  version: number,
): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase
      .from("response_drafts")
      .select("answers, schema_version")
      .eq("form_id", formId)
      .maybeSingle();

    if (error || !data) return null;
    if (data.schema_version !== version) return null;
    return typeof data.answers === "object" && data.answers !== null
      ? (data.answers as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function saveLocalDraft(
  slug: string,
  version: number,
  answers: Record<string, unknown>,
): void {
  try {
    if (Object.keys(answers).length === 0) localStorage.removeItem(key(slug, version));
    else localStorage.setItem(key(slug, version), JSON.stringify(answers));
  } catch {
    /* ignore: drafts are best-effort */
  }
}

export function saveDraft(
  slug: string,
  version: number,
  answers: Record<string, unknown>,
  options?: { formId?: string; userId?: string },
): void {
  saveLocalDraft(slug, version, answers);

  if (options?.formId && options?.userId) {
    void supabase
      .from("response_drafts")
      .upsert({
        form_id: options.formId,
        respondent_id: options.userId,
        schema_version: version,
        answers,
        updated_at: new Date().toISOString(),
      })
      .then();
  }
}

export function clearDraft(
  slug: string,
  version: number,
  options?: { formId?: string; userId?: string },
): void {
  try {
    localStorage.removeItem(key(slug, version));
  } catch {
    /* ignore */
  }

  if (options?.formId && options?.userId) {
    void supabase
      .from("response_drafts")
      .delete()
      .eq("form_id", options.formId)
      .eq("respondent_id", options.userId)
      .then();
  }
}
