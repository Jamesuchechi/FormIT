import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Copy,
  Crown,
  Eye,
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getFormCollaborators,
  getFormInvites,
  inviteCollaborator,
  removeCollaborator,
  revokeInvite,
  updateCollaboratorRole,
  type CollaboratorInvite,
  type CollaboratorRole,
  type FormCollaborator,
} from "./collaborationApi.ts";

interface CollaboratorsModalProps {
  formId: string;
  formTitle: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: "owner" | "editor" | "viewer";
}

export function CollaboratorsModal({
  formId,
  formTitle,
  isOpen,
  onClose,
  currentUserRole = "owner",
}: CollaboratorsModalProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("editor");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [justInvitedLink, setJustInvitedLink] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Collaborators query
  const { data: collaborators = [], isLoading: isLoadingCollabs } = useQuery({
    queryKey: ["form-collaborators", formId],
    queryFn: () => getFormCollaborators(formId),
    enabled: isOpen,
  });

  // Invites query
  const { data: invites = [], isLoading: isLoadingInvites } = useQuery({
    queryKey: ["form-invites", formId],
    queryFn: () => getFormInvites(formId),
    enabled: isOpen && currentUserRole === "owner",
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      setJustInvitedLink(null);
      return inviteCollaborator({
        targetType: "form",
        targetId: formId,
        email,
        role,
      });
    },
    onSuccess: (invite) => {
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["form-invites", formId] });
      const inviteUrl = `${window.location.origin}/invite/${invite.token}`;
      setJustInvitedLink(inviteUrl);
    },
    onError: (err: unknown) => {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create invite");
    },
  });

  // Remove collaborator mutation
  const removeMutation = useMutation({
    mutationFn: (collabId: string) => removeCollaborator(collabId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-collaborators", formId] });
    },
  });

  // Change role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, newRole }: { id: string; newRole: CollaboratorRole }) =>
      updateCollaboratorRole(id, newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-collaborators", formId] });
    },
  });

  // Revoke invite mutation
  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => revokeInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-invites", formId] });
    },
  });

  async function handleCopy(token: string) {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // fallback
    }
  }

  if (!isOpen) return null;

  const isOwner = currentUserRole === "owner";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="collaborators-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4.5 bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 id="collaborators-modal-title" className="text-base font-bold text-neutral-900">
                Collaborate on Form
              </h2>
              <p className="text-xs text-neutral-500 truncate max-w-xs sm:max-w-md">
                {formTitle || "Untitled Form"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Invite Section (Owner only) */}
          {isOwner ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Invite by Email
              </label>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) inviteMutation.mutate();
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as CollaboratorRole)}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="editor">Editor (Can edit)</option>
                    <option value="viewer">Viewer (Read-only)</option>
                  </select>

                  <button
                    type="submit"
                    disabled={inviteMutation.isPending || !email.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                  >
                    {inviteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    <span>Invite</span>
                  </button>
                </div>
              </form>

              {errorMessage && (
                <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Just invited link notification */}
              {justInvitedLink && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800">
                  <div className="flex items-center gap-2 truncate">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium">Invite generated! Share this link:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(justInvitedLink);
                      setCopiedToken("just_invited");
                      setTimeout(() => setCopiedToken(null), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-md bg-white border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    {copiedToken === "just_invited" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-xs text-neutral-600 flex items-center gap-2">
              <Eye className="h-4 w-4 text-neutral-500 flex-shrink-0" />
              <span>You have {currentUserRole} access to this form. Only owners can invite or remove collaborators.</span>
            </div>
          )}

          {/* Active Collaborators */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3 flex items-center justify-between">
              <span>Active Collaborators</span>
              <span className="text-neutral-400 font-normal">
                {isLoadingCollabs ? "Loading..." : `${collaborators.length + 1} member${collaborators.length > 0 ? "s" : ""}`}
              </span>
            </h3>

            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs">
              {/* Owner Item */}
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-50/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-semibold text-xs flex-shrink-0">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900 truncate">Form Owner</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Owner
                      </span>
                    </div>
                    <span className="text-xs text-neutral-400">Full administrative control</span>
                  </div>
                </div>
              </div>

              {/* Collaborators */}
              {collaborators.map((c: FormCollaborator) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex-shrink-0">
                      {c.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-neutral-900 truncate block">
                        {c.email}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Joined {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isOwner ? (
                      <select
                        value={c.role}
                        onChange={(e) =>
                          updateRoleMutation.mutate({
                            id: c.id,
                            newRole: e.target.value as CollaboratorRole,
                          })
                        }
                        className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 shadow-2xs focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          c.role === "editor"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {c.role === "editor" ? "Editor" : "Viewer"}
                      </span>
                    )}

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remove ${c.email} from collaborators?`)) {
                            removeMutation.mutate(c.id);
                          }
                        }}
                        className="rounded-md p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove collaborator"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invites (Owner only) */}
          {isOwner && invites.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                Pending Invites ({invites.length})
              </h3>

              <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs">
                {invites.map((inv: CollaboratorInvite) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between px-4 py-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900 truncate">{inv.email}</span>
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                          {inv.role}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(inv.token)}
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        {copiedToken === inv.token ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy link</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => revokeMutation.mutate(inv.id)}
                        className="rounded-md p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Revoke invite"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-6 py-3.5 bg-neutral-50/50 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {isOwner
              ? "Editors can modify fields and sections. Viewers can only view."
              : "Contact the owner to change permissions."}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-neutral-200/80 px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-300 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
