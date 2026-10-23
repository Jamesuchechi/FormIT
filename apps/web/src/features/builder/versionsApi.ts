import { parseFormSchema, type FormSchema } from "@formit/schema";
import { supabase } from "../../lib/supabase.ts";

export type FormVersionHistoryItem = {
  version: number;
  schema: FormSchema;
  label: string | null;
  createdBy: string | null;
  createdAt: string;
};

/**
 * Fetch the chronological version history of a form, newest first.
 */
export async function getFormVersionHistory(formId: string): Promise<FormVersionHistoryItem[]> {
  const { data, error } = await supabase
    .from("form_versions")
    .select("version, schema, label, created_by, created_at")
    .eq("form_id", formId)
    .order("version", { ascending: false });

  if (error) {
    console.error("Failed to load version history:", error);
    return [];
  }

  const items: FormVersionHistoryItem[] = [];
  for (const row of data || []) {
    const parsed = parseFormSchema(row.schema);
    if (parsed.success) {
      items.push({
        version: Number(row.version),
        schema: parsed.data,
        label: (row.label as string | null) ?? null,
        createdBy: (row.created_by as string | null) ?? null,
        createdAt: String(row.created_at),
      });
    }
  }

  return items;
}

/**
 * Explicitly create a named snapshot checkpoint of current form schema.
 */
export async function createVersionSnapshot(formId: string, label?: string): Promise<number> {
  const { data, error } = await supabase.rpc("create_form_version_snapshot", {
    p_form_id: formId,
    p_label: label?.trim() || null,
  });

  if (error) throw error;
  return Number(data);
}

/**
 * Restore a historic version of a form schema.
 */
export async function restoreFormVersion(formId: string, version: number): Promise<FormSchema> {
  const { data, error } = await supabase.rpc("restore_form_version", {
    p_form_id: formId,
    p_version: version,
  });

  if (error) throw error;

  const parsed = parseFormSchema(data);
  if (!parsed.success) {
    throw new Error("Restored version has invalid schema format.");
  }

  return parsed.data;
}
