import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ArrowRight, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FormitLogo } from "../components/FormitLogo.tsx";
import { useAuth } from "../features/auth/AuthContext.tsx";
import { acceptInvite } from "../features/collaboration/collaborationApi.ts";

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session, loading: isAuthLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    target_type: "form" | "workspace";
    target_id: string;
    role: string;
  } | null>(null);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Missing invite token");
      return acceptInvite(token);
    },
    onSuccess: (data) => {
      setSuccessInfo(data);
      setTimeout(() => {
        if (data.target_type === "form") {
          navigate(`/forms/${data.target_id}/edit`);
        } else {
          navigate("/");
        }
      }, 1500);
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : "Failed to accept invite. It may have expired or already been accepted.",
      );
    },
  });

  // Automatically attempt accept if user is authenticated and hasn't yet
  useEffect(() => {
    if (session && token && !successInfo && !error && !acceptMutation.isPending && !acceptMutation.isSuccess) {
      acceptMutation.mutate();
    }
  }, [session, token]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-sm text-neutral-500">Checking credentials...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50/70">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-neutral-200/80 text-center">
        <div className="flex justify-center mb-6">
          <FormitLogo size="md" />
        </div>

        {!session ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900">Collaboration Invitation</h1>
            <p className="text-sm text-neutral-600">
              You've been invited to collaborate on FormIT! Please sign in or create an account to accept your invitation.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to={`/login?redirect=/invite/${token}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
              >
                Sign In to Accept
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={`/signup?redirect=/invite/${token}`}
                className="w-full inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : successInfo ? (
          <div className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900">Invite Accepted!</h1>
            <p className="text-sm text-neutral-600">
              You've joined as <span className="font-semibold text-neutral-800">{successInfo.role}</span>. Redirecting to your workspace...
            </p>
            <Loader2 className="h-4 w-4 animate-spin text-neutral-400 mx-auto mt-2" />
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900">Invitation Invalid or Expired</h1>
            <p className="text-sm text-neutral-600">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-2" />
            <h1 className="text-xl font-bold text-neutral-900">Accepting Invitation...</h1>
            <p className="text-sm text-neutral-500">Adding you as collaborator...</p>
          </div>
        )}
      </div>
    </div>
  );
}
