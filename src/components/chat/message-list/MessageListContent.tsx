import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  Pencil,
  Trash2,
  Bookmark,
  Copy,
  MessageSquare,
  CornerUpLeft,
  Pin,
  ListTodo,
  Smile,
  CornerUpRight,
  Check,
  CheckCheck,
  CheckSquare,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { formatFileSize, getFileIcon } from "../../../lib/file-upload";
import { MessageReactions, type Reaction } from "../MessageReactions";
import { renderMentions } from "../../../lib/mentions";
import FileViewerModal from "../FileViewerModal";
import { parseChannelInviteMessageContent } from "../../../lib/channelInvites";
import { parseChannelSystemMessage } from "../../../lib/channelSystemMessages";
import { MessageActionSheet } from "../MessageActionSheet";
import { capitalizeFirst } from "../../../lib/text";
import { isOnline } from "../../utils/isOnline";
import type {
  ChatMessage as Message,
  ChannelInviteRecord,
  MessageListProps,
} from "../chatTypes";

const PAGE_SIZE = 50;
const TOP_PAGINATION_THRESHOLD = 120;
const MESSAGE_HIGHLIGHT_CLASSES = [
  "!bg-[#5f7c9b]",
  "!text-white",
  "!border-transparent",
  "ring-1",
  "ring-[#4d6680]",
  "shadow-sm",
  "transition-all",
  "duration-300",
];

//Tooltip Component
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  placement?: "top" | "bottom";
}

export function Tooltip({
  content,
  children,
  placement = "top",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const containerClass =
    placement === "bottom"
      ? "absolute top-full left-1/2 z-[9999] mt-2 -translate-x-1/2 pointer-events-none"
      : "absolute bottom-full left-1/2 z-[9999] mb-2 -translate-x-1/2 pointer-events-none";
  const arrowClass =
    placement === "bottom"
      ? "absolute bottom-full left-1/2 h-0 w-0 -translate-x-1/2 border-b-[4px] border-l-[4px] border-r-[4px] border-b-slate-800 border-l-transparent border-r-transparent"
      : "absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-slate-800";

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={containerClass}>
          <div className="relative bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1 rounded-md white-space-nowrap shadow-xl">
            {content}
            <div className={arrowClass} />
          </div>
        </div>
      )}
    </div>
  );
}

export function MessageList({
  channelId,
  dmId,
  broadcastId,
  onThreadOpen,
  onReplyToMessage,
  onForwardMessage,
  onForwardMessages,
  onChannelJoin,
  onDMSelect,
  onMentionClick,
  scrollToMessageTarget,
  messageSentToken,
}: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Set<string>>(
    new Set(),
  );
  const [todoMessageIds, setTodoMessageIds] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [reactionsByMessageId, setReactionsByMessageId] = useState<
    Record<string, Reaction[]>
  >({});
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] =
    useState<string | null>(null);
  const [joiningInviteToken, setJoiningInviteToken] = useState<string | null>(
    null,
  );
  const [joinedInviteTokens, setJoinedInviteTokens] = useState<Set<string>>(
    new Set(),
  );
  const [removedInviteTokens, setRemovedInviteTokens] = useState<Set<string>>(
    new Set(),
  );
  const [joinedChannelIds, setJoinedChannelIds] = useState<Set<string>>(
    new Set(),
  );
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [otherParticipantLastReadAt, setOtherParticipantLastReadAt] = useState<
    string | null
  >(null);
  const [otherParticipantIsOnline, setOtherParticipantIsOnline] =
    useState(false);
  const [inlineScrollToMessageTarget, setInlineScrollToMessageTarget] =
    useState<{
      messageId: string;
      nonce: number;
      timestamp?: string;
    } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const loadedMessageIdsRef = useRef<Set<string>>(new Set());
  const loadedHistoryCountRef = useRef(0);
  const loadedWindowOffsetRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const lastHandledScrollNonceRef = useRef<number | null>(null);
  const lastFetchAttemptNonceRef = useRef<number | null>(null);
  const prependScrollStateRef = useRef<{
    previousScrollHeight: number;
    previousScrollTop: number;
  } | null>(null);
  const scrollHighlightTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const { user } = useAuth();
  const channelMessageSelect =
    "*, profiles:profiles!messages_user_id_fkey(full_name, avatar_url, avatar_color)";
  const directMessageSelect =
    "*, profiles:profiles!direct_message_messages_user_id_fkey(full_name, avatar_url, avatar_color)";
  const [openModal, setOpenModal] = useState(false);
  const [fileLink, setFileLink] = useState<string | undefined>("");
  const [actionSheetMessageId, setActionSheetMessageId] = useState<
    string | null
  >(null);
  const [deleteMenuMessage, setDeleteMenuMessage] = useState<Message | null>(
    null,
  );
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(
    new Set(),
  );
  const [isBatchDeleteMenuOpen, setIsBatchDeleteMenuOpen] = useState(false);
  const [conversationLastReadAt, setConversationLastReadAt] = useState<
    string | null
  >(null);
  const [conversationReadStateReady, setConversationReadStateReady] =
    useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMarkedConversationReadRef = useRef<string | null>(null);
  const copiedMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const conversationLastReadAtRef = useRef<string | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
    loadedMessageIdsRef.current = new Set(
      messages.map((message) => message.id),
    );
  }, [messages]);

  useEffect(() => {
    lastMarkedConversationReadRef.current = null;
  }, [channelId, dmId, user?.id]);

  useEffect(() => {
    return () => {
      if (copiedMessageTimeoutRef.current) {
        clearTimeout(copiedMessageTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsMultiSelectMode(false);
    setSelectedMessageIds(new Set());
    setIsBatchDeleteMenuOpen(false);
  }, [channelId, dmId, broadcastId]);

  const isMobile = () => window.matchMedia("(max-width: 640px)").matches;

  const handlePointerDown = (messageId: string) => {
    if (!isMobile()) return;
    longPressTimerRef.current = setTimeout(() => {
      setActionSheetMessageId(messageId);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const clearSelection = () => {
    setIsMultiSelectMode(false);
    setSelectedMessageIds(new Set());
    setIsBatchDeleteMenuOpen(false);
  };

  const toggleMessageSelection = (messageId: string) => {
    setIsMultiSelectMode(true);
    setSelectedMessageIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const bookmarkMessage = async (messageId: string, shouldBookmark = true) => {
    if (!user) return false;

    const alreadyBookmarked = bookmarkedMessages.has(messageId);
    if (shouldBookmark && alreadyBookmarked) return true;
    if (!shouldBookmark && !alreadyBookmarked) return true;

    if (shouldBookmark) {
      const { error } = await supabase.from("message_bookmarks").insert({
        message_id: messageId,
        user_id: user.id,
      } as any);

      if (error) {
        console.error("Failed to bookmark message", error);
        return false;
      }

      setBookmarkedMessages((prev) => new Set(prev).add(messageId));
    } else {
      const { error } = await supabase
        .from("message_bookmarks")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to remove bookmark", error);
        return false;
      }

      setBookmarkedMessages((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    }

    emitBookmarkChange();
    return true;
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

  const addMessageToTodo = async (message: Message) => {
    if (!user || (!channelId && !dmId && !broadcastId)) return false;
    if (todoMessageIds.has(message.id)) return true;

    const { error } = await (supabase as any).from("message_todos").insert(
      {
        message_id: message.id,
        message_source: channelId
          ? "channel"
          : broadcastId
            ? "broadcast"
            : "dm",
        channel_id: channelId || null,
        dm_id: dmId || null,
        broadcast_id: broadcastId || null,
        workspace_id: message.workspace_id || null,
        user_id: user.id,
        status: "pending",
      },
      {
        onConflict: "message_id,message_source",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      console.error("Failed to add message to todo", error);
      return false;
    }

    setTodoMessageIds((prev) => new Set(prev).add(message.id));
    emitTodoChange();
    return true;
  };

  const setPinnedState = async (messageId: string, shouldPin: boolean) => {
    if (!user) return false;

    const { data: existing } = await supabase
      .from("pinned_messages")
      .select("id")
      .eq("message_id", messageId)
      .maybeSingle();

    if (shouldPin && existing) return true;
    if (!shouldPin && !existing) return true;

    const table = channelId
      ? "messages"
      : broadcastId
        ? "broadcast_messages"
        : "direct_message_messages";
    const nextPinnedState = shouldPin;

    if (shouldPin) {
      const { error } = await supabase.from("pinned_messages").insert({
        message_id: messageId,
        channel_id: channelId || null,
        dm_id: dmId || null,
        broadcast_id: broadcastId || null,
        pinned_by: user.id,
      } as any);
      if (error) {
        console.error("Failed to pin message", error);
        return false;
      }
    } else {
      const { error } = await supabase
        .from("pinned_messages")
        .delete()
        .eq("id", (existing as any).id);
      if (error) {
        console.error("Failed to unpin message", error);
        return false;
      }
    }

    const { error: updateError } = await (supabase as any)
      .from(table)
      .update({ is_pinned: nextPinnedState })
      .eq("id", messageId);

    if (updateError) {
      console.error("Failed to update pinned state on message", updateError);
      return false;
    }

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? { ...message, is_pinned: nextPinnedState }
          : message,
      ),
    );
    emitPinChange();
    return true;
  };

  const deleteMessage = async (messageId: string) => {
    const table = channelId
      ? "messages"
      : dmId
        ? "direct_message_messages"
        : "broadcast_messages";

    const { error } = await (supabase as any)
      .from(table)
      .update({
        is_deleted: true,
        deleted_by: user?.id,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .select();

    if (error) {
      console.error("Failed to delete message", error);
      return false;
    }

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              is_deleted: true,
              deleted_by: user?.id ?? null,
              deleted_at: new Date().toISOString(),
              content: "This message was deleted",
            }
          : message,
      ),
    );

    return true;
  };

  const deleteMessageForMe = async (message: Message) => {
    if (!user) return false;

    const table = channelId
      ? "messages"
      : dmId
        ? "direct_message_messages"
        : "broadcast_messages";

    const { error } = await (supabase as any)
      .from("message_hidden_for_users")
      .upsert(
        {
          message_id: message.id,
          user_id: user.id,
          source_table: table,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "message_id,user_id,source_table",
        },
      );

    if (error) {
      console.error("Failed to hide message for current user", error);
      return false;
    }

    setMessages((current) => current.filter((msg) => msg.id !== message.id));
    return true;
  };

  const emitBookmarkChange = () => {
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

  const emitPinChange = () => {
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

  const loadBookmarks = async () => {
    if (!user) {
      setBookmarkedMessages(new Set());
      return;
    }

    const messageIds = messages.map((message) => message.id);
    if (messageIds.length === 0) {
      setBookmarkedMessages(new Set());
      return;
    }

    const { data, error } = await supabase
      .from("message_bookmarks")
      .select("message_id")
      .eq("user_id", user.id)
      .in("message_id", messageIds);

    if (error) {
      console.error("Failed to load bookmarks", error);
      return;
    }

    setBookmarkedMessages(
      new Set(
        ((data as Array<{ message_id: string }> | null) ?? []).map(
          (bookmark) => bookmark.message_id,
        ),
      ),
    );
  };

  const loadTodoMessageIds = async () => {
    if (!user) {
      setTodoMessageIds(new Set());
      return;
    }

    const messageIds = messages.map((message) => message.id);
    if (messageIds.length === 0) {
      setTodoMessageIds(new Set());
      return;
    }

    const { data, error } = await (supabase as any)
      .from("message_todos")
      .select("message_id")
      .eq(
        "message_source",
        channelId ? "channel" : broadcastId ? "broadcast" : "dm",
      )
      .in("message_id", messageIds);

    if (error) {
      console.error("Failed to load todo messages", error);
      return;
    }

    setTodoMessageIds(
      new Set(
        ((data as Array<{ message_id: string }> | null) ?? []).map(
          (todo) => todo.message_id,
        ),
      ),
    );
  };

  const loadPinnedMessageIds = async (messageIds: string[]) => {
    if (messageIds.length === 0) return new Set<string>();

    let query = supabase
      .from("pinned_messages")
      .select("message_id")
      .in("message_id", messageIds);

    if (channelId) {
      query = query.eq("channel_id", channelId);
    } else if (broadcastId) {
      query = query.eq("broadcast_id", broadcastId);
    } else if (dmId) {
      query = query.eq("dm_id", dmId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load pinned messages", error);
      return new Set<string>();
    }

    return new Set(
      ((data as Array<{ message_id: string }> | null) ?? []).map(
        (pin) => pin.message_id,
      ),
    );
  };

  const loadedMessageIds = useMemo(
    () => messages.map((message) => message.id),
    [messages],
  );
  const loadedMessageIdKey = loadedMessageIds.join(",");

  const loadReactionsForMessages = async (messageIds: string[]) => {
    const uniqueMessageIds = Array.from(new Set(messageIds));

    if (uniqueMessageIds.length === 0) {
      setReactionsByMessageId({});
      return;
    }

    const { data, error } = await supabase
      .from("message_reactions")
      .select(
        "id, message_id, channel_id, dm_id, workspace_id, emoji, user_id, profiles:profiles!message_reactions_user_id_fkey(full_name)",
      )
      .in("message_id", uniqueMessageIds);

    if (error) {
      console.error("Failed to load reactions", error);
      return;
    }

    const nextReactionsByMessageId: Record<string, Reaction[]> = {};
    uniqueMessageIds.forEach((messageId) => {
      nextReactionsByMessageId[messageId] = [];
    });

    ((data as unknown as Reaction[] | null) ?? []).forEach((reaction) => {
      if (!nextReactionsByMessageId[reaction.message_id]) {
        nextReactionsByMessageId[reaction.message_id] = [];
      }
      nextReactionsByMessageId[reaction.message_id].push(reaction);
    });

    setReactionsByMessageId((current) => ({
      ...current,
      ...nextReactionsByMessageId,
    }));
  };

  const loadHiddenMessageIds = async (
    table: "messages" | "direct_message_messages" | "broadcast_messages",
    messageIds?: string[],
  ) => {
    if (!user) return new Set<string>();
    if (messageIds && messageIds.length === 0) return new Set<string>();

    let query = supabase
      .from("message_hidden_for_users")
      .select("message_id")
      .eq("user_id", user.id)
      .eq("source_table", table);

    if (messageIds) {
      query = query.in("message_id", messageIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to load hidden messages", error);
      return new Set<string>();
    }

    return new Set(
      ((data as Array<{ message_id: string }> | null) ?? []).map(
        (row) => row.message_id,
      ),
    );
  };

  useEffect(() => {
    if (!channelId && !dmId && !broadcastId) {
      setMessages([]);
      setBookmarkedMessages(new Set());
      setReactionsByMessageId({});
      setJoinedInviteTokens(new Set());
      setRemovedInviteTokens(new Set());
      setJoinedChannelIds(new Set());
      setEditingId(null);
      setEditContent("");
      setActiveReactionPickerMessageId(null);
      setOpenModal(false);
      setFileLink("");
      setIsInitialLoading(false);
      setIsLoadingOlder(false);
      setHasOlderMessages(true);
      setOtherParticipantLastReadAt(null); // DM specific
      setOtherParticipantIsOnline(false);
      loadedHistoryCountRef.current = 0;
      loadedWindowOffsetRef.current = 0;
      return;
    }

    setMessages([]);
    setBookmarkedMessages(new Set());
    setReactionsByMessageId({});
    setJoinedInviteTokens(new Set());
    setRemovedInviteTokens(new Set());
    setJoinedChannelIds(new Set());
    setEditingId(null);
    setEditContent("");
    setActiveReactionPickerMessageId(null);
    setOpenModal(false);
    setFileLink("");
    setIsInitialLoading(true);
    setIsLoadingOlder(false);
    setHasOlderMessages(true);
    setOtherParticipantLastReadAt(null); // DM specific
    setOtherParticipantIsOnline(false);
    loadedHistoryCountRef.current = 0;
    loadedWindowOffsetRef.current = 0;
    shouldAutoScrollRef.current = true;
    previousMessageCountRef.current = 0;
    void loadInitialMessages();

    const handleMessageCreated = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail;
      if (!detail) return;

      // If broadcast message is created, it will trigger DMs.
      // The MessageList for a broadcast should listen to broadcast_messages.
      const matchesConversation =
        (channelId && detail.channel_id === channelId) ||
        (broadcastId && detail.broadcast_id === broadcastId) ||
        (dmId && detail.dm_id === dmId);

      if (!matchesConversation) return;

      void fetchMessageById(detail.id).then((hydratedMessage) => {
        const nextMessage = hydratedMessage ?? (detail as Message);
        if (nextMessage.thread_id) return;

        setMessages((current) => {
          const existingIndex = current.findIndex(
            (message) => message.id === nextMessage.id,
          );

          if (existingIndex >= 0) {
            const nextMessages = [...current];
            nextMessages[existingIndex] = nextMessage;
            return nextMessages.sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );
          }

          return [...current, nextMessage].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );
        });
      });
    };

    const refreshCurrentConversation = () => {
      shouldAutoScrollRef.current = true;
      void loadInitialMessages();
    };

    const handleChatPushReceived = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          channel_id?: string | null;
          dm_id?: string | null;
          broadcast_id?: string | null;
          message_id?: string | null;
        }>
      ).detail;

      const matchesConversation =
        (channelId && detail?.channel_id === channelId) ||
        (dmId && detail?.dm_id === dmId) ||
        (broadcastId && detail?.broadcast_id === broadcastId);

      if (!matchesConversation) return;

      if (detail?.message_id) {
        void fetchMessageById(detail.message_id).then((nextMessage) => {
          if (!nextMessage || nextMessage.thread_id) {
            refreshCurrentConversation();
            return;
          }

          setMessages((current) => {
            if (current.some((message) => message.id === nextMessage.id)) {
              return current;
            }

            return [...current, nextMessage].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );
          });
        });
        return;
      }

      refreshCurrentConversation();
    };

    const handleWindowFocus = () => {
      refreshCurrentConversation();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshCurrentConversation();
      }
    };

    window.addEventListener("message-created", handleMessageCreated);
    window.addEventListener("chat-push-received", handleChatPushReceived);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const channel = supabase
      .channel(`messages-${channelId || dmId || broadcastId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: channelId
            ? "messages"
            : dmId
              ? "direct_message_messages"
              : "broadcast_messages",
          filter: channelId
            ? `channel_id=eq.${channelId}`
            : dmId
              ? `dm_id=eq.${dmId}`
              : `broadcast_id=eq.${broadcastId}`,
        },
        (payload) => void handleRealtimeMessageChange(payload),
      )
      .subscribe();

    return () => {
      window.removeEventListener("message-created", handleMessageCreated);
      window.removeEventListener("chat-push-received", handleChatPushReceived);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel.unsubscribe();
    };
  }, [channelId, dmId, broadcastId]);

  useEffect(() => {
    void loadReactionsForMessages(loadedMessageIds);
  }, [loadedMessageIdKey]);

  useEffect(() => {
    if (!channelId && !dmId) return;

    const reactionSubscription = supabase
      .channel(`message-reactions-${channelId || dmId || broadcastId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
          filter: channelId
            ? `channel_id=eq.${channelId}`
            : dmId
              ? `dm_id=eq.${dmId}`
              : `broadcast_id=eq.${broadcastId}`,
        },
        (payload) => {
          const changedMessageId =
            (payload.new as { message_id?: string } | null)?.message_id ??
            (payload.old as { message_id?: string } | null)?.message_id;

          if (
            changedMessageId &&
            loadedMessageIdsRef.current.has(changedMessageId)
          ) {
            void loadReactionsForMessages([changedMessageId]);
          }
        },
      )
      .subscribe();

    return () => {
      reactionSubscription.unsubscribe();
    };
  }, [channelId, dmId, broadcastId]);

  useEffect(() => {
    if (!channelId && !dmId) return;

    const applyProfileUpdate = (profile?: {
      id?: string;
      full_name?: string | null;
      avatar_url?: string | null;
      avatar_color?: string | null;
    }) => {
      if (!profile?.id) return;

      setMessages((current) =>
        current.map((message) =>
          message.user_id === profile.id
            ? {
                ...message,
                profiles: {
                  full_name:
                    profile.full_name ?? message.profiles?.full_name ?? "",
                  avatar_url: Object.prototype.hasOwnProperty.call(
                    profile,
                    "avatar_url",
                  )
                    ? (profile.avatar_url ?? null)
                    : (message.profiles?.avatar_url ?? null),
                  avatar_color:
                    profile.avatar_color ??
                    message.profiles?.avatar_color ??
                    null,
                },
              }
            : message,
        ),
      );
    };

    const handleProfileUpdated = (event: Event) => {
      applyProfileUpdate(
        (
          event as CustomEvent<{
            id?: string;
            full_name?: string | null;
            avatar_url?: string | null;
            avatar_color?: string | null;
          }>
        ).detail,
      );
    };

    window.addEventListener("profile-updated", handleProfileUpdated);

    const profileSubscription = supabase
      .channel(`message-profile-avatars-${channelId || dmId || broadcastId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const profile = payload.new as
            | {
                id?: string;
                full_name?: string | null;
                avatar_url?: string | null;
                avatar_color?: string | null;
              }
            | undefined;

          applyProfileUpdate(profile);
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
      profileSubscription.unsubscribe();
    };
  }, [channelId, dmId, broadcastId]);

  useEffect(() => {
    if (!user || !dmId) {
      setOtherParticipantLastReadAt(null);
      setOtherParticipantIsOnline(false);
      return;
    }

    let isMounted = true;
    let presenceSubscription: ReturnType<typeof supabase.channel> | null = null;
    let presencePoll: number | null = null;

    const loadDMReadState = async () => {
      const { data: conversation, error } = await supabase
        .from("direct_messages")
        .select("user1_id, user2_id, user1_last_read_at, user2_last_read_at")
        .eq("id", dmId!)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !conversation) {
        if (error) {
          console.error("Failed to load DM seen state", error);
        }
        setOtherParticipantLastReadAt(null);
        return;
      }

      const typedConversation = conversation as {
        user1_id: string;
        user2_id: string;
        user1_last_read_at: string | null;
        user2_last_read_at: string | null;
      };

      const otherReadAt =
        typedConversation.user1_id === user.id
          ? typedConversation.user2_last_read_at
          : typedConversation.user1_last_read_at;
      const otherUserId =
        typedConversation.user1_id === user.id
          ? typedConversation.user2_id
          : typedConversation.user1_id;

      setOtherParticipantLastReadAt(otherReadAt);

      const syncPresence = async () => {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_signedin, last_seen")
          .eq("id", otherUserId)
          .maybeSingle();

        if (!isMounted) return;

        if (profileError || !profile) {
          if (profileError) {
            console.error("Failed to load DM recipient presence", profileError);
          }
          setOtherParticipantIsOnline(false);
          return;
        }

        const typedProfile = profile as {
          is_signedin: boolean;
          last_seen: string | null;
        };

        setOtherParticipantIsOnline(
          isOnline(typedProfile.is_signedin, typedProfile.last_seen ?? null),
        );
      };

      await syncPresence();

      presenceSubscription = supabase
        .channel(`dm-recipient-presence-${otherUserId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${otherUserId}`,
          },
          (payload) => {
            const row = payload.new as
              | {
                  is_signedin?: boolean;
                  last_seen?: string | null;
                }
              | undefined;

            setOtherParticipantIsOnline(
              isOnline(row?.is_signedin ?? false, row?.last_seen ?? null),
            );
          },
        )
        .subscribe();

      // Keep the 90s online window fresh even if no profile update arrives.
      presencePoll = window.setInterval(() => {
        void syncPresence();
      }, 30000);
    };

    void loadDMReadState();

    const subscription = supabase
      .channel(`direct-message-read-state-${dmId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `id=eq.${dmId}`,
        },
        (payload) => {
          const row = payload.new as
            | {
                user1_id?: string;
                user2_id?: string;
                user1_last_read_at?: string | null;
                user2_last_read_at?: string | null;
              }
            | undefined;

          if (!row) return;

          const otherReadAt =
            row.user1_id === user.id
              ? (row.user2_last_read_at ?? null)
              : (row.user1_last_read_at ?? null);

          setOtherParticipantLastReadAt(otherReadAt);
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (presenceSubscription) {
        presenceSubscription.unsubscribe();
      }
      if (presencePoll) {
        window.clearInterval(presencePoll);
      }
      subscription.unsubscribe();
    };
  }, [dmId, broadcastId, user?.id]); // DM specific

  useEffect(() => {
    if (prependScrollStateRef.current) {
      const container = scrollContainerRef.current;
      if (container) {
        const { previousScrollHeight, previousScrollTop } =
          prependScrollStateRef.current;
        container.scrollTop =
          container.scrollHeight - previousScrollHeight + previousScrollTop;
      }
      prependScrollStateRef.current = null;
    }

    if (shouldAutoScrollRef.current || previousMessageCountRef.current === 0) {
      scrollToBottom(previousMessageCountRef.current === 0 ? "auto" : "smooth");
    }

    previousMessageCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (!scrollToMessageTarget) return;
    if (lastHandledScrollNonceRef.current === scrollToMessageTarget.nonce) {
      return;
    }

    const target = document.querySelector<HTMLElement>(
      `[data-message-highlight-id="${scrollToMessageTarget.messageId}"]`,
    );
    if (!target) {
      if (lastFetchAttemptNonceRef.current === scrollToMessageTarget.nonce) {
        return;
      }

      lastFetchAttemptNonceRef.current = scrollToMessageTarget.nonce;
      void ensureMessageIsLoaded(
        scrollToMessageTarget.messageId,
        scrollToMessageTarget.timestamp,
      );
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add(...MESSAGE_HIGHLIGHT_CLASSES);
    lastHandledScrollNonceRef.current = scrollToMessageTarget.nonce;

    if (scrollHighlightTimeoutRef.current) {
      clearTimeout(scrollHighlightTimeoutRef.current);
    }

    scrollHighlightTimeoutRef.current = setTimeout(() => {
      target.classList.remove(...MESSAGE_HIGHLIGHT_CLASSES);
    }, 1800);
  }, [scrollToMessageTarget, messages]);
  useEffect(() => {
    if (!inlineScrollToMessageTarget) return;
    if (
      lastHandledScrollNonceRef.current === inlineScrollToMessageTarget.nonce
    ) {
      return;
    }

    const target = document.querySelector<HTMLElement>(
      `[data-message-highlight-id="${inlineScrollToMessageTarget.messageId}"]`,
    );
    if (!target) {
      if (
        lastFetchAttemptNonceRef.current === inlineScrollToMessageTarget.nonce
      ) {
        return;
      }

      lastFetchAttemptNonceRef.current = inlineScrollToMessageTarget.nonce;
      void ensureMessageIsLoaded(
        inlineScrollToMessageTarget.messageId,
        inlineScrollToMessageTarget.timestamp,
      );
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add(...MESSAGE_HIGHLIGHT_CLASSES);
    lastHandledScrollNonceRef.current = inlineScrollToMessageTarget.nonce;

    if (scrollHighlightTimeoutRef.current) {
      clearTimeout(scrollHighlightTimeoutRef.current);
    }

    scrollHighlightTimeoutRef.current = setTimeout(() => {
      target.classList.remove(...MESSAGE_HIGHLIGHT_CLASSES);
    }, 1800);
  }, [inlineScrollToMessageTarget, messages]);

  useEffect(() => {
    if (!messageSentToken) return;

    shouldAutoScrollRef.current = true;
    requestAnimationFrame(() => {
      scrollToBottom("smooth");
    });
  }, [messageSentToken]);

  useEffect(() => {
    return () => {
      if (scrollHighlightTimeoutRef.current) {
        clearTimeout(scrollHighlightTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    shouldAutoScrollRef.current = distanceFromBottom < 120;

    if (
      container.scrollTop <= TOP_PAGINATION_THRESHOLD &&
      hasOlderMessages &&
      !isInitialLoading &&
      !isLoadingOlder
    ) {
      void loadOlderMessages();
    }
  };

  const applyThreadReplyCounts = async (
    parentMessages: Message[],
    table: "messages" | "direct_message_messages" | "broadcast_messages",
  ) => {
    if (parentMessages.length === 0) {
      return [];
    }

    const parentIds = parentMessages.map((message) => message.id);

    let replyQuery = supabase
      .from(broadcastId ? "broadcast_messages" : table)
      .select("thread_id")
      .in("thread_id", parentIds);

    if (channelId) {
      replyQuery = replyQuery.eq("channel_id", channelId);
    } else if (dmId) {
      replyQuery = replyQuery.eq("dm_id", dmId);
    } else if (broadcastId) {
      replyQuery = replyQuery.eq("broadcast_id", broadcastId);
    }

    const { data: replies, error: repliesError } = await replyQuery;

    if (repliesError) {
      console.error("Failed to load thread reply counts", repliesError);
      return parentMessages;
    }

    const counts = new Map<string, number>();

    ((replies as Array<{ thread_id: string | null }> | null) ?? []).forEach(
      (reply) => {
        if (!reply.thread_id) return;
        counts.set(reply.thread_id, (counts.get(reply.thread_id) ?? 0) + 1);
      },
    );

    return parentMessages.map((message) => ({
      ...message,
      reply_count: counts.get(message.id) ?? 0,
    }));
  };

  const hydrateReplyPreviews = async (items: Message[]) => {
    if ((!channelId && !dmId) || items.length === 0) {
      return items.map((message) => ({
        ...message,
        reply_preview: null,
      }));
    }

    const parentIds = Array.from(
      new Set(
        items
          .map((message) => message.parent_id)
          .filter((parentId): parentId is string => Boolean(parentId)),
      ),
    );

    if (parentIds.length === 0) {
      return items.map((message) => ({
        ...message,
        reply_preview: null,
      }));
    }

    const table = channelId ? "messages" : "direct_message_messages";
    const previewSelect = channelId
      ? "id, user_id, content, attachment_name, profiles:profiles!messages_user_id_fkey(full_name)"
      : "id, user_id, content, attachment_name, profiles:profiles!direct_message_messages_user_id_fkey(full_name)";

    const { data, error } = await supabase
      .from(table)
      .select(previewSelect)
      .in("id", parentIds);

    if (error) {
      console.error("Failed to load reply previews", error);
      return items.map((message) => ({
        ...message,
        reply_preview: null,
      }));
    }

    const previewMap = new Map(
      (
        (data as Array<{
          id: string;
          user_id: string;
          content: string;
          attachment_name?: string | null;
          profiles?: { full_name?: string | null } | null;
        }> | null) ?? []
      ).map((parent) => [
        parent.id,
        {
          id: parent.id,
          senderId: parent.user_id,
          content: parent.content,
          attachmentName: parent.attachment_name ?? null,
          senderName: parent.profiles?.full_name || "Unknown user",
        },
      ]),
    );

    return items.map((message) => ({
      ...message,
      reply_preview: message.parent_id
        ? (previewMap.get(message.parent_id) ?? null)
        : null,
    }));
  };

  const fetchMessagePage = async ({
    offset = 0,
    limit = PAGE_SIZE,
  }: {
    offset?: number;
    limit?: number;
  }) => {
    const table = channelId
      ? "messages"
      : dmId
        ? "direct_message_messages"
        : "broadcast_messages";
    const broadcastTable = "broadcast_messages";
    const selectQuery = channelId ? channelMessageSelect : directMessageSelect;
    const broadcastSelectQuery =
      "*, profiles:profiles!broadcast_messages_user_id_fkey(full_name, avatar_url, avatar_color)";

    let query = supabase
      .from(broadcastId ? broadcastTable : table)
      .select(broadcastId ? broadcastSelectQuery : selectQuery)
      .is("thread_id", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (channelId) {
      query = query.eq("channel_id", channelId);
    } else if (broadcastId) {
      query = query.eq("broadcast_id", broadcastId);
    } else if (dmId) {
      query = query.eq("dm_id", dmId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        channelId
          ? "Failed to load channel messages"
          : "Failed to load direct messages",
        error,
      );
      return null;
    }

    const rawPage = ((data as Message[] | null) ?? []).reverse();
    const hiddenIds = await loadHiddenMessageIds(
      table,
      rawPage.map((message) => message.id),
    );
    const page = rawPage.filter((message) => !hiddenIds.has(message.id));
    const [messagesWithReplyCounts, pinnedMessageIds] = await Promise.all([
      applyThreadReplyCounts(page, table),
      loadPinnedMessageIds(page.map((message) => message.id)),
    ]);
    const messagesWithReplyPreviews = await hydrateReplyPreviews(
      messagesWithReplyCounts,
    );
    const rawCount = ((data as Message[] | null) ?? []).length;

    return {
      messages: messagesWithReplyPreviews.map((message) => ({
        ...message,
        content: message.is_deleted
          ? "This message was deleted"
          : message.content,
        is_pinned: pinnedMessageIds.has(message.id),
      })),
      hasMore: rawCount === limit,
      rawCount,
    };
  };

  const loadInitialMessages = async () => {
    setIsInitialLoading(true);

    let offset = 0;
    let result: Awaited<ReturnType<typeof fetchMessagePage>> | null = null;

    while (true) {
      result = await fetchMessagePage({ offset });

      if (!result) {
        setMessages([]);
        setHasOlderMessages(false);
        setIsInitialLoading(false);
        return;
      }

      if (result.messages.length > 0 || !result.hasMore) {
        break;
      }

      offset += result.rawCount;
    }

    setMessages(result.messages);
    loadedHistoryCountRef.current = result.rawCount;
    loadedWindowOffsetRef.current = offset;
    setHasOlderMessages(result.hasMore);
    setIsInitialLoading(false);
  };

  const loadOlderMessages = async () => {
    const container = scrollContainerRef.current;

    if (!container || isLoadingOlder || !hasOlderMessages) {
      return;
    }

    setIsLoadingOlder(true);
    prependScrollStateRef.current = {
      previousScrollHeight: container.scrollHeight,
      previousScrollTop: container.scrollTop,
    };

    let nextOffset =
      loadedWindowOffsetRef.current + loadedHistoryCountRef.current;
    let result: Awaited<ReturnType<typeof fetchMessagePage>> | null = null;
    let rawRowsLoaded = 0;

    while (true) {
      result = await fetchMessagePage({ offset: nextOffset });

      if (!result) {
        prependScrollStateRef.current = null;
        setIsLoadingOlder(false);
        return;
      }

      rawRowsLoaded += result.rawCount;

      if (result.messages.length > 0 || !result.hasMore) {
        break;
      }

      nextOffset += result.rawCount;
    }

    loadedHistoryCountRef.current += rawRowsLoaded;

    setMessages((current) => {
      const existingIds = new Set(current.map((message) => message.id));
      const olderMessages = result.messages.filter(
        (message) => !existingIds.has(message.id),
      );

      if (olderMessages.length === 0) {
        prependScrollStateRef.current = null;
        return current;
      }

      return [...olderMessages, ...current];
    });

    setHasOlderMessages(result.hasMore);
    setIsLoadingOlder(false);
  };

  const fetchMessageById = async (messageId: string) => {
    const table = channelId
      ? "messages"
      : dmId
        ? "direct_message_messages"
        : "broadcast_messages";
    const selectQuery = channelId ? channelMessageSelect : directMessageSelect;
    const broadcastSelectQuery =
      "*, profiles:profiles!broadcast_messages_user_id_fkey(full_name, avatar_url, avatar_color)";

    const { data, error } = await supabase
      .from(table)
      .select(broadcastId ? broadcastSelectQuery : selectQuery)
      .eq("id", messageId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error("Failed to load realtime message", error);
      }
      return null;
    }

    const [messageWithReplyCount] = await applyThreadReplyCounts(
      [data as Message],
      table,
    );
    const pinnedMessageIds = await loadPinnedMessageIds([messageId]);
    const [messageWithReplyPreview] = await hydrateReplyPreviews([
      messageWithReplyCount,
    ]);

    return {
      ...messageWithReplyPreview,
      content: messageWithReplyPreview.is_deleted
        ? "This message was deleted"
        : messageWithReplyPreview.content,
      is_pinned: pinnedMessageIds.has(messageId),
    };
  };

  const handleRealtimeMessageChange = async (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE" | string;
    new: unknown;
    old: unknown;
  }) => {
    const changedMessageId =
      (payload.new as { id?: string } | null)?.id ??
      (payload.old as { id?: string } | null)?.id;

    if (!changedMessageId) return;

    if (payload.eventType === "DELETE") {
      setMessages((current) =>
        current.filter((message) => message.id !== changedMessageId),
      );
      return;
    }

    const nextMessage = await fetchMessageById(changedMessageId);
    if (!nextMessage || nextMessage.thread_id) return;

    setMessages((current) => {
      const existingIndex = current.findIndex(
        (message) => message.id === nextMessage.id,
      );

      if (existingIndex >= 0) {
        const nextMessages = [...current];
        nextMessages[existingIndex] = nextMessage;
        return nextMessages.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      }

      return [...current, nextMessage].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    });
  };

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;

    if (
      !container ||
      isInitialLoading ||
      isLoadingOlder ||
      !hasOlderMessages ||
      messages.length === 0
    ) {
      return;
    }

    if (container.scrollHeight <= container.clientHeight + 48) {
      void loadOlderMessages();
    }
  }, [messages, hasOlderMessages, isInitialLoading, isLoadingOlder]);

  const ensureMessageIsLoaded = async (
    messageId: string,
    messageTimestamp?: string,
  ) => {
    if (!channelId && !dmId && !broadcastId) return;

    const table = channelId
      ? "messages"
      : dmId
        ? "direct_message_messages"
        : "broadcast_messages";
    const selectQuery = channelId ? channelMessageSelect : directMessageSelect;
    const broadcastSelectQuery =
      "*, profiles:profiles!broadcast_messages_user_id_fkey(full_name, avatar_url, avatar_color)";

    const hiddenIds = await loadHiddenMessageIds(table);

    if (hiddenIds.has(messageId)) {
      return;
    }

    let resolvedTimestamp = messageTimestamp;

    if (!resolvedTimestamp) {
      const { data: targetMessage, error: targetError } = await supabase
        .from(table)
        .select("id, created_at")
        .eq("id", messageId)
        .maybeSingle();

      if (targetError || !targetMessage) {
        return;
      }

      resolvedTimestamp = (targetMessage as { created_at: string }).created_at;
    }

    let newerMessagesCountQuery = supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .is("thread_id", null)
      .gt("created_at", resolvedTimestamp);

    if (channelId) {
      newerMessagesCountQuery = newerMessagesCountQuery.eq(
        "channel_id",
        channelId,
      );
    } else if (dmId) {
      newerMessagesCountQuery = newerMessagesCountQuery.eq("dm_id", dmId);
    } else if (broadcastId) {
      newerMessagesCountQuery = newerMessagesCountQuery.eq(
        "broadcast_id",
        broadcastId,
      );
    }

    const { count, error: countError } = await newerMessagesCountQuery;

    if (countError) {
      console.error("Failed to locate message page", countError);
      return;
    }

    const targetOffset = count ?? 0;
    const pageOffset = Math.max(0, targetOffset - Math.floor(PAGE_SIZE / 2));
    const result = await fetchMessagePage({
      offset: pageOffset,
      limit: PAGE_SIZE,
    });

    if (result?.messages.some((message) => message.id === messageId)) {
      shouldAutoScrollRef.current = false;
      loadedWindowOffsetRef.current = pageOffset;
      loadedHistoryCountRef.current = result.rawCount;
      setHasOlderMessages(result.hasMore);
      setMessages(result.messages);
      return;
    }

    const { data, error } = await supabase
      .from(table)
      .select(broadcastId ? broadcastSelectQuery : selectQuery)
      .eq("id", messageId)
      .maybeSingle();

    if (error || !data) {
      return;
    }

    const [messageWithReplyCount] = await applyThreadReplyCounts(
      [data as Message],
      table,
    );
    const pinnedMessageIds = await loadPinnedMessageIds([messageId]);
    const [messageWithReplyPreview] = await hydrateReplyPreviews([
      messageWithReplyCount,
    ]);

    setMessages((current) => {
      if (current.some((message) => message.id === messageId)) {
        return current;
      }

      return [
        ...current,
        {
          ...messageWithReplyPreview,
          content: messageWithReplyPreview.is_deleted
            ? "This message was deleted"
            : messageWithReplyPreview.content,
          is_pinned: pinnedMessageIds.has(messageId),
        },
      ].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    });
  };

  const renderAttachment = (message: Message) => {
    if (!message.attachment_url) return null;

    const isImage = message.attachment_type?.startsWith("image/");

    return (
      <div className="">
        {isImage ? (
          <button
            onClick={() => {
              setFileLink(message.attachment_url);
              setOpenModal(true);
            }}
            className="block sm:w-auto"
          >
            <img
              src={message.attachment_url}
              alt={message.attachment_name || "Attachment"}
              className="rounded-lg border border-slate-200 hover:opacity-90 transition-opacity max-h-20 sm:max-h-20 object-cover max-w-full"
            />
          </button>
        ) : (
          <button
            onClick={() => {
              setFileLink(message.attachment_url);
              setOpenModal(true);
            }}
            className="flex items-center gap-3 p-3 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-150 transition-colors w-[200px] sm:max-w-sm sm:w-auto"
          >
            <span className="text-2xl flex-shrink-0">
              {getFileIcon(message.attachment_type || "")}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate max-w-[120px] sm:max-w-none">
                {message.attachment_name || "Attachment"}
              </p>
              {message.attachment_size && (
                <p className="text-xs text-slate-500">
                  {formatFileSize(message.attachment_size)}
                </p>
              )}
            </div>
          </button>
        )}
      </div>
    );
  };

  const hasSeenOwnDMMessage = (message: Message) => {
    if (!dmId || message.user_id !== user?.id || !otherParticipantLastReadAt) {
      return false;
    }

    return (
      new Date(otherParticipantLastReadAt).getTime() >=
      new Date(message.created_at).getTime()
    );
  };

  const getOwnDMMessageTickState = (message: Message) => {
    if (!dmId || message.user_id !== user?.id) {
      return null;
    }

    if (hasSeenOwnDMMessage(message)) {
      return "seen" as const;
    }

    if (otherParticipantIsOnline) {
      return "delivered" as const;
    }

    return "sent" as const;
  };

  const handleEdit = async (messageId: string) => {
    if (!editContent.trim()) return;

    const table = channelId
      ? "messages"
      : dmId
        ? "direct_message_messages"
        : "broadcast_messages";
    const supabaseClient = supabase as any;
    const { error } = await supabaseClient
      .from(table)
      .update({
        content: editContent,
        updated_at: new Date().toISOString(),
        is_edited: true,
      })
      .eq("id", messageId);

    if (error) {
      console.error("Failed to edit message", error);
      return;
    }

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content: editContent,
              updated_at: new Date().toISOString(),
              is_edited: true,
            }
          : message,
      ),
    );
    setEditingId(null);
    setEditContent("");
  };

  const handleQuickReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const existingReaction = reactionsByMessageId[messageId]?.find(
      (reaction) => reaction.user_id === user.id && reaction.emoji === emoji,
    );

    if (existingReaction) {
      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (error) {
        console.error("Failed to remove reaction", error);
        return;
      }

      await loadReactionsForMessages([messageId]);
      return;
    }

    const { error } = await supabase.from("message_reactions").insert({
      message_id: messageId,
      channel_id: channelId || null,
      broadcast_id: broadcastId || null,
      dm_id: dmId || null,
      workspace_id:
        messagesRef.current.find((message) => message.id === messageId)
          ?.workspace_id || null,
      user_id: user.id,
      emoji,
    } as any);

    if (error) {
      console.error("Failed to add reaction", error);
      return;
    }

    await loadReactionsForMessages([messageId]);
  };

  const markConversationAsRead = async (
    markerSuffix: string,
    readAt: string,
  ) => {
    if (!user || (!channelId && !dmId && !broadcastId)) return;
    const dmIdString = dmId!;
    const conversationKey = channelId
      ? `channel:${channelId}`
      : broadcastId
        ? `broadcast:${broadcastId}`
        : `dm:${dmId}`;
    const nextMarker = `${conversationKey}:${markerSuffix}`;

    if (lastMarkedConversationReadRef.current === nextMarker) {
      return;
    }

    if (channelId) {
      const { error } = await (supabase as any)
        .from("channel_members")
        .update({ last_read_at: readAt })
        .eq("channel_id", channelId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to update channel read state", error);
        return;
      }
    } else if (broadcastId) {
      const { error } = await (supabase as any)
        .from("broadcast_members")
        .update({ last_read_at: readAt })
        .eq("broadcast_id", broadcastId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to update broadcast read state", error);
        return;
      }
      // For now, we only update the broadcast_members.last_read_at.
    } else if (dmId) {
      const { data: conversation, error: conversationError } = await supabase
        .from("direct_messages")
        .select("id, user1_id, user2_id")
        .eq("id", dmId)
        .maybeSingle();

      if (conversationError || !conversation) {
        if (conversationError) {
          console.error(
            "Failed to load direct message read state",
            conversationError,
          );
        }
        return;
      }

      const typedConversation = conversation as {
        id: string;
        user1_id: string;
        user2_id: string;
      };
      const ownReadColumn =
        typedConversation.user1_id === user.id
          ? "user1_last_read_at"
          : "user2_last_read_at";

      const { error } = await (supabase as any)
        .from("direct_messages")
        .update({ [ownReadColumn]: readAt })
        .eq("id", dmIdString);

      if (error) {
        console.error("Failed to update DM read state", error);
        return;
      }
    }

    lastMarkedConversationReadRef.current = nextMarker;
    conversationLastReadAtRef.current = readAt;
    setConversationLastReadAt(readAt);
    setConversationReadStateReady(true);
    window.dispatchEvent(
      new CustomEvent("conversation-read", {
        detail: {
          channelId: channelId ?? null,
          dmId: dmId ?? null,
          broadcastId: broadcastId || null,
        },
      }),
    );
  };

  useEffect(() => {
    if (!user || (!channelId && !dmId && !broadcastId) || isInitialLoading) {
      return;
    }

    if (!conversationReadStateReady) {
      return;
    }

    const latestIncomingMessage = [...messages]
      .reverse()
      .find((message) => message.user_id !== user.id);

    if (!latestIncomingMessage) {
      return;
    }

    const latestIncomingAt = new Date(
      latestIncomingMessage.created_at,
    ).getTime();
    const lastReadAt = conversationLastReadAt
      ? new Date(conversationLastReadAt).getTime()
      : 0;

    if (latestIncomingAt <= lastReadAt) {
      return;
    }

    const markerSuffix = latestIncomingMessage.id;
    const readAt = new Date().toISOString();

    void markConversationAsRead(markerSuffix, readAt);
  }, [
    messages,
    user,
    channelId,
    dmId,
    isInitialLoading,
    conversationLastReadAt,
    conversationReadStateReady,
  ]);

  useEffect(() => {
    void loadBookmarks();
    void loadTodoMessageIds();
  }, [messages, user?.id, channelId, dmId, broadcastId]);

  useEffect(() => {
    if (!user || (!channelId && !dmId && !broadcastId)) {
      setConversationLastReadAt(null);
      conversationLastReadAtRef.current = null;
      setConversationReadStateReady(false);
      return;
    }

    let cancelled = false;

    const loadConversationReadState = async () => {
      if (channelId) {
        const { data, error } = await supabase
          .from("channel_members")
          .select("last_read_at")
          .eq("channel_id", channelId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Failed to load channel read state", error);
          setConversationLastReadAt(null);
          conversationLastReadAtRef.current = null;
        } else {
          const lastReadAt =
            (data as { last_read_at?: string | null } | null)?.last_read_at ??
            null;
          conversationLastReadAtRef.current = lastReadAt;
          setConversationLastReadAt(lastReadAt);
        }
      } else if (broadcastId) {
        const { data, error } = await supabase
          .from("broadcast_members")
          .select("last_read_at")
          .eq("broadcast_id", broadcastId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Failed to load broadcast read state", error);
          setConversationLastReadAt(null);
          conversationLastReadAtRef.current = null;
        } else {
          const lastReadAt =
            (data as { last_read_at?: string | null } | null)?.last_read_at ??
            null;
          conversationLastReadAtRef.current = lastReadAt;
          setConversationLastReadAt(lastReadAt);
        }
      } else if (dmId) {
        const { data, error } = await supabase
          .from("direct_messages")
          .select(
            "id, user1_id, user2_id, user1_last_read_at, user2_last_read_at",
          )
          .eq("id", dmId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Failed to load DM read state", error);
          setConversationLastReadAt(null);
          conversationLastReadAtRef.current = null;
        } else if (data) {
          const typedConversation = data as {
            id: string;
            user1_id: string;
            user2_id: string;
            user1_last_read_at: string | null;
            user2_last_read_at: string | null;
          };
          const lastReadAt =
            typedConversation.user1_id === user.id
              ? typedConversation.user1_last_read_at
              : typedConversation.user2_last_read_at;
          conversationLastReadAtRef.current = lastReadAt ?? null;
          setConversationLastReadAt(lastReadAt ?? null);
        }
      }

      if (!cancelled) {
        setConversationReadStateReady(true);
      }
    };

    setConversationReadStateReady(false);
    void loadConversationReadState();

    return () => {
      cancelled = true;
    };
  }, [channelId, dmId, broadcastId, user?.id]);

  useEffect(() => {
    const handleBookmarkChanged = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          channelId?: string | null;
          dmId?: string | null;
          broadcastId?: string | null;
        }>
      ).detail;

      const matchesConversation =
        (channelId && detail?.channelId === channelId) ||
        (dmId && detail?.dmId === dmId) ||
        (broadcastId && detail?.broadcastId === broadcastId);

      if (!matchesConversation) return;

      void loadBookmarks();
    };

    const handleTodoChanged = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          channelId?: string | null;
          dmId?: string | null;
          broadcastId?: string | null;
        }>
      ).detail;

      const matchesConversation =
        (channelId && detail?.channelId === channelId) ||
        (dmId && detail?.dmId === dmId) ||
        (broadcastId && detail?.broadcastId === broadcastId);

      if (!matchesConversation) return;

      void loadTodoMessageIds();
    };

    const handlePinChanged = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          channelId?: string | null;
          dmId?: string | null;
          broadcastId?: string | null;
        }>
      ).detail;

      const matchesConversation =
        (channelId && detail?.channelId === channelId) ||
        (broadcastId && detail?.broadcastId === broadcastId) ||
        (dmId && detail?.dmId === dmId);

      if (!matchesConversation) return;

      const currentMessageIds = messagesRef.current.map(
        (message) => message.id,
      );
      if (currentMessageIds.length === 0) return;

      void loadPinnedMessageIds(currentMessageIds).then((pinnedMessageIds) => {
        setMessages((current) =>
          current.map((message) => ({
            ...message,
            is_pinned: pinnedMessageIds.has(message.id),
          })),
        );
      });
    };

    window.addEventListener("bookmark-changed", handleBookmarkChanged);
    window.addEventListener("pin-changed", handlePinChanged);
    window.addEventListener("todo-changed", handleTodoChanged);

    return () => {
      window.removeEventListener("bookmark-changed", handleBookmarkChanged);
      window.removeEventListener("pin-changed", handlePinChanged);
      window.removeEventListener("todo-changed", handleTodoChanged);
    };
  }, [channelId, dmId, broadcastId, messages, user?.id]);

  useEffect(() => {
    if (!user) {
      setJoinedChannelIds(new Set());
      setRemovedInviteTokens(new Set());
      return;
    }

    const inviteTokens = Array.from(
      new Set(
        messages
          .map(
            (message) =>
              parseChannelInviteMessageContent(message.content)?.token,
          )
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const inviteChannelIds = Array.from(
      new Set(
        messages
          .map(
            (message) =>
              parseChannelInviteMessageContent(message.content)?.channelId,
          )
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (inviteChannelIds.length === 0) {
      setJoinedChannelIds(new Set());
      setRemovedInviteTokens(new Set());
      return;
    }

    let cancelled = false;

    const loadJoinedChannels = async () => {
      const [
        { data: membershipData, error: membershipError },
        { data: inviteData, error: inviteError },
      ] = await Promise.all([
        supabase
          .from("channel_members")
          .select("channel_id")
          .eq("user_id", user.id)
          .in("channel_id", inviteChannelIds),
        supabase
          .from("channel_invites")
          .select("invite_token, channel_id, accepted_at")
          .in("invite_token", inviteTokens),
      ]);

      if (cancelled || membershipError || inviteError) return;

      const joinedChannels = new Set(
        ((membershipData as Array<{ channel_id: string }> | null) ?? []).map(
          (membership) => membership.channel_id,
        ),
      );

      const removedTokens = new Set(
        (
          (inviteData as Array<{
            invite_token: string;
            channel_id: string;
            accepted_at: string | null;
          }> | null) ?? []
        )
          .filter(
            (invite) =>
              invite.accepted_at && !joinedChannels.has(invite.channel_id),
          )
          .map((invite) => invite.invite_token),
      );

      setJoinedChannelIds(joinedChannels);
      setRemovedInviteTokens(removedTokens);
    };

    void loadJoinedChannels();

    return () => {
      cancelled = true;
    };
  }, [messages, user]);

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, "h:mm a")}`;
    }
    return format(date, "MMM d, h:mm a");
  };

  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = format(new Date(message.created_at), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, Message[]>,
  );

  const formatDateDivider = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMMM d");
  };

  const handleJoinInvite = async (token: string) => {
    // This is channel specific
    if (!user) return;

    setJoiningInviteToken(token);

    try {
      const { data: invite, error: inviteError } = await supabase
        .from("channel_invites")
        .select("channel_id, invited_email, accepted_at")
        .eq("invite_token", token)
        .maybeSingle();
      const typedInvite = invite as ChannelInviteRecord | null;

      if (inviteError) throw inviteError;
      if (!typedInvite) throw new Error("Invite not found.");

      if (
        typedInvite.invited_email &&
        user.email &&
        typedInvite.invited_email.toLowerCase() !== user.email.toLowerCase()
      ) {
        throw new Error("This invite belongs to a different email address.");
      }

      const { data: existingMembership, error: membershipError } =
        await supabase
          .from("channel_members")
          .select("channel_id")
          .eq("channel_id", typedInvite.channel_id)
          .eq("user_id", user.id)
          .maybeSingle();

      if (membershipError) throw membershipError;

      if (existingMembership) {
        setRemovedInviteTokens((current) => {
          const next = new Set(current);
          next.delete(token);
          return next;
        });
        setJoinedInviteTokens((current) => new Set(current).add(token));
        setJoinedChannelIds((current) => {
          const next = new Set(current);
          next.add(typedInvite.channel_id);
          return next;
        });
        onChannelJoin?.(typedInvite.channel_id);
        return;
      }

      if (typedInvite.accepted_at) {
        setRemovedInviteTokens((current) => new Set(current).add(token));
        return;
      }

      const { data: acceptedChannelId, error: joinError } = await (
        supabase as any
      ).rpc("accept_channel_invite", {
        p_invite_token: token,
      });

      if (joinError) {
        throw joinError;
      }

      const joinedChannelId =
        (acceptedChannelId as string | null) ?? typedInvite.channel_id;

      setRemovedInviteTokens((current) => {
        const next = new Set(current);
        next.delete(token);
        return next;
      });
      setJoinedInviteTokens((current) => new Set(current).add(token));
      setJoinedChannelIds((current) => {
        const next = new Set(current);
        next.add(joinedChannelId);
        return next;
      });
      onChannelJoin?.(joinedChannelId);
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setJoiningInviteToken(null);
    }
  };

  const selectedMessages = messages.filter((message) =>
    selectedMessageIds.has(message.id),
  );
  const selectedDeleteForEveryoneEligible = selectedMessages.every(
    (message) =>
      message.user_id === user?.id &&
      Date.now() - new Date(message.created_at).getTime() <= 5 * 60 * 1000,
  );

  const handleBatchBookmark = async () => {
    if (selectedMessages.length === 0) return;
    const results = await Promise.all(
      selectedMessages.map((message) => bookmarkMessage(message.id, true)),
    );
    if (results.every(Boolean)) clearSelection();
  };

  const handleBatchPin = async () => {
    if (selectedMessages.length === 0) return;
    const results = await Promise.all(
      selectedMessages.map((message) => setPinnedState(message.id, true)),
    );
    if (results.every(Boolean)) clearSelection();
  };

  const handleBatchForward = () => {
    if (selectedMessages.length === 0) return;
    onForwardMessages?.(selectedMessages);
    clearSelection();
  };

  const handleBatchDelete = async (mode: "me" | "everyone") => {
    if (selectedMessages.length === 0) return;

    const done = await Promise.all(
      selectedMessages.map((message) =>
        mode === "me" ? deleteMessageForMe(message) : deleteMessage(message.id),
      ),
    );

    if (done.every(Boolean)) {
      setIsBatchDeleteMenuOpen(false);
      clearSelection();
    }
  };

  const renderInitialSkeleton = () => {
    const rows = [
      { align: "left", width: "w-56", secondary: "w-32" },
      { align: "right", width: "w-44", secondary: "w-24" },
      { align: "left", width: "w-64", secondary: "w-40" },
      { align: "right", width: "w-52", secondary: "w-28" },
      { align: "left", width: "w-48", secondary: "w-36" },
      { align: "right", width: "w-60", secondary: "w-32" },
    ] as const;

    return (
      <div className="flex min-h-full flex-col justify-end px-4 py-6">
        <div className="space-y-5">
          {rows.map((row, index) => (
            <div
              key={`${row.align}-${index}`}
              className={`flex ${row.align === "right" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[72%] ${row.align === "left" ? "flex flex-col items-start" : "flex flex-col items-end"}`}
              >
                {row.align === "left" && (
                  <div className="mb-2 h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                )}
                <div
                  className={`rounded-2xl px-3 py-3 ${
                    row.align === "right"
                      ? "rounded-br-md bg-sky-100 dark:bg-sky-900/40"
                      : "rounded-bl-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800"
                  }`}
                >
                  <div
                    className={`h-3 animate-pulse rounded ${row.width} ${
                      row.align === "right"
                        ? "bg-sky-200 dark:bg-sky-800/80"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                  <div
                    className={`mt-2 h-3 animate-pulse rounded ${
                      row.secondary
                    } ${
                      row.align === "right"
                        ? "bg-sky-200 dark:bg-sky-800/80"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    const title = dmId
      ? "No messages yet. Start the conversation!"
      : broadcastId
        ? "No broadcast messages yet."
        : "No messages yet.";

    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#3178C6] text-white shadow-sm">
          <MessageSquare size={28} strokeWidth={2.4} />
        </div>
        <p className="max-w-xs text-sm font-medium text-slate-600 dark:text-slate-300">
          {title}
        </p>
      </div>
    );
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-white custom-scrollbar"
    >
      {isInitialLoading && messages.length === 0 ? (
        renderInitialSkeleton()
      ) : messages.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="flex flex-col justify-end min-h-full py-4">
          {/* <div className="sticky top-0 z-20 px-4 pb-3">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
              {isMultiSelectMode ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <CheckSquare size={16} className="text-[#3178C6]" />
                    {selectedMessageIds.size} selected
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllLoadedMessages}
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Tip: multi-select messages for batch actions.
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMultiSelectMode(true)}
                    className="rounded-xl bg-[#3178C6] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#255f9c]"
                  >
                    Select
                  </button>
                </>
              )}
            </div>
          </div> */}

          {isLoadingOlder && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex justify-start">
                <div className="max-w-[72%] space-y-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-800">
                    <div className="h-3 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="mt-2 h-3 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="max-w-[68%]">
                  <div className="rounded-2xl rounded-br-md bg-sky-100 px-3 py-3 dark:bg-sky-900/40">
                    <div className="h-3 w-44 animate-pulse rounded bg-sky-200 dark:bg-sky-800/80" />
                    <div className="mt-2 h-3 w-24 animate-pulse rounded bg-sky-200 dark:bg-sky-800/80" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="relative">
              {/* Date Divider */}
              <div className="flex items-center my-4 px-4">
                <div className="flex-1 h-[1px] bg-slate-100"></div>
                <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-tight">
                  {formatDateDivider(date)}
                </span>
                <div className="flex-1 h-[1px] bg-slate-100"></div>
              </div>

              {dateMessages.map((message) => {
                const channelInvite = parseChannelInviteMessageContent(
                  message.content,
                );
                const systemMessageText = parseChannelSystemMessage(
                  message.content,
                );
                const profileName =
                  capitalizeFirst(channelInvite?.invitedByName) ||
                  capitalizeFirst(message.profiles?.full_name) ||
                  "Unknown user";
                const profileInitial =
                  profileName.charAt(0).toUpperCase() || "?";
                const isForwarded = message.forwarded === true;
                const cleanedContent = message.content;
                const isJoiningInvite =
                  joiningInviteToken === channelInvite?.token;
                const hasJoinedInvite =
                  channelInvite &&
                  (joinedInviteTokens.has(channelInvite.token) ||
                    joinedChannelIds.has(channelInvite.channelId));
                const hasRemovedInvite =
                  channelInvite && removedInviteTokens.has(channelInvite.token);
                const isOwnMessage = message.user_id === user?.id;
                const isInviteOwnedByCurrentUser = Boolean(
                  channelInvite &&
                  user &&
                  channelInvite.invitedById === user.id,
                );
                const alignAsOwnMessage =
                  channelInvite && !channelId
                    ? isInviteOwnedByCurrentUser
                    : isOwnMessage;
                const showSenderMeta = Boolean(channelId || broadcastId);
                const showMessageAvatar = !alignAsOwnMessage;
                const messageTimeLabel = formatMessageTime(message.created_at);
                const messageTickState = getOwnDMMessageTickState(message);

                if (systemMessageText) {
                  return (
                    <div
                      key={message.id}
                      id={`message-${message.id}`}
                      className="flex justify-center px-4 py-2 scroll-mt-24"
                    >
                      <div
                        data-message-highlight-id={message.id}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500"
                      >
                        {systemMessageText}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={message.id}
                    id={`message-${message.id}`}
                    onPointerDown={() => {
                      if (!isMultiSelectMode) handlePointerDown(message.id);
                    }}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onClick={() => {
                      if (isMultiSelectMode) {
                        toggleMessageSelection(message.id);
                      }
                    }}
                    className={`group relative flex px-4 pt-[1.20rem] pb-1.5 hover:bg-slate-50/80 dark:hover:bg-[#eeeeee1c] transition-colors scroll-mt-24 ${
                      alignAsOwnMessage ? "justify-end" : "justify-start"
                    }`}
                  >
                    {isMultiSelectMode && (
                      <button
                        type="button"
                        aria-label={`Select message ${profileName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMessageSelection(message.id);
                        }}
                        className={`absolute top-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                          selectedMessageIds.has(message.id)
                            ? "border-[#3178C6] bg-[#3178C6] text-white"
                            : "border-slate-300 bg-white text-transparent dark:border-slate-700 dark:bg-slate-900"
                        } ${alignAsOwnMessage ? "left-4" : "left-4"}`}
                      >
                        <CheckSquare size={14} />
                      </button>
                    )}

                    {!editingId &&
                      !isMultiSelectMode &&
                      !channelInvite &&
                      !message.is_deleted && (
                        <div
                          className={`absolute -top-3 ${
                            alignAsOwnMessage
                              ? "right-4"
                              : showSenderMeta
                                ? "left-16"
                                : "left-4"
                          } z-10 hidden sm:flex opacity-0 group-hover:opacity-100 transition-all duration-150`}
                        >
                          <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-lg overflow-visible h-8">
                            <div className="flex items-center gap-1.5 px-2 border-r border-slate-300">
                              {(["👍", "❤️", "😂"] as const).map((emoji) => (
                                <Tooltip
                                  key={emoji}
                                  content={`React with ${emoji}`}
                                >
                                  <button
                                    onClick={() =>
                                      handleQuickReaction(message.id, emoji)
                                    }
                                    className="text-sm hover:scale-110 transition-transform"
                                  >
                                    {emoji}
                                  </button>
                                </Tooltip>
                              ))}
                            </div>

                            <Tooltip content="Add reaction">
                              <button
                                onClick={() =>
                                  setActiveReactionPickerMessageId(message.id)
                                }
                                className="px-2 hover:bg-slate-100 text-slate-500 h-full border-r border-slate-100"
                              >
                                <Smile size={16} />
                              </button>
                            </Tooltip>

                            {(channelId || dmId) && (
                              <Tooltip content="Reply">
                                <button
                                  onClick={() => onReplyToMessage?.(message)}
                                  className="px-2 hover:bg-slate-100 text-slate-500 h-full border-r border-slate-100"
                                >
                                  <CornerUpLeft size={16} />
                                </button>
                              </Tooltip>
                            )}

                            <Tooltip content="Reply in thread">
                              <button
                                onClick={() => onThreadOpen?.(message)}
                                className="px-2 hover:bg-slate-100 text-slate-500 h-full border-r border-slate-100"
                              >
                                <MessageSquare size={16} />
                              </button>
                            </Tooltip>

                            <Tooltip
                              content={
                                todoMessageIds.has(message.id)
                                  ? "Already in Task"
                                  : "Add to Task"
                              }
                            >
                              <button
                                onClick={() => addMessageToTodo(message)}
                                className={`px-2 hover:bg-slate-100 h-full border-r border-slate-100 ${
                                  todoMessageIds.has(message.id)
                                    ? "text-emerald-600"
                                    : "text-slate-500"
                                }`}
                              >
                                <ListTodo size={16} />
                              </button>
                            </Tooltip>

                            <Tooltip
                              content={
                                bookmarkedMessages.has(message.id)
                                  ? "Remove bookmark"
                                  : "Bookmark message"
                              }
                            >
                              <button
                                onClick={() =>
                                  bookmarkMessage(
                                    message.id,
                                    !bookmarkedMessages.has(message.id),
                                  )
                                }
                                className={`px-2 hover:bg-slate-100 h-full border-r border-slate-100 ${
                                  bookmarkedMessages.has(message.id)
                                    ? "text-amber-500"
                                    : "text-slate-500"
                                }`}
                              >
                                <Bookmark
                                  size={16}
                                  fill={
                                    bookmarkedMessages.has(message.id)
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              </button>
                            </Tooltip>

                            <Tooltip
                              content={
                                copiedMessageId === message.id
                                  ? "Text copied"
                                  : "Copy text"
                              }
                            >
                              <button
                                onClick={() => {
                                  void navigator.clipboard.writeText(
                                    cleanedContent,
                                  );
                                  setCopiedMessageId(message.id);
                                  if (copiedMessageTimeoutRef.current) {
                                    clearTimeout(
                                      copiedMessageTimeoutRef.current,
                                    );
                                  }
                                  copiedMessageTimeoutRef.current = setTimeout(
                                    () => {
                                      setCopiedMessageId((current) =>
                                        current === message.id ? null : current,
                                      );
                                    },
                                    1500,
                                  );
                                }}
                                className="px-2 hover:bg-slate-100 text-slate-500 h-full border-r border-slate-100"
                              >
                                <Copy size={16} />
                              </button>
                            </Tooltip>

                            {message.user_id === user?.id &&
                              Date.now() -
                                new Date(message?.created_at).getTime() <=
                                5 * 60 * 1000 && (
                                <Tooltip content="Edit message">
                                  <button
                                    onClick={() => {
                                      setEditingId(message.id);
                                      setEditContent(message.content);
                                    }}
                                    className="px-2 hover:bg-slate-100 text-slate-500 h-full border-r border-slate-100"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                </Tooltip>
                              )}

                            <Tooltip
                              content={
                                message.is_pinned
                                  ? "Unpin message"
                                  : "Pin message"
                              }
                            >
                              <button
                                onClick={() =>
                                  setPinnedState(message.id, !message.is_pinned)
                                }
                                className={`px-2 hover:bg-slate-100 h-full border-r border-slate-100 ${
                                  message.is_pinned
                                    ? "text-[#3178C6]"
                                    : "text-slate-500"
                                }`}
                              >
                                <Pin
                                  size={16}
                                  fill={
                                    message.is_pinned ? "currentColor" : "none"
                                  }
                                />
                              </button>
                            </Tooltip>

                            <Tooltip content="Forward message">
                              <button
                                onClick={() => onForwardMessage?.(message)}
                                className="p-1.5 hover:bg-slate-200 rounded transition-colors text-slate-500"
                              >
                                <CornerUpRight size={16} />
                              </button>
                            </Tooltip>

                            <Tooltip content="Delete message">
                              <button
                                onClick={() => setDeleteMenuMessage(message)}
                                className="px-2 hover:bg-slate-100 text-red-500 h-full"
                              >
                                <Trash2 size={16} />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      )}
                    {showMessageAvatar && (
                      <div
                        className="relative w-10 h-10 rounded-full flex items-center justify-center overflow-hidden text-white text-sm font-bold flex-shrink-0 mt-0.5 shadow-sm mr-3"
                        style={{
                          backgroundColor:
                            message.profiles?.avatar_color || "#3178c6",
                        }}
                      >
                        {profileInitial}
                        {message.profiles?.avatar_url && (
                          <img
                            src={message.profiles.avatar_url}
                            alt={profileName}
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </div>
                    )}

                    <div
                      className={`min-w-0 max-w-[86%] sm:max-w-[75%] ${
                        alignAsOwnMessage
                          ? "flex flex-col items-end"
                          : "flex flex-col items-start"
                      }`}
                    >
                      {editingId === message.id ? (
                        <div
                          data-message-highlight-id={message.id}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2"
                        >
                          <textarea
                            rows={2}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-transparent border-none resize-none focus:ring-0 text-[14px] text-slate-700 outline-none"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleEdit(message.id)}
                              className="text-[11px] font-bold text-[#3178C6] hover:underline"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-[11px] font-bold text-slate-500 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {channelInvite ? (
                            <div
                              data-message-highlight-id={message.id}
                              className="mt-1 max-w-md rounded-2xl border border-sky-200 bg-sky-50 p-4"
                            >
                              <p className="text-sm font-semibold text-slate-900">
                                Join #{channelInvite.channelName}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {channelInvite.invitedByName} invited you to
                                join this channel. You will only be added after
                                you click Join.
                              </p>
                              {hasRemovedInvite && (
                                <p className="mt-3 text-sm text-red-600">
                                  You have been removed by the admin and cannot
                                  join this channel again on your own.
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  void handleJoinInvite(channelInvite.token)
                                }
                                disabled={Boolean(
                                  hasJoinedInvite ||
                                  hasRemovedInvite ||
                                  isJoiningInvite,
                                )}
                                className="mt-3 inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {hasJoinedInvite
                                  ? "Joined"
                                  : hasRemovedInvite
                                    ? "Unavailable"
                                    : isJoiningInvite
                                      ? "Joining..."
                                      : "Join"}
                              </button>
                            </div>
                          ) : (
                            <>
                              {" "}
                              {/* This needs to be updated for broadcast too */}
                              {!alignAsOwnMessage && showSenderMeta && (
                                <div className="mb-1 px-1">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (message.user_id) {
                                        void onDMSelect?.(
                                          message.user_id,
                                          event,
                                        );
                                      }
                                    }}
                                    className="font-bold text-[14px] text-slate-900 transition-colors hover:text-[#3178C6]"
                                  >
                                    {profileName}
                                  </button>
                                </div>
                              )}
                              {/* {cleanedContent.length === 0 ? (
                                ""
                              ) : ( */}
                              <div
                                data-message-highlight-id={message.id}
                                className={`max-w-full overflow-hidden rounded-[18px] shadow-sm transition-all duration-300 ${
                                  alignAsOwnMessage
                                    ? "rounded-tr-[4px] rounded-tl-[14px] rounded-bl-[14px] rounded-br-[14px] bg-[#3178C6] text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
                                    : "rounded-tl-[4px] rounded-tr-[14px] rounded-br-[14px] rounded-bl-[14px] border border-slate-200 bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                                } ${
                                  cleanedContent.length === 0 ? "" : "px-3 py-2"
                                }`}
                              >
                                {message.reply_preview && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInlineScrollToMessageTarget({
                                        messageId: message.reply_preview!.id,
                                        nonce: Date.now(),
                                      })
                                    }
                                    className={`mb-2 flex w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                                      alignAsOwnMessage
                                        ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    <div
                                      className={`mt-0.5 h-8 w-1 rounded-full ${
                                        alignAsOwnMessage
                                          ? "bg-white/60"
                                          : "bg-emerald-500"
                                      }`}
                                    />
                                    <div className="min-w-0">
                                      <p
                                        className={`text-[11px] font-semibold ${
                                          alignAsOwnMessage
                                            ? "text-white/85"
                                            : "text-emerald-700"
                                        }`}
                                      >
                                        {message.reply_preview.senderId ===
                                        user?.id
                                          ? "You"
                                          : message.reply_preview.senderName}
                                      </p>
                                      <p
                                        className={`line-clamp-2 text-[12px] ${
                                          alignAsOwnMessage
                                            ? "text-white/80"
                                            : "text-slate-600"
                                        }`}
                                      >
                                        {message.reply_preview.content ||
                                          message.reply_preview
                                            .attachmentName ||
                                          "Attachment"}
                                      </p>
                                    </div>
                                  </button>
                                )}{" "}
                                {/* This needs to be updated for broadcast too */}
                                {isForwarded && (
                                  <div
                                    className={`mb-1 flex items-center gap-1 text-[11px] ${
                                      alignAsOwnMessage
                                        ? "text-white/80"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    <CornerUpRight size={12} />
                                    <span className="italic">Forwarded</span>
                                  </div>
                                )}
                                {!message.is_deleted &&
                                  renderAttachment(message)}{" "}
                                {/* This needs to be updated for broadcast too */}
                                <div
                                  data-selectable-message-text
                                  className={`min-w-0 select-none whitespace-pre-wrap text-[14px] leading-[1.4] [overflow-wrap:anywhere] [word-break:break-word] sm:select-text ${message.is_deleted ? "italic" : ""}`}
                                >
                                  {renderMentions(
                                    cleanedContent,
                                    onMentionClick,
                                  )}
                                </div>
                              </div>
                              <div className="data-message-highlight-id={message.id} mt-1 flex select-none items-center gap-2 text-[11px] text-slate-400">
                                {/* <div
                                  className={`flex items-center gap-1 text-[11px] ${
                                    alignAsOwnMessage
                                      ? "justify-end text-black/80"
                                      : "justify-end text-slate-400"
                                  } ${cleanedContent.length === 0 ? "mt-0" : "mt-1"}`}
                                > */}
                                {message.is_edited && <span>Edited</span>}
                                {/* </div> */}
                                <span>{messageTimeLabel}</span>
                                {messageTickState &&
                                  (messageTickState === "seen" ? (
                                    <CheckCheck
                                      size={14}
                                      className="text-emerald-300"
                                    />
                                  ) : messageTickState === "delivered" ? (
                                    <CheckCheck size={14} />
                                  ) : (
                                    <Check size={14} />
                                  ))}
                              </div>
                              {/* )} */}
                            </>
                          )}

                          {!channelInvite &&
                            !message.is_deleted &&
                            ((reactionsByMessageId[message.id] ?? []).length >
                              0 ||
                              activeReactionPickerMessageId === message.id) && (
                              <MessageReactions
                                messageId={message.id}
                                reactions={
                                  reactionsByMessageId[message.id] ?? []
                                }
                                onToggleReaction={handleQuickReaction}
                                showEmojiPicker={
                                  activeReactionPickerMessageId === message.id
                                }
                                setShowEmojiPicker={(show) =>
                                  setActiveReactionPickerMessageId(
                                    show ? message.id : null,
                                  )
                                }
                                pickerAlign={
                                  alignAsOwnMessage ? "right" : "left"
                                }
                              />
                            )}

                          {!channelInvite &&
                          !message.is_deleted &&
                          message.reply_count &&
                          message.reply_count > 0 ? (
                            <button
                              onClick={() => onThreadOpen?.(message)}
                              className="mt-1 flex items-center gap-2 group/thread"
                            >
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                <MessageSquare
                                  size={12}
                                  className="text-[#3178C6]"
                                />
                              </div>
                              <span className="text-xs font-bold text-[#3178C6] group-hover:underline">
                                {message.reply_count}{" "}
                                {message.reply_count === 1
                                  ? "reply"
                                  : "replies"}
                              </span>
                            </button>
                          ) : (
                            ""
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {actionSheetMessageId &&
        (() => {
          const msg = messages.find((m) => m.id === actionSheetMessageId);
          if (!msg) return null;
          return (
            <MessageActionSheet
              message={msg}
              canChatReply={Boolean(channelId || dmId)}
              isOwner={msg.user_id === user?.id}
              isBookmarked={bookmarkedMessages.has(msg.id)}
              isPinned={!!msg.is_pinned}
              canDeleteForEveryone={
                msg.user_id === user?.id &&
                Date.now() - new Date(msg.created_at).getTime() <= 5 * 60 * 1000
              }
              onClose={() => setActionSheetMessageId(null)}
              onReact={(emoji) => {
                handleQuickReaction(msg.id, emoji);
                setActionSheetMessageId(null);
              }}
              onOpenEmojiPicker={() => {
                setActiveReactionPickerMessageId(msg.id);
                setActionSheetMessageId(null);
              }}
              onChatReply={() => {
                onReplyToMessage?.(msg);
                setActionSheetMessageId(null);
              }}
              onReply={() => {
                onThreadOpen?.(msg);
                setActionSheetMessageId(null);
              }}
              onBookmark={() => {
                bookmarkMessage(msg.id, !bookmarkedMessages.has(msg.id));
                setActionSheetMessageId(null);
              }}
              onCopyText={() => {
                void navigator.clipboard.writeText(msg.content);
                setActionSheetMessageId(null);
              }}
              onAddToTodo={() => {
                addMessageToTodo(msg);
                setActionSheetMessageId(null);
              }}
              onEdit={() => {
                setEditingId(msg.id);
                setEditContent(msg.content);
                setActionSheetMessageId(null);
              }}
              onPin={() => {
                setPinnedState(msg.id, !msg.is_pinned);
                setActionSheetMessageId(null);
              }}
              onForward={() => {
                onForwardMessage?.(msg);
                setActionSheetMessageId(null);
              }}
              onDeleteForMe={() => {
                deleteMessageForMe(msg);
                setActionSheetMessageId(null);
              }}
              onDeleteForEveryone={() => {
                deleteMessage(msg.id);
                setActionSheetMessageId(null);
              }}
            />
          );
        })()}
      {selectedMessages.length > 0 && (
        <div className="sticky bottom-4 z-30 px-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {selectedMessages.length} selected
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleBatchBookmark}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Bookmark
              </button>
              <button
                onClick={handleBatchPin}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Pin
              </button>
              <button
                onClick={handleBatchForward}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Forward
              </button>
              <button
                onClick={() => setIsBatchDeleteMenuOpen(true)}
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {isBatchDeleteMenuOpen && selectedMessages.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsBatchDeleteMenuOpen(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Delete selected messages
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose how to delete {selectedMessages.length} selected messages.{" "}
              {/* This needs to be updated for broadcast too */}
            </p>
            <div className="mt-4 space-y-2">
              {" "}
              {/* This needs to be updated for broadcast too */}
              <button
                type="button"
                onClick={async () => {
                  await handleBatchDelete("me");
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span>Delete for me</span>
                <Trash2 size={16} className="text-red-500" />{" "}
                {/* This needs to be updated for broadcast too */}
              </button>
              {selectedDeleteForEveryoneEligible && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleBatchDelete("everyone");
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                >
                  <span>Delete for everyone</span>
                  <Trash2 size={16} />{" "}
                  {/* This needs to be updated for broadcast too */}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsBatchDeleteMenuOpen(false)}
              className="mt-4 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} className="h-4" />
      {deleteMenuMessage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteMenuMessage(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Delete message
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose how you want to remove this message.
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={async () => {
                  const done = await deleteMessageForMe(deleteMenuMessage);
                  if (done) setDeleteMenuMessage(null);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <span>Delete for me</span>
                <Trash2 size={16} className="text-red-500" />
              </button>

              {deleteMenuMessage.user_id === user?.id &&
                Date.now() - new Date(deleteMenuMessage.created_at).getTime() <=
                  5 * 60 * 1000 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const done = await deleteMessage(deleteMenuMessage.id);
                      if (done) setDeleteMenuMessage(null);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                  >
                    <span>Delete for everyone</span>
                    <Trash2 size={16} />
                  </button>
                )}
            </div>

            <button
              type="button"
              onClick={() => setDeleteMenuMessage(null)}
              className="mt-4 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <FileViewerModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        url={fileLink}
      />
    </div>
  );
}
