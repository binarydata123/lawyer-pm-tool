import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Mail,
  X,
  Lock,
  Settings,
  Link as LinkIcon,
  Image as ImageIcon,
  Bookmark,
  Pin,
  Users,
  UserMinus,
  Trash2,
  LogOut,
  LightbulbIcon,
  ListTodo,
  Crown,
  ClipboardList,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { useWorkspaces } from "../../../contexts/WorkspaceContext";
import { getFileIcon } from "../../../lib/file-upload";
import FileViewerModal from "../FileViewerModal";
import { getMemberPopupPosition } from "../MemberPopup";
import { PinnedMessage } from "../PinnedMessagesPanel";
import { isOnline } from "../../utils/isOnline";
import type {
  BookmarkedItem,
  ChannelInfo,
  ChannelMemberEntry,
  BroadcastInfo,
  ChatAssetMessage,
  ChatDetailsPanelProps,
  MessageTodoItem,
  MessageTodoStatus,
  PanelSectionKey,
  ProfileInfo,
} from "../chatTypes";
import { Tooltip } from "../message-list/MessageListContent";
import InstallButton from "../InstallButton/InstallButton";

interface PendingChannelInvite {
  id: string;
  invited_email: string;
  created_at: string;
}

const getStorageKey = (
  type: "notes",
  channelId?: string,
  dmId?: string,
  broadcastId?: string,
) => {
  if (channelId) return `chat-details:${type}:channel:${channelId}`;
  if (dmId) return `chat-details:${type}:dm:${dmId}`;
  if (broadcastId) return `chat-details:${type}:broadcast:${broadcastId}`;
  return null;
};

const extractUrls = (content: string) => {
  const matches = content.match(/https?:\/\/[^\s]+/g) || [];
  return matches.map((url) => url.replace(/[),.!?]+$/, ""));
};

const CHAT_DETAILS_ASSET_LIMIT = 200;

export function ChatDetailsPanel({
  channelId,
  broadcastId,
  dmId,
  otherUserId,
  mobileOpen = false,
  onCloseMobile,
  onMemberClick,
  onBookmarkClick,
  onMembersClick,
  onSettingsClick,
  onPinnedMessageClick,
  onChannelLeft,
}: ChatDetailsPanelProps) {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [broadcastInfo, setBroadcastInfo] = useState<BroadcastInfo | null>(
    null,
  );
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [channelMembers, setChannelMembers] = useState<ChannelMemberEntry[]>(
    [],
  );
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [pendingChannelInvites, setPendingChannelInvites] = useState<
    PendingChannelInvite[]
  >([]);
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  const [sharedCredentialId, setSharedCredentialId] = useState<string | null>(
    null,
  );
  const [credentials, setCredentials] = useState("");
  const [notes, setNotes] = useState("");
  const [initialCredentials, setInitialCredentials] = useState("");
  const [initialNotes, setInitialNotes] = useState("");
  const [detailsSaveMessage, setDetailsSaveMessage] = useState<string | null>(
    null,
  );
  const [chatMessages, setChatMessages] = useState<ChatAssetMessage[]>([]);
  const [bookmarkedMessages, setBookmarkedMessages] = useState<
    BookmarkedItem[]
  >([]);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [pinCount, setPinCount] = useState(0);
  const [todoCount, setTodoCount] = useState(0);
  const [messageTodos, setMessageTodos] = useState<MessageTodoItem[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [fileLink, setFileLink] = useState<string | undefined>("");
  const [fileName, setFileName] = useState<string | undefined>("");
  const [fileType, setFileType] = useState<string | undefined>("");
  const { user, profile: authProfile } = useAuth();
  const { activeWorkspaceId, canManageWorkspace } = useWorkspaces();
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [expandedDrawer, setExpandedDrawer] = useState<PanelSectionKey | null>(
    null,
  );
  const [activeActionUserId, setActiveActionUserId] = useState<string | null>(
    null,
  );
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  const [isLeavingChannel, setIsLeavingChannel] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(
    null,
  );
  const [presenceTick, setPresenceTick] = useState(0);
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);

  // Refs to always hold latest values for use inside cleanup / beforeunload
  const notesRef = useRef(notes);
  const initialNotesRef = useRef(initialNotes);
  const detailEntryIdRef = useRef(detailEntryId);
  const channelIdRef = useRef(channelId);
  const broadcastIdRef = useRef(broadcastId);
  const dmIdRef = useRef(dmId);
  const sharedCredentialIdRef = useRef(sharedCredentialId);
  const userRef = useRef(user);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    // Infinite toggle every 5 minute
    const intervalId = window.setInterval(() => {
      setShowInstallPrompt((prev) => !prev);
    }, 300000);

    return () => window.clearInterval(intervalId);
  }, [channelId, dmId]);
  useEffect(() => {
    initialNotesRef.current = initialNotes;
  }, [initialNotes]);
  useEffect(() => {
    detailEntryIdRef.current = detailEntryId;
  }, [detailEntryId]);
  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);
  useEffect(() => {
    broadcastIdRef.current = broadcastId;
  }, [broadcastId]);
  useEffect(() => {
    dmIdRef.current = dmId;
  }, [dmId]);
  useEffect(() => {
    sharedCredentialIdRef.current = sharedCredentialId;
  }, [sharedCredentialId]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    setExpandedDrawer(null);
    setActiveActionUserId(null);
    setMemberActionError(null);
  }, [channelId, dmId, broadcastId]);

  useEffect(() => {
    setChannelMembers([]);
    setIsLoadingMembers(false);
  }, [channelId, broadcastId]);

  const persistDetails = async (
    personalNotes: string,
    entryId: string | null,
    chId?: string,
    dId?: string,
    bId?: string,
    currentUser?: typeof user,
  ) => {
    if (!currentUser || (!chId && !dId && !bId)) return;

    const notesKey = getStorageKey("notes", chId, dId, bId);

    if (notesKey) localStorage.setItem(notesKey, personalNotes);

    const payload = {
      user_id: currentUser.id,
      channel_id: chId || null,
      dm_id: dId || null,
      broadcast_id: bId || null,
      personal_notes: personalNotes,
    };

    if (entryId) {
      await (supabase as any)
        .from("chat_detail_entries")
        .update({ personal_notes: personalNotes })
        .eq("id", entryId)
        .eq("user_id", currentUser.id);
    } else {
      await (supabase as any)
        .from("chat_detail_entries")
        .insert(payload)
        .select("id")
        .single();
    }
  };

  // Auto-save when channelId/dmId changes (i.e. user navigates away)
  useEffect(() => {
    return () => {
      const personalNotes = notesRef.current;
      const initNotes = initialNotesRef.current;
      const hasChanges = personalNotes !== initNotes;

      if (hasChanges) {
        void persistDetails(
          personalNotes,
          detailEntryIdRef.current,
          channelId,
          dmId,
          broadcastId,
          userRef.current,
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, dmId, broadcastId]);

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const personalNotes = notesRef.current;
      const initNotes = initialNotesRef.current;
      const hasChanges = personalNotes !== initNotes;

      if (hasChanges) {
        // Use localStorage as a reliable sync fallback on unload
        const notesKey = getStorageKey(
          "notes",
          channelIdRef.current,
          broadcastIdRef.current,
          dmIdRef.current,
        );
        if (notesKey) localStorage.setItem(notesKey, personalNotes);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const loadDMProfile = async () => {
      if (!dmId || !user || !activeWorkspaceId) {
        setProfile(null);
        return;
      }

      let resolvedOtherUserId = otherUserId;

      if (!resolvedOtherUserId) {
        const { data: dm } = await (supabase as any)
          .from("direct_messages")
          .select("user1_id, user2_id")
          .eq("workspace_id", activeWorkspaceId)
          .eq("id", dmId)
          .maybeSingle();

        if (!dm) {
          setProfile(null);
          return;
        }

        resolvedOtherUserId =
          dm.user1_id === user.id ? dm.user2_id : dm.user1_id;
      }

      if (!resolvedOtherUserId) {
        setProfile(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, is_signedin, last_seen, avatar_url")
        .eq("id", resolvedOtherUserId)
        .maybeSingle();

      setProfile((data as ProfileInfo | null) ?? null);
    };

    void loadDMProfile();
  }, [activeWorkspaceId, dmId, otherUserId, user]);

  const loadPendingChannelInvites = async (activeChannelId: string) => {
    const { data, error } = await supabase
      .from("channel_invites")
      .select("id, invited_email, created_at")
      .eq("channel_id", activeChannelId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      setPendingChannelInvites([]);
      return;
    }

    const latestInvitesByEmail = new Map<string, PendingChannelInvite>();

    ((data as PendingChannelInvite[] | null) ?? []).forEach((invite) => {
      const emailKey = invite.invited_email.toLowerCase();
      if (!latestInvitesByEmail.has(emailKey)) {
        latestInvitesByEmail.set(emailKey, invite);
      }
    });

    setPendingChannelInvites(Array.from(latestInvitesByEmail.values()));
  };

  const loadBroadcastSummary = async () => {
    if (!broadcastId) {
      setBroadcastInfo(null);
      return;
    }

    const [
      { data: broadcastData, error: broadcastError },
      { count: memberCount, error: memberCountError },
    ] = await Promise.all([
      supabase
        .from("broadcasts")
        .select("name, created_by")
        .eq("id", broadcastId)
        .maybeSingle(),
      supabase
        .from("broadcast_members")
        .select("*", { count: "exact", head: true })
        .eq("broadcast_id", broadcastId),
    ]);

    if (broadcastError) {
      console.error("Failed to load broadcast details", broadcastError);
      setBroadcastInfo(null);
      return;
    }

    if (memberCountError) {
      console.error("Failed to load broadcast member count", memberCountError);
    }

    if (broadcastData) {
      setBroadcastInfo({
        ...(broadcastData as BroadcastInfo),
        member_count: memberCount ?? 0,
      } as BroadcastInfo);
    } else {
      setBroadcastInfo(null);
    }
  };

  const loadChannelSummary = async () => {
    if (!channelId) {
      setChannelInfo(null);
      setChannelMembers([]);
      setPendingChannelInvites([]);
      return;
    }

    const [
      { data: channelData, error: channelError },
      { data: membershipData, error: membershipError },
      { count: memberCount, error: memberCountError },
    ] = await Promise.all([
      supabase
        .from("channels")
        .select("name, description, is_private")
        .eq("id", channelId)
        .maybeSingle(),
      user
        ? supabase
            .from("channel_members")
            .select("role")
            .eq("channel_id", channelId)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("channel_members")
        .select("id", { count: "exact", head: true })
        .eq("channel_id", channelId),
    ]);

    if (channelError) {
      console.error("Failed to load channel details", channelError);
      setChannelInfo(null);
      setChannelMembers([]);
      setPendingChannelInvites([]);
      return;
    }

    if (memberCountError) {
      console.error("Failed to load channel member count", memberCountError);
    }

    if (channelData) {
      setChannelInfo({
        ...(channelData as ChannelInfo),
        member_count: memberCount ?? 0,
        current_user_role:
          (membershipData as { role?: string } | null)?.role ?? null,
      });
    } else {
      setChannelInfo(null);
    }

    if ((channelData as ChannelInfo | null)?.is_private) {
      await loadPendingChannelInvites(channelId);
    } else {
      setPendingChannelInvites([]);
    }

    if (membershipError) {
      console.error(
        "Failed to load current channel membership",
        membershipError,
      );
    }
  };

  const loadChannelMembers = async () => {
    if (!channelId) {
      setChannelMembers([]);
      setIsLoadingMembers(false);
      return;
    }

    setIsLoadingMembers(true);

    const { data: memberData, error: memberError } = await supabase
      .from("channel_members")
      .select(
        "id, role, joined_at, profiles(id, full_name, email, avatar_url,avatar_color, is_signedin, last_seen)",
      )
      .eq("channel_id", channelId)
      .order("joined_at", { ascending: true });

    if (memberError) {
      console.error("Failed to load channel members", memberError);
      setChannelMembers([]);
      setIsLoadingMembers(false);
      return;
    }

    setChannelMembers((memberData as ChannelMemberEntry[] | null) ?? []);
    setIsLoadingMembers(false);
  };

  useEffect(() => {
    void loadChannelSummary();
  }, [channelId, user]);

  useEffect(() => {
    if (!channelId) return;

    const channelMetaSubscription = supabase
      .channel(`chat-details-members-${channelId}`)
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
            void loadChannelSummary();
            if (expandedDrawer === "members") {
              void (channelId ? loadChannelMembers() : loadBroadcastMembers());
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channel_invites" },
        (payload) => {
          const changedChannelId =
            (payload.new as { channel_id?: string } | null)?.channel_id ??
            (payload.old as { channel_id?: string } | null)?.channel_id;

          if (changedChannelId === channelId) {
            void loadPendingChannelInvites(channelId);
          }
        },
      )
      .subscribe();

    const handleChannelMembershipChanged = () => {
      void loadChannelSummary();
      if (expandedDrawer === "members") {
        void loadChannelMembers();
      }
    };

    window.addEventListener(
      "channel-membership-changed",
      handleChannelMembershipChanged,
    );

    return () => {
      void channelMetaSubscription.unsubscribe();
      window.removeEventListener(
        "channel-membership-changed",
        handleChannelMembershipChanged,
      );
    };
  }, [channelId, expandedDrawer, user?.id]);

  useEffect(() => {
    void loadBroadcastSummary();
  }, [broadcastId, user?.id]);

  useEffect(() => {
    if (!broadcastId) return;

    const broadcastMetaSubscription = supabase
      .channel(`chat-details-broadcast-members-${broadcastId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcast_members" },
        () => {
          void loadBroadcastSummary();
          if (expandedDrawer === "members") {
            void loadBroadcastMembers();
          }
        },
      );

    broadcastMetaSubscription.subscribe();

    return () => {
      void broadcastMetaSubscription.unsubscribe();
    };
  }, [broadcastId, expandedDrawer, user?.id]);

  useEffect(() => {
    if (!channelId) return;

    const presenceSubscription = supabase
      .channel(`chat-details-presence-${channelId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updatedProfile = payload.new as {
            id?: string;
            full_name?: string;
            email?: string;
            avatar_url?: string | null;
            avatar_color?: string | null;
            is_signedin?: boolean;
            last_seen?: string;
          } | null;

          if (!updatedProfile?.id) return;

          setChannelMembers((current) =>
            current.map((member) =>
              member.profiles?.id === updatedProfile.id
                ? {
                    ...member,
                    profiles: member.profiles
                      ? {
                          ...member.profiles,
                          ...updatedProfile,
                        }
                      : member.profiles,
                  }
                : member,
            ),
          );
        },
      );

    void presenceSubscription.subscribe();

    return () => {
      void presenceSubscription.unsubscribe();
    };
  }, [channelId]);

  useEffect(() => {
    if (expandedDrawer !== "members") {
      return;
    }

    if (channelId) {
      void loadChannelMembers();
    } else if (broadcastId) {
      void loadBroadcastMembers();
    }
  }, [expandedDrawer, channelId, broadcastId]);

  const loadBroadcastMembers = async () => {
    if (!broadcastId) {
      setChannelMembers([]);
      setIsLoadingMembers(false);
      return;
    }

    setIsLoadingMembers(true);

    const { data: memberData, error: memberError } = await supabase
      .from("broadcast_members")
      .select(
        "user_id, role, profiles(id, full_name, email, avatar_url,avatar_color, is_signedin, last_seen)",
      )
      .eq("broadcast_id", broadcastId)
      .order("joined_at", { ascending: true });

    if (memberError) {
      console.error("Failed to load broadcast members", memberError);
      setChannelMembers([]);
      setIsLoadingMembers(false);
      return;
    }

    // Map the user_id to the 'id' field expected by the component keys and profiles
    const formattedMembers = ((memberData as any[] | null) ?? []).map((m) => ({
      ...m,
      id: m.profiles?.id || m.user_id,
    }));

    setChannelMembers(formattedMembers as ChannelMemberEntry[]);
    setIsLoadingMembers(false);
  };

  useEffect(() => {
    if (!channelId && !broadcastId) return;
    const presencePoll = setInterval(() => {
      setPresenceTick((current) => current + 1);
    }, 15_000);

    return () => {
      window.clearInterval(presencePoll);
    };
  }, [channelId]);

  useEffect(() => {
    const loadChatDetails = async () => {
      if (!user || (!channelId && !dmId && !broadcastId)) {
        setDetailEntryId(null);
        setCredentials("");
        setNotes("");
        setInitialCredentials("");
        setInitialNotes("");
        return;
      }

      const notesKey = getStorageKey("notes", channelId, dmId, broadcastId);
      const localNotes = notesKey ? localStorage.getItem(notesKey) || "" : "";

      let query = supabase
        .from("chat_detail_entries" as any)
        .select("id, personal_notes")
        .eq("user_id", user.id);
      if (channelId) {
        query = query.eq("channel_id", channelId);
      } else if (dmId) {
        query = query.eq("dm_id", dmId);
      } else if (broadcastId) {
        query = query.eq("broadcast_id", broadcastId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("Failed to load chat details", error);
        setDetailEntryId(null);
        setNotes(localNotes);
        setInitialNotes(localNotes);
        setDetailsSaveMessage(null);
        return;
      }

      const entry = data as {
        id: string;
        personal_notes: string | null;
      } | null;
      const nextNotes = entry?.personal_notes ?? localNotes;

      setDetailEntryId(entry?.id || null);
      setNotes(nextNotes);
      setInitialNotes(nextNotes);
      setDetailsSaveMessage(null);
    };

    void loadChatDetails();
  }, [channelId, dmId, broadcastId, user]);

  const loadSharedCredentials = async (
    activeChannelId?: string,
    activeDmId?: string,
    activeBroadcastId?: string,
  ) => {
    if (!activeChannelId && !activeDmId && !activeBroadcastId) {
      setSharedCredentialId(null);
      setCredentials("");
      setInitialCredentials("");
      return;
    }

    let query = (supabase as any)
      .from("chat_shared_credentials")
      .select("id, credentials")
      .order("created_at", { ascending: false })
      .limit(1);

    query = activeChannelId
      ? query.eq("channel_id", activeChannelId)
      : activeBroadcastId
        ? query.eq("broadcast_id", activeBroadcastId)
        : query.eq("dm_id", activeDmId ?? null);

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Failed to load shared credentials", error);
      setSharedCredentialId(null);
      setCredentials("");
      setInitialCredentials("");
      return;
    }

    const nextCredentials = (data?.credentials as string | null) ?? "";
    setSharedCredentialId((data?.id as string | undefined) ?? null);
    setCredentials(nextCredentials);
    setInitialCredentials(nextCredentials);
  };

  const persistSharedCredentials = async (
    nextCredentials: string,
    activeSharedCredentialId: string | null,
    chId?: string,
    dId?: string,
    bId?: string,
    currentUser?: typeof user,
  ) => {
    if (!currentUser || (!chId && !dId && !bId)) return;

    let targetId = activeSharedCredentialId;

    if (!targetId) {
      let existingQuery = (supabase as any)
        .from("chat_shared_credentials")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);

      existingQuery = chId
        ? existingQuery.eq("channel_id", chId)
        : bId
          ? existingQuery.eq("broadcast_id", bId)
          : existingQuery.eq("dm_id", dId ?? null);

      const { data: existingRow } = await existingQuery.maybeSingle();
      targetId = (existingRow?.id as string | undefined) ?? null;
    }

    const payload = {
      credentials: nextCredentials,
      shared_by: currentUser.id,
      channel_id: chId || null,
      dm_id: dId || null,
      broadcast_id: bId || null,
    };

    const request = targetId
      ? (supabase as any)
          .from("chat_shared_credentials")
          .update(payload)
          .eq("id", targetId)
      : (supabase as any).from("chat_shared_credentials").insert(payload);

    const { data, error } = await request.select("id, credentials").single();

    if (error) {
      console.error("Failed to save shared credentials", error);
      return;
    }

    const savedId = (data?.id as string | undefined) ?? null;
    const savedCredentials = (data?.credentials as string | null) ?? "";
    setSharedCredentialId(savedId);
    setCredentials(savedCredentials);
    setInitialCredentials(savedCredentials);
  };

  const handleCredentialsBlur = () => {
    if (!user || (!channelId && !dmId && !broadcastId)) return;
    if (credentials === initialCredentials) return;

    void persistSharedCredentials(
      credentials,
      sharedCredentialIdRef.current,
      channelId,
      dmId ?? undefined,
      broadcastId ?? undefined,
      user,
    );
  };

  useEffect(() => {
    void loadSharedCredentials(channelId, dmId, broadcastId);
  }, [channelId, dmId, broadcastId]);

  useEffect(() => {
    if (!channelId && !dmId && !broadcastId) return;

    const conversationId = (channelId || dmId || broadcastId) as string;
    const filter = channelId
      ? `channel_id=eq.${channelId}`
      : dmId
        ? `dm_id=eq.${dmId}`
        : `broadcast_id=eq.${broadcastId ?? null}`;

    const subscription = supabase
      .channel(`chat-shared-credentials-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_shared_credentials",
          filter,
        },
        () => {
          void loadSharedCredentials(channelId, dmId, broadcastId);
        },
      )
      .subscribe();

    return () => {
      void subscription.unsubscribe();
    };
  }, [channelId, dmId, broadcastId]);

  useEffect(() => {
    if (!channelId && !dmId && !broadcastId) {
      setChatMessages([]);
      return;
    }

    const loadChatMessages = async () => {
      let queryBuilder;
      if (channelId) {
        queryBuilder = (supabase as any).from("messages");
      } else if (dmId) {
        queryBuilder = (supabase as any).from("direct_message_messages");
      } else if (broadcastId) {
        queryBuilder = (supabase as any).from("broadcast_messages");
      } else {
        setChatMessages([]);
        return;
      }

      let messageQuery = queryBuilder
        .select(
          "id, content, created_at, attachment_url, attachment_name, attachment_size, attachment_type",
        )
        .or("attachment_url.not.is.null,content.ilike.%http%")
        .limit(CHAT_DETAILS_ASSET_LIMIT)
        .order("created_at", { ascending: false });

      if (channelId) {
        messageQuery = messageQuery
          .eq("channel_id", channelId)
          .is("parent_id", null)
          .is("thread_id", null);
      } else if (dmId && dmId !== "undefined") {
        messageQuery = messageQuery.eq("dm_id", dmId).is("thread_id", null);
      } else if (broadcastId) {
        messageQuery = messageQuery.eq("broadcast_id", broadcastId);
      }

      const { data: messageData, error: messageError } = await messageQuery;

      if (messageError) {
        console.error("Failed to load chat details messages", messageError);
        setChatMessages([]);
      } else {
        setChatMessages((messageData as ChatAssetMessage[] | null) ?? []);
      }
    };

    void loadChatMessages();

    const handleMessageCreated = (event: Event) => {
      const detail = (
        event as CustomEvent<
          ChatAssetMessage & {
            channel_id?: string | null;
            dm_id?: string | null;
          }
        >
      ).detail;
      if (!detail) return;

      // If a broadcast message is created, it should trigger a reload of broadcast_messages

      const matchesConversation =
        (channelId && detail.channel_id === channelId) ||
        (dmId && detail.dm_id === dmId);

      if (!matchesConversation) return;

      setChatMessages((current) => {
        if (current.some((message) => message.id === detail.id)) {
          return current;
        }

        return [detail, ...current].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      });
    };

    window.addEventListener("message-created", handleMessageCreated);

    const messageTable = channelId ? "messages" : "direct_message_messages";
    const broadcastMessageTable = "broadcast_messages";
    const messageChannel = supabase
      .channel(`chat-details-messages-${channelId || dmId || broadcastId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: broadcastId ? broadcastMessageTable : messageTable,
          filter: channelId
            ? `channel_id=eq.${channelId}`
            : dmId
              ? `dm_id=eq.${dmId}`
              : `broadcast_id=eq.${broadcastId}`,
        },
        (payload) => {
          const row = (payload.new || payload.old) as
            | {
                content?: string | null;
                attachment_url?: string | null;
              }
            | undefined;

          if (!row?.attachment_url && !extractUrls(row?.content || "").length) {
            return;
          }

          void loadChatMessages();
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener("message-created", handleMessageCreated);
      messageChannel.unsubscribe();
    };
  }, [channelId, dmId, broadcastId]);

  const loadSummaryCounts = async () => {
    if (!user || (!channelId && !dmId && !broadcastId)) {
      setBookmarkCount(0);
      setPinCount(0);
      setTodoCount(0);
      return;
    }

    const { data, error } = await (supabase as any).rpc(
      "get_chat_detail_counts",
      {
        p_channel_id: channelId ?? null,
        p_broadcast_id: broadcastId ?? null,
        p_dm_id: dmId ?? null,
      },
    );

    if (error) {
      console.error("Failed to load chat detail counts", error);
      setBookmarkCount(0);
      setPinCount(0);
      setTodoCount(0);
      return;
    }

    const counts = (Array.isArray(data) ? data[0] : data) as {
      bookmark_count?: number | string | null;
      pin_count?: number | string | null;
      todo_count?: number | string | null;
    } | null;

    setBookmarkCount(Number(counts?.bookmark_count ?? 0));
    setPinCount(Number(counts?.pin_count ?? 0));
    setTodoCount(Number(counts?.todo_count ?? 0));
  };
  // This function is not used directly, loadSummaryCounts covers it.
  // const loadBookmarkCount = async () => {
  //   if (!user || (!channelId && !dmId && !broadcastId)) {
  //     setBookmarkCount(0);
  //     return;
  //   }

  // const loadBookmarkCount = async () => {
  //   if (!user || (!channelId && !dmId)) {
  //     setBookmarkCount(0);
  //     return;
  //   }

  //   const messageTable = channelId ? "messages" : "direct_message_messages";

  //   const { data: bookmarkData, error: bookmarkError } = await supabase
  //     .from("message_bookmarks")
  //     .select("message_id")
  //     .eq("user_id", user.id);

  //   if (bookmarkError) {
  //     console.error("Failed to load bookmark count", bookmarkError);
  //     setBookmarkCount(0);
  //     return;
  //   }

  //   const bookmarkedMessageIds = Array.from(
  //     new Set(
  //       ((bookmarkData as Array<{ message_id: string }> | null) ?? []).map(
  //         (bookmark) => bookmark.message_id,
  //       ),
  //     ),
  //   );

  //   if (bookmarkedMessageIds.length === 0) {
  //     setBookmarkCount(0);
  //     return;
  //   }

  //   let query = supabase
  //     .from(messageTable)
  //     .select("id", { count: "exact", head: true })
  //     .in("id", bookmarkedMessageIds);

  //   query = channelId
  //     ? query.eq("channel_id", channelId)
  //     : query.eq("dm_id", dmId as string);

  //   const { count, error } = await query;

  //   if (error) {
  //     console.error("Failed to count conversation bookmarks", error);
  //     setBookmarkCount(0);
  //     return;
  //   }

  //   setBookmarkCount(count ?? 0);
  // };

  const loadBookmarks = async () => {
    if (!channelId && !dmId && !broadcastId) {
      setBookmarkedMessages([]);
      return;
    }

    if (!user) {
      setBookmarkedMessages([]);
      return;
    }

    const { data: bookmarkData, error: bookmarkError } = await supabase
      .from("message_bookmarks")
      .select("id, message_id, created_at, note")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (bookmarkError) {
      console.error("Failed to load chat bookmarks", bookmarkError);
      setBookmarkedMessages([]);
      return;
    }

    const rawBookmarks = (bookmarkData as BookmarkedItem[] | null) ?? [];

    if (rawBookmarks.length === 0) {
      setBookmarkedMessages([]);
      return;
    }

    const seenBookmarkIds = new Set<string>();
    const uniqueBookmarks = rawBookmarks.filter((bookmark) => {
      if (seenBookmarkIds.has(bookmark.message_id)) {
        return false;
      }

      seenBookmarkIds.add(bookmark.message_id);
      return true;
    });
    const messageIds = uniqueBookmarks.map((bookmark) => bookmark.message_id);

    if (channelId) {
      const { data: channelBookmarkMessages, error: channelBookmarkError } =
        await (supabase as any)
          .from("messages")
          .select("id, content, created_at, channel_id, channels(name)")
          .in("id", messageIds)
          .eq("channel_id", channelId);

      if (channelBookmarkError) {
        console.error(
          "Failed to load channel bookmark messages",
          channelBookmarkError,
        );
        setBookmarkedMessages([]);
        return;
      }

      const channelMessages =
        (channelBookmarkMessages as
          | NonNullable<BookmarkedItem["message"]>[]
          | null) ?? [];
      const messageMap = new Map(
        channelMessages.map((message) => [message.id, message]),
      );

      setBookmarkedMessages(
        uniqueBookmarks
          .filter((bookmark) => messageMap.has(bookmark.message_id))
          .map((bookmark) => ({
            ...bookmark,
            message: messageMap.get(bookmark.message_id),
          })),
      );
      return;
    } else if (broadcastId) {
      const { data: broadcastBookmarkMessages, error: broadcastBookmarkError } =
        await (supabase as any)
          .from("broadcast_messages")
          .select("id, content, created_at, broadcast_id")
          .in("id", messageIds)
          .eq("broadcast_id", broadcastId);

      if (broadcastBookmarkError) {
        console.error(
          "Failed to load broadcast bookmark messages",
          broadcastBookmarkError,
        );
        setBookmarkedMessages([]);
        return;
      }

      const broadcastMessages =
        (broadcastBookmarkMessages as
          | NonNullable<BookmarkedItem["message"]>[]
          | null) ?? [];
      const messageMap = new Map(
        broadcastMessages.map((message) => [message.id, message]),
      );

      setBookmarkedMessages(
        uniqueBookmarks
          .filter((bookmark) => messageMap.has(bookmark.message_id))
          .map((bookmark) => ({
            ...bookmark,
            message: messageMap.get(bookmark.message_id),
          })),
      );
      return;
    }

    const { data: dmBookmarkMessages, error: dmBookmarkError } = await (
      supabase as any
    )
      .from("direct_message_messages")
      .select("id, content, created_at, dm_id")
      .in("id", messageIds)
      .eq("dm_id", dmId ?? null);

    if (dmBookmarkError) {
      console.error("Failed to load direct message bookmarks", dmBookmarkError);
      setBookmarkedMessages([]);
      return;
    }

    const dmMessages =
      (dmBookmarkMessages as NonNullable<BookmarkedItem["message"]>[] | null) ??
      [];
    const messageMap = new Map(
      dmMessages.map((message) => [message.id, message]),
    );

    setBookmarkedMessages(
      uniqueBookmarks
        .filter((bookmark) => messageMap.has(bookmark.message_id))
        .map((bookmark) => ({
          ...bookmark,
          message: messageMap.get(bookmark.message_id),
        })),
    );
  };

  const handleRemoveBookmark = async (
    event: ReactMouseEvent<HTMLButtonElement>,
    bookmarkId: string,
  ) => {
    event.stopPropagation();

    const { error } = await supabase
      .from("message_bookmarks")
      .delete()
      .eq("id", bookmarkId);

    if (error) {
      console.error("Failed to remove bookmark", error);
      return;
    }

    setBookmarkedMessages((current) =>
      current.filter((bookmark) => bookmark.id !== bookmarkId),
    );
    setBookmarkCount((current) => Math.max(0, current - 1));

    window.dispatchEvent(
      new CustomEvent("bookmark-changed", {
        detail: {
          channelId: channelId || null,
          dmId: dmId || null,
          broadcastId: broadcastId || null,
        },
      }),
    );
  };

  const handleRemovePin = async (
    event: ReactMouseEvent<HTMLButtonElement>,
    pinnedMessage: PinnedMessage,
  ) => {
    event.stopPropagation();

    const { error } = await supabase
      .from("pinned_messages")
      .delete()
      .eq("id", pinnedMessage.id);

    if (error) {
      console.error("Failed to remove pin", error);
      return;
    }

    const table = channelId
      ? "messages"
      : broadcastId
        ? "broadcast_messages"
        : "direct_message_messages";
    const { error: updateError } = await (supabase as any)
      .from(table)
      .update({ is_pinned: false })
      .eq("id", pinnedMessage.message.id);

    if (updateError) {
      console.error("Failed to update pinned state on message", updateError);
    }

    setPinnedMessages((current) =>
      current.filter((item) => item.id !== pinnedMessage.id),
    );
    setPinCount((current) => Math.max(0, current - 1));

    window.dispatchEvent(
      new CustomEvent("pin-changed", {
        detail: {
          channelId: channelId || null,
          dmId: dmId || null,
          broadcastId: broadcastId || null,
        },
      }),
    );
  };

  const loadPinnedMessages = async () => {
    if (!channelId && !dmId && !broadcastId) {
      setPinnedMessages([]);
      return;
    }

    let query = supabase
      .from("pinned_messages")
      .select(
        `
          id,
          message_id,
          created_at,
          pinned_by,
          profiles!pinned_messages_pinned_by_fkey(full_name)
        `,
      )
      .order("created_at", { ascending: false });

    if (channelId) {
      query = query.eq("channel_id", channelId);
    } else if (broadcastId) {
      query = query.eq("broadcast_id", broadcastId);
    } else if (dmId) {
      query = query.eq("dm_id", dmId);
    }

    const { data: pinRows, error: pinError } = await query;

    if (pinError) {
      console.error("Failed to load pinned messages", pinError);
      setPinnedMessages([]);
      return;
    }

    const pins = (pinRows as any[] | null) ?? [];
    if (pins.length === 0) {
      setPinnedMessages([]);
      return;
    }

    const messageIds = pins.map((pin) => pin.message_id);
    const table = channelId
      ? "messages"
      : broadcastId
        ? "broadcast_messages"
        : "direct_message_messages";

    const messageSelect = broadcastId
      ? "id, content, created_at, attachment_url, attachment_name, profiles:profiles!broadcast_messages_user_id_fkey(full_name)"
      : channelId
        ? "id, content, created_at, attachment_url, attachment_name, profiles:profiles!messages_user_id_fkey(full_name)"
        : "id, content, created_at, attachment_url, attachment_name, profiles:profiles!direct_message_messages_user_id_fkey(full_name)";

    const { data: messageRows, error: messageError } = await supabase
      .from(table)
      .select(messageSelect)
      .in("id", messageIds);

    if (messageError) {
      console.error("Failed to load pinned message content", messageError);
      setPinnedMessages([]);
      return;
    }

    const messageMap = new Map(
      ((messageRows as any[] | null) ?? []).map((message) => [
        message.id,
        message,
      ]),
    );

    setPinnedMessages(
      pins
        .map((pin) => ({
          ...pin,
          message: messageMap.get(pin.message_id),
        }))
        .filter((pin) => Boolean(pin.message)) as unknown as PinnedMessage[],
    );
  };

  const loadMessageTodos = async () => {
    if (!user || (!channelId && !dmId && !broadcastId)) {
      setMessageTodos([]);
      return;
    }

    let query = (supabase as any)
      .from("message_todos")
      .select(
        "id, message_id, message_source, user_id, status, completed_by, completed_at, created_at",
      )
      .order("created_at", { ascending: false });

    if (channelId) {
      query = query.eq("channel_id", channelId);
    } else if (broadcastId) {
      query = query.eq("broadcast_id", broadcastId);
    } else if (dmId) {
      query = query.eq("dm_id", dmId);
    }

    const { data: todoRows, error: todoError } = await query;

    if (todoError) {
      console.error("Failed to load message todos", todoError);
      setMessageTodos([]);
      return;
    }

    const todos = (todoRows as MessageTodoItem[] | null) ?? [];
    if (todos.length === 0) {
      setMessageTodos([]);
      return;
    }

    const messageIds = todos.map((todoItem) => todoItem.message_id);
    const profileIds = Array.from(
      new Set(
        todos
          .flatMap((todoItem) => [todoItem.user_id, todoItem.completed_by])
          .filter(Boolean) as string[],
      ),
    );
    const table = channelId
      ? "messages"
      : broadcastId
        ? "broadcast_messages"
        : "direct_message_messages";

    const [
      { data: messageRows, error: messageError },
      { data: profileRows, error: profileError },
    ] = await Promise.all([
      (supabase as any)
        .from(table)
        .select(
          broadcastId
            ? "id, content, created_at, broadcast_id, workspace_id"
            : channelId
              ? "id, content, created_at, channel_id, workspace_id, channels(name)"
              : "id, content, created_at, dm_id, workspace_id",
        )
        .in("id", messageIds),
      profileIds.length > 0
        ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (messageError || profileError) {
      console.error(
        "Failed to load todo metadata",
        messageError || profileError,
      );
      setMessageTodos([]);
      return;
    }

    const messageMap = new Map(
      (
        (messageRows as NonNullable<MessageTodoItem["message"]>[] | null) ?? []
      ).map((message) => [message.id, message]),
    );
    const profileMap = new Map(
      (
        (profileRows as Array<{ id: string; full_name: string }> | null) ?? []
      ).map((profileRow) => [profileRow.id, profileRow]),
    );

    setMessageTodos(
      todos
        .filter((todoItem) => messageMap.has(todoItem.message_id))
        .map((todoItem) => ({
          ...todoItem,
          message: messageMap.get(todoItem.message_id),
          creator: profileMap.get(todoItem.user_id) ?? null,
          completer: todoItem.completed_by
            ? (profileMap.get(todoItem.completed_by) ?? null)
            : null,
        })),
    );
  };

  const emitTodoChange = () => {
    window.dispatchEvent(
      new CustomEvent("todo-changed", {
        detail: {
          channelId: channelId || null,
          dmId: dmId || null,
          broadcastId: broadcastId || null,
        },
      }),
    );
  };

  const postTodoCompletedMessage = async (todoItem: MessageTodoItem) => {
    if (!user || (!channelId && !dmId && !broadcastId)) return;

    const actorName =
      authProfile?.full_name?.trim() || user.email?.split("@")[0] || "Someone";
    const todoText = (todoItem.message?.content || "message").slice(0, 180);
    const content = `${actorName} completed a To-Do: ${todoText}`;
    const workspaceId = todoItem.message?.workspace_id || activeWorkspaceId;

    const messagePayload = {
      user_id: user.id,
      content,
      workspace_id: workspaceId,
      ...(channelId
        ? { channel_id: channelId }
        : dmId
          ? { dm_id: dmId }
          : { broadcast_id: broadcastId }),
    };

    const table = channelId
      ? "messages"
      : broadcastId
        ? "broadcast_messages"
        : "direct_message_messages";

    const { error } = await (supabase as any)
      .from(table)
      .insert(messagePayload);

    if (error) {
      console.error("Failed to post todo completion message", error);
    }
  };

  const markTodoDone = async (todoItem: MessageTodoItem) => {
    if (!user) return;
    if (todoItem.status === "done") return;

    const completedAt = new Date().toISOString();
    const { error } = await (supabase as any)
      .from("message_todos")
      .update({
        status: "done",
        completed_by: user.id,
        completed_at: completedAt,
      })
      .eq("id", todoItem.id);

    if (error) {
      console.error("Failed to update todo status", error);
      return;
    }

    setMessageTodos((current) =>
      current.map((currentTodo) =>
        currentTodo.id === todoItem.id
          ? {
              ...currentTodo,
              status: "done",
              completed_by: user.id,
              completed_at: completedAt,
              completer: {
                full_name:
                  authProfile?.full_name ||
                  user.email?.split("@")[0] ||
                  "Someone",
              },
            }
          : todoItem,
      ),
    );
    emitTodoChange();
    await postTodoCompletedMessage(todoItem);
  };

  const removeTodo = async (todoId: string) => {
    const { error } = await (supabase as any)
      .from("message_todos")
      .delete()
      .eq("id", todoId);

    if (error) {
      console.error("Failed to remove todo", error);
      return;
    }

    setMessageTodos((current) =>
      current.filter((todoItem) => todoItem.id !== todoId),
    );
    setTodoCount((current) => Math.max(current - 1, 0));
    emitTodoChange();
  };

  useEffect(() => {
    void loadSummaryCounts(); // This will be called if channelId, dmId, or broadcastId changes
  }, [channelId, dmId, broadcastId, user?.id]);

  useEffect(() => {
    if (expandedDrawer !== "bookmarks") {
      return;
    }

    void loadBookmarks();
  }, [expandedDrawer, channelId, dmId, broadcastId, user?.id]);

  useEffect(() => {
    if (expandedDrawer !== "pins") {
      return;
    }

    void loadPinnedMessages();
  }, [expandedDrawer, channelId, dmId, broadcastId]);

  useEffect(() => {
    if (expandedDrawer !== "todo") {
      return;
    }

    void loadMessageTodos();
  }, [expandedDrawer, channelId, dmId, broadcastId, user?.id]);

  useEffect(() => {
    const handleBookmarkChanged = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          channelId?: string | null;
          dmId?: string | null;
          broadcastId?: string | null;
        }>
      ).detail;

      if (
        detail?.channelId === (channelId || null) &&
        detail?.dmId === (dmId || null) &&
        detail?.broadcastId === (broadcastId || null)
      ) {
        void loadSummaryCounts();
        if (expandedDrawer === "bookmarks") {
          void loadBookmarks();
        }
      }
    };

    const handlePinChanged = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          channelId?: string | null;
          dmId?: string | null;
          broadcastId?: string | null;
        }>
      ).detail;

      if (
        detail?.channelId === (channelId || null) &&
        detail?.dmId === (dmId || null) &&
        detail?.broadcastId === (broadcastId || null)
      ) {
        void loadSummaryCounts();
        if (expandedDrawer === "pins") {
          void loadPinnedMessages();
        }
      }
    };

    const handleTodoChanged = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          channelId?: string | null;
          dmId?: string | null;
          broadcastId?: string | null;
        }>
      ).detail;

      if (
        detail?.channelId === (channelId || null) &&
        detail?.dmId === (dmId || null) &&
        detail?.broadcastId === (broadcastId || null)
      ) {
        void loadSummaryCounts();
        if (expandedDrawer === "todo") {
          void loadMessageTodos();
        }
      }
    };

    window.addEventListener("bookmark-changed", handleBookmarkChanged);
    window.addEventListener("pin-changed", handlePinChanged);
    window.addEventListener("todo-changed", handleTodoChanged);

    return () => {
      window.removeEventListener("bookmark-changed", handleBookmarkChanged);
      window.removeEventListener("pin-changed", handlePinChanged);
      window.removeEventListener("todo-changed", handleTodoChanged);
    };
  }, [channelId, dmId, broadcastId, expandedDrawer, user?.id]);

  const title = useMemo(() => {
    if (channelId) {
      if (channelInfo?.name) {
        return (
          <span className="flex items-center gap-1">
            {channelInfo.is_private ? <Lock size={12} /> : <span>#</span>}
            {channelInfo.name}
          </span>
        );
      }
    } else if (broadcastId) {
      if (broadcastInfo?.name) {
        return (
          <span className="flex items-center gap-1">
            <Lock size={12} />
            {broadcastInfo.name}
          </span>
        );
      }
      return "Channel details";
    }

    if (profile?.full_name) return profile.full_name;

    return "Chat details";
  }, [channelId, channelInfo, broadcastId, broadcastInfo, profile]);

  const isCurrentUserAdmin = useMemo(() => {
    if (broadcastId) {
      return broadcastInfo?.created_by === user?.id;
    }
    if (channelId) {
      return (
        channelInfo?.current_user_role === "admin" ||
        channelInfo?.current_user_role === "owner"
      );
    }
    return false;
  }, [
    broadcastId,
    broadcastInfo?.created_by,
    channelId,
    channelInfo?.current_user_role,
    user?.id,
  ]);

  const canInviteTeammates =
    (Boolean(channelInfo?.is_private) &&
      (channelInfo?.current_user_role === "admin" ||
        channelInfo?.current_user_role === "owner") &&
      canManageWorkspace) ||
    (Boolean(broadcastId) && isCurrentUserAdmin);

  const sharedUrls = useMemo(() => {
    const uniqueUrls = new Map<
      string,
      { url: string; created_at: string; message_id: string }
    >();

    chatMessages.forEach((message) => {
      extractUrls(message.content || "").forEach((url) => {
        if (!uniqueUrls.has(url)) {
          uniqueUrls.set(url, {
            url,
            created_at: message.created_at,
            message_id: message.id,
          });
        }
      });
    });

    return Array.from(uniqueUrls.values());
  }, [chatMessages]);

  const mediaItems = useMemo(
    () => chatMessages.filter((message) => message.attachment_url),
    [chatMessages],
  );

  const handleMediaOpen = (item: ChatAssetMessage) => {
    if (!item.attachment_url) return;

    setFileLink(item.attachment_url);
    setFileName(item.attachment_name || "Attachment");
    setFileType(item.attachment_type || "");
    setOpenModal(true);
  };

  const handleMemberClick = (
    member: ChannelMemberEntry,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    if (!member.profiles) return;

    const rect = event.currentTarget.getBoundingClientRect();

    onMemberClick?.(
      {
        ...member.profiles,
        currentChannelJoinedAt: member.joined_at,
      },
      getMemberPopupPosition(rect),
    );
  };

  const handleRemoveMember = async (
    memberRowId: string,
    memberName = "this member",
  ) => {
    if (!channelId && !broadcastId) return;

    const shouldRemove = window.confirm(
      `Remove ${memberName} from this ${broadcastId ? "broadcast" : "channel"}?`,
    );

    if (!shouldRemove) return;

    setActiveActionUserId(memberRowId);
    setMemberActionError(null);

    const table = channelId ? "channel_members" : "broadcast_members";
    const idColumn = channelId ? "id" : "user_id";
    const scopeColumn = channelId ? "channel_id" : "broadcast_id";
    const scopeId = channelId || broadcastId;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq(idColumn, memberRowId)
      .eq(scopeColumn, scopeId as string);

    setActiveActionUserId(null);

    if (error) {
      setMemberActionError(error.message);
      return;
    }

    setChannelMembers((current) =>
      current.filter((member) => member.id !== memberRowId),
    );
    window.dispatchEvent(new CustomEvent("channel-membership-changed"));
  };

  const handleDeletePendingInvite = async (inviteId: string) => {
    setDeletingInviteId(inviteId);

    const { error } = await supabase
      .from("channel_invites")
      .delete()
      .eq("id", inviteId);

    setDeletingInviteId(null);

    if (error) {
      console.error("Failed to delete pending invite", error);
      return;
    }

    setPendingChannelInvites((current) =>
      current.filter((invite) => invite.id !== inviteId),
    );
  };

  const handleLeaveChannel = async () => {
    if ((!channelId && !broadcastId) || !user || isLeavingChannel) return;

    const shouldLeave = window.confirm(
      "Are you sure you want to leave this channel?",
    );

    if (!shouldLeave) return;

    setIsLeavingChannel(true);
    setMemberActionError(null);

    const { error: hideError } = await (supabase as any)
      .from(
        channelId
          ? "channel_hidden_memberships"
          : "broadcast_hidden_memberships",
      ) // Assuming a new table for broadcast hidden memberships
      .upsert(
        {
          ...(channelId
            ? { channel_id: channelId }
            : { broadcast_id: broadcastId }),
          user_id: user.id,
          hidden_at: new Date().toISOString(),
        },
        {
          onConflict: channelId ? "channel_id,user_id" : "broadcast_id,user_id",
        },
      );

    if (hideError) {
      setIsLeavingChannel(false);
      setMemberActionError(hideError.message);
      return;
    }

    const { error } = await (supabase as any)
      .from(channelId ? "channel_members" : "broadcast_members")
      .delete()
      .eq(
        channelId ? "channel_id" : "broadcast_id",
        (channelId || broadcastId) as string,
      )
      .eq("user_id", user.id);

    setIsLeavingChannel(false);

    if (error) {
      await (supabase as any)
        .from(
          channelId
            ? "channel_hidden_memberships"
            : "broadcast_hidden_memberships",
        )
        .delete()
        .eq(
          channelId ? "channel_id" : "broadcast_id",
          (channelId || broadcastId) as string,
        )
        .eq("user_id", user.id);
      setMemberActionError(error.message);
      return;
    }

    window.dispatchEvent(new CustomEvent("channel-membership-changed"));
    onChannelLeft?.();
  };

  const topActionButtonClass =
    "rounded-md p-2 transition-colors hover:bg-slate-100 text-slate-500";

  // const currentUserRole = channelId
  //   ? channelInfo?.current_user_role
  //   : broadcastId && broadcastInfo?.created_by === user?.id
  //     ? "admin"
  //     : null;

  const canLeaveChat =
    Boolean((channelId || broadcastId) && user) && !isCurrentUserAdmin;

  const renderSectionEmptyState = (
    Icon: React.ElementType,
    title: string,
    message: string,
  ) => (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-[#3178C6]">
        <Icon size={26} strokeWidth={1.8} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 max-w-[240px] text-sm leading-5 text-slate-500">
        {message}
      </p>
    </div>
  );

  const renderMemberRows = () => {
    return (
      <div className="flex h-full min-h-0 flex-col space-y-4">
        {channelMembers.length > 0 ? (
          <>
            {memberActionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {memberActionError}
              </div>
            )}

            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
              {channelMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={(event) => handleMemberClick(member, event)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition hover:bg-slate-200/60"
                >
                  <div className="relative h-8 w-8 flex-shrink-0">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
                      style={{
                        backgroundColor:
                          member.profiles?.avatar_color || "#3178c6",
                      }}
                    >
                      {member.profiles?.full_name?.charAt(0).toUpperCase() ||
                        "?"}
                    </div>

                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-[2px] border-white ${
                        isOnline(
                          member.profiles?.is_signedin ?? false,
                          member.profiles?.last_seen ?? null,
                        )
                          ? "bg-green-500"
                          : "bg-slate-400"
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1 flex items-center gap-1">
                    <p className="truncate text-[13px] text-slate-700">
                      {member.profiles?.full_name || "Unknown user"}
                    </p>

                    {member.role === "admin" && (
                      <Crown
                        size={14}
                        className="text-yellow-500 flex-shrink-0"
                      />
                    )}
                  </div>

                  {(channelId || broadcastId) &&
                    isCurrentUserAdmin &&
                    member.profiles?.id !== user?.id && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleRemoveMember(
                            member.id,
                            member.profiles?.full_name || "this member",
                          );
                        }}
                        disabled={activeActionUserId === member.id}
                        title="Remove"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserMinus size={14} />
                        {activeActionUserId === member.id ? "..." : ""}
                      </button>
                    )}
                </button>
              ))}
            </div>
          </>
        ) : isLoadingMembers ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl bg-slate-50 px-3 py-6 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#3178C6]" />
            <p className="mt-3 text-sm text-slate-500">Loading members...</p>
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
            No members found for this channel.
          </p>
        )}
        {channelId &&
          channelInfo?.is_private &&
          pendingChannelInvites.length > 0 && (
            <div className="space-y-2 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Pending invites
                </p>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {pendingChannelInvites.length}
                </span>
              </div>
              {pendingChannelInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-amber-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-slate-700">
                      {invite.invited_email}
                    </p>
                    <p className="text-xs text-slate-500">
                      Sent {new Date(invite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                    {isCurrentUserAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleDeletePendingInvite(invite.id)
                        }
                        disabled={deletingInviteId === invite.id}
                        title="Delete invite"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        {(channelInfo || broadcastInfo) &&
          canInviteTeammates &&
          onMembersClick && (
            <button
              type="button"
              onClick={onMembersClick}
              className="
              group sticky bottom-2 z-10 mt-3 flex w-full shrink-0 items-center justify-center gap-3
              rounded bg-[#C4EED0] px-6 py-2.5
              text-sm font-medium text-[#072711]
              transition-all duration-200 ease-in-out
              hover:bg-[#B3E6C2] hover:shadow-md
              active:bg-[#A2DEC0] active:shadow-none
              focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600
            "
              title="Invite Members to this channel"
            >
              <Users size={20} strokeWidth={1.5} className="text-[#072711]" />
              <span className="tracking-wide">
                Invite to {channelInfo?.name || broadcastInfo?.name} Chat
              </span>
            </button>
          )}
      </div>
    );
  };

  const renderUrlRows = () => {
    if (sharedUrls.length > 0) {
      return (
        <div className="space-y-2">
          {sharedUrls.map((item) => (
            <a
              key={item.url}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-slate-200 px-3 py-2 text-sm transition-colors hover:bg-slate-50"
            >
              <p className="truncate font-medium text-slate-700">{item.url}</p>
              <p className="mt-1 text-xs text-slate-400">
                Shared in this conversation
              </p>
            </a>
          ))}
        </div>
      );
    }

    return renderSectionEmptyState(
      LinkIcon,
      "No Legal Links",
      "Links shared in this conversation will appear here.",
    );
  };

  const renderMediaRows = () => {
    if (mediaItems.length > 0) {
      return (
        <div>
          {mediaItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleMediaOpen(item)}
              className="mb-3 flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-left transition-colors hover:bg-slate-100"
            >
              <span className="flex-shrink-0 text-2xl">
                {getFileIcon(item.attachment_type || "")}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">
                  {item.attachment_name || "Attachment"}
                </p>
                <p className="text-xs text-slate-400">Preview file</p>
              </div>
            </button>
          ))}
        </div>
      );
    }

    return renderSectionEmptyState(
      ImageIcon,
      "No Case Documents Found",
      "Documents shared in this conversation will appear here.",
    );
  };

  const renderBookmarkRows = (closeDrawer = false) => {
    if (bookmarkedMessages.length > 0) {
      return (
        <div className="space-y-2">
          {bookmarkedMessages.map((item) => (
            <div
              key={item.id}
              className="relative rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 mt-1"
            >
              <div className="absolute right-3 top-2">
                <Tooltip content="Remove bookmark" placement="bottom">
                  <button
                    type="button"
                    onClick={(event) =>
                      void handleRemoveBookmark(event, item.id)
                    }
                    className="inline-flex h-6 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </Tooltip>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (item.message?.id) {
                    onBookmarkClick?.(item.message.id);
                    if (closeDrawer) {
                      setExpandedDrawer(null);
                    }
                  }
                }}
                className="w-full pr-10 text-left"
              >
                {item.message?.channels?.name && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.message.channel_id ? (
                      <>#{item.message.channels.name}</>
                    ) : item.message.broadcast_id ? (
                      <>{broadcastInfo?.name}</>
                    ) : (
                      ""
                    )}
                  </p>
                )}
                <p className="line-clamp-3 text-sm text-slate-700">
                  {item.message?.content || "Saved message"}
                </p>
              </button>
              {item.note && (
                <p className="mt-2 text-xs text-amber-700">Note: {item.note}</p>
              )}
            </div>
          ))}
        </div>
      );
    }

    return renderSectionEmptyState(
      Bookmark,
      "No bookmarked messages",
      "Bookmarked messages from this conversation will appear here.",
    );
  };

  const renderPinnedRows = (closeDrawer = false) => {
    if (pinnedMessages.length > 0) {
      return (
        <div className="space-y-2">
          {pinnedMessages.map((pinned) => (
            <div
              key={pinned.id}
              className="relative rounded-xl border border-gray-100 bg-white p-2 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="absolute right-3 top-2">
                <Tooltip content="Unpin message" placement="bottom">
                  <button
                    type="button"
                    onClick={(event) => void handleRemovePin(event, pinned)}
                    className="inline-flex h-6 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#3178C6]"
                  >
                    <Pin
                      className="text-[#3178C6]"
                      strokeWidth={2.5}
                      fill="#3178C6"
                      size={16}
                    />
                  </button>
                </Tooltip>
              </div>
              <button
                type="button"
                onClick={() => {
                  onPinnedMessageClick?.(pinned.message.id);
                  if (closeDrawer) {
                    setExpandedDrawer(null);
                  }
                }}
                className="w-full cursor-pointer pr-10 text-left"
              >
                {pinned.message.broadcast_id && broadcastInfo?.name && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {broadcastInfo.name}
                  </p>
                )}
                {pinned.message.channel_id && pinned.message.channels?.name && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    #{pinned.message.channels.name}
                  </p>
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-words line-clamp-3 text-[13px] leading-snug text-slate-600">
                    {pinned.message.content}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Pinned by {pinned.profiles.full_name}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
      );
    }

    return renderSectionEmptyState(
      Pin,
      "No pinned messages",
      "Pinned messages from this conversation will appear here.",
    );
  };

  const renderCredentialsEditor = () => (
    <textarea
      value={credentials}
      onChange={(e) => setCredentials(e.target.value)}
      onBlur={handleCredentialsBlur}
      className="min-h-[890px] w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600 outline-none placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      placeholder="Enter Access Credentials details or dosage notes..."
    />
  );

  const renderNotesEditor = (showSaveMessage: boolean) => (
    <>
      {showSaveMessage && detailsSaveMessage ? (
        <p className="mb-3 text-xs font-medium text-slate-500">
          {detailsSaveMessage}
        </p>
      ) : null}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="min-h-[890px] w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600 outline-none placeholder:text-slate-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        placeholder="This is a Lawyer Notes note for this chat."
      />
    </>
  );

  const todoStatusLabels: Record<MessageTodoStatus, string> = {
    pending: "To-Do",
    done: "Done",
  };
  const formatTodoDateTime = (value: string) =>
    new Date(value).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  const todoStatusStyles: Record<
    MessageTodoStatus,
    {
      card: string;
      pill: string;
      accent: string;
    }
  > = {
    pending: {
      card: "border-amber-200 bg-amber-50/70",
      pill: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
      accent: "bg-amber-400",
    },
    done: {
      card: "border-emerald-200 bg-emerald-50/70",
      pill: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
      accent: "bg-emerald-500",
    },
  };

  const renderTodoRows = (closeDrawer = false) => {
    if (messageTodos.length > 0) {
      return (
        <div className="space-y-3">
          {messageTodos.map((todoItem) => (
            <div
              key={todoItem.id}
              className={`overflow-hidden rounded-xl border bg-white shadow-sm ${todoStatusStyles[todoItem.status].card}`}
            >
              <div
                className={`h-1 ${todoStatusStyles[todoItem.status].accent}`}
              />
              <div className="space-y-3 px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${todoStatusStyles[todoItem.status].pill}`}
                  >
                    {todoStatusLabels[todoItem.status]}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(todoItem.created_at).toLocaleDateString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (todoItem.message?.id) {
                      onBookmarkClick?.(todoItem.message.id);
                      if (closeDrawer) {
                        setExpandedDrawer(null);
                      }
                    }
                  }}
                  className="w-full rounded-lg bg-white/75 px-3 py-2 text-left transition-colors hover:bg-white"
                >
                  <p className="line-clamp-4 text-sm font-medium leading-5 text-slate-800">
                    {todoItem.message?.content || "Todo message"}
                  </p>
                </button>

                <div className="space-y-1 rounded-lg bg-white/70 px-3 py-2 text-[11px] text-slate-500">
                  <p>
                    Created by{" "}
                    <span className="font-semibold text-slate-700">
                      {todoItem.creator?.full_name || "Unknown user"}
                    </span>
                    <span> at {formatTodoDateTime(todoItem.created_at)}</span>
                  </p>
                  {todoItem.status === "done" ? (
                    <p>
                      Completed by{" "}
                      <span className="font-semibold text-emerald-700">
                        {todoItem.completer?.full_name || "Unknown user"}
                      </span>
                      {todoItem.completed_at ? (
                        <span>
                          {" "}
                          at {formatTodoDateTime(todoItem.completed_at)}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  {todoItem.status !== "done" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void markTodoDone(todoItem)}
                        className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                      >
                        Mark done
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeTodo(todoItem.id)}
                        className="inline-flex flex-1 items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
                      >
                        Remove To-Do
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void removeTodo(todoItem.id)}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Remove To-Do
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return renderSectionEmptyState(
      ListTodo,
      "No Case tasks",
      "Case Tasks created from messages in this conversation will appear here.",
    );
  };

  const renderDrawerShell = ({
    sectionKey,
    icon: Icon,
    title,
    children,
    headerExtra,
  }: {
    sectionKey: PanelSectionKey;
    icon: React.ElementType;
    title: string;
    children: ReactNode;
    headerExtra?: ReactNode;
  }) => {
    if (expandedDrawer !== sectionKey) return null;

    return (
      <div
        className="absolute inset-0 z-40 flex flex-col bg-white dark:bg-[#0f172a]"
        style={{ animation: "slideInFromRight 0.25s ease-out" }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">
              {title}
            </span>
            {headerExtra}
          </div>
          <button
            type="button"
            onClick={() => setExpandedDrawer(null)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    );
  };

  void presenceTick;

  const SectionHeader = ({
    icon: Icon,
    label,
    onExpand,
    badge,
    extra,
  }: {
    icon: React.ElementType;
    label: string;
    badge?: number;
    onExpand?: () => void;
    extra?: React.ReactNode;
  }) => {
    return (
      <button
        type="button"
        onClick={() => {
          if (onExpand) {
            onExpand();
          }
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <Icon size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {badge !== 0 && badge ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {badge}
            </span>
          ) : (
            ""
          )}
          {extra}
        </div>
      </button>
    );
  };

  const renderPanel = (mobile: boolean) => (
    <>
      <div
        className={`flex-shrink-0 border-b border-slate-200 ${mobile ? "px-4 py-3" : ""}`}
      >
        <div className="flex items-center justify-between gap-3">
          {mobile && (
            <div className="min-w-0  flex-1">
              <span className="text-sm font-semibold text-slate-700 truncate lg:whitespace-normal">
                {title}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {canLeaveChat && (
              <button
                type="button"
                onClick={() => void handleLeaveChannel()}
                disabled={isLeavingChannel}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="Leave Channel"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">
                  {isLeavingChannel ? "Leaving..." : "Leave Channel"}
                </span>
              </button>
            )}
            <div className="flex lg:hidden items-center gap-1.5">
              {onMembersClick && channelId && (
                <button
                  type="button"
                  onClick={onMembersClick}
                  className={topActionButtonClass}
                  title="View members"
                >
                  <Users size={20} />
                </button>
              )}
              {onMembersClick && broadcastId && (
                <button
                  type="button"
                  onClick={onMembersClick}
                  className={topActionButtonClass}
                  title="View members"
                >
                  <Users size={20} />
                </button>
              )}
              {onSettingsClick && (
                <button
                  type="button"
                  onClick={onSettingsClick}
                  className={topActionButtonClass}
                  title="Settings"
                >
                  <Settings size={20} />
                </button>
              )}
              {mobile && (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className={topActionButtonClass}
                  title="Close"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
        {memberActionError && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {memberActionError}
          </div>
        )}
      </div>

      <div className="flex h-full flex-col overflow-y-auto bg-gradient-to-b from-gray-50 to-gray-100 p-5 dark:from-[#0f172a] dark:to-[#0f172a]">
        {/* Channel/Broadcast Members Card */}
        {/* {isCurrentUserAdmin && (
          <div className="mb-5 transform overflow-hidden rounded-xl bg-white shadow-md transition-all duration-200 hover:shadow-lg dark:border dark:border-[#344155]">
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              <button
                type="button"
                onClick={onEditChat}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600 dark:bg-green-900/20">
                  <Pencil size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Edit {channelId ? "Channel" : "Broadcast"} Settings
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Modify name or privacy settings
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={onDeleteChat}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-red-50/50 dark:hover:bg-red-900/10"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20">
                  <Trash2 size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-600">
                    Delete {channelId ? "Channel" : "Broadcast"}
                  </p>
                  <p className="text-[11px] text-red-500/70">
                    Permanently remove this chat
                  </p>
                </div>
              </button>
            </div>
          </div>
        )} */}
        {channelId && (
          <div className="mb-5 transform rounded-xl bg-white shadow-md dark:border dark:border-[#344155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <SectionHeader
              icon={Users}
              label="Channel members"
              extra={
                channelInfo?.is_private && pendingChannelInvites.length > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    {pendingChannelInvites.length} pending
                  </span>
                ) : undefined
              }
              onExpand={() => setExpandedDrawer("members")}
              badge={channelInfo?.member_count ?? 0}
            />
          </div>
        )}
        {broadcastId && (
          <div className="mb-5 transform rounded-xl bg-white shadow-md dark:border dark:border-[#344155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <SectionHeader
              icon={Users}
              label="Broadcast members"
              onExpand={() => setExpandedDrawer("members")}
              badge={broadcastInfo?.member_count ?? 0}
            />
          </div>
        )}

        {/* Shared assets group */}
        <div className="space-y-2 lg:space-y-5">
          {/* URLs */}
          <div className="transform rounded-xl bg-white shadow-md dark:border dark:border-[#344155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <SectionHeader
              icon={LinkIcon}
              label="Legal Links"
              onExpand={() => setExpandedDrawer("urls")}
              badge={sharedUrls.length}
            />
          </div>

          {/* Media */}
          <div className="transform rounded-xl bg-white shadow-md dark:border dark:border-[#344155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <SectionHeader
              icon={ImageIcon}
              label="Case Documents"
              onExpand={() => setExpandedDrawer("media")}
              badge={mediaItems.length}
            />
          </div>

          {/* Bookmarks */}
          <div className="transform rounded-xl bg-white shadow-md dark:border dark:border-[#344155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <SectionHeader
              icon={Bookmark}
              label="Bookmarked messages"
              onExpand={() => setExpandedDrawer("bookmarks")}
              badge={bookmarkCount}
            />
          </div>

          {/* Pinned Messages */}
          <div className="transform rounded-xl bg-white shadow-md dark:border dark:border-[#344155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <SectionHeader
              icon={Pin}
              label="Pinned Messages"
              onExpand={() => setExpandedDrawer("pins")}
              badge={pinCount}
            />
          </div>

          {/* Task */}
          <div className="transform rounded-xl bg-white shadow-md dark:border dark:border-[#344155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <SectionHeader
              icon={ListTodo}
              label="Case Task"
              onExpand={() => setExpandedDrawer("todo")}
              badge={todoCount}
            />
          </div>
        </div>

        {/* Credentials Card */}
        <div className="mt-5 transform rounded-xl bg-white shadow-md dark:border dark:border-[#344155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <SectionHeader
            icon={ClipboardList}
            label="Access Credentials"
            onExpand={() => setExpandedDrawer("credentials")}
          />
        </div>

        {/* Personal Notes Card */}
        <div className="mt-5 transform rounded-xl bg-white shadow-md dark:border dark:border-[#344155] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <SectionHeader
            icon={Mail}
            label="Lawyer Notes"
            onExpand={() => setExpandedDrawer("notes")}
          />
        </div>

        {/* ---- BOTTOM SPACE UTILIZED ---- */}
        <div className="mt-6 flex-1">
          <div className="sticky top-full rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
            {showInstallPrompt ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  Install Our App
                </h3>

                <p className="text-sm leading-relaxed text-slate-400">
                  Access case files, legal documents, and updates instantly.
Stay connected with your legal team and manage cases efficiently anytime, anywhere.
                </p>

                <div className="pt-2">
                  <InstallButton />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-indigo-50 p-2 text-indigo-600">
                  <LightbulbIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">
                    Workspace tip
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Use{" "}
                    <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">
                      Ctrl+K
                    </kbd>{" "}
                    to quickly search across all channels and direct messages.
                  </p>
                  <button className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                    More shortcuts →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {renderDrawerShell({
        sectionKey: "members",
        icon: Users,
        title: `${broadcastId ? "Broadcast" : "Channel"} members`,
        headerExtra:
          channelInfo?.is_private && pendingChannelInvites.length > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {pendingChannelInvites.length} pending
            </span>
          ) : undefined,
        children: renderMemberRows(),
      })}
      {renderDrawerShell({
        sectionKey: "urls",
        icon: LinkIcon,
        title: "Legal Links",
        children: renderUrlRows(),
      })}
      {renderDrawerShell({
        sectionKey: "media",
        icon: ImageIcon,
        title: "Case Documents",
        children: renderMediaRows(),
      })}
      {renderDrawerShell({
        sectionKey: "bookmarks",
        icon: Bookmark,
        title: "Bookmarked messages",
        children: renderBookmarkRows(true),
      })}
      {renderDrawerShell({
        sectionKey: "pins",
        icon: Pin,
        title: "Pinned messages",
        children: renderPinnedRows(true),
      })}
      {renderDrawerShell({
        sectionKey: "credentials",
        icon: ClipboardList,
        title: "Access Credentials",
        children: renderCredentialsEditor(),
      })}
      {renderDrawerShell({
        sectionKey: "notes",
        icon: Mail,
        title: "Lawyer Notes",
        headerExtra: detailsSaveMessage ? (
          <span className="ml-1 text-xs font-medium text-slate-500">
            {detailsSaveMessage}
          </span>
        ) : undefined,
        children: renderNotesEditor(false),
      })}
      {renderDrawerShell({
        sectionKey: "todo",
        icon: ListTodo,
        title: "Case Task",
        children: renderTodoRows(true),
      })}
    </>
  );

  return (
    <>
      <aside className="relative hidden xl:flex w-[320px] border-l border-slate-200 bg-white flex-col dark:bg-[#0f172a]">
        {renderPanel(false)}
      </aside>

      {mobileOpen && (
        <aside className="fixed inset-0 z-50 flex xl:hidden flex-col bg-white dark:bg-[#0f172a]">
          {renderPanel(true)}
        </aside>
      )}

      <FileViewerModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        url={fileLink}
        name={fileName}
        type={fileType}
      />
    </>
  );
}
