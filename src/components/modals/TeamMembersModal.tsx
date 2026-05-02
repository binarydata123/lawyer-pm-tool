import { useState, useEffect, useMemo } from "react";
import {
  X,
  UserPlus,
  Crown,
  Lock,
  Hash,
  LogOut,
  UserMinus,
  Megaphone,
  Search,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";
import { isOnline } from "../utils/isOnline";

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  avatar_color: string | null;
  is_signedin: boolean;
  last_seen: string;
  created_at: string;
}

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId?: string;
  broadcastId?: string;
  onChannelLeft?: () => void;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function TeamMembersModal({
  isOpen,
  onClose,
  channelId,
  broadcastId,
  onChannelLeft,
}: TeamMembersModalProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [savingInvite, setSavingInvite] = useState(false);
  const [manualInviteEmails, setManualInviteEmails] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [activeActionUserId, setActiveActionUserId] = useState<string | null>(
    null,
  );
  const [channelCreatedBy, setChannelCreatedBy] = useState<string | null>(null);
  const [channelName, setChannelName] = useState("");
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [broadcastName, setBroadcastName] = useState<string | null>(null);
  const [broadcastCreatedBy, setBroadcastCreatedBy] = useState<string | null>(
    null,
  );
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [channelWorkspaceId, setChannelWorkspaceId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { user } = useAuth();
  const { activeWorkspaceId, activeWorkspace } = useWorkspaces();

  useEffect(() => {
    if (isOpen) {
      setSuccessMessage("");
      setMemberSearchQuery("");
      setInviteSearchQuery("");
      void loadMembers(); // This will handle loading based on channelId or broadcastId
    }
  }, [activeWorkspaceId, isOpen, channelId, broadcastId, user?.id]);

  useEffect(() => {
    // This useEffect is for channel-specific realtime updates
    if (!isOpen || !channelId) return;

    const membersSubscription = supabase
      .channel(`team-members-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channel_members" },
        (payload) => {
          const changedChannelId =
            (payload.new as { channel_id?: string } | null)?.channel_id ??
            (payload.old as { channel_id?: string } | null)?.channel_id;

          if (
            changedChannelId === channelId ||
            (payload.eventType === "DELETE" && !changedChannelId)
          ) {
            void loadMembers();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        (payload) => {
          const changedChannelId =
            (payload.new as { id?: string } | null)?.id ??
            (payload.old as { id?: string } | null)?.id;

          if (changedChannelId === channelId) {
            void loadMembers();
          }
        },
      )
      .subscribe();

    return () => {
      void membersSubscription.unsubscribe();
    };
  }, [isOpen, channelId, user?.id]);

  useEffect(() => {
    // New useEffect for broadcast-specific realtime updates
    if (!isOpen || !broadcastId) return;

    const membersSubscription = supabase
      .channel(`team-members-${broadcastId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_members" },
        (payload) => {
          const changedBroadcastId =
            (payload.new as { broadcast_id?: string } | null)?.broadcast_id ??
            (payload.old as { broadcast_id?: string } | null)?.broadcast_id;

          if (
            changedBroadcastId === broadcastId ||
            (payload.eventType === "DELETE" && !changedBroadcastId)
          ) {
            void loadMembers();
          }
        },
      )
      .subscribe();
    return () => {
      void membersSubscription.unsubscribe();
    };
  }, [isOpen, broadcastId, user?.id]);

  const getWorkspaceProfiles = async (workspaceId: string) => {
    const { data: memberships, error: membershipsError } = await supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .is("removed_at", null);

    if (membershipsError) {
      return {
        data: [] as TeamMember[],
        roles: {} as Record<string, string>,
        error: membershipsError,
      };
    }

    const membershipRows =
      (memberships as Array<{ user_id: string; role: string }> | null) ?? [];
    const memberIds = membershipRows.map((membership) => membership.user_id);

    if (memberIds.length === 0) {
      return {
        data: [] as TeamMember[],
        roles: {} as Record<string, string>,
        error: null,
      };
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, avatar_url, avatar_color, is_signedin, last_seen, created_at",
      )
      .in("id", memberIds)
      .order("created_at", { ascending: true });

    return {
      data: (profiles as TeamMember[] | null) ?? [],
      roles: Object.fromEntries(
        membershipRows.map((membership) => [
          membership.user_id,
          membership.role,
        ]),
      ),
      error,
    };
  };

  const loadMembers = async () => {
    if (!user || !activeWorkspaceId) return;
    setLoading(true);
    setSelectedInviteIds([]);
    setError("");

    let resolvedWorkspaceId = activeWorkspaceId;
    let table = "";
    let column = "";

    if (channelId) {
      const { data: channelData, error: channelError } = await supabase
        .from("channels")
        .select("name, is_private, created_by, workspace_id")
        .eq("id", channelId)
        .maybeSingle();

      if (!channelError && channelData) {
        const typedChannel = channelData as {
          name: string;
          is_private: boolean;
          created_by: string | null;
          workspace_id: string | null;
        };
        setChannelName(typedChannel.name);
        setIsPrivateChannel(typedChannel.is_private);
        setChannelCreatedBy(typedChannel.created_by);
        setChannelWorkspaceId(typedChannel.workspace_id);
        resolvedWorkspaceId = typedChannel.workspace_id || activeWorkspaceId;
      }
      table = "channel_members";
      column = "channel_id";
    } else if (broadcastId) {
      const { data: broadcastData, error: broadcastError } = await supabase
        .from("broadcasts")
        .select("name, created_by, workspace_id")
        .eq("id", broadcastId)
        .maybeSingle();

      if (!broadcastError && broadcastData) {
        const typedBroadcast = broadcastData as {
          name: string;
          created_by: string | null;
          workspace_id: string | null;
        };
        setBroadcastName(typedBroadcast.name);
        setBroadcastCreatedBy(typedBroadcast.created_by);
        setChannelWorkspaceId(typedBroadcast.workspace_id);
        setIsPrivateChannel(false);
        resolvedWorkspaceId = typedBroadcast.workspace_id || activeWorkspaceId;
      }
      table = "broadcast_members";
      column = "broadcast_id";
    } else {
      setChannelName("");
      setIsPrivateChannel(false);
      setChannelCreatedBy(null);
      setChannelWorkspaceId(activeWorkspaceId);
      setCurrentUserRole(null);
      const { data, roles, error } =
        await getWorkspaceProfiles(activeWorkspaceId);
      if (data && !error) {
        setMembers(data);
        setWorkspaceMembers(data);
        setMemberRoles(roles);
      }
      setLoading(false);
      return;
    }

    if (channelId || broadcastId) {
      const [
        {
          data: workspaceProfiles,
          roles: workspaceRoles,
          error: profilesError,
        },
        { data: memberRows, error: membersError },
      ] = await Promise.all([
        getWorkspaceProfiles(resolvedWorkspaceId),
        supabase
          .from(table)
          .select("user_id, role")
          .eq(column, channelId || (broadcastId as string)),
      ]);

      if (!profilesError && !membersError) {
        const allProfiles = workspaceProfiles;
        const typedMemberRows =
          (memberRows as Array<{ user_id: string; role: string }> | null) ?? [];
        const nextRoles = Object.fromEntries(
          typedMemberRows.map((member) => [member.user_id, member.role]),
        );
        const memberIds = new Set(
          typedMemberRows.map((member) => member.user_id),
        );
        setWorkspaceMembers(allProfiles);
        setMemberRoles({ ...workspaceRoles, ...nextRoles });
        setCurrentUserRole(nextRoles[user.id] ?? null);
        setMembers(allProfiles.filter((profile) => memberIds.has(profile.id)));
      } else {
        setWorkspaceMembers([]);
        setMembers([]);
      }
    }
    setLoading(false);
  };

  const filteredMembers = useMemo(() => {
    return members.filter(
      (member) =>
        member.full_name
          .toLowerCase()
          .includes(memberSearchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(memberSearchQuery.toLowerCase()),
    );
  }, [members, memberSearchQuery]);

  const availableInvitees = useMemo(() => {
    if (!channelId && !broadcastId) return [];
    const currentMemberIds = new Set(members.map((member) => member.id));
    return workspaceMembers.filter(
      (member) => member.id !== user?.id && !currentMemberIds.has(member.id),
    );
  }, [channelId, members, user?.id, workspaceMembers]);

  const filteredInvitees = useMemo(() => {
    return availableInvitees.filter(
      (member) =>
        member.full_name
          .toLowerCase()
          .includes(inviteSearchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(inviteSearchQuery.toLowerCase()),
    );
  }, [availableInvitees, inviteSearchQuery]);

  const isPersonalDefaultChannel = useMemo(() => {
    const normalizedName = (channelName || broadcastName || "")
      .trim()
      .toLowerCase();
    return (
      Boolean(channelId || broadcastId) &&
      (channelCreatedBy === user?.id || broadcastCreatedBy === user?.id) &&
      ["general", "ideas", "support"].includes(normalizedName)
    );
  }, [
    channelCreatedBy,
    channelId,
    channelName,
    user?.id,
    broadcastId,
    broadcastName,
    broadcastCreatedBy,
  ]);

  const isCurrentUserAdmin =
    currentUserRole === "admin" || currentUserRole === "owner";
  const canCurrentUserLeave =
    Boolean((channelId || broadcastId) && user) &&
    !isCurrentUserAdmin &&
    (channelId
      ? channelCreatedBy !== user?.id
      : broadcastCreatedBy !== user?.id);

  const toggleInvitee = (memberId: string) => {
    setSelectedInviteIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!channelId && !broadcastId) || !user || !channelWorkspaceId) return;
    if (!isCurrentUserAdmin) {
      setError("Only channel admins can invite or remove members.");
      return;
    }

    setSavingInvite(true);
    setError("");
    setSuccessMessage("");

    const selectedInvitees = availableInvitees.filter((member) =>
      selectedInviteIds.includes(member.id),
    );
    const manualEmails = manualInviteEmails
      .split(/[\n,;]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (selectedInvitees.length === 0 && manualEmails.length === 0) {
      setSavingInvite(false);
      setError("Choose at least one teammate or enter a new email address.");
      return;
    }

    const currentMemberIds = new Set(members.map((member) => member.id));
    const currentMemberEmails = new Set(
      members.map((member) => member.email.toLowerCase()),
    );
    const uniqueManualEmails = Array.from(new Set(manualEmails)).filter(
      (email) => !currentMemberEmails.has(email),
    );

    const { data: existingProfiles, error: profilesError } =
      uniqueManualEmails.length > 0
        ? await supabase
            .from("profiles")
            .select("id, email")
            .in("email", uniqueManualEmails)
        : { data: [], error: null };

    if (profilesError) {
      setSavingInvite(false);
      setError(profilesError.message);
      return;
    }

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
            .eq("workspace_id", channelWorkspaceId)
            .in("user_id", existingUserIds)
        : { data: [], error: null };

    if (existingMembershipsError) {
      setSavingInvite(false);
      setError(existingMembershipsError.message);
      return;
    }

    const memberIdSet = new Set(
      ((existingMemberships as Array<{ user_id: string }> | null) ?? []).map(
        (membership) => membership.user_id,
      ),
    );

    const manualWorkspaceProfiles = existingProfileRows.filter((profileRow) =>
      memberIdSet.has(profileRow.id),
    );
    const manualWorkspaceEmails = new Set(
      manualWorkspaceProfiles.map((profileRow) =>
        profileRow.email.toLowerCase(),
      ),
    );
    const emailsToInvite = uniqueManualEmails.filter(
      (email) => !manualWorkspaceEmails.has(email),
    );

    const directMemberIds = Array.from(
      new Set([
        ...selectedInvitees.map((member) => member.id),
        ...manualWorkspaceProfiles.map((member) => member.id),
      ]),
    ).filter((memberId) => !currentMemberIds.has(memberId));

    if (directMemberIds.length > 0) {
      const { error: memberError } = await supabase
        .from(channelId ? "channel_members" : "broadcast_members") // Dynamically select table
        .insert(
          directMemberIds.map((memberId) => ({
            [channelId ? "channel_id" : "broadcast_id"]:
              channelId || broadcastId, // Dynamically select column
            user_id: memberId,
            role: "member", // Default role for new members
          })) as any,
        );

      if (memberError && memberError.code !== "23505") {
        setSavingInvite(false);
        setError(memberError.message);
        return;
      }
    }

    let sentInviteCount = 0;

    if (emailsToInvite.length > 0) {
      const inviteRows = emailsToInvite.map((email) => ({
        [channelId ? "channel_id" : "broadcast_id"]: channelId || broadcastId,
        workspace_id: channelWorkspaceId,
        invited_email: email,
        invited_by: user.id,
        invited_by_name:
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "A teammate",

        [channelId ? "channel_name" : "broadcast_name"]:
          channelName || broadcastName, // Dynamically select column
        invite_token: crypto.randomUUID(),
      }));

      const { data, error } = await supabase
        .from("channel_invites")
        .insert(inviteRows as any)
        .select("invited_email, invite_token");

      if (error) {
        setSavingInvite(false);
        setError(error.message);
        return;
      }

      try {
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
          `${supabaseUrl}/functions/v1/send-channel-invites`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
              "x-user-jwt": refreshedSession.session.access_token,
            },
            body: JSON.stringify({
              inviteTokens: (data || []).map(
                (invite: any) => invite.invite_token,
              ),
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
              : null) || "Failed to send channel invite emails.",
          );
        }
        sentInviteCount = (data || []).length;
      } catch (sendError) {
        setSavingInvite(false);
        setError((sendError as Error).message);
        return;
      }
    }

    if (directMemberIds.length === 0 && sentInviteCount === 0) {
      setSavingInvite(false);
      setError("Everyone selected is already in this channel.");
      return;
    }

    setSavingInvite(false);

    setSelectedInviteIds([]);
    setManualInviteEmails("");
    window.dispatchEvent(new CustomEvent("channel-membership-changed"));
    const successParts = [];
    if (directMemberIds.length > 0) {
      successParts.push(
        `added ${directMemberIds.length} ${
          directMemberIds.length === 1 ? "teammate" : "teammates"
        }`,
      );
    }
    if (sentInviteCount > 0) {
      successParts.push(
        `sent ${sentInviteCount} email ${
          sentInviteCount === 1 ? "invite" : "invites"
        }`,
      );
    }
    setSuccessMessage(`Successfully ${successParts.join(" and ")}.`);

    await loadMembers();
  };

  const handleLeaveChannel = async () => {
    if ((!channelId && !broadcastId) || !user) return;

    setActiveActionUserId(user.id);
    setError("");

    const { error: hideError } = await (supabase as any)
      .from(
        channelId
          ? "channel_hidden_memberships"
          : "broadcast_hidden_memberships",
      )
      .upsert(
        {
          [channelId ? "channel_id" : "broadcast_id"]: channelId || broadcastId,
          user_id: user.id,
          hidden_at: new Date().toISOString(),
        },
        {
          onConflict: channelId ? "channel_id,user_id" : "broadcast_id,user_id",
        },
      );

    if (hideError) {
      setActiveActionUserId(null);
      setError(hideError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from(channelId ? "channel_members" : "broadcast_members")
      .delete()
      .eq(
        channelId ? "channel_id" : "broadcast_id",
        channelId || (broadcastId as string),
      ) // Dynamically select column
      .eq("user_id", user.id);

    setActiveActionUserId(null);

    if (deleteError) {
      await (supabase as any)
        .from(
          channelId
            ? "channel_hidden_memberships"
            : "broadcast_hidden_memberships",
        )
        .delete()
        .eq(
          channelId ? "channel_id" : "broadcast_id",
          channelId || (broadcastId as string),
        )
        .eq("user_id", user.id);
      setError(deleteError.message);
      return;
    }

    onClose();
    window.dispatchEvent(new CustomEvent("channel-membership-changed"));
    onChannelLeft?.();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!channelId && !broadcastId) return;

    setActiveActionUserId(memberId);
    setError("");

    const { error: deleteError } = await supabase
      .from(channelId ? "channel_members" : "broadcast_members")
      .delete()
      .eq(
        channelId ? "channel_id" : "broadcast_id",
        channelId || (broadcastId as string),
      )
      .eq("user_id", memberId);

    setActiveActionUserId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    window.dispatchEvent(new CustomEvent("channel-membership-changed"));
    await loadMembers();
  };

  if (!isOpen) return null;

  const isBroadcast = !!broadcastId;
  const isPublicChannel = !broadcastId && !isPrivateChannel;
  const isInviteDisabled = isPersonalDefaultChannel || isPublicChannel;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {channelId ? "Channel Members" : ""}
              {broadcastId ? "Broadcast Members" : "Team Members"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {channelId ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    {isPrivateChannel ? <Lock size={14} /> : <Hash size={14} />}
                    <span className="font-medium text-slate-700">
                      {channelName || "Channel"}
                    </span>
                  </span>
                  {" · "}
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </>
              ) : broadcastId ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <Megaphone size={14} />
                    <span className="font-medium text-slate-700">
                      {broadcastName || "Broadcast"}
                    </span>
                  </span>
                  {" · "}
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </>
              ) : (
                <>
                  {members.length} member{members.length !== 1 ? "s" : ""} in
                  {activeWorkspace?.name || "this workspace"}
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="min-h-[350px] flex-1 overflow-y-auto p-6">
          <div className="relative mb-4">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              placeholder="Search current members..."
              className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="relative">
                      <div
                        className="relative w-12 h-12 rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-lg"
                        style={{
                          backgroundColor: member.avatar_color || "#3178c6",
                        }}
                      >
                        {(member.full_name || member.email)[0].toUpperCase()}
                        {member.avatar_url && (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name || member.email}
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </div>
                      {isOnline(member.is_signedin, member.last_seen) && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate">
                          {member.full_name || "Anonymous User"}
                        </p>
                        {member.id === user?.id && (
                          <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                            You
                          </span>
                        )}
                        {memberRoles[member.id] === "admin" && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 truncate">
                        {member.email}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {isOnline(member.is_signedin, member.last_seen)
                          ? "Active now"
                          : "Offline"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.id === user?.id && (
                        <div
                          className="p-2 bg-amber-100 rounded-lg"
                          title="Admin"
                        >
                          <Crown size={18} className="text-amber-600" />
                        </div>
                      )}
                      {(channelId || broadcastId) &&
                        member.id === user?.id &&
                        canCurrentUserLeave && (
                          <button
                            type="button"
                            onClick={() => void handleLeaveChannel()}
                            disabled={activeActionUserId === user.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <LogOut size={14} />
                            {activeActionUserId === user.id
                              ? "Leaving..."
                              : "Leave"}
                          </button>
                        )}
                      {(channelId || broadcastId) &&
                        isCurrentUserAdmin &&
                        member.id !== user?.id && (
                          <button
                            type="button"
                            onClick={() => void handleRemoveMember(member.id)}
                            disabled={activeActionUserId === member.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <UserMinus size={14} />
                            {activeActionUserId === member.id
                              ? "Removing..."
                              : "Remove"}
                          </button>
                        )}
                    </div>{" "}
                  </div>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center text-slate-500">
                  <Search size={32} className="text-slate-200 mb-2" />
                  <p className="text-sm">
                    {memberSearchQuery.trim()
                      ? `No members found matching "${memberSearchQuery}"`
                      : "No members found in this list."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-slate-50">
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}
          {channelId || broadcastId ? (
            isInviteDisabled ? (
              <div className="text-sm text-slate-600">
                {isPersonalDefaultChannel
                  ? "This starter channel belongs only to you. Other users cannot be invited here."
                  : "This is a public channel, so everyone in this workspace is already included automatically."}
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {isBroadcast
                      ? "Add members to this broadcast"
                      : "Add teammates to this private channel"}
                  </label>

                  <div className="relative mb-2">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={inviteSearchQuery}
                      onChange={(e) => setInviteSearchQuery(e.target.value)}
                      placeholder="Search teammates to add..."
                      className="w-full rounded-md border border-slate-300 pl-8 pr-3 py-1.5 text-xs outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    {filteredInvitees.length > 0 ? (
                      filteredInvitees.map((member) => (
                        <label
                          key={member.id}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedInviteIds.includes(member.id)}
                            onChange={() => toggleInvitee(member.id)}
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {member.full_name || member.email}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {member.email}
                            </p>
                          </div>
                        </label>
                      ))
                    ) : (
                      <p className="px-4 py-6 text-xs text-slate-500 text-center">
                        {inviteSearchQuery.trim()
                          ? `No teammates matching "${inviteSearchQuery}"`
                          : "No available teammates to add."}
                      </p>
                    )}
                  </div>

                  {/* ❗ Only show email invite for channels */}
                  {!isBroadcast && (
                    <>
                      <label className="mt-3 block text-sm font-medium text-slate-700 mb-2">
                        Or invite by email
                      </label>
                      <textarea
                        value={manualInviteEmails}
                        onChange={(e) => setManualInviteEmails(e.target.value)}
                        rows={3}
                        placeholder="one@example.com, two@example.com"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Existing workspace teammates are added immediately.
                        Emails are only sent to people who are not already in
                        this workspace.
                      </p>
                    </>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    savingInvite ||
                    (selectedInviteIds.length === 0 &&
                      !isBroadcast &&
                      manualInviteEmails.trim().length === 0) ||
                    !isCurrentUserAdmin
                  }
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus size={20} />
                  {savingInvite
                    ? isBroadcast
                      ? "Adding members..."
                      : "Adding teammates..."
                    : isBroadcast
                      ? "Add Members"
                      : "Add Teammates / Send Invites"}
                </button>

                {!isCurrentUserAdmin && (
                  <p className="text-xs text-slate-500">
                    Only {isBroadcast ? "broadcast" : "channel"} admins can
                    invite members.
                  </p>
                )}
              </form>
            )
          ) : (
            <div className="text-sm text-slate-600">
              Workspace membership is managed from the workspace switcher and
              invite flow.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
