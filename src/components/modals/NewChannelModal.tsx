import { useEffect, useState } from "react";
import { X, Hash, Lock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";

interface NewChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated?: (channelId: string, isPrivate: boolean) => void;
  isFrom?: "new" | "edit";
  channelInfo?: {
    id: string;
    name: string;
    is_private: boolean;
    is_member: boolean;
    unread_count?: number;
  };
}

export function NewChannelModal({
  isOpen,
  onClose,
  onChannelCreated,
  isFrom = "new",
  channelInfo,
}: NewChannelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const { activeWorkspaceId, canManageWorkspace } = useWorkspaces();

  useEffect(() => {
    if (!isOpen) return;

    if (isFrom === "edit" && channelInfo?.name) {
      setName(channelInfo.name);
      setIsPrivate(channelInfo.is_private);
    } else {
      setName("");
      setDescription("");
      setIsPrivate(false);
    }

    setError("");
  }, [channelInfo, isFrom, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!name.trim() && isFrom === "new") || !user) return;
    if (!canManageWorkspace || !activeWorkspaceId) {
      setError("Only workspace admins can create or update channels.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isFrom === "new") {
        const { data: channel, error: channelError } = await supabase
          .from("channels")
          .insert({
            name: name.trim(),
            description: description.trim(),
            is_private: isPrivate,
            created_by: user.id,
            workspace_id: activeWorkspaceId,
          } as any)
          .select()
          .single();

        if (channelError) throw channelError;

        const channelData = channel as { id: string } | null;
        if (!channelData) throw new Error("Failed to create channel.");

        const { error: memberError } = await supabase
          .from("channel_members")
          .insert({
            channel_id: channelData.id,
            user_id: user.id,
            role: "admin",
          } as any);

        if (memberError) throw memberError;

        onChannelCreated?.(channelData.id, isPrivate);
      } else {
        if (!channelInfo?.id) return;

        const { error: channelError } = await (supabase as any)
          .from("channels")
          .update({
            name: name.trim(),
            is_private: isPrivate,
          })
          .eq("id", channelInfo.id);

        if (channelError) throw channelError;
      }

      setName("");
      setDescription("");
      setIsPrivate(false);
      onClose();
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
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {isFrom === "new" ? "Create a" : "Update"} Channel
          </h2>
          <button
            onClick={onClose}
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
            <label
              htmlFor="name"
              className="mb-2 block text-base sm:text-sm font-semibold text-slate-700"
            >
              Channel Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., team-updates"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base sm:text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500"
              required
              autoFocus
            />
            <p className="mt-1 text-sm sm:text-xs text-slate-500">
              Use lowercase letters, numbers, and hyphens
            </p>
          </div>

          <div>
            <label className="mb-3 block text-base sm:text-sm font-semibold text-slate-700">
              Channel Type
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  !isPrivate
                    ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-500/10"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 dark:bg-slate-900/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Hash
                    size={20}
                    className={
                      !isPrivate
                        ? "text-primary-600 dark:text-primary-300"
                        : "text-slate-600 dark:text-slate-400"
                    }
                  />
                  <div className="flex-1">
                    <div className="text-base sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Public
                    </div>
                    <div className="text-sm sm:text-xs text-slate-600 dark:text-slate-400">
                      Visible to everyone in this workspace
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  isPrivate
                    ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-500/10"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 dark:bg-slate-900/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Lock
                    size={20}
                    className={
                      isPrivate
                        ? "text-primary-600 dark:text-primary-300"
                        : "text-slate-600 dark:text-slate-400"
                    }
                  />
                  <div className="flex-1">
                    <div className="text-base sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Private
                    </div>
                    <div className="text-sm sm:text-xs text-slate-600 dark:text-slate-400">
                      Only users you explicitly add can access
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-base sm:text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-2 lg:px-4 py-1 lg:py-3 text-base sm:text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !canManageWorkspace || !activeWorkspaceId}
              className="flex-1 rounded-lg bg-primary-600  px-4 py-3 text-base sm:text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : isFrom === "new"
                  ? "Create Channel"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
