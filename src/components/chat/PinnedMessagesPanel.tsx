import { useState, useEffect } from "react";
import { X, Pin } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";

export interface PinnedMessage {
  id: string;
  message_id: string;
  created_at: string;
  pinned_by: string;
  message: {
    id: string;
    content: string;
    created_at: string;
    attachment_url?: string;
    attachment_name?: string;
    profiles?: {
      full_name: string;
    };
    broadcast_id?: string;
    channel_id?: string;
    dm_id?: string;
    channels?: {
      name: string;
    };
  };
  profiles: {
    full_name: string;
  };
}

interface PinnedMessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  channelId?: string;
  dmId?: string;
  broadcastId?: string;
  onPinnedMessageClick?: (messageId: string) => void;
}

export function PinnedMessagesPanel({
  isOpen,
  onClose,
  channelId,
  dmId,
  broadcastId,
  onPinnedMessageClick,
}: PinnedMessagesPanelProps) {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadPinnedMessages();

      const channel = supabase
        .channel(`pinned-${channelId || dmId || broadcastId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pinned_messages",
            filter: channelId
              ? `channel_id=eq.${channelId}`
              : broadcastId
                ? `broadcast_id=eq.${broadcastId}`
                : `dm_id=eq.${dmId}`,
          },
          () => loadPinnedMessages(),
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [isOpen, channelId, dmId, broadcastId]);

  const loadPinnedMessages = async () => {
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

    const { data: pins } = await query;

    if (pins) {
      if (pins.length === 0) {
        setPinnedMessages([]);
        return;
      }

      const messagesWithContent = await Promise.all(
        pins.map(async (pin: any) => {
          const table = channelId
            ? "messages"
            : broadcastId
              ? "broadcast_messages"
              : "direct_message_messages";
          const { data: message } = await supabase
            .from(table)
            .select(
              channelId
                ? "id, content, created_at, attachment_url, attachment_name, profiles:profiles!messages_user_id_fkey(full_name)"
                : "id, content, created_at, attachment_url, attachment_name, profiles:profiles!direct_message_messages_user_id_fkey(full_name)",
            )
            .eq("id", pin.message_id)
            .maybeSingle();

          return {
            ...pin,
            message,
          };
        }),
      );

      setPinnedMessages(
        messagesWithContent.filter(
          (m) => m.message,
        ) as unknown as PinnedMessage[],
      );
    }
  };

  if (!isOpen) return null;

  return (
    /* The Popover Container - Positioned to the right under the header icons */
    <div className="absolute top-12 right-4 w-96 bg-white border border-slate-200 shadow-2xl z-50 rounded-lg flex flex-col max-h-[500px] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
      {/* Header - Clean and Professional */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <Pin className="text-[#3178C6]" size={16} strokeWidth={2.5} />
          <h3 className="text-sm font-bold text-slate-800">Pinned Messages</h3>
          <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {pinnedMessages.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {pinnedMessages.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Pin size={20} className="text-slate-300" />
            </div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
              No Pinned Messages
            </p>
          </div>
        ) : (
          pinnedMessages.map((pinned) => (
            <button
              key={pinned.id}
              type="button"
              onClick={() => onPinnedMessageClick?.(pinned.message.id)}
              className="w-full text-left p-4 hover:bg-slate-50/50 transition-colors group relative"
            >
              <div className="flex items-start gap-3">
                {/* Small Avatar Placeholder */}
                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-500 mt-0.5">
                  {pinned.message.profiles?.full_name?.[0].toUpperCase() || "?"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-bold text-[14px] text-slate-900 truncate">
                      {pinned.message.profiles?.full_name || "Unknown user"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {format(new Date(pinned.message.created_at), "MMM d")}
                    </span>
                  </div>

                  <p className="text-[13px] text-slate-600 leading-snug break-words line-clamp-3">
                    {pinned.message.content}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">
                      Pinned by {pinned.profiles.full_name}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
          End of pins
        </p>
      </div>
    </div>
  );
}
