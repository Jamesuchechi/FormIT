import { newId, type Field, type FieldOption } from "@formit/schema";
import { supabase } from "../../lib/supabase.ts";

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type FieldTemplate = DistributiveOmit<Field, "id">;

export type SavedQuestion = {
  id: string;
  ownerId: string;
  title: string;
  category: string;
  fieldDefinition: FieldTemplate;
  createdAt: string;
  updatedAt: string;
};

/**
 * Given a field definition template, produce a new Field object ready to be added to a form,
 * generating fresh unique IDs for the field and any options.
 */
export function instantiateQuestion(template: FieldTemplate): Field {
  const fieldId = newId("f");

  // If the field has choice options, generate fresh option IDs so they don't collide
  if ("options" in template && Array.isArray((template as { options: FieldOption[] }).options)) {
    const rawOptions = (template as { options: FieldOption[] }).options;
    const freshOptions: FieldOption[] = rawOptions.map((opt) => ({
      ...opt,
      id: newId("opt"),
    }));

    return {
      ...(template as unknown as Field),
      id: fieldId,
      options: freshOptions,
    } as Field;
  }

  return {
    ...(template as unknown as Field),
    id: fieldId,
  } as Field;
}

/**
 * Fetch all saved questions belonging to the current user.
 */
export async function getSavedQuestions(): Promise<SavedQuestion[]> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return [];

  const { data, error } = await supabase
    .from("saved_questions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load saved questions:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: String(row.id),
    ownerId: String(row.owner_id),
    title: String(row.title),
    category: String(row.category || "General"),
    fieldDefinition: row.field_definition as unknown as FieldTemplate,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

/**
 * Save a field definition to the current user's Question Bank.
 */
export async function saveQuestionToBank(params: {
  title: string;
  category?: string;
  field: Field;
}): Promise<SavedQuestion> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    throw new Error("You must be signed in to save questions to your Question Bank.");
  }

  const { id: _discardId, ...definitionWithoutId } = params.field;
  const title = params.title.trim() || params.field.label || "Untitled Question";
  const category = (params.category || "General").trim();

  const { data, error } = await supabase
    .from("saved_questions")
    .insert({
      owner_id: userRes.user.id,
      title,
      category,
      field_definition: definitionWithoutId,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: String(data.id),
    ownerId: String(data.owner_id),
    title: String(data.title),
    category: String(data.category),
    fieldDefinition: data.field_definition as unknown as FieldTemplate,
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
  };
}

/**
 * Delete a saved question from the current user's Question Bank.
 */
export async function deleteSavedQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("saved_questions").delete().eq("id", id);
  if (error) throw error;
}
