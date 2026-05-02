import { useState, useEffect, useRef } from "react";
import {
  Hash,
  Lock,
  Plus,
  Search,
  Settings,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  UserPlus,
  Check,
  Moon,
  Sun,
  Bell,
  Archive,
  RotateCcw,
  X,
  MessageSquare,
  Phone,
  Video,
  Info,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";
import { SettingsModal } from "../modals/SettingsModal";
import { isOnline } from "../utils/isOnline";
import { capitalizeFirst } from "../../lib/text";
import { parseChannelSystemMessage } from "../../lib/channelSystemMessages";

interface Channel {
  id: string;
  name: string;
  is_private: boolean;
  workspace_id?: string | null;
  is_member: boolean;
  created_by?: string | null;
  created_at?: string;
  unread_count?: number;
  is_admin?: boolean;
  is_archived?: boolean;
  archived_at?: string | null;
  last_activity_at?: string | null;
  last_message_preview?: string | null;
}

interface Broadcast {
  id: string;
  name: string;
  workspace_id?: string | null;
  is_member: boolean;
  created_by?: string | null;
  created_at?: string;
  unread_count?: number;
  is_admin?: boolean;
  is_archived?: boolean;
  archived_at?: string | null;
  last_activity_at?: string | null;
}

interface DMConversation {
  id: string;
  has_existing_dm?: boolean;
  last_activity_at?: string | null;
  last_message_preview?: string | null;
  other_user: {
    id: string;
    email?: string;
    full_name: string;
    avatar_url: string | null;
    avatar_color: string | null;
    is_signedin: boolean;
    last_seen: string;
  };
  unread_count?: number;
  is_archived?: boolean;
  archived_at?: string | null;
}

interface DMSidebarSummaryRow {
  id: string;
  user1_id: string;
  user2_id: string;
  user1_last_read_at: string | null;
  user2_last_read_at: string | null;
  created_at: string | null;
  other_user_id: string;
  other_email?: string | null;
  other_full_name: string;
  other_avatar_url: string | null;
  other_avatar_color: string | null;
  other_is_signedin: boolean;
  other_last_seen: string;
  latest_content?: string | null;
  latest_created_at?: string | null;
  latest_user_id?: string | null;
  latest_attachment_name?: string | null;
  latest_attachment_type?: string | null;
  latest_is_deleted?: boolean | null;
  unread_count?: number | null;
}

interface SidebarProps {
  onChannelSelect: (channelId: string) => void;
  onBroadcastSelect?: (broadcastId: string) => void;
  onDMSelect: (dmId: string, otherUserId: string) => void;
  onNewChannel: () => void;
  onNewBroadcast?: () => void;
  onNewDM: () => void;
  onInvitePeople?: () => void;
  onSearch?: () => void;
  selectedChannelId?: string;
  selectedBroadcastId?: string;
  selectedDMId?: string;
  isDarkMode?: boolean;
  onToggleDarkMode: () => void;
  onToggleNotifications?: () => void;
  onStartDMCall?: (mode: "audio" | "video") => void;
  onEditChannel?: (channel: Channel) => void;
  onDeleteChannel?: (channelId: string) => void;
  onEditBroadcast?: (broadcast: Broadcast) => void;
  onDeleteBroadcast?: (broadcastId: string) => void;
  mobileListMode?: boolean;
}

const PERSONAL_DEFAULT_CHANNEL_NAMES = new Set(["general", "ideas", "support"]);

const sortDMConversations = (inputDMs: DMConversation[]) =>
  [...inputDMs].sort((left, right) => {
    const leftUnread = left.unread_count ?? 0;
    const rightUnread = right.unread_count ?? 0;

    if (leftUnread !== rightUnread) {
      return rightUnread - leftUnread;
    }

    const leftActivity = left.last_activity_at
      ? new Date(left.last_activity_at).getTime()
      : 0;
    const rightActivity = right.last_activity_at
      ? new Date(right.last_activity_at).getTime()
      : 0;

    if (leftActivity !== rightActivity) {
      return rightActivity - leftActivity;
    }

    return left.other_user.full_name.localeCompare(right.other_user.full_name);
  });

export function Sidebar({
  onChannelSelect,
  onBroadcastSelect,
  onDMSelect,
  onNewChannel,
  onNewBroadcast,
  onNewDM,
  onInvitePeople,
  selectedChannelId,
  selectedDMId,
  selectedBroadcastId,
  onEditBroadcast,
  onDeleteBroadcast,
  isDarkMode,
  onToggleDarkMode,
  onToggleNotifications,
  onStartDMCall,
  mobileListMode = false,
}: SidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dms, setDMs] = useState<DMConversation[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [publicChannelsCollapsed, setPublicChannelsCollapsed] = useState(false);
  const [privateChannelsCollapsed, setPrivateChannelsCollapsed] =
    useState(false);
  const [broadcastsCollapsed, setBroadcastsCollapsed] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [archivedChatsCollapsed, setArchivedChatsCollapsed] = useState(true);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [mobileChatSearchQuery, setMobileChatSearchQuery] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState<{
    name: string;
    avatarUrl: string | null;
    avatarColor: string | null;
    dmId?: string;
    otherUserId?: string;
  } | null>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const { user, profile } = useAuth();
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    canManageWorkspace,
    isWorkspaceOwner,
    setActiveWorkspaceId,
  } = useWorkspaces();
  const formatUnreadCount = (count?: number) => {
    if (!count) return null;
    return count > 99 ? "99+" : String(count);
  };

  const openProfileImagePreview = (profile: {
    name: string;
    avatarUrl: string | null;
    avatarColor: string | null;
    dmId?: string;
    otherUserId?: string;
  }) => {
    setProfileImagePreview(profile);
  };

  const openPreviewDM = () => {
    if (!profileImagePreview?.dmId || !profileImagePreview.otherUserId) return;

    onDMSelect(profileImagePreview.dmId, profileImagePreview.otherUserId);
    setProfileImagePreview(null);
  };

  const startPreviewDMCall = (mode: "audio" | "video") => {
    if (!profileImagePreview?.dmId || !profileImagePreview.otherUserId) return;

    onDMSelect(profileImagePreview.dmId, profileImagePreview.otherUserId);
    setProfileImagePreview(null);
    onStartDMCall?.(mode);
  };

  const formatLastMessagePreview = (
    message?: {
      content?: string | null;
      attachment_name?: string | null;
      attachment_type?: string | null;
      is_deleted?: boolean | null;
      user_id?: string | null;
    } | null,
  ) => {
    if (!message) return null;
    if (message.is_deleted) return "This message was deleted";

    const text = message.content?.trim();
    const systemMessagePreview = text
      ? parseChannelSystemMessage(text, {
          isCurrentUser: message.user_id === user?.id,
        })
      : null;
    const attachmentType = message.attachment_type ?? "";
    const attachmentLabel = attachmentType.startsWith("image/")
      ? "Photo"
      : attachmentType.startsWith("video/")
        ? "Video"
        : attachmentType.startsWith("audio/")
          ? "Audio"
          : message.attachment_name
            ? "Attachment"
            : null;
    const preview =
      systemMessagePreview || text || attachmentLabel || "Sent a message";

    if (systemMessagePreview) {
      return preview;
    }

    return message.user_id === user?.id ? ` ${preview}` : preview;
  };

  const normalizeChannelName = (name: string) => name.trim().toLowerCase();

  const workspaceOwnerId = activeWorkspace?.created_by || user?.id;

  useEffect(() => {
    if (!showWorkspaceMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(event.target as Node)
      ) {
        setShowWorkspaceMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowWorkspaceMenu(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showWorkspaceMenu]);

  useEffect(() => {
    setShowWorkspaceMenu(false);
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (mobileListMode) {
      setArchivedChatsCollapsed(true);
    }
  }, [mobileListMode]);

  const scoreChannel = (channel: Channel, ownerId?: string) => {
    const normalizedName = normalizeChannelName(channel.name);
    const isOwnedDefault =
      PERSONAL_DEFAULT_CHANNEL_NAMES.has(normalizedName) &&
      channel.created_by === user?.id;

    return {
      isOwnedDefault,
      priority:
        (channel.is_member ? 100 : 0) +
        (isOwnedDefault ? 50 : 0) +
        (channel.created_by === ownerId ? 20 : 0) +
        (channel.created_by === user?.id ? 10 : 0),
      createdAt: channel.created_at
        ? new Date(channel.created_at).getTime()
        : 0,
    };
  };

  const dedupeChannels = (inputChannels: Channel[]) => {
    const channelsByName = new Map<string, Channel>();

    inputChannels.forEach((channel) => {
      const normalizedName = normalizeChannelName(channel.name);
      const existing = channelsByName.get(normalizedName);

      if (!existing) {
        channelsByName.set(normalizedName, channel);
        return;
      }

      const existingScore = scoreChannel(existing, workspaceOwnerId);
      const nextScore = scoreChannel(channel, workspaceOwnerId);

      if (
        nextScore.priority > existingScore.priority ||
        (nextScore.priority === existingScore.priority &&
          nextScore.createdAt < existingScore.createdAt)
      ) {
        channelsByName.set(normalizedName, channel);
      }
    });

    return Array.from(channelsByName.values()).sort((left, right) =>
      normalizeChannelName(left.name).localeCompare(
        normalizeChannelName(right.name),
      ),
    );
  };

  // const incrementChannelUnreadCount = (channelId: string) => {
  //   setChannels((current) =>
  //     current.map((channel) =>
  //       channel.id === channelId
  //         ? {
  //             ...channel,
  //             unread_count:
  //               selectedChannelId === channelId
  //                 ? 0
  //                 : (channel.unread_count ?? 0) + 1,
  //           }
  //         : channel,
  //     ),
  //   );
  // };

  const clearChannelUnreadCount = (channelId: string) => {
    setChannels((current) =>
      current.map((channel) =>
        channel.id === channelId ? { ...channel, unread_count: 0 } : channel,
      ),
    );
  };

  useEffect(() => {
    if (!user || !activeWorkspaceId) return;

    void loadChannels();
    void loadBroadcasts();
    void loadDMs();

    const channelsSubscription = supabase
      .channel("sidebar-channel-events")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channels",
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        () => void loadChannels(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_members",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = (payload.new || payload.old) as
            | { user_id?: string; channel_id?: string }
            | undefined;

          if (row?.user_id === user.id && row.channel_id) {
            clearChannelUnreadCount(row.channel_id);
          }

          void loadChannels();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "broadcasts",
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        () => void loadBroadcasts(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_hidden_memberships",
        },
        (payload) => {
          const row = (payload.new || payload.old) as
            | { user_id?: string }
            | undefined;

          if (row?.user_id === user.id) {
            void loadChannels();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "broadcast_members",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadBroadcasts();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_hidden_memberships",
        },
        (payload) => {
          const row = (payload.new || payload.old) as
            | { user_id?: string }
            | undefined;

          if (row?.user_id === user.id) {
            void loadChannels();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_archives",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadChannels();
          void loadDMs();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const row = payload.new as
            | {
                channel_id?: string | null;
                workspace_id?: string | null;
                user_id?: string;
                thread_id?: string | null;
                parent_id?: string | null;
                created_at?: string | null;
                content?: string | null;
                attachment_name?: string | null;
                attachment_type?: string | null;
                is_deleted?: boolean | null;
              }
            | undefined;

          if (row?.workspace_id && row.workspace_id !== activeWorkspaceId) {
            return;
          }

          if (row?.channel_id && !row.thread_id && !row.parent_id) {
            setChannels((current) =>
              current.map((channel) =>
                channel.id === row.channel_id
                  ? {
                      ...channel,
                      last_activity_at:
                        row.created_at ?? new Date().toISOString(),
                      last_message_preview: formatLastMessagePreview(row),
                      unread_count:
                        row.user_id !== user.id
                          ? selectedChannelId === row.channel_id
                            ? 0
                            : (channel.unread_count ?? 0) + 1
                          : (channel.unread_count ?? 0),
                    }
                  : channel,
              ),
            );
            void loadChannels();
            return;
          }

          void loadChannels();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        (payload) => {
          if (payload.eventType !== "INSERT") {
            void loadChannels();
          }
        },
      )
      .subscribe();

    const dmSubscription = supabase
      .channel("sidebar-dm-events")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_members",
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        () => void loadDMs(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        () => void loadDMs(),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_message_messages",
        },
        (payload) => {
          const row = payload.new as
            | {
                dm_id?: string | null;
                workspace_id?: string | null;
                user_id?: string;
                thread_id?: string | null;
                created_at?: string;
                content?: string | null;
                attachment_name?: string | null;
                attachment_type?: string | null;
                is_deleted?: boolean | null;
              }
            | undefined;

          if (row?.workspace_id && row.workspace_id !== activeWorkspaceId) {
            return;
          }

          if (!row?.dm_id || row.thread_id) {
            return;
          }

          setDMs((current) =>
            sortDMConversations(
              current.map((dm) =>
                dm.id === row.dm_id
                  ? {
                      ...dm,
                      last_activity_at:
                        row.created_at ?? new Date().toISOString(),
                      last_message_preview: formatLastMessagePreview(row),
                      unread_count:
                        row.user_id !== user.id && selectedDMId !== row.dm_id
                          ? (dm.unread_count ?? 0) + 1
                          : (dm.unread_count ?? 0),
                      // unread_count: (dm.unread_count ?? 0) + 1,
                    }
                  : dm,
              ),
            ),
          );
          void loadDMs();
        },
      )
      .subscribe();

    const handleConversationRead = () => {
      if (selectedChannelId) {
        clearChannelUnreadCount(selectedChannelId);
      }
    };

    const handleMessageCreated = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          channel_id?: string | null;
          broadcast_id?: string | null;
          dm_id?: string | null;
          user_id?: string | null;
          content?: string | null;
          attachment_name?: string | null;
          attachment_type?: string | null;
          is_deleted?: boolean | null;
        }>
      ).detail;

      if (detail?.channel_id) {
        setChannels((current) =>
          current.map((channel) =>
            channel.id === detail.channel_id
              ? {
                  ...channel,
                  last_activity_at: new Date().toISOString(),
                  last_message_preview: formatLastMessagePreview(detail),
                  unread_count:
                    selectedChannelId === detail.channel_id
                      ? 0
                      : (channel.unread_count ?? 0),
                }
              : channel,
          ),
        );

        if (selectedChannelId === detail.channel_id) {
          clearChannelUnreadCount(detail.channel_id);
        }

        if (detail?.broadcast_id) {
          setBroadcasts((current) =>
            current.map((broadcast) =>
              broadcast.id === detail.broadcast_id
                ? {
                    ...broadcast,
                    last_activity_at: new Date().toISOString(),
                    last_message_preview: formatLastMessagePreview(detail),
                    unread_count:
                      selectedBroadcastId === detail.broadcast_id
                        ? 0
                        : (broadcast.unread_count ?? 0),
                  }
                : broadcast,
            ),
          );
        }
      }

      if (detail?.dm_id) {
        setDMs((current) =>
          sortDMConversations(
            current.map((dm) =>
              dm.id === detail.dm_id
                ? {
                    ...dm,
                    last_activity_at: new Date().toISOString(),
                    last_message_preview: formatLastMessagePreview(detail),
                    unread_count: 0,
                  }
                : dm,
            ),
          ),
        );
      }
    };

    const handleChannelMembershipChanged = () => {
      void loadChannels();
    };

    const handleChatArchiveChanged = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          action?: "archive" | "restore";
          type?: "channel" | "broadcast" | "dm";
          id?: string;
          archived_at?: string;
        }>
      ).detail;

      if (!detail?.id || !detail.type || detail.action !== "archive") {
        return;
      }

      if (detail.type === "channel") {
        setChannels((current) =>
          current.map((channel) =>
            channel.id === detail.id
              ? {
                  ...channel,
                  is_archived: true,
                  archived_at: detail.archived_at ?? new Date().toISOString(),
                }
              : channel,
          ),
        );
        return;
      }

      if (detail.type === "broadcast") {
        setBroadcasts((current) =>
          current.map((broadcast) =>
            broadcast.id === detail.id
              ? {
                  ...broadcast,
                  is_archived: true,
                  archived_at: detail.archived_at ?? new Date().toISOString(),
                }
              : broadcast,
          ),
        );
        return;
      }

      setDMs((current) =>
        current.map((dm) =>
          dm.id === detail.id
            ? {
                ...dm,
                is_archived: true,
                archived_at: detail.archived_at ?? new Date().toISOString(),
              }
            : dm,
        ),
      );
    };

    const refreshSidebarState = () => {
      void loadChannels();
      void loadBroadcasts();
      void loadDMs();
    };

    const handleChatPushReceived = () => {
      refreshSidebarState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshSidebarState();
      }
    };

    window.addEventListener("conversation-read", handleConversationRead);
    window.addEventListener("message-created", handleMessageCreated);
    window.addEventListener(
      "channel-membership-changed",
      handleChannelMembershipChanged,
    );
    window.addEventListener("chat-archive-changed", handleChatArchiveChanged);
    window.addEventListener("chat-push-received", handleChatPushReceived);
    window.addEventListener("focus", refreshSidebarState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      channelsSubscription.unsubscribe();
      dmSubscription.unsubscribe();
      window.removeEventListener("conversation-read", handleConversationRead);
      window.removeEventListener("message-created", handleMessageCreated);
      window.removeEventListener(
        "channel-membership-changed",
        handleChannelMembershipChanged,
      );
      window.removeEventListener(
        "chat-archive-changed",
        handleChatArchiveChanged,
      );
      window.removeEventListener("chat-push-received", handleChatPushReceived);
      window.removeEventListener("focus", refreshSidebarState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    activeWorkspaceId,
    profile?.id,
    selectedBroadcastId,
    selectedChannelId,
    selectedDMId,
    user?.id,
  ]);

  const handleDeleteChannel = async (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);

    if (!channel?.is_admin) {
      alert("You are not an admin of this channel");
      return;
    }
    if (!confirm("Are you sure you want to delete this channel?")) return;

    const data = await (supabase as any)
      .from("channels")
      .delete()
      .eq("id", channelId);
    console.log("Data Came After Deletion : ", data);
    loadChannels();
    if (selectedChannelId === channelId) {
      onChannelSelect("");
    }
  };

  const handlePermanentlyRemoveUser = async (dm: DMConversation) => {
    if (!user || !isWorkspaceOwner) return;

    const memberName = capitalizeFirst(dm.other_user.full_name);
    const confirmed = confirm(
      `Permanently remove ${memberName} from your workspace?`,
    );

    if (!confirmed) return;

    setRemovingUserId(dm.other_user.id);

    const { error } = await (supabase as any).rpc(
      "admin_permanently_remove_user",
      {
        p_user_id: dm.other_user.id,
      },
    );

    setRemovingUserId(null);

    if (error) {
      alert(error.message || "Failed to remove this user.");
      return;
    }

    setDMs((current) =>
      current.filter((item) => item.other_user.id !== dm.other_user.id),
    );
    void loadChannels();
    void loadDMs();

    if (selectedDMId === dm.id) {
      onDMSelect("", "");
    }
  };

  const archiveChat = async (
    chat:
      | { type: "channel"; id: string }
      | { type: "dm"; id: string }
      | { type: "broadcast"; id: string },
  ) => {
    if (!user || !activeWorkspaceId) return;

    const archiveRecord =
      chat.type === "channel"
        ? {
            workspace_id: activeWorkspaceId,
            user_id: user.id,
            channel_id: chat.id,
            dm_id: null,
            archived_at: new Date().toISOString(),
          }
        : chat.type === "broadcast"
          ? {
              workspace_id: activeWorkspaceId,
              user_id: user.id,
              channel_id: null,
              dm_id: null,
              broadcast_id: chat.id,
              archived_at: new Date().toISOString(),
            }
          : {
              workspace_id: activeWorkspaceId,
              user_id: user.id,
              channel_id: null,
              dm_id: chat.id,
              archived_at: new Date().toISOString(),
            };

    const { error } = await (supabase as any)
      .from("chat_archives")
      .upsert(archiveRecord, {
        onConflict:
          chat.type === "channel"
            ? "user_id,channel_id"
            : chat.type === "broadcast"
              ? "user_id,broadcast_id"
              : "user_id,dm_id",
      });

    if (error) {
      alert(error.message || "Failed to archive this chat.");
      return;
    }

    if (chat.type === "channel") {
      setChannels((current) =>
        current.map((channel) =>
          channel.id === chat.id
            ? {
                ...channel,
                is_archived: true,
                archived_at: archiveRecord.archived_at,
              }
            : channel,
        ),
      );

      if (selectedChannelId === chat.id) {
        onChannelSelect("");
      }
    } else if (chat.type === "broadcast") {
      setBroadcasts((current) =>
        current.map((broadcast) =>
          broadcast.id === chat.id
            ? {
                ...broadcast,
                is_archived: true,
                archived_at: archiveRecord.archived_at,
              }
            : broadcast,
        ),
      );
      if (selectedBroadcastId === chat.id) {
        onBroadcastSelect?.("");
      }
    } else {
      setDMs((current) =>
        current.map((dm) =>
          dm.id === chat.id
            ? {
                ...dm,
                is_archived: true,
                archived_at: archiveRecord.archived_at,
              }
            : dm,
        ),
      );

      if (selectedDMId === chat.id) {
        onDMSelect("", "");
      }
    }
  };

  const unarchiveChat = async (
    chat:
      | { type: "channel"; id: string }
      | { type: "dm"; id: string }
      | { type: "broadcast"; id: string },
  ) => {
    if (!user) return;

    let query = (supabase as any)
      .from("chat_archives")
      .delete()
      .eq("user_id", user.id);

    if (chat.type === "channel") {
      query = query.eq("channel_id", chat.id);
    } else if (chat.type === "broadcast") {
      query = query.eq("broadcast_id", chat.id);
    } else {
      query = query.eq("dm_id", chat.id);
    }

    const { error } = await query;

    if (error) {
      alert(error.message || "Failed to restore this chat.");
      return;
    }

    if (chat.type === "channel") {
      setChannels((current) =>
        current.map((channel) =>
          channel.id === chat.id
            ? { ...channel, is_archived: false, archived_at: null }
            : channel,
        ),
      );
    } else if (chat.type === "broadcast") {
      setBroadcasts((current) =>
        current.map((broadcast) =>
          broadcast.id === chat.id
            ? { ...broadcast, is_archived: false, archived_at: null }
            : broadcast,
        ),
      );
    } else {
      setDMs((current) =>
        current.map((dm) =>
          dm.id === chat.id
            ? { ...dm, is_archived: false, archived_at: null }
            : dm,
        ),
      );
    }

    if (mobileListMode) {
      setArchivedChatsCollapsed(true);
    }
  };

  const loadChannels = async () => {
    if (!user || !activeWorkspaceId) {
      setChannels([]);
      return;
    }
    const [
      { data: visibleChannels, error: channelsError },
      { data: memberships, error: membershipsError },
      { data: hiddenChannels, error: hiddenChannelsError },
      { data: archivedChats, error: archivedChatsError },
    ] = await Promise.all([
      supabase
        .from("channels")
        .select("id, name, is_private, workspace_id, created_by, created_at")
        .eq("workspace_id", activeWorkspaceId)
        .order("name", { ascending: true }),
      supabase
        .from("channel_members")
        .select("channel_id, role, last_read_at")
        .eq("user_id", user.id),
      (supabase as any)
        .from("channel_hidden_memberships")
        .select("channel_id")
        .eq("user_id", user.id),
      (supabase as any)
        .from("chat_archives")
        .select("channel_id, archived_at")
        .eq("user_id", user.id)
        .eq("workspace_id", activeWorkspaceId)
        .not("channel_id", "is", null),
    ]);

    if (
      channelsError ||
      membershipsError ||
      hiddenChannelsError ||
      archivedChatsError
    ) {
      return;
    }

    const membershipMap = new Map(
      (memberships || []).map((m: any) => [
        m.channel_id,
        {
          is_member: true,
          is_admin: m.role === "admin",
          last_read_at: m.last_read_at,
        },
      ]),
    );
    const hiddenChannelIds = new Set(
      ((hiddenChannels as Array<{ channel_id: string }> | null) ?? []).map(
        (hiddenChannel) => hiddenChannel.channel_id,
      ),
    );
    const archivedChannelMap = new Map(
      (
        (archivedChats as Array<{
          channel_id: string | null;
          archived_at: string;
        }> | null) ?? []
      )
        .filter((archive) => Boolean(archive.channel_id))
        .map((archive) => [archive.channel_id as string, archive.archived_at]),
    );

    const scopedChannels = (
      ((visibleChannels as any[]) || []) as Array<{
        id: string;
        name: string;
        is_private: boolean;
        created_by: string | null;
        created_at: string;
      }>
    ).filter((channel) => {
      const membership = membershipMap.get(channel.id);

      if (membership?.is_member) {
        return true;
      }

      if (hiddenChannelIds.has(channel.id)) {
        return false;
      }

      return !channel.is_private;
    });

    const channelIds = scopedChannels.map((channel) => channel.id);
    const latestMessagesByChannel = new Map<
      string,
      {
        created_at?: string | null;
        content?: string | null;
        user_id?: string | null;
        attachment_name?: string | null;
        attachment_type?: string | null;
        is_deleted?: boolean | null;
      }
    >();

    if (channelIds.length > 0) {
      const { data: latestMessages } = await supabase
        .from("messages")
        .select(
          "channel_id, content, created_at, user_id, attachment_name, attachment_type, is_deleted",
        )
        .in("channel_id", channelIds)
        .is("thread_id", null)
        .is("parent_id", null)
        .order("created_at", { ascending: false });

      (
        (latestMessages as Array<{
          channel_id: string | null;
          created_at?: string | null;
          content?: string | null;
          user_id?: string | null;
          attachment_name?: string | null;
          attachment_type?: string | null;
          is_deleted?: boolean | null;
        }> | null) ?? []
      ).forEach((message) => {
        if (
          !message.channel_id ||
          latestMessagesByChannel.has(message.channel_id)
        ) {
          return;
        }

        latestMessagesByChannel.set(message.channel_id, message);
      });
    }

    const nextChannels = await Promise.all(
      scopedChannels.map(async (channel) => {
        const membership = membershipMap.get(channel.id);
        let unreadCount = 0;
        const latestMessage = latestMessagesByChannel.get(channel.id) ?? null;

        if (membership?.is_member) {
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("channel_id", channel.id)
            .is("thread_id", null)
            .is("parent_id", null)
            .neq("user_id", user.id)
            .gt("created_at", membership.last_read_at);

          unreadCount = count ?? 0;
        }

        return {
          ...channel,
          is_member: !!membership,
          is_admin:
            Boolean(membership?.is_admin) && channel.created_by === user.id,
          unread_count: unreadCount,
          is_archived: archivedChannelMap.has(channel.id),
          archived_at: archivedChannelMap.get(channel.id) ?? null,
          last_activity_at: latestMessage?.created_at ?? null,
          last_message_preview: formatLastMessagePreview(latestMessage),
        };
      }),
    );

    setChannels(dedupeChannels(nextChannels));
  };

  const loadBroadcasts = async () => {
    if (!user || !activeWorkspaceId) {
      setBroadcasts([]);
      return;
    }

    const [
      { data: visibleBroadcasts, error: broadcastsError },
      { data: memberships, error: membershipsError },
      { data: archivedChats, error: archivedChatsError },
    ] = await Promise.all([
      supabase
        .from("broadcasts")
        .select("id, name, workspace_id, created_by, created_at")
        .eq("workspace_id", activeWorkspaceId)
        .order("name", { ascending: true }),
      supabase
        .from("broadcast_members")
        .select("broadcast_id, role, last_read_at")
        .eq("user_id", user.id),
      (supabase as any)
        .from("chat_archives")
        .select("broadcast_id, archived_at")
        .eq("user_id", user.id)
        .eq("workspace_id", activeWorkspaceId)
        .not("broadcast_id", "is", null),
    ]);

    if (broadcastsError || membershipsError || archivedChatsError) {
      return;
    }

    const archivedBroadcastMap = new Map(
      (
        (archivedChats as Array<{
          broadcast_id: string | null;
          archived_at: string;
        }> | null) ?? []
      )
        .filter((archive) => Boolean(archive.broadcast_id))
        .map((archive) => [
          archive.broadcast_id as string,
          archive.archived_at,
        ]),
    );

    const membershipMap = new Map(
      (memberships || []).map((m: any) => [
        m.broadcast_id,
        {
          is_member: true,
          is_admin: m.role === "admin",
          last_read_at: m.last_read_at,
        },
      ]),
    );

    const nextBroadcasts = await Promise.all(
      (visibleBroadcasts || []).map(async (broadcast: any) => {
        const membership = membershipMap.get(broadcast.id);
        let unreadCount = 0;

        if (membership?.is_member) {
          const { count } = await supabase
            .from("broadcast_messages")
            .select("id", { count: "exact", head: true })
            .eq("broadcast_id", broadcast.id)
            .neq("user_id", user.id)
            .gt("created_at", membership.last_read_at);
          unreadCount = count ?? 0;
        }
        return {
          ...broadcast,
          is_member: !!membership,
          is_admin: broadcast.created_by === user.id,
          unread_count: unreadCount,
          is_archived: archivedBroadcastMap.has(broadcast.id),
          archived_at: archivedBroadcastMap.get(broadcast.id) ?? null,
        };
      }),
    );

    setBroadcasts(nextBroadcasts);
  };

  const handleChannelClick = async (channel: Channel) => {
    if (!user) return;
    setArchivedChatsCollapsed(true);
    if (!channel.is_member && !channel.is_private) {
      const { error } = await supabase.from("channel_members").insert({
        channel_id: channel.id,
        user_id: user.id,
        role: "member",
      } as any);
      if (error && error.code !== "23505") return;
      await (supabase as any)
        .from("channel_hidden_memberships")
        .delete()
        .eq("channel_id", channel.id)
        .eq("user_id", user.id);
      setChannels((prev) =>
        prev.map((c) => (c.id === channel.id ? { ...c, is_member: true } : c)),
      );
    }
    onChannelSelect(channel.id);
  };

  const handleBroadcastClick = async (broadcast: Broadcast) => {
    if (!user) return;
    setArchivedChatsCollapsed(true);
    onBroadcastSelect?.(broadcast.id);
  };

  const loadDMs = async () => {
    if (!user || !activeWorkspaceId) {
      setDMs([]);
      return;
    }

    const [
      { data: dmSummaryData, error: dmSummaryError },
      { data: memberData, error: memberError },
      { data: archivedChats, error: archivedChatsError },
    ] = await Promise.all([
      (supabase as any).rpc("get_dm_sidebar_summaries", {
        p_workspace_id: activeWorkspaceId,
      }),
      (supabase as any)
        .from("workspace_members")
        .select("user_id, joined_at")
        .eq("workspace_id", activeWorkspaceId)
        .eq("is_active", true)
        .is("removed_at", null)
        .neq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .limit(50),
      (supabase as any)
        .from("chat_archives")
        .select("dm_id, archived_at")
        .eq("user_id", user.id)
        .eq("workspace_id", activeWorkspaceId)
        .not("dm_id", "is", null),
    ]);

    if (dmSummaryError || memberError || archivedChatsError) {
      if (dmSummaryError) {
        console.error("Failed to load DM summaries", dmSummaryError);
      }
      return;
    }

    const archivedDMMap = new Map(
      (
        (archivedChats as Array<{
          dm_id: string | null;
          archived_at: string;
        }> | null) ?? []
      )
        .filter((archive) => Boolean(archive.dm_id))
        .map((archive) => [archive.dm_id as string, archive.archived_at]),
    );

    const existingDMs = (dmSummaryData as DMSidebarSummaryRow[] | null) ?? [];
    const existingDMUserIds = existingDMs.map((dm) => dm.other_user_id);
    const recentWorkspaceMemberIds = (
      (memberData as Array<{ user_id: string }> | null) ?? []
    ).map((member) => member.user_id);
    const memberIds = Array.from(
      new Set(
        [...existingDMUserIds, ...recentWorkspaceMemberIds].filter(
          (memberId) => memberId !== user.id,
        ),
      ),
    );

    const { data: workspaceProfiles, error: profilesError } =
      memberIds.length > 0
        ? await supabase
            .from("profiles")
            .select(
              "id, email, full_name, avatar_url, avatar_color, is_signedin, last_seen",
            )
            .in("id", memberIds)
            .order("full_name")
        : { data: [], error: null };

    if (profilesError) return;

    const workspaceProfilesList =
      (workspaceProfiles as Array<{
        id: string;
        email?: string;
        full_name: string;
        avatar_url: string | null;
        avatar_color: string | null;
        is_signedin: boolean;
        last_seen: string;
      }> | null) ?? [];
    const workspaceProfileMap = new Map(
      workspaceProfilesList.map((profileRow) => [profileRow.id, profileRow]),
    );
    const conversationsByUserId = new Map<string, DMConversation>();

    existingDMs.forEach((dm) => {
      const profile = workspaceProfileMap.get(dm.other_user_id) ?? {
        id: dm.other_user_id,
        email: dm.other_email ?? undefined,
        full_name: dm.other_full_name,
        avatar_url: dm.other_avatar_url,
        avatar_color: dm.other_avatar_color,
        is_signedin: dm.other_is_signedin,
        last_seen: dm.other_last_seen,
      };
      const latestMessage = dm.latest_created_at
        ? {
            content: dm.latest_content,
            created_at: dm.latest_created_at,
            user_id: dm.latest_user_id,
            attachment_name: dm.latest_attachment_name,
            attachment_type: dm.latest_attachment_type,
            is_deleted: dm.latest_is_deleted,
          }
        : null;

      conversationsByUserId.set(dm.other_user_id, {
        id: dm.id,
        has_existing_dm: true,
        last_activity_at: dm.latest_created_at ?? null,
        last_message_preview: formatLastMessagePreview(latestMessage),
        other_user: profile,
        unread_count: Number(dm.unread_count ?? 0),
        is_archived: archivedDMMap.has(dm.id),
        archived_at: archivedDMMap.get(dm.id) ?? null,
      });
    });

    recentWorkspaceMemberIds.forEach((memberId) => {
      if (conversationsByUserId.has(memberId)) return;

      const profileRow = workspaceProfileMap.get(memberId);
      if (!profileRow) return;

      conversationsByUserId.set(memberId, {
        id: `workspace-member:${memberId}`,
        has_existing_dm: false,
        last_activity_at: null,
        last_message_preview: null,
        other_user: profileRow,
        unread_count: 0,
      });
    });

    setDMs(sortDMConversations(Array.from(conversationsByUserId.values())));
  };

  const handleDMClick = async (dm: DMConversation) => {
    if (!user) return;
    setArchivedChatsCollapsed(true);

    if (dm.has_existing_dm) {
      onDMSelect(dm.id, dm.other_user.id);
      return;
    }

    if (!activeWorkspaceId) return;

    const [userId1, userId2] = [user.id, dm.other_user.id].sort();

    const { data: existingDM, error: existingDMError } = await supabase
      .from("direct_messages")
      .select("id")
      .eq("workspace_id", activeWorkspaceId)
      .eq("user1_id", userId1)
      .eq("user2_id", userId2)
      .maybeSingle();

    if (existingDMError) return;

    let dmId = (existingDM as { id: string } | null)?.id;

    if (!dmId) {
      const { data: newDM, error: newDMError } = await supabase
        .from("direct_messages")
        .insert({
          workspace_id: activeWorkspaceId,
          user1_id: userId1,
          user2_id: userId2,
        } as any)
        .select("id")
        .single();

      if (newDMError && newDMError.code !== "23505") return;

      if (newDM) {
        dmId = (newDM as { id: string }).id;
      } else {
        const { data: duplicateDM } = await supabase
          .from("direct_messages")
          .select("id")
          .eq("workspace_id", activeWorkspaceId)
          .eq("user1_id", userId1)
          .eq("user2_id", userId2)
          .maybeSingle();

        dmId = (duplicateDM as { id: string } | null)?.id;
      }
    }

    if (!dmId) return;

    onDMSelect(dmId, dm.other_user.id);
    void loadDMs();
  };

  const activeChannels = channels.filter((channel) => !channel.is_archived);
  const publicChannels = activeChannels.filter(
    (channel) => !channel.is_private,
  );
  const privateChannels = activeChannels.filter(
    (channel) => channel.is_private,
  );
  const archivedChannels = channels
    .filter((channel) => channel.is_archived)
    .sort(
      (left, right) =>
        new Date(right.archived_at ?? 0).getTime() -
        new Date(left.archived_at ?? 0).getTime(),
    );
  const activeBroadcasts = broadcasts.filter(
    (broadcast) => !broadcast.is_archived,
  );
  const archivedBroadcasts = broadcasts
    .filter((broadcast) => broadcast.is_archived)
    .sort(
      (left, right) =>
        new Date(right.archived_at ?? 0).getTime() -
        new Date(left.archived_at ?? 0).getTime(),
    );
  const activeDMs = dms.filter((dm) => !dm.is_archived);
  const archivedDMs = dms
    .filter((dm) => dm.is_archived)
    .sort(
      (left, right) =>
        new Date(right.archived_at ?? 0).getTime() -
        new Date(left.archived_at ?? 0).getTime(),
    );
  const archivedChatCount =
    archivedChannels.length + archivedBroadcasts.length + archivedDMs.length;

  const userInitial = profile?.full_name?.[0].toUpperCase() ?? "?";
  const profileImagePreviewModal = profileImagePreview ? (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-5 py-6"
      onClick={() => setProfileImagePreview(null)}
    >
      <div
        className="relative w-[min(82vw,380px)] overflow-hidden bg-slate-950 shadow-2xl sm:w-[min(44vw,390px)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative aspect-square w-full overflow-hidden">
          {profileImagePreview.avatarUrl ? (
            <img
              src={profileImagePreview.avatarUrl}
              alt={capitalizeFirst(profileImagePreview.name)}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-7xl font-bold text-white"
              style={{
                backgroundColor: profileImagePreview.avatarColor || "#3178c6",
              }}
            >
              {capitalizeFirst(profileImagePreview.name)
                .charAt(0)
                .toUpperCase() || "?"}
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex h-14 items-center justify-between bg-black/35 px-4 text-white backdrop-blur-[1px]">
            <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">
              {capitalizeFirst(profileImagePreview.name)}
            </h2>
            <button
              type="button"
              onClick={() => setProfileImagePreview(null)}
              aria-label="Close profile photo"
              className="ml-3 hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white/90 hover:bg-white/15 hover:text-white sm:flex"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="grid h-16 grid-cols-4 items-center bg-slate-950 text-[#3178c6]">
          <button
            type="button"
            aria-label="Message"
            onClick={openPreviewDM}
            disabled={!profileImagePreview.dmId}
            className="flex h-full items-center justify-center transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MessageSquare size={25} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label="Audio call"
            onClick={() => startPreviewDMCall("audio")}
            disabled={!profileImagePreview.dmId || !onStartDMCall}
            className="flex h-full items-center justify-center transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Phone size={25} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label="Video call"
            onClick={() => startPreviewDMCall("video")}
            disabled={!profileImagePreview.dmId || !onStartDMCall}
            className="flex h-full items-center justify-center transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Video size={26} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label="Info"
            onClick={openPreviewDM}
            disabled={!profileImagePreview.dmId}
            className="flex h-full items-center justify-center transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Info size={26} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (mobileListMode) {
    const mobileShowsArchivedChats = !archivedChatsCollapsed;
    const mobileChannels = mobileShowsArchivedChats
      ? archivedChannels
      : activeChannels;
    const mobileBroadcasts = mobileShowsArchivedChats
      ? archivedBroadcasts
      : activeBroadcasts;
    const mobileDMs = mobileShowsArchivedChats ? archivedDMs : activeDMs;
    const chatRows = [
      ...mobileChannels.map((channel) => ({
        id: `channel:${channel.id}`,
        title: capitalizeFirst(channel.name),
        subtitle:
          channel.last_message_preview ||
          (channel.is_private ? "Private channel" : "Channel"),
        unreadCount: channel.unread_count ?? 0,
        sortTimestamp: channel.last_activity_at ?? channel.created_at,
        // sortTimestamp: channel.created_at,
        displayTimestamp: channel.last_activity_at ?? channel.created_at,
        avatarColor: "#3178c6",
        avatarText:
          channel.name
            ?.split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "#",
        onClick: () => void handleChannelClick(channel),
        canArchive: mobileShowsArchivedChats,
        onArchive: () =>
          mobileShowsArchivedChats
            ? void unarchiveChat({ type: "channel", id: channel.id })
            : void archiveChat({ type: "channel", id: channel.id }),
      })),
      ...mobileBroadcasts.map((broadcast) => ({
        id: `broadcast:${broadcast.id}`,
        title: capitalizeFirst(broadcast.name),
        subtitle: "Broadcast",
        unreadCount: broadcast.unread_count ?? 0,
        sortTimestamp: broadcast.last_activity_at ?? broadcast.created_at,
        displayTimestamp: broadcast.last_activity_at ?? broadcast.created_at,
        avatarColor: "#3178c6",
        avatarText:
          broadcast.name
            ?.split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "#",
        onClick: () => void handleBroadcastClick(broadcast),
        canArchive: mobileShowsArchivedChats,
        onArchive: () =>
          mobileShowsArchivedChats
            ? void unarchiveChat({ type: "broadcast", id: broadcast.id })
            : void archiveChat({ type: "broadcast", id: broadcast.id }),
      })),
      ...mobileDMs.map((dm) => ({
        id: `dm:${dm.id}`,
        title: capitalizeFirst(dm.other_user.full_name),
        subtitle: dm.last_message_preview || "Start a conversation",
        unreadCount: dm.unread_count ?? 0,
        sortTimestamp: dm.last_activity_at,
        displayTimestamp: dm.last_activity_at,
        avatarColor: dm.other_user.avatar_color || "#3178c6",
        avatarText:
          capitalizeFirst(dm.other_user.full_name).charAt(0).toUpperCase() ||
          "?",
        avatarUrl: dm.other_user.avatar_url,
        profileName: dm.other_user.full_name,
        profileAvatarColor: dm.other_user.avatar_color,
        profileDMId: dm.id,
        profileOtherUserId: dm.other_user.id,
        isOnline: isOnline(dm.other_user.is_signedin, dm.other_user.last_seen),
        onClick: () => void handleDMClick(dm),
        canArchive: mobileShowsArchivedChats && Boolean(dm.has_existing_dm),
        onArchive: () =>
          mobileShowsArchivedChats
            ? void unarchiveChat({ type: "dm", id: dm.id })
            : void archiveChat({
                type: "dm",
                id: dm.id,
              }),
      })),
    ].sort((left, right) => {
      if (left.unreadCount !== right.unreadCount) {
        return right.unreadCount - left.unreadCount;
      }

      const leftTime = left.sortTimestamp
        ? new Date(left.sortTimestamp).getTime()
        : 0;
      const rightTime = right.sortTimestamp
        ? new Date(right.sortTimestamp).getTime()
        : 0;

      if (leftTime !== rightTime) return rightTime - leftTime;
      return left.title.localeCompare(right.title);
    });
    const normalizedMobileSearchQuery = mobileChatSearchQuery
      .trim()
      .toLowerCase();
    const visibleChatRows = normalizedMobileSearchQuery
      ? chatRows.filter((row) =>
          row.title.toLowerCase().includes(normalizedMobileSearchQuery),
        )
      : chatRows;

    return (
      <>
        <div className="flex h-screen w-full flex-col bg-white font-sans dark:bg-slate-950">
          <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-950 dark:text-white">
                Chats
              </h1>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {activeWorkspace?.name || "LPM-Tool"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {onToggleNotifications && (
                <button
                  type="button"
                  onClick={onToggleNotifications}
                  aria-label="Notifications"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Bell size={20} />
                </button>
              )}
              {canManageWorkspace && (
                <>
                  <button
                    type="button"
                    onClick={onNewChannel}
                    aria-label="Create channel"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#3178c6] hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Hash size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={onNewBroadcast}
                    aria-label="Create broadcast"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#3178c6] hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Plus size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={onInvitePeople}
                    aria-label="Invite Clients & Team"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#3178c6] hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <UserPlus size={20} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                aria-label="Settings"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>

          <div className="flex-shrink-0 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={mobileChatSearchQuery}
                onChange={(event) =>
                  setMobileChatSearchQuery(event.target.value)
                }
                placeholder="Search users or channels"
                className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#3178c6] focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-[#3178c6] dark:focus:bg-slate-950"
              />
            </div>
            {archivedChatCount > 0 ? (
              <button
                type="button"
                onClick={() => setArchivedChatsCollapsed((value) => !value)}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                {mobileShowsArchivedChats ? (
                  <RotateCcw size={14} />
                ) : (
                  <Archive size={14} />
                )}
                {mobileShowsArchivedChats
                  ? "Back to active chats"
                  : `Archived chats (${archivedChatCount})`}
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleChatRows.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-[#3178c6] dark:bg-slate-800">
                  <Plus size={24} />
                </div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {chatRows.length === 0
                    ? mobileShowsArchivedChats
                      ? "No archived chats"
                      : "No chats yet"
                    : "No users or channels found"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {mobileShowsArchivedChats
                    ? "Archived chats you restore will return to your main list."
                    : chatRows.length > 0
                      ? "Try a different name."
                      : canManageWorkspace
                        ? "Create a channel or invite teammates to get started."
                        : "Your channels and direct messages will appear here."}
                </p>
              </div>
            ) : (
              visibleChatRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={row.onClick}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <div
                    role={"profileName" in row ? "button" : undefined}
                    tabIndex={"profileName" in row ? 0 : undefined}
                    aria-label={
                      "profileName" in row
                        ? `View ${capitalizeFirst(row.profileName)} profile photo`
                        : undefined
                    }
                    onClick={(event) => {
                      if (!("profileName" in row)) return;
                      event.preventDefault();
                      event.stopPropagation();
                      openProfileImagePreview({
                        name: row.profileName,
                        avatarUrl: row.avatarUrl ?? null,
                        avatarColor: row.profileAvatarColor ?? row.avatarColor,
                        dmId: row.profileDMId,
                        otherUserId: row.profileOtherUserId,
                      });
                    }}
                    onKeyDown={(event) => {
                      if (
                        !("profileName" in row) ||
                        (event.key !== "Enter" && event.key !== " ")
                      ) {
                        return;
                      }
                      event.preventDefault();
                      event.stopPropagation();
                      openProfileImagePreview({
                        name: row.profileName,
                        avatarUrl: row.avatarUrl ?? null,
                        avatarColor: row.profileAvatarColor ?? row.avatarColor,
                        dmId: row.profileDMId,
                        otherUserId: row.profileOtherUserId,
                      });
                    }}
                    className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white ${
                      "profileName" in row
                        ? "cursor-pointer ring-offset-2 transition hover:ring-2 hover:ring-[#3178c6]"
                        : ""
                    }`}
                    style={{ backgroundColor: row.avatarColor }}
                  >
                    {String(row.avatarText)}
                    {"avatarUrl" in row && row.avatarUrl && (
                      <img
                        src={row.avatarUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    {"isOnline" in row && row.isOnline ? (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-950" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 border-b border-slate-100 pb-1 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-950 dark:text-white">
                        {row.title}
                      </span>
                      {row.displayTimestamp ? (
                        <span className="text-[11px] text-slate-400">
                          {new Date(row.displayTimestamp).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            },
                          )}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm text-slate-500 dark:text-slate-400">
                        {row.subtitle}
                      </p>
                      {row.unreadCount ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
                          {formatUnreadCount(row.unreadCount)}
                        </span>
                      ) : null}
                      {row.canArchive ? (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`${mobileShowsArchivedChats ? "Restore" : "Archive"} ${row.title}`}
                          title={
                            mobileShowsArchivedChats ? "Restore" : "Archive"
                          }
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            row.onArchive();
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") {
                              return;
                            }
                            event.preventDefault();
                            event.stopPropagation();
                            row.onArchive();
                          }}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          {mobileShowsArchivedChats ? (
                            <RotateCcw size={16} />
                          ) : (
                            <Archive size={16} />
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
        {profileImagePreviewModal}
      </>
    );
  }

  return (
    <>
      <div className="w-full flex flex-col h-screen bg-[#f2f3f5] select-none font-sans dark:bg-slate-900">
        {/* ── Header ── */}
        <div
          className={`h-12 px-3 flex items-center ${
            mobileListMode
              ? "justify-between"
              : "justify-center lg:justify-between"
          } border-b border-black/[0.08] shadow-sm transition-colors flex-shrink-0`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* App Icon - Slightly larger on mobile rail for better touch targets */}
            <div className="w-10 h-10 lg:w-7 lg:h-7 rounded-xl lg:rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm bg-[#3178c6]">
              <span className="text-white text-[14px] lg:text-[11px] font-black tracking-tight leading-none">
                LPM
              </span>
            </div>
            {/* Label hidden on mobile */}
            <span
              className={`${
                mobileListMode ? "block" : "hidden lg:block"
              } text-[15px] font-bold text-[#060607] truncate dark:text-white`}
            >
              {activeWorkspace?.name || "LPM-Tool"}
            </span>
          </div>
          {workspaces.length > 1 ? (
            <div
              ref={workspaceMenuRef}
              className={`relative ${mobileListMode ? "block" : "hidden lg:block"}`}
            >
              <button
                type="button"
                onClick={() => setShowWorkspaceMenu((value) => !value)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#4e5058] hover:bg-[#e9eaed] dark:text-slate-300 dark:hover:bg-slate-800"
                title="Switch workspace"
                aria-haspopup="menu"
                aria-expanded={showWorkspaceMenu}
              >
                <span>Switch</span>
                <ChevronDown size={14} />
              </button>

              {showWorkspaceMenu && (
                <div
                  role="menu"
                  className="fixed left-2 top-[52px] z-50 w-[min(14rem,calc(100vw-1rem))] overflow-hidden rounded-lg border border-black/[0.08] bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
                >
                  {workspaces.map((workspace) => {
                    const isActive = workspace.id === activeWorkspaceId;

                    return (
                      <button
                        key={workspace.id}
                        type="button"
                        role="menuitem"
                        onClick={() => setActiveWorkspaceId(workspace.id)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          isActive
                            ? "bg-[#3178c6]/10 text-[#1a5fa8] dark:bg-sky-500/15 dark:text-sky-200"
                            : "text-slate-700 hover:bg-[#f2f3f5] dark:text-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#3178c6] text-[11px] font-bold uppercase text-white">
                          {workspace.name?.charAt(0) || "?"}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {capitalizeFirst(workspace.name)}
                        </span>
                        {isActive && (
                          <Check size={15} className="flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto py-3 lg:py-2 no-scrollbar">
          {archivedChatCount > 0 ? (
            <div
              className={`flex flex-col ${
                mobileListMode
                  ? "items-stretch"
                  : "items-center lg:items-stretch"
              }`}
            >
              <div
                className={`${
                  mobileListMode ? "flex" : "hidden lg:flex"
                } items-center gap-1 px-2 pt-1 pb-1 mx-1 rounded cursor-pointer group`}
                onClick={() => setArchivedChatsCollapsed((value) => !value)}
              >
                {archivedChatsCollapsed ? (
                  <ChevronRight size={12} className="text-[#6d6f78]" />
                ) : (
                  <ChevronDown size={12} className="text-[#6d6f78]" />
                )}
                <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-[#6d6f78]">
                  Archived ({archivedChatCount})
                </span>
              </div>

              {!archivedChatsCollapsed &&
                archivedChannels.map((channel) => (
                  <button
                    key={`top-archived-channel-${channel.id}`}
                    onClick={() => void handleChannelClick(channel)}
                    title={capitalizeFirst(channel.name)}
                    className={`group flex items-center ${
                      mobileListMode
                        ? "justify-start px-3"
                        : "justify-center lg:justify-start lg:px-2"
                    } gap-1.5 h-12 lg:h-8 transition-all duration-200 text-[#4e5058] hover:bg-[#dde1e9] hover:text-[#060607] ${
                      mobileListMode
                        ? "rounded-md w-[calc(100%-16px)]"
                        : "w-11 lg:w-[calc(100%-16px)] rounded-[24px] lg:rounded"
                    } mx-auto lg:mx-2 my-1 lg:my-0.5`}
                  >
                    <span
                      className={`flex-shrink-0 ${mobileListMode ? "flex" : "hidden lg:flex"}`}
                    >
                      {channel.is_private ? (
                        <Lock size={20} className="lg:w-[15px] lg:h-[15px]" />
                      ) : (
                        <Hash size={20} className="lg:w-[15px] lg:h-[15px]" />
                      )}
                    </span>
                    <span
                      className={`${mobileListMode ? "flex" : "hidden lg:flex"} flex-1 truncate text-sm text-slate-600 dark:text-slate-300`}
                    >
                      {capitalizeFirst(channel.name)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Restore ${capitalizeFirst(channel.name)}`}
                      title="Restore"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({ type: "channel", id: channel.id });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({ type: "channel", id: channel.id });
                      }}
                      className="hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-800 group-hover:opacity-100"
                    >
                      <RotateCcw size={13} />
                    </span>
                  </button>
                ))}

              {!archivedChatsCollapsed &&
                archivedBroadcasts.map((broadcast) => (
                  <button
                    key={`top-archived-broadcast-${broadcast.id}`}
                    onClick={() => void handleBroadcastClick(broadcast)}
                    title={capitalizeFirst(broadcast.name)}
                    className={`group flex items-center ${
                      mobileListMode
                        ? "justify-start px-3"
                        : "justify-center lg:justify-start lg:px-2"
                    } gap-1.5 h-12 lg:h-8 transition-all duration-200 text-[#4e5058] hover:bg-[#dde1e9] hover:text-[#060607] ${
                      mobileListMode
                        ? "rounded-md w-[calc(100%-16px)]"
                        : "w-11 lg:w-[calc(100%-16px)] rounded-[24px] lg:rounded"
                    } mx-auto lg:mx-2 my-1 lg:my-0.5`}
                  >
                    <span
                      className={`flex-shrink-0 ${mobileListMode ? "flex" : "hidden lg:flex"}`}
                    >
                      <Hash size={20} className="lg:w-[15px] lg:h-[15px]" />
                    </span>
                    <span
                      className={`${mobileListMode ? "flex" : "hidden lg:flex"} flex-1 truncate text-sm text-slate-600 dark:text-slate-300`}
                    >
                      {capitalizeFirst(broadcast.name)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Restore ${capitalizeFirst(broadcast.name)}`}
                      title="Restore"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({
                          type: "broadcast",
                          id: broadcast.id,
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({
                          type: "broadcast",
                          id: broadcast.id,
                        });
                      }}
                      className="hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-800 group-hover:opacity-100"
                    >
                      <RotateCcw size={13} />
                    </span>
                  </button>
                ))}

              {!archivedChatsCollapsed &&
                archivedDMs.map((dm) => (
                  <button
                    key={`top-archived-dm-${dm.id}`}
                    onClick={() => void handleDMClick(dm)}
                    title={capitalizeFirst(dm.other_user.full_name)}
                    className={`group flex items-center ${
                      mobileListMode
                        ? "justify-start px-3"
                        : "justify-center lg:justify-start lg:px-2"
                    } gap-2 h-12 lg:h-8 transition-all duration-200 hover:bg-[#dde1e9] ${
                      mobileListMode
                        ? "rounded-md w-[calc(100%-16px)]"
                        : "w-11 lg:w-[calc(100%-16px)] rounded-[24px] lg:rounded"
                    } mx-auto lg:mx-2 my-1 lg:my-0.5`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${capitalizeFirst(
                        dm.other_user.full_name,
                      )} profile photo`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openProfileImagePreview({
                          name: dm.other_user.full_name,
                          avatarUrl: dm.other_user.avatar_url,
                          avatarColor: dm.other_user.avatar_color,
                          dmId: dm.id,
                          otherUserId: dm.other_user.id,
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        e.stopPropagation();
                        openProfileImagePreview({
                          name: dm.other_user.full_name,
                          avatarUrl: dm.other_user.avatar_url,
                          avatarColor: dm.other_user.avatar_color,
                          dmId: dm.id,
                          otherUserId: dm.other_user.id,
                        });
                      }}
                      className="relative w-9 h-9 lg:w-7 lg:h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden cursor-pointer ring-offset-2 transition hover:ring-2 hover:ring-[#3178c6]"
                      style={{
                        backgroundColor:
                          dm.other_user.avatar_color || "#64748b",
                      }}
                    >
                      {capitalizeFirst(dm.other_user.full_name)
                        .charAt(0)
                        .toUpperCase() ?? "?"}
                      {dm.other_user.avatar_url && (
                        <img
                          src={dm.other_user.avatar_url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>
                    <span
                      className={`${mobileListMode ? "flex" : "hidden lg:flex"} flex-1 truncate text-sm text-slate-600 dark:text-slate-300`}
                    >
                      {capitalizeFirst(dm.other_user.full_name)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Restore ${capitalizeFirst(
                        dm.other_user.full_name,
                      )}`}
                      title="Restore"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({ type: "dm", id: dm.id });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({ type: "dm", id: dm.id });
                      }}
                      className="hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-800 group-hover:opacity-100"
                    >
                      <RotateCcw size={13} />
                    </span>
                  </button>
                ))}
            </div>
          ) : null}
          {/* BROADCAST */}
          {/* Section Header - Only visible on Desktop */}
          <div
            className={`${
              mobileListMode ? "flex" : "hidden lg:flex"
            } items-center gap-1 px-2 pt-4 pb-1 mx-1 rounded cursor-pointer group`}
            onClick={() => setBroadcastsCollapsed((v) => !v)}
          >
            {broadcastsCollapsed ? (
              <ChevronRight size={12} className="text-[#6d6f78]" />
            ) : (
              <ChevronDown size={12} className="text-[#6d6f78]" />
            )}
            <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-[#6d6f78] group-hover:text-[#060607]">
              Broadcasts
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNewBroadcast?.();
              }}
              className="w-5 h-5 flex items-center justify-center rounded text-[#6d6f78] hover:text-[#060607] hover:bg-[#dde1e9]"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Broadcast Items */}
          {!broadcastsCollapsed &&
            activeBroadcasts.map((broadcast) => (
              <button
                key={broadcast.id}
                onClick={() => void handleBroadcastClick(broadcast)}
                title={capitalizeFirst(broadcast.name)}
                className={`flex items-center group ${
                  mobileListMode
                    ? "justify-start px-3"
                    : "justify-center lg:justify-start lg:px-2"
                } gap-1.5 h-12 lg:h-8 transition-all duration-200 ${
                  selectedBroadcastId === broadcast.id
                    ? `bg-[#3178c6]/20 lg:bg-[#3178c6]/20 lg:text-[#1a5fa8] ${mobileListMode ? "font-semibold rounded-md w-[calc(100%-16px)]" : "lg:font-semibold rounded-2xl lg:rounded w-11 lg:w-[calc(100%-16px)]"}`
                    : `text-[#4e5058] hover:bg-[#dde1e9] hover:text-[#060607] ${mobileListMode ? "rounded-md w-[calc(100%-16px)]" : "w-11 lg:w-[calc(100%-16px)] rounded-[24px] lg:rounded"}`
                } mx-auto lg:mx-2 my-1 lg:my-0.5`}
              >
                <span
                  className={`flex-shrink-0 ${mobileListMode ? "flex" : "hidden lg:flex"}`}
                >
                  <Hash size={20} className="lg:w-[15px] lg:h-[15px]" />
                </span>
                <div
                  className={`${mobileListMode ? "hidden" : "lg:hidden"} relative w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-[#3178c6] overflow-hidden`}
                >
                  {broadcast.name
                    ?.split(" ")
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 3)
                    .toUpperCase() ?? "?"}
                  {broadcast.unread_count ? (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#f2f3f5] dark:border-slate-900">
                      {formatUnreadCount(broadcast.unread_count)}
                    </span>
                  ) : null}
                </div>
                <span
                  className={`${
                    mobileListMode ? "flex" : "hidden lg:flex"
                  } flex-1 truncate text-sm ${
                    selectedBroadcastId === broadcast.id
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {capitalizeFirst(broadcast.name)}
                </span>

                {broadcast.unread_count ? (
                  <span
                    className={`${
                      mobileListMode ? "inline-flex" : "hidden lg:inline-flex"
                    } min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white`}
                  >
                    {formatUnreadCount(broadcast.unread_count)}
                  </span>
                ) : null}

                {broadcast?.is_admin ? (
                  <div className="hidden lg:flex items-center  opacity-0 group-hover:opacity-100 transition-opacity ml-auto mr-1">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditBroadcast?.(broadcast);
                      }}
                      className={`hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-green-500 opacity-0 transition-opacity hover:bg-green-200 hover:text-green-800 group-hover:opacity-100 ${broadcast?.is_admin ? "" : "ml-auto"}`}
                    >
                      <Pencil size={13} />
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBroadcast?.(broadcast.id);
                      }}
                      className={`hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-red-500 opacity-0 transition-opacity hover:bg-red-200 hover:text-red-800 group-hover:opacity-100 ${broadcast?.is_admin ? "" : "ml-auto"}`}
                    >
                      <Trash2 size={13} />
                    </span>
                  </div>
                ) : null}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Archive ${capitalizeFirst(broadcast.name)}`}
                  title="Archive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void archiveChat({ type: "broadcast", id: broadcast.id });
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    e.stopPropagation();
                    void archiveChat({ type: "broadcast", id: broadcast.id });
                  }}
                  className={`hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-800 group-hover:opacity-100 ${broadcast?.is_admin ? "" : "ml-auto"}`}
                >
                  <Archive size={13} />
                </span>
              </button>
            ))}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewBroadcast?.();
            }}
            className={`${
              mobileListMode ? "hidden" : "flex lg:hidden"
            } w-11 h-11 items-center justify-center rounded-[24px] bg-white text-[#23A559] hover:bg-[#23A559] hover:text-white hover:rounded-2xl transition-all duration-200 mt-2 border border-black/[0.05] dark:bg-slate-800 dark:border-slate-700`}
          >
            <Plus size={24} />
          </button>

          {/* Channels section */}
          <div
            className={`flex flex-col ${
              mobileListMode ? "items-stretch" : "items-center lg:items-stretch"
            }`}
          >
            {/* CHANNELS */}
            {/* Section Header - Only visible on Desktop */}
            <div
              className={`${
                mobileListMode ? "flex" : "hidden lg:flex"
              } items-center gap-1 px-2 pt-4 pb-1 mx-1 rounded cursor-pointer group`}
              onClick={() => setChannelsCollapsed((v) => !v)}
            >
              {channelsCollapsed ? (
                <ChevronRight size={12} className="text-[#6d6f78]" />
              ) : (
                <ChevronDown size={12} className="text-[#6d6f78]" />
              )}
              <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-[#6d6f78] group-hover:text-[#060607]">
                Channels
              </span>
              {canManageWorkspace && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewChannel();
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded text-[#6d6f78] hover:text-[#060607] hover:bg-[#dde1e9]"
                >
                  <Plus size={15} />
                </button>
              )}
            </div>

            {/* Channel Items */}
            {!channelsCollapsed &&
              [
                {
                  label: "Public",
                  channels: publicChannels,
                  collapsed: publicChannelsCollapsed,
                  onToggle: () => setPublicChannelsCollapsed((value) => !value),
                  visible: true,
                },
                {
                  label: "Private",
                  channels: privateChannels,
                  collapsed: privateChannelsCollapsed,
                  onToggle: () =>
                    setPrivateChannelsCollapsed((value) => !value),
                  visible: privateChannels.length > 0,
                },
              ]
                .filter((group) => group.visible)
                .map((group) => (
                  <div key={group.label} className="contents">
                    <button
                      type="button"
                      onClick={group.onToggle}
                      className={`${
                        mobileListMode ? "flex" : "hidden lg:flex"
                      } mx-2 mt-2 items-center gap-1 rounded px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600`}
                    >
                      {group.collapsed ? (
                        <ChevronRight size={11} />
                      ) : (
                        <ChevronDown size={11} />
                      )}
                      {group.label}
                    </button>
                    {!group.collapsed &&
                      group.channels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => void handleChannelClick(channel)}
                          title={capitalizeFirst(channel.name)} // Tooltip for mobile rail
                          className={`flex items-center group ${
                            mobileListMode
                              ? "justify-start px-3"
                              : "justify-center lg:justify-start lg:px-2"
                          } gap-1.5 h-12 lg:h-8 transition-all duration-200 ${
                            selectedChannelId === channel.id
                              ? `bg-[#3178c6]/20 lg:bg-[#3178c6]/20 lg:text-[#1a5fa8] ${mobileListMode ? "font-semibold rounded-md w-[calc(100%-16px)]" : "lg:font-semibold rounded-2xl lg:rounded w-11 lg:w-[calc(100%-16px)]"}`
                              : `text-[#4e5058] hover:bg-[#dde1e9] hover:text-[#060607] ${mobileListMode ? "rounded-md w-[calc(100%-16px)]" : "w-11 lg:w-[calc(100%-16px)] rounded-[24px] lg:rounded"}`
                          } mx-auto lg:mx-2 my-1 lg:my-0.5`}
                        >
                          <span
                            className={`flex-shrink-0 ${mobileListMode ? "flex" : "hidden lg:flex"}`}
                          >
                            {channel.is_private ? (
                              <Lock
                                size={20}
                                className="lg:w-[15px] lg:h-[15px]"
                              />
                            ) : (
                              <Hash
                                size={20}
                                className="lg:w-[15px] lg:h-[15px]"
                              />
                            )}
                          </span>
                          <div
                            className={`${
                              mobileListMode ? "hidden" : "lg:hidden"
                            } relative w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-[#3178c6] overflow-hidden`}
                          >
                            {channel.name
                              ?.split(" ")
                              .map((word) => word[0])
                              .join("")
                              .slice(0, 3)
                              .toUpperCase() ?? "?"}
                            {channel.unread_count ? (
                              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#f2f3f5] dark:border-slate-900">
                                {formatUnreadCount(channel.unread_count)}
                              </span>
                            ) : null}
                          </div>
                          {/* <span className="hidden lg:flex flex-1 truncate text-sm">
                    {channel.name}
                  </span> */}
                          <span
                            className={`${
                              mobileListMode ? "flex" : "hidden lg:flex"
                            } flex-1 truncate text-sm ${
                              selectedChannelId === channel.id
                                ? "text-slate-900 dark:text-white"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {capitalizeFirst(channel.name)}
                          </span>

                          {channel.unread_count ? (
                            <span
                              className={`${
                                mobileListMode
                                  ? "inline-flex"
                                  : "hidden lg:inline-flex"
                              } min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white`}
                            >
                              {formatUnreadCount(channel.unread_count)}
                            </span>
                          ) : null}

                          {channel?.is_admin ? (
                            <div className="hidden lg:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto mr-1">
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className="p-1 rounded hover:bg-green-100 text-green-500"
                              >
                                <Pencil size={13} />
                              </span>
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChannel(channel.id);
                                }}
                                className="p-1 rounded hover:bg-red-100 text-red-500"
                              >
                                <Trash2 size={13} />
                              </span>
                            </div>
                          ) : null}
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={`Archive ${capitalizeFirst(channel.name)}`}
                            title="Archive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void archiveChat({
                                type: "channel",
                                id: channel.id,
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" && e.key !== " ") return;
                              e.preventDefault();
                              e.stopPropagation();
                              void archiveChat({
                                type: "channel",
                                id: channel.id,
                              });
                            }}
                            className={`hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-800 group-hover:opacity-100 ${channel?.is_admin ? "" : "ml-auto"}`}
                          >
                            <Archive size={13} />
                          </span>
                        </button>
                      ))}
                  </div>
                ))}
            {canManageWorkspace && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNewChannel();
                }}
                className={`${
                  mobileListMode ? "hidden" : "flex lg:hidden"
                } w-11 h-11 items-center justify-center rounded-[24px] bg-white text-[#23A559] hover:bg-[#23A559] hover:text-white hover:rounded-2xl transition-all duration-200 mt-2 border border-black/[0.05] dark:bg-slate-800 dark:border-slate-700`}
              >
                <Plus size={24} />
              </button>
            )}
          </div>

          {/* Separator for mobile rail */}
          <div
            className={`h-[2px] bg-black/[0.05] ${
              mobileListMode ? "w-[calc(100%-24px)]" : "w-8"
            } mx-auto my-4 lg:hidden rounded-full`}
          />

          {/* DMs section */}
          <div
            className={`flex flex-col ${
              mobileListMode ? "items-stretch" : "items-center lg:items-stretch"
            }`}
          >
            <div
              className={`${
                mobileListMode ? "flex" : "hidden lg:flex"
              } items-center gap-1 px-2 pt-4 pb-1 mx-1 rounded cursor-pointer group`}
              onClick={() => setDmsCollapsed((v) => !v)}
            >
              {/* Same toggle logic as channels for desktops */}
              {dmsCollapsed ? (
                <ChevronRight size={12} className="text-[#6d6f78]" />
              ) : (
                <ChevronDown size={12} className="text-[#6d6f78]" />
              )}
              <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-[#6d6f78]">
                Direct Messages
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNewDM();
                }}
                className="w-5 h-5 flex items-center justify-center rounded text-[#6d6f78] hover:text-[#060607] hover:bg-[#dde1e9]"
              >
                <Plus size={15} />
              </button>
            </div>

            {!dmsCollapsed &&
              activeDMs.map((dm) => {
                const canRemoveManagedUser = false;
                const isRemoving = removingUserId === dm.other_user.id;

                return (
                  <button
                    key={dm.id}
                    onClick={() => void handleDMClick(dm)}
                    title={capitalizeFirst(dm.other_user.full_name)}
                    className={`group flex items-center ${
                      mobileListMode
                        ? "justify-start px-3"
                        : "justify-center lg:justify-start lg:px-2"
                    } gap-2 h-12 lg:h-8 transition-all duration-200 ${
                      selectedDMId === dm.id
                        ? `bg-[#3178c6]/20 lg:text-[#1a5fa8] ${mobileListMode ? "rounded-md w-[calc(100%-16px)]" : "rounded-2xl lg:rounded w-11 lg:w-[calc(100%-16px)]"}`
                        : `hover:bg-[#dde1e9] ${mobileListMode ? "rounded-md w-[calc(100%-16px)]" : "w-11 lg:w-[calc(100%-16px)] rounded-[24px] lg:rounded"}`
                    } mx-auto lg:mx-2 my-1 lg:my-0.5`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${capitalizeFirst(
                        dm.other_user.full_name,
                      )} profile photo`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openProfileImagePreview({
                          name: dm.other_user.full_name,
                          avatarUrl: dm.other_user.avatar_url,
                          avatarColor: dm.other_user.avatar_color,
                          dmId: dm.id,
                          otherUserId: dm.other_user.id,
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        e.stopPropagation();
                        openProfileImagePreview({
                          name: dm.other_user.full_name,
                          avatarUrl: dm.other_user.avatar_url,
                          avatarColor: dm.other_user.avatar_color,
                          dmId: dm.id,
                          otherUserId: dm.other_user.id,
                        });
                      }}
                      className="relative w-9 h-9 lg:w-7 lg:h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden cursor-pointer ring-offset-2 transition hover:ring-2 hover:ring-[#3178c6]"
                      style={{
                        backgroundColor:
                          dm.other_user.avatar_color || "#3178c6",
                      }}
                    >
                      {capitalizeFirst(dm.other_user.full_name)
                        .charAt(0)
                        .toUpperCase() ?? "?"}
                      {dm.other_user.avatar_url && (
                        <img
                          src={dm.other_user.avatar_url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      {isOnline(
                        dm.other_user.is_signedin,
                        dm.other_user.last_seen,
                      ) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 lg:w-2.5 lg:h-2.5 bg-emerald-500 rounded-full border-2 border-[#f2f3f5]" />
                      )}
                      {/* {dm.unread_count ? (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#f2f3f5] dark:border-slate-900">
                          {formatUnreadCount(dm.unread_count)}
                        </span>
                      ) : null} */}
                    </div>
                    {/* <span className="hidden lg:flex flex-1 truncate text-sm">
                    {dm.other_user.full_name}
                  </span> */}
                    <span
                      className={`${
                        mobileListMode ? "flex" : "hidden lg:flex"
                      } flex-1 truncate text-sm ${
                        selectedDMId === dm.id
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {capitalizeFirst(dm.other_user.full_name)}
                    </span>

                    {dm.unread_count ? (
                      <span
                        className={`${
                          mobileListMode
                            ? "inline-flex"
                            : "hidden lg:inline-flex"
                        } min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white`}
                      >
                        {formatUnreadCount(dm.unread_count)}
                      </span>
                    ) : null}

                    {canRemoveManagedUser ? (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Remove ${capitalizeFirst(
                          dm.other_user.full_name,
                        )}`}
                        title="Remove permanently"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isRemoving) {
                            void handlePermanentlyRemoveUser(dm);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (!isRemoving) {
                            void handlePermanentlyRemoveUser(dm);
                          }
                        }}
                        className={`hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-red-500 transition-opacity hover:bg-red-100 ${
                          isRemoving
                            ? "opacity-60"
                            : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <Trash2 size={13} />
                      </span>
                    ) : null}
                    {dm.has_existing_dm ? (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Archive ${capitalizeFirst(
                          dm.other_user.full_name,
                        )}`}
                        title="Archive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void archiveChat({
                            type: "dm",
                            id: dm.id,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          e.stopPropagation();
                          void archiveChat({
                            type: "dm",
                            id: dm.id,
                          });
                        }}
                        className="hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-800 group-hover:opacity-100"
                      >
                        <Archive size={13} />
                      </span>
                    ) : null}
                  </button>
                );
              })}

            {/* Mobile "Add" button for DMs */}
            <button
              onClick={onNewDM}
              className={`${
                mobileListMode ? "hidden" : "flex lg:hidden"
              } w-11 h-11 items-center justify-center rounded-[24px] bg-white text-[#23A559] hover:bg-[#23A559] hover:text-white hover:rounded-2xl transition-all duration-200 mt-2 border border-black/[0.05] dark:bg-slate-800 dark:border-slate-700`}
            >
              <Plus size={24} />
            </button>
          </div>

          {false && archivedChatCount > 0 ? (
            <div
              className={`flex flex-col ${
                mobileListMode
                  ? "items-stretch"
                  : "items-center lg:items-stretch"
              }`}
            >
              <div
                className={`${
                  mobileListMode ? "flex" : "hidden lg:flex"
                } items-center gap-1 px-2 pt-4 pb-1 mx-1 rounded cursor-pointer group`}
                onClick={() => setArchivedChatsCollapsed((value) => !value)}
              >
                {archivedChatsCollapsed ? (
                  <ChevronRight size={12} className="text-[#6d6f78]" />
                ) : (
                  <ChevronDown size={12} className="text-[#6d6f78]" />
                )}
                <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-[#6d6f78]">
                  Archived ({archivedChatCount})
                </span>
              </div>

              {!archivedChatsCollapsed &&
                archivedChannels.map((channel) => (
                  <button
                    key={`archived-channel-${channel.id}`}
                    onClick={() => void handleChannelClick(channel)}
                    title={capitalizeFirst(channel.name)}
                    className={`group flex items-center ${
                      mobileListMode
                        ? "justify-start px-3"
                        : "justify-center lg:justify-start lg:px-2"
                    } gap-1.5 h-12 lg:h-8 transition-all duration-200 text-[#4e5058] hover:bg-[#dde1e9] hover:text-[#060607] ${
                      mobileListMode
                        ? "rounded-md w-[calc(100%-16px)]"
                        : "w-11 lg:w-[calc(100%-16px)] rounded-[24px] lg:rounded"
                    } mx-auto lg:mx-2 my-1 lg:my-0.5`}
                  >
                    <span
                      className={`flex-shrink-0 ${mobileListMode ? "flex" : "hidden lg:flex"}`}
                    >
                      {channel.is_private ? (
                        <Lock size={20} className="lg:w-[15px] lg:h-[15px]" />
                      ) : (
                        <Hash size={20} className="lg:w-[15px] lg:h-[15px]" />
                      )}
                    </span>
                    <div
                      className={`${
                        mobileListMode ? "hidden" : "lg:hidden"
                      } relative w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-slate-500 overflow-hidden`}
                    >
                      {channel.name
                        ?.split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 3)
                        .toUpperCase() ?? "?"}
                    </div>
                    <span
                      className={`${mobileListMode ? "flex" : "hidden lg:flex"} flex-1 truncate text-sm text-slate-600 dark:text-slate-300`}
                    >
                      {capitalizeFirst(channel.name)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Restore ${capitalizeFirst(channel.name)}`}
                      title="Restore"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({ type: "channel", id: channel.id });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({ type: "channel", id: channel.id });
                      }}
                      className="hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-800 group-hover:opacity-100"
                    >
                      <RotateCcw size={13} />
                    </span>
                  </button>
                ))}

              {!archivedChatsCollapsed &&
                archivedBroadcasts.map((broadcast) => (
                  <button
                    key={`archived-broadcast-${broadcast.id}`}
                    onClick={() => void handleBroadcastClick(broadcast)}
                    title={capitalizeFirst(broadcast.name)}
                    className={`group flex items-center ${
                      mobileListMode
                        ? "justify-start px-3"
                        : "justify-center lg:justify-start lg:px-2"
                    } gap-1.5 h-12 lg:h-8 transition-all duration-200 text-[#4e5058] hover:bg-[#dde1e9] hover:text-[#060607] ${
                      mobileListMode
                        ? "rounded-md w-[calc(100%-16px)]"
                        : "w-11 lg:w-[calc(100%-16px)] rounded-[24px] lg:rounded"
                    } mx-auto lg:mx-2 my-1 lg:my-0.5`}
                  >
                    <span
                      className={`flex-shrink-0 ${mobileListMode ? "flex" : "hidden lg:flex"}`}
                    >
                      <Hash size={20} className="lg:w-[15px] lg:h-[15px]" />
                    </span>
                    <div
                      className={`${
                        mobileListMode ? "hidden" : "lg:hidden"
                      } relative w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-slate-500 overflow-hidden`}
                    >
                      {broadcast.name
                        ?.split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 3)
                        .toUpperCase() ?? "?"}
                    </div>
                    <span
                      className={`${mobileListMode ? "flex" : "hidden lg:flex"} flex-1 truncate text-sm text-slate-600 dark:text-slate-300`}
                    >
                      {capitalizeFirst(broadcast.name)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Restore ${capitalizeFirst(broadcast.name)}`}
                      title="Restore"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({
                          type: "broadcast",
                          id: broadcast.id,
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({
                          type: "broadcast",
                          id: broadcast.id,
                        });
                      }}
                      className="hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-800 group-hover:opacity-100"
                    >
                      <RotateCcw size={13} />
                    </span>
                  </button>
                ))}

              {!archivedChatsCollapsed &&
                archivedDMs.map((dm) => (
                  <button
                    key={`archived-dm-${dm.id}`}
                    onClick={() => void handleDMClick(dm)}
                    title={capitalizeFirst(dm.other_user.full_name)}
                    className={`group flex items-center ${
                      mobileListMode
                        ? "justify-start px-3"
                        : "justify-center lg:justify-start lg:px-2"
                    } gap-2 h-12 lg:h-8 transition-all duration-200 hover:bg-[#dde1e9] ${
                      mobileListMode
                        ? "rounded-md w-[calc(100%-16px)]"
                        : "w-11 lg:w-[calc(100%-16px)] rounded-[24px] lg:rounded"
                    } mx-auto lg:mx-2 my-1 lg:my-0.5`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${capitalizeFirst(
                        dm.other_user.full_name,
                      )} profile photo`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openProfileImagePreview({
                          name: dm.other_user.full_name,
                          avatarUrl: dm.other_user.avatar_url,
                          avatarColor: dm.other_user.avatar_color,
                          dmId: dm.id,
                          otherUserId: dm.other_user.id,
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        e.stopPropagation();
                        openProfileImagePreview({
                          name: dm.other_user.full_name,
                          avatarUrl: dm.other_user.avatar_url,
                          avatarColor: dm.other_user.avatar_color,
                          dmId: dm.id,
                          otherUserId: dm.other_user.id,
                        });
                      }}
                      className="relative w-9 h-9 lg:w-7 lg:h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden cursor-pointer ring-offset-2 transition hover:ring-2 hover:ring-[#3178c6]"
                      style={{
                        backgroundColor:
                          dm.other_user.avatar_color || "#64748b",
                      }}
                    >
                      {capitalizeFirst(dm.other_user.full_name)
                        .charAt(0)
                        .toUpperCase() ?? "?"}
                      {dm.other_user.avatar_url && (
                        <img
                          src={dm.other_user.avatar_url}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>
                    <span
                      className={`${mobileListMode ? "flex" : "hidden lg:flex"} flex-1 truncate text-sm text-slate-600 dark:text-slate-300`}
                    >
                      {capitalizeFirst(dm.other_user.full_name)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Restore ${capitalizeFirst(
                        dm.other_user.full_name,
                      )}`}
                      title="Restore"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({ type: "dm", id: dm.id });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        e.stopPropagation();
                        void unarchiveChat({ type: "dm", id: dm.id });
                      }}
                      className="hidden lg:flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-500 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-800 group-hover:opacity-100"
                    >
                      <RotateCcw size={13} />
                    </span>
                  </button>
                ))}
            </div>
          ) : null}
        </div>

        {!channelsCollapsed && canManageWorkspace && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInvitePeople?.();
            }}
            className="
    group flex items-center gap-3 h-10 w-[calc(100%-24px)] mx-3 my-1 px-2
    rounded-md text-slate-900 transition-all duration-200
    hover:bg-slate-200/60 hover:text-slate-900
    active:bg-slate-300/50
  "
          >
            {/* The icon now matches the sidebar's visual weight */}
            <div className="flex h-6 w-6 items-center justify-center rounded text-blue-600 group-hover:text-blue-600 transition-colors">
              <UserPlus size={18} strokeWidth={1.5} />
            </div>

            <span className="flex-1 truncate text-[14px] font-medium text-left">
              Invite Clients & Team
            </span>

            {/* A very subtle indicator that only appears on hover */}
            <Plus
              size={14}
              className="opacity-0 group-hover:opacity-40 transition-opacity"
            />
          </button>
        )}

        {/* ── User Panel ── */}
        <div className="min-h-[60px] lg:h-[52px] bg-[#eaecf0] border-t border-[#dde1e9] flex flex-col lg:flex-row items-center justify-center lg:px-2 gap-2 flex-shrink-0 py-2 lg:py-0 dark:bg-slate-800 dark:border-slate-700">
          <div
            className="relative w-10 h-10 lg:w-8 lg:h-8 rounded-full flex items-center justify-center overflow-hidden text-white text-sm font-bold flex-shrink-0 cursor-pointer"
            style={{
              backgroundColor: profile?.avatar_color || "#3178c6",
            }}
            onClick={() => setShowSettingsModal(true)}
          >
            {userInitial}
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={capitalizeFirst(profile?.full_name) || "Profile"}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}
            <span className="absolute bottom-0 right-0 w-3 h-3 lg:w-2.5 lg:h-2.5 bg-emerald-500 rounded-full border-2 border-[#eaecf0] dark:border-slate-800" />
          </div>

          {/* Hidden on mobile rail */}
          <div className="hidden lg:flex flex-1 min-w-0 flex-col">
            <p className="text-[13px] font-semibold text-[#060607] truncate leading-tight">
              {capitalizeFirst(profile?.full_name)}
            </p>
            <p className="text-[11px] text-[#4e5058] leading-tight">Online</p>
          </div>

          <div className="hidden lg:flex items-center gap-0.5 flex-shrink-0">
            {/* {canManageWorkspace && (
              <button
                onClick={() => onInvitePeople?.()}
                className="w-8 h-8 flex items-center justify-center rounded text-[#4e5058] hover:bg-[#dde1e9] dark:hover:bg-slate-700"
                title="Invite People"
              >
                <MailPlus size={16} />
              </button>
            )} */}
            <div className="flex items-center justify-center">
              <button
                onClick={onToggleDarkMode}
                aria-label="Toggle theme"
                className={`
      w-9 h-9 flex items-center justify-center
      rounded-full transition-colors
      ${isDarkMode ? "bg-[#011627]" : "bg-slate-200"}
    `}
              >
                {isDarkMode ? (
                  <Moon
                    size={16}
                    strokeWidth={2}
                    className="text-white fill-white"
                  />
                ) : (
                  <Sun
                    size={16}
                    strokeWidth={2}
                    className="text-amber-500 fill-amber-500"
                  />
                )}
              </button>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-8 h-8 flex items-center justify-center rounded text-[#4e5058] hover:bg-[#dde1e9] dark:hover:bg-slate-700"
            >
              <Settings size={16} />
            </button>
            {/* <button
              onClick={() => signOut()}
              className="w-8 h-8 flex items-center justify-center rounded text-[#4e5058] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <LogOut size={16} />
            </button> */}
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      {profileImagePreviewModal}
    </>
  );
}
