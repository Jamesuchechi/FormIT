import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  Crown,
  Loader2,
  Mail,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getWorkspaceMembers,
  inviteCollaborator,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceRole,
} from "../collaboration/collaborationApi.ts";

interface WorkspaceMembersModalProps {
  workspace: Workspace;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspaceMembersModal({
  workspace,
  isOpen,
  onClose,
}: WorkspaceMembersModalProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["workspace-members", workspace.id],
    queryFn: () => getWorkspaceMembers(workspace.id),
    enabled: isOpen,
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      inviteCollaborator({
        targetType: "workspace",
        targetId: workspace.id,
        email: email.trim().toLowerCase(),
        role,
      }),
    onSuccess: (inv) => {
      setEmail("");
      setError(null);
      const url = `${window.location.origin}/invite/${inv.token}`;
      setGeneratedLink(url);
      queryClient.invalidateQueries({ queryKey: ["workspace-members", workspace.id] });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    },
  });

  if (!isOpen) return null;

  const canManage =
    workspace.currentUserRole === "owner" || workspace.currentUserRole === "admin";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-members-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 id="workspace-members-title" className="text-base font-bold text-neutral-900">
                Workspace Members
              </h2>
              <p className="text-xs text-neutral-500">{workspace.name}</p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Invite Box */}
          {canManage ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 space-y-3">
              <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Invite Teammate
              </span>
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
                    placeholder="teammate@company.com"
                    className="w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "admin" | "member")}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending || !email.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
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

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {generatedLink && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-800">
                  <div className="flex items-center gap-2 truncate">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium">Invite generated! Share with your teammate:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
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
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
              You are a member of this workspace. Only workspace admins can invite new teammates.
            </div>
          )}

          {/* Members List */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
              Workspace Teammates ({members.length})
            </h3>
            {isLoading ? (
              <div className="flex items-center justify-center p-6 text-neutral-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs">
                {members.map((m: WorkspaceMember) => (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-xs flex-shrink-0">
                        {m.email ? m.email.slice(0, 2).toUpperCase() : "WS"}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-neutral-900 truncate block">
                          {m.email}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          Joined {new Date(m.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {m.role === "owner" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          <Crown className="h-3 w-3" />
                          <span>Owner</span>
                        </span>
                      ) : m.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                          <Shield className="h-3 w-3" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                          Member
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-6 py-3.5 bg-neutral-50/50 flex justify-end">
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
