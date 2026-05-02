import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";
import { isOnline } from "../utils/isOnline";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  avatar_color: string | null;
  is_signedin: boolean;
  last_seen: string;
}

interface NewDMModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDMCreated: (dmId: string, otherUserId: string) => void;
}

export function NewDMModal({ isOpen, onClose, onDMCreated }: NewDMModalProps) {
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaces();

  useEffect(() => {
    if (!isOpen) {
      setFilteredUsers([]);
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 2) {
      void loadWorkspaceUsers();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void searchUsers(trimmedQuery);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeWorkspaceId, isOpen, searchQuery, user?.id]);

  const loadWorkspaceUsers = async () => {
    if (!user || !activeWorkspaceId) return;

    const { data: memberships, error: membershipsError } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", activeWorkspaceId)
      .eq("is_active", true)
      .neq("user_id", user.id)
      .limit(50);

    if (membershipsError) return;

    const memberIds = ((memberships as Array<{ user_id: string }> | null) ?? [])
      .map((membership) => membership.user_id)
      .filter(Boolean);

    if (memberIds.length === 0) {
      setFilteredUsers([]);
      return;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, avatar_url, avatar_color, is_signedin, last_seen",
      )
      .in("id", memberIds)
      .order("full_name")
      .limit(50);

    if (profilesError) return;

    setFilteredUsers((profiles as Profile[] | null) ?? []);
  };

  const searchUsers = async (query: string) => {
    if (!user || !activeWorkspaceId) return;

    const { data: profileMatches, error: profilesError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, avatar_url, avatar_color, is_signedin, last_seen",
      )
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .neq("id", user.id)
      .order("full_name")
      .limit(25);

    if (profilesError) return;

    const matchedProfiles = (profileMatches as Profile[] | null) ?? [];
    const matchedIds = matchedProfiles.map((profile) => profile.id);

    if (matchedIds.length === 0) {
      setFilteredUsers([]);
      return;
    }

    const { data: memberships, error: membershipsError } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", activeWorkspaceId)
      .eq("is_active", true)
      .in("user_id", matchedIds);

    if (membershipsError) return;

    const activeMemberIds = new Set(
      ((memberships as Array<{ user_id: string }> | null) ?? []).map(
        (membership) => membership.user_id,
      ),
    );
    const nextUsers = matchedProfiles.filter((profile) =>
      activeMemberIds.has(profile.id),
    );

    setFilteredUsers(nextUsers);
  };

  const handleSelectUser = async (otherUserId: string) => {
    if (!user || !activeWorkspaceId) return;
    setLoading(true);

    try {
      const [userId1, userId2] = [user.id, otherUserId].sort();

      const { data: existingDM } = await supabase
        .from("direct_messages")
        .select("id")
        .eq("workspace_id", activeWorkspaceId)
        .eq("user1_id", userId1)
        .eq("user2_id", userId2)
        .maybeSingle();

      if (existingDM) {
        const dmData = existingDM as any;
        onDMCreated(dmData.id, otherUserId);
      } else {
        const { data: newDM, error } = await supabase
          .from("direct_messages")
          .insert({
            workspace_id: activeWorkspaceId,
            user1_id: userId1,
            user2_id: userId2,
          } as any)
          .select()
          .single();

        if (error) throw error;

        if (newDM) {
          const dmData = newDM as any;
          onDMCreated(dmData.id, otherUserId);
        }
      }

      setSearchQuery("");
      onClose();
    } catch (err) {
      console.error("Error creating DM:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Start a Direct Message
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-4">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {searchQuery.trim().length < 2
                  ? "No people available"
                  : "No users found"}
              </div>
            ) : (
              filteredUsers.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelectUser(profile.id)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <div className="relative">
                    <div
                      className="relative w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden text-white font-semibold"
                      style={{
                        backgroundColor: profile.avatar_color || "#3178c6",
                      }}
                    >
                      {(profile.full_name || profile.email)[0].toUpperCase()}
                      {profile.avatar_url && (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || profile.email}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>
                    {isOnline(profile.is_signedin, profile.last_seen) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-slate-900">
                      {profile.full_name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {profile.email}
                    </div>
                  </div>
                  {isOnline(profile.is_signedin, profile.last_seen) && (
                    <span className="text-xs text-green-600 font-medium">
                      Active
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
