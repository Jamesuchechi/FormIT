import { supabase } from "../../lib/supabase.ts";

export type FieldComment = {
  id: string;
  formId: string;
  fieldId: string;
  authorId: string;
  authorEmail: string;
  content: string;
  status: "open" | "resolved";
  createdAt: string;
  updatedAt: string;
};

/**
 * Fetch all comments for a form across all fields.
 */
export async function getFormComments(formId: string): Promise<FieldComment[]> {
  const { data, error } = await supabase
    .from("field_comments")
    .select("*")
    .eq("form_id", formId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch comments:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: String(row.id),
    formId: String(row.form_id),
    fieldId: String(row.field_id),
    authorId: String(row.author_id),
    authorEmail: String(row.author_email),
    content: String(row.content),
    status: row.status as "open" | "resolved",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

/**
 * Add a new comment to a specific field.
 */
export async function addFieldComment(params: {
  formId: string;
  fieldId: string;
  content: string;
}): Promise<FieldComment> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    throw new Error("You must be signed in to comment.");
  }

  const cleanContent = params.content.trim();
  if (!cleanContent) {
    throw new Error("Comment cannot be empty.");
  }

  const authorEmail = userRes.user.email || "collaborator";

  const { data, error } = await supabase
    .from("field_comments")
    .insert({
      form_id: params.formId,
      field_id: params.fieldId,
      author_id: userRes.user.id,
      author_email: authorEmail,
      content: cleanContent,
      status: "open",
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: String(data.id),
    formId: String(data.form_id),
    fieldId: String(data.field_id),
    authorId: String(data.author_id),
    authorEmail: String(data.author_email),
    content: String(data.content),
    status: data.status as "open" | "resolved",
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
  };
}

/**
 * Mark a comment as open or resolved.
 */
export async function updateFieldCommentStatus(
  commentId: string,
  status: "open" | "resolved",
): Promise<void> {
  const { error } = await supabase
    .from("field_comments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) throw error;
}

/**
 * Delete a comment.
 */
export async function deleteFieldComment(commentId: string): Promise<void> {
  const { error } = await supabase.from("field_comments").delete().eq("id", commentId);
  if (error) throw error;
}
