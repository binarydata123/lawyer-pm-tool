import { useState, useEffect, useRef } from "react";
import { X, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";
import { format } from "date-fns";
import { MessageReactions } from "./MessageReactions";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  workspace_id?: string | null;
  channel_id?: string | null;
  dm_id?: string | null;
  thread_id?: string | null;
  reply_count?: number | null;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachment_type?: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface ThreadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  parentMessage: Message | null;
  channelId?: string;
  broadcastId?: string;
  dmId?: string;
  highlightReplyId?: string;
}

export function ThreadPanel({
  isOpen,
  onClose,
  parentMessage,
  channelId,
  broadcastId,
  dmId,
  highlightReplyId,
}: ThreadPanelProps) {
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaces();
  const resolvedWorkspaceId = parentMessage?.workspace_id ?? activeWorkspaceId;
  const channelReplySelect =
    "*, profiles:profiles!messages_user_id_fkey(full_name, avatar_url)";
  const directReplySelect =
    "*, profiles:profiles!direct_message_messages_user_id_fkey(full_name, avatar_url)";

  useEffect(() => {
    if (isOpen && parentMessage) {
      void loadThreadData();

      const table = channelId
        ? "messages"
        : broadcastId
          ? "broadcast_messages"
          : "direct_message_messages";
      const channel = supabase
        .channel(`thread-${parentMessage.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `thread_id=eq.${parentMessage.id}`,
          },
          () => loadReplies(),
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [isOpen, parentMessage, channelId, dmId, broadcastId]);

  useEffect(() => {
    if (!highlightReplyId || replies.length === 0) return;

    const target = document.querySelector<HTMLElement>(
      `[data-thread-reply-id="${highlightReplyId}"]`,
    );
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add(
      "bg-blue-50/80",
      "ring-1",
      "ring-blue-200",
      "shadow-sm",
      "rounded-xl",
    );

    if (replyHighlightTimeoutRef.current) {
      clearTimeout(replyHighlightTimeoutRef.current);
    }

    replyHighlightTimeoutRef.current = setTimeout(() => {
      target.classList.remove(
        "bg-blue-50/80",
        "ring-1",
        "ring-blue-200",
        "shadow-sm",
        "rounded-xl",
      );
    }, 1800);
  }, [highlightReplyId, replies]);

  useEffect(() => {
    if (highlightReplyId) return;
    scrollToBottom();
  }, [replies, highlightReplyId]);

  useEffect(() => {
    return () => {
      if (replyHighlightTimeoutRef.current) {
        clearTimeout(replyHighlightTimeoutRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadThreadData = async () => {
    if (!parentMessage) return;

    setThreadLoading(true);

    const table = channelId
      ? "messages"
      : broadcastId
        ? "broadcast_messages"
        : "direct_message_messages";
    const parentSelect = channelId ? channelReplySelect : directReplySelect;

    const { data: parentData, error: parentError } = await supabase
      .from(table)
      .select(parentSelect)
      .eq("id", parentMessage.id)
      .maybeSingle();

    if (parentError) {
      console.error("Failed to load thread parent message", parentError);
      setThreadParent(parentMessage);
    } else {
      setThreadParent((parentData as Message | null) ?? parentMessage);
    }

    await loadReplies();
    setThreadLoading(false);
  };

  const loadReplies = async () => {
    if (!parentMessage) return;

    if (channelId) {
      let query = supabase
        .from("messages")
        .select(channelReplySelect)
        .eq("thread_id", parentMessage.id)
        .eq("channel_id", channelId);

      if (resolvedWorkspaceId) {
        query = query.eq("workspace_id", resolvedWorkspaceId);
      }

      const { data, error } = await query.order("created_at", {
        ascending: true,
      });

      if (error) {
        console.error("Failed to load thread replies", error);
        setReplies([]);
        return;
      }

      if (data) setReplies(data as unknown as Message[]);
    } else if (dmId) {
      let query = supabase
        .from("direct_message_messages")
        .select(directReplySelect)
        .eq("thread_id", parentMessage.id)
        .eq("dm_id", dmId);

      if (resolvedWorkspaceId) {
        query = query.eq("workspace_id", resolvedWorkspaceId);
      }

      const { data, error } = await query.order("created_at", {
        ascending: true,
      });

      if (error) {
        console.error("Failed to load DM thread replies", error);
        setReplies([]);
        return;
      }

      if (data) setReplies(data as unknown as Message[]);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !user || !parentMessage) return;

    setLoading(true);

    const messageData: any = {
      user_id: user.id,
      content: replyText.trim(),
      thread_id: parentMessage.id,
      workspace_id: resolvedWorkspaceId,
    };

    if (channelId) {
      messageData.channel_id = channelId;
      messageData.parent_id = parentMessage.id;
      const { error } = await supabase.from("messages").insert(messageData);
      if (error) {
        console.error("Failed to send thread reply", error);
        setLoading(false);
        return;
      }
    } else if (dmId) {
      messageData.dm_id = dmId;
      const { error } = await supabase
        .from("direct_message_messages")
        .insert(messageData);
      if (error) {
        console.error("Failed to send DM thread reply", error);
        setLoading(false);
        return;
      }
    }

    const parentTable = channelId ? "messages" : "direct_message_messages";
    const { error: countError } = await (supabase as any)
      .from(parentTable)
      .update({ reply_count: (replies.length || 0) + 1 })
      .eq("id", parentMessage.id);

    if (countError) {
      console.error("Failed to update thread reply count", countError);
    }

    setReplyText("");
    await loadThreadData();
    setLoading(false);
  };

  if (!isOpen || !parentMessage) return null;

  const activeParentMessage = threadParent ?? parentMessage;
  const parentProfileName =
    activeParentMessage.profiles?.full_name || "Unknown user";
  const parentProfileInitial = parentProfileName.charAt(0).toUpperCase() || "?";

  return (
    <aside className="fixed inset-0 z-50 flex flex-col border-l border-slate-200 bg-white shadow-xl xl:relative xl:inset-auto xl:z-auto xl:w-[320px] xl:flex-shrink-0 xl:shadow-none">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Thread</h2>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="pb-4 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <div className="relative w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center overflow-hidden text-white font-medium flex-shrink-0">
              {parentProfileInitial}
              {activeParentMessage.profiles?.avatar_url && (
                <img
                  src={activeParentMessage.profiles.avatar_url}
                  alt={parentProfileName}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-900">
                  {parentProfileName}
                </span>
                <span className="text-xs text-slate-500">
                  {format(new Date(activeParentMessage.created_at), "h:mm a")}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed break-words">
                {activeParentMessage.content}
              </p>
              <MessageReactions messageId={activeParentMessage.id} />
            </div>
          </div>
        </div>

        {threadLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Loading thread...
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-600">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </p>

            {replies.map((reply) => (
              <div
                key={reply.id}
                data-thread-reply-id={reply.id}
                className="flex items-start gap-3 rounded-xl transition-all duration-300"
              >
                <div className="relative w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center overflow-hidden text-white text-sm font-medium flex-shrink-0">
                  {(reply.profiles?.full_name || "Unknown user")
                    .charAt(0)
                    .toUpperCase() || "?"}
                  {reply.profiles?.avatar_url && (
                    <img
                      src={reply.profiles.avatar_url}
                      alt={reply.profiles.full_name || "Unknown user"}
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-slate-900">
                      {reply.profiles?.full_name || "Unknown user"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {format(new Date(reply.created_at), "h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed break-words">
                    {reply.content}
                  </p>
                  <MessageReactions messageId={reply.id} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200">
        <form onSubmit={handleSendReply} className="flex items-end gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendReply(e);
              }
            }}
            placeholder="Reply to thread..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
            rows={2}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!replyText.trim() || loading}
            className="p-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </aside>
  );
}
