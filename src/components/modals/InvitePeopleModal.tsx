import { useEffect, useState } from "react";
import { MailPlus, Trash2, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";
import { parseInviteEmails } from "../../lib/text";

interface InvitePeopleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminInviteRow {
  id: string;
  workspace_id: string;
  invited_email: string;
  accepted_at: string | null;
  created_at: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function InvitePeopleModal({ isOpen, onClose }: InvitePeopleModalProps) {
  const [inviteEmails, setInviteEmails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [inviteRows, setInviteRows] = useState<AdminInviteRow[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeWorkspaceId, activeWorkspace, canManageWorkspace } =
    useWorkspaces();

  const resetModalState = () => {
    setInviteEmails("");
    setLoading(false);
    setError(null);
    setSuccessMessage(null);
  };

  const loadInviteRows = async () => {
    if (!user || !activeWorkspaceId || !canManageWorkspace) {
      setInviteRows([]);
      return;
    }

    setLoadingInvites(true);
    const { data, error } = await supabase
      .from("workspace_invites")
      .select("id, workspace_id, invited_email, accepted_at, created_at")
      .eq("workspace_id", activeWorkspaceId)
      .eq("invited_by", user.id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    setLoadingInvites(false);

    if (error) {
      setError(error.message);
      return;
    }

    const latestInvitesByEmail = new Map<string, AdminInviteRow>();

    ((data as AdminInviteRow[] | null) ?? []).forEach((invite) => {
      const emailKey = invite.invited_email.toLowerCase();
      const currentInvite = latestInvitesByEmail.get(emailKey);

      if (
        !currentInvite ||
        new Date(invite.created_at).getTime() >
          new Date(currentInvite.created_at).getTime()
      ) {
        latestInvitesByEmail.set(emailKey, invite);
      }
    });

    setInviteRows(Array.from(latestInvitesByEmail.values()));
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const handleDeletePendingInvite = async (inviteId: string) => {
    if (!user) return;

    setDeletingInviteId(inviteId);
    setError(null);
    setSuccessMessage(null);

    const { error } = await supabase
      .from("workspace_invites")
      .delete()
      .eq("id", inviteId)
      .eq("invited_by", user.id)
      .eq("workspace_id", activeWorkspaceId ?? "")
      .is("accepted_at", null);

    setDeletingInviteId(null);

    if (error) {
      setError(error.message);
      return;
    }

    setInviteRows((current) =>
      current.filter((invite) => invite.id !== inviteId),
    );
    setSuccessMessage("Pending invite deleted.");
  };

  useEffect(() => {
    if (!isOpen) {
      resetModalState();
      return;
    }

    void loadInviteRows();
  }, [activeWorkspaceId, canManageWorkspace, isOpen, user?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;
    if (!activeWorkspaceId || !activeWorkspace) {
      setError("Select a workspace before inviting people.");
      return;
    }

    if (!canManageWorkspace) {
      setError("Only workspace admins can invite people.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const normalizedEmails = parseInviteEmails(inviteEmails).filter(
        (email) => email !== user.email?.toLowerCase(),
      );

      if (normalizedEmails.length === 0) {
        throw new Error("Enter at least one valid email address.");
      }

      const { data: pendingInvites, error: pendingInvitesError } =
        await supabase
          .from("workspace_invites")
          .select("invited_email")
          .eq("workspace_id", activeWorkspaceId)
          .eq("invited_by", user.id)
          .is("accepted_at", null);

      if (pendingInvitesError) throw pendingInvitesError;

      const alreadyPendingEmails = Array.from(
        new Set(
          ((pendingInvites as Array<{ invited_email: string }> | null) ?? [])
            .map((invite) => invite.invited_email.toLowerCase())
            .filter((email) => normalizedEmails.includes(email))
            .filter(Boolean),
        ),
      );

      if (alreadyPendingEmails.length > 0) {
        throw new Error(
          `An invite has already been sent to this user${
            alreadyPendingEmails.length > 1 ? "s" : ""
          }: ${alreadyPendingEmails.join(
            ", ",
          )}. If you want to send it again, delete the old pending invite first.`,
        );
      }

      const { data: existingProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email")
        .in("email", normalizedEmails);

      if (profilesError) throw profilesError;

      const existingProfileRows =
        (existingProfiles as Array<{
          id: string;
          email: string;
        }> | null) ?? [];

      const existingUserIds = existingProfileRows.map(
        (profileRow) => profileRow.id,
      );
      const { data: existingMemberships, error: existingMembershipsError } =
        existingUserIds.length > 0
          ? await supabase
              .from("workspace_members")
              .select("user_id")
              .eq("workspace_id", activeWorkspaceId)
              .in("user_id", existingUserIds)
          : { data: [], error: null };

      if (existingMembershipsError) throw existingMembershipsError;

      const existingEmailSet = new Set(
        ((existingMemberships as Array<{ user_id: string }> | null) ?? [])
          .map((membershipRow) =>
            existingProfileRows
              .find((profileRow) => profileRow.id === membershipRow.user_id)
              ?.email?.toLowerCase(),
          )
          .filter(Boolean) as string[],
      );

      const emailsToInvite = normalizedEmails.filter(
        (email) => !existingEmailSet.has(email),
      );

      if (emailsToInvite.length === 0) {
        throw new Error(
          "All entered users are already members of this workspace.",
        );
      }

      const inviteRows = emailsToInvite.map((email) => ({
        workspace_id: activeWorkspaceId,
        invited_email: email,
        invited_by: user.id,
        invited_by_name:
          user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin",
        workspace_name: activeWorkspace.name,
        invite_token: crypto.randomUUID(),
      }));

      const { data, error } = await supabase
        .from("workspace_invites")
        .insert(inviteRows as any)
        .select("invite_token");

      if (error) throw error;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session expired. Please sign in again and retry.",
        );
      }

      const { data: refreshedSession, error: refreshError } =
        await supabase.auth.refreshSession();

      if (refreshError || !refreshedSession.session) {
        throw new Error("Session refresh failed");
      }

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase environment variables.");
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-admin-user-invites`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            "x-user-jwt": refreshedSession.session.access_token,
          },
          body: JSON.stringify({
            inviteTokens: (
              (data as Array<{ invite_token: string }> | null) ?? []
            ).map((invite) => invite.invite_token),
            appBaseUrl: window.location.origin,
          }),
        },
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const failureDetails = Array.isArray(errorPayload?.failures)
          ? ` ${errorPayload.failures
              .map(
                (failure: { email: string; error: string }) =>
                  `${failure.email}: ${failure.error}`,
              )
              .join("; ")}`
          : "";
        throw new Error(
          (errorPayload?.error
            ? `${errorPayload.error}${failureDetails}`
            : null) ||
            errorPayload?.message ||
            "Failed to send invite emails.",
        );
      }

      setSuccessMessage(
        `Invite sent to ${emailsToInvite.length} ${
          emailsToInvite.length === 1 ? "person" : "people"
        }.`,
      );
      setInviteEmails("");
      await loadInviteRows();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="mx-4 w-full max-w-lg animate-slide-in rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-3 lg:p-6">
          <h2 className="text-xl font-bold text-slate-900">Invite People</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 transition-colors hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 lg:space-y-5 lg:p-6 p-3"
        >
          <div>
            <div className="mb-3 flex items-center gap-2">
              <MailPlus size={16} className="text-slate-500" />
              <label
                htmlFor="inviteEmails"
                className="block text-sm font-semibold text-slate-700"
              >
                Add Members
              </label>
            </div>
            <textarea
              id="inviteEmails"
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              rows={5}
              placeholder="one@example.com, two@example.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              Invited users will join{" "}
              <strong>{activeWorkspace?.name ?? "this workspace"}</strong>{" "}
              without affecting their memberships in other workspaces.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canManageWorkspace || !activeWorkspaceId}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Invites"}
            </button>
          </div>
        </form>

        <div className="border-t border-slate-200 p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Invited people
            </h3>
            <button
              type="button"
              onClick={() => void loadInviteRows()}
              disabled={loadingInvites || !canManageWorkspace}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
            {loadingInvites ? (
              <div className="px-4 py-5 text-center text-sm text-slate-500">
                Loading invites...
              </div>
            ) : inviteRows.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {inviteRows
                  .filter((invite) => !invite.accepted_at)
                  .map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between gap-3 bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {invite.invited_email}
                        </p>
                        <p className="text-xs text-slate-500">
                          Invited{" "}
                          {new Date(invite.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            invite.accepted_at
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          Pending
                        </span>
                        {!invite.accepted_at && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleDeletePendingInvite(invite.id)
                            }
                            disabled={deletingInviteId === invite.id}
                            title="Delete invite"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="px-4 py-5 text-center text-sm text-slate-500">
                No invites sent yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
