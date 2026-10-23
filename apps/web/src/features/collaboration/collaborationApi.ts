import { supabase } from "../../lib/supabase.ts";

export type CollaboratorRole = "editor" | "viewer";
export type WorkspaceRole = "owner" | "admin" | "member";

export type FormCollaborator = {
  id: string;
  formId: string;
  userId: string;
  email: string;
  role: CollaboratorRole;
  createdAt: string;
};

export type CollaboratorInvite = {
  id: string;
  email: string;
  targetType: "form" | "workspace";
  targetId: string;
  role: string;
  token: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  createdAt: string;
  expiresAt: string;
};

export type Workspace = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  currentUserRole?: WorkspaceRole;
};

export type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/* Workspaces API                                                     */
/* ------------------------------------------------------------------ */

/**
 * Fetch all workspaces the current user belongs to.
 */
export async function getWorkspaces(): Promise<Workspace[]> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return [];

  const { data, error } = await supabase
    .from("workspaces")
    .select("*, workspace_members(role)")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch workspaces:", error);
    return [];
  }

  const rows = (data || []) as unknown as Array<
    Record<string, unknown> & {
      workspace_members?: Array<{ role: WorkspaceRole }>;
    }
  >;

  return rows.map((row) => ({
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name),
    slug: String(row.slug),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    currentUserRole:
      row.owner_id === userRes.user?.id
        ? "owner"
        : row.workspace_members?.[0]?.role ?? "member",
  }));
}

/**
 * Create a new workspace and automatically become its owner.
 */
export async function createWorkspace(params: {
  name: string;
  slug?: string;
}): Promise<Workspace> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    throw new Error("You must be signed in to create a workspace.");
  }

  const name = params.name.trim();
  if (!name) throw new Error("Workspace name is required.");

  const generatedSlug = (
    params.slug ||
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) ||
    `ws-${crypto.randomUUID().slice(0, 8)}`
  );

  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      owner_id: userRes.user.id,
      name,
      slug: generatedSlug,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: String(data.id),
    ownerId: String(data.owner_id),
    name: String(data.name),
    slug: String(data.slug),
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
    currentUserRole: "owner",
  };
}

/**
 * Fetch members of a workspace.
 */
export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase.rpc("get_workspace_members", {
    p_workspace_id: workspaceId,
  });

  if (error) {
    console.error("Failed to load workspace members:", error);
    return [];
  }

  return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
    workspaceId: String(row.workspace_id),
    userId: String(row.user_id),
    email: String(row.email),
    role: row.role as WorkspaceRole,
    createdAt: String(row.created_at),
  }));
}

/* ------------------------------------------------------------------ */
/* Form Collaborators API                                             */
/* ------------------------------------------------------------------ */

/**
 * Fetch all collaborators for a form.
 */
export async function getFormCollaborators(formId: string): Promise<FormCollaborator[]> {
  const { data, error } = await supabase.rpc("get_form_collaborators", {
    p_form_id: formId,
  });

  if (error) {
    // If RPC is unavailable (e.g. mock test or client query fallback), query table
    const { data: fallback, error: fbError } = await supabase
      .from("form_collaborators")
      .select("*")
      .eq("form_id", formId);

    if (fbError) return [];
    return ((fallback || []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      formId: String(r.form_id),
      userId: String(r.user_id),
      email: "collaborator",
      role: r.role as CollaboratorRole,
      createdAt: String(r.created_at),
    }));
  }

  return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    formId: formId,
    userId: String(row.user_id),
    email: String(row.email),
    role: row.role as CollaboratorRole,
    createdAt: String(row.created_at),
  }));
}

/**
 * Fetch active pending invites for a form.
 */
export async function getFormInvites(formId: string): Promise<CollaboratorInvite[]> {
  const { data, error } = await supabase.rpc("get_form_invites", {
    p_form_id: formId,
  });

  if (error) {
    const { data: fallback, error: fbError } = await supabase
      .from("collaborator_invites")
      .select("*")
      .eq("target_type", "form")
      .eq("target_id", formId)
      .eq("status", "pending");

    if (fbError) return [];
    return ((fallback || []) as Array<Record<string, unknown>>).map((r) => ({
      id: String(r.id),
      email: String(r.email),
      targetType: "form",
      targetId: formId,
      role: String(r.role),
      token: String(r.token),
      status: "pending",
      createdAt: String(r.created_at),
      expiresAt: String(r.expires_at),
    }));
  }

  return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    email: String(row.email),
    targetType: "form",
    targetId: formId,
    role: String(row.role),
    token: String(row.token),
    status: (row.status as CollaboratorInvite["status"]) || "pending",
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
  }));
}

/**
 * Invite a collaborator by email with a role ('editor' or 'viewer').
 */
export async function inviteCollaborator(params: {
  targetType: "form" | "workspace";
  targetId: string;
  email: string;
  role: "editor" | "viewer" | "admin" | "member";
}): Promise<CollaboratorInvite> {
  const { data, error } = await supabase.rpc("create_invite", {
    p_target_type: params.targetType,
    p_target_id: params.targetId,
    p_email: params.email.trim().toLowerCase(),
    p_role: params.role,
  });

  if (error) throw error;

  return {
    id: String(data.id),
    email: String(data.email),
    targetType: data.target_type as "form" | "workspace",
    targetId: String(data.target_id),
    role: String(data.role),
    token: String(data.token),
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: String(data.expires_at),
  };
}

/**
 * Update an existing collaborator's role.
 */
export async function updateCollaboratorRole(
  collaboratorId: string,
  role: CollaboratorRole,
): Promise<void> {
  const { error } = await supabase
    .from("form_collaborators")
    .update({ role })
    .eq("id", collaboratorId);

  if (error) throw error;
}

/**
 * Remove a collaborator from a form.
 */
export async function removeCollaborator(collaboratorId: string): Promise<void> {
  const { error } = await supabase
    .from("form_collaborators")
    .delete()
    .eq("id", collaboratorId);

  if (error) throw error;
}

/**
 * Revoke a pending invite.
 */
export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from("collaborator_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId);

  if (error) throw error;
}

/**
 * Accept an invite using its invite token.
 */
export async function acceptInvite(token: string): Promise<{
  ok: boolean;
  target_type: "form" | "workspace";
  target_id: string;
  role: string;
}> {
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) throw error;
  return data as {
    ok: boolean;
    target_type: "form" | "workspace";
    target_id: string;
    role: string;
  };
}

/**
 * Get current user's effective role on a form ('owner' | 'editor' | 'viewer' | null).
 */
export async function getUserFormRole(formId: string): Promise<"owner" | "editor" | "viewer" | null> {
  const { data, error } = await supabase.rpc("get_user_form_role", { p_form_id: formId });
  if (error) return null;
  return (data as "owner" | "editor" | "viewer") || null;
}
