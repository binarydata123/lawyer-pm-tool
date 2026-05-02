import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";

interface Broadcast {
  id: string;
  name: string;
  is_member: boolean;
  created_by?: string | null;
  unread_count?: number;
}

interface NewBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBroadcastCreated?: (broadcastId: string) => void;
  isFrom?: "new" | "edit";
  broadcastInfo?: Broadcast;
}

interface WorkspaceMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  avatar_color: string | null;
}

export function NewBroadcastModal({
  isOpen,
  onClose,
  onBroadcastCreated,
  isFrom = "new",
  broadcastInfo,
}: NewBroadcastModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaces();

  useEffect(() => {
    if (!isOpen) return;

    if (isFrom === "edit" && broadcastInfo?.name) {
      setName(broadcastInfo.name);
    } else {
      setName("");
      setSelectedMemberIds(new Set());
      setSearchQuery("");
    }

    setError("");
    void loadWorkspaceMembers();
  }, [broadcastInfo, isFrom, isOpen, activeWorkspaceId]);

  const filteredMembers = members.filter(
    (member) =>
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const loadWorkspaceMembers = async () => {
    if (!activeWorkspaceId) return;
    const { data: membershipData, error: membershipError } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", activeWorkspaceId)
      .eq("is_active", true)
      .is("removed_at", null);

    if (membershipError) return;
    const memberIds = (membershipData as any[])
      .map((m) => m.user_id)
      .filter((id) => id !== user?.id);

    if (memberIds.length === 0) {
      setMembers([]);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, avatar_color")
      .in("id", memberIds);

    if (profileError) return;
    setMembers(profileData as WorkspaceMember[]);

    if (isFrom === "edit" && broadcastInfo?.id) {
      const { data: broadcastMembers } = await supabase
        .from("broadcast_members")
        .select("user_id")
        .eq("broadcast_id", broadcastInfo.id);
      if (broadcastMembers) {
        setSelectedMemberIds(
          new Set((broadcastMembers as any[]).map((m) => m.user_id)),
        );
      }
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!name.trim() && isFrom === "new") || !user) return;
    if (!activeWorkspaceId) {
      setError("Only workspace admins can create or update broadcasts.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isFrom === "new") {
        const { data: broadcast, error: broadcastError } = await supabase
          .from("broadcasts")
          .insert({
            name: name.trim(),
            created_by: user.id,
            // @ts-ignore
            workspace_id: activeWorkspaceId,
          } as any)
          .select()
          .single();

        if (broadcastError) throw broadcastError;

        const broadcastData = broadcast as { id: string } | null;
        if (!broadcastData) throw new Error("Failed to create broadcast.");

        const memberInserts = Array.from(selectedMemberIds).map((memberId) => ({
          broadcast_id: broadcastData.id,
          user_id: memberId,
          role: "member",
        }));

        memberInserts.push({
          broadcast_id: broadcastData.id,
          user_id: user.id,
          role: "admin", // Creator is admin by default
        });

        const { error: memberError } = await supabase
          .from("broadcast_members")
          .insert(memberInserts as any);

        if (memberError) throw memberError;

        onBroadcastCreated?.(broadcastData.id);
      } else {
        if (!broadcastInfo?.id) return;

        const { error: broadcastUpdateError } = await (supabase as any)
          .from("broadcasts")
          .update({
            name: name.trim(),
          })
          .eq("id", broadcastInfo.id);

        if (broadcastUpdateError) throw broadcastUpdateError;
      }

      setName("");
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
            {isFrom === "new" ? "Create a" : "Update"} Broadcast
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
              Broadcast Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing Announcements"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base sm:text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-base sm:text-sm font-semibold text-slate-700">
              Add Members
            </label>
            <div className="relative mb-3">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="memberSearch"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 text-base sm:text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="h-64 overflow-y-auto rounded-lg border border-slate-300 divide-y bg-slate-50/50">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className="flex items-center gap-3 p-3 hover:bg-white cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.has(member.id)}
                      readOnly
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />

                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white overflow-hidden"
                      style={{
                        backgroundColor: member.avatar_color || "#3178c6",
                      }}
                    >
                      {member.full_name?.charAt(0).toUpperCase() || "?"}
                      {member.avatar_url && (
                        <img
                          src={member.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {member.full_name || member.email}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                  <Search size={32} className="text-slate-200 mb-2" />
                  <p className="text-sm text-slate-500">
                    {searchQuery.trim()
                      ? `No members found matching "${searchQuery}"`
                      : "No other members available in this workspace."}
                  </p>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500 font-medium">
              {selectedMemberIds.size} member
              {selectedMemberIds.size !== 1 ? "s" : ""} selected
            </p>
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
              disabled={loading || !activeWorkspaceId}
              className="flex-1 rounded-lg bg-primary-600  px-4 py-3 text-base sm:text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : isFrom === "new"
                  ? "Create Broadcast"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
