import { useState, useEffect } from "react";
import { X, Hash, MessageSquare, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";

interface Channel {
  id: string;
  name: string;
  is_private: boolean;
}

interface DM {
  id: string;
  other_user: {
    id: string;
    full_name: string;
  };
}

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: {
    id: string;
    content: string;
    attachment_url?: string;
    attachment_name?: string;
    attachment_size?: number;
    attachment_type?: string;
  } | null;
  messages?: Array<{
    id: string;
    content: string;
    attachment_url?: string;
    attachment_name?: string;
    attachment_size?: number;
    attachment_type?: string;
  }>;
}

export function ForwardMessageModal({
  isOpen,
  onClose,
  message,
  messages,
}: ForwardMessageModalProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dms, setDMs] = useState<DM[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<{
    type: "channel" | "dm";
    id: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaces();
  const messagesToForward = messages ?? (message ? [message] : []);
  const primaryMessage = messagesToForward[0] ?? null;

  useEffect(() => {
    if (!isOpen) {
      setSelectedTarget(null);
      return;
    }

    void loadChannels();
    void loadDMs();
  }, [activeWorkspaceId, isOpen, user?.id]);

  const loadChannels = async () => {
    if (!user || !activeWorkspaceId) {
      setChannels([]);
      return;
    }

    const { data: memberChannels } = await supabase
      .from("channel_members")
      .select("channel_id")
      .eq("user_id", user.id);

    const channelIds = Array.from(
      new Set(
        ((memberChannels as Array<{ channel_id: string }> | null) ?? []).map(
          (membership) => membership.channel_id,
        ),
      ),
    );

    if (channelIds.length === 0) {
      setChannels([]);
      return;
    }

    const { data: channelRows } = await supabase
      .from("channels")
      .select("id, name, is_private")
      .eq("workspace_id", activeWorkspaceId)
      .in("id", channelIds)
      .order("name");

    setChannels((channelRows as Channel[] | null) ?? []);
  };

  const loadDMs = async () => {
    if (!user || !activeWorkspaceId) {
      setDMs([]);
      return;
    }

    const { data: dmData } = await supabase
      .from("direct_messages")
      .select("id, user1_id, user2_id")
      .eq("workspace_id", activeWorkspaceId)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (!dmData || dmData.length === 0) {
      setDMs([]);
      return;
    }

    const otherUserIds = Array.from(
      new Set(
        dmData.map((dm: any) =>
          dm.user1_id === user.id ? dm.user2_id : dm.user1_id
        )
      )
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", otherUserIds);

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p])
    );

    const dmsWithProfiles = dmData
      .map((dm: any) => {
        const otherUserId =
          dm.user1_id === user.id ? dm.user2_id : dm.user1_id;
        const profile = profileMap.get(otherUserId);

        if (!profile) return null;

        return {
          id: dm.id,
          other_user: profile,
        };
      })
      .filter(Boolean);

    setDMs(dmsWithProfiles as DM[]);
  };

  const handleForward = async () => {
    if (!selectedTarget || messagesToForward.length === 0 || !user) return;

    setLoading(true);

    try {
      for (const item of messagesToForward) {
        const newMessage: any = {
          user_id: user.id,
          content: item.content,
          forwarded: true,
        };

        if (item.attachment_url) {
          newMessage.attachment_url = item.attachment_url;
          newMessage.attachment_name = item.attachment_name;
          newMessage.attachment_size = item.attachment_size;
          newMessage.attachment_type = item.attachment_type;
        }

        let newMessageId: string | null = null;

        if (selectedTarget.type === "channel") {
          newMessage.channel_id = selectedTarget.id;
          const { data } = await supabase
            .from("messages")
            .insert(newMessage)
            .select("id")
            .single();
          newMessageId = (data as any)?.id || null;
        } else {
          newMessage.dm_id = selectedTarget.id;
          const { data } = await supabase
            .from("direct_message_messages")
            .insert(newMessage)
            .select("id")
            .single();
          newMessageId = (data as any)?.id || null;
        }

        if (newMessageId) {
          await supabase.from("message_forwards").insert({
            original_message_id: item.id,
            new_message_id: newMessageId,
            forwarded_by: user.id,
          } as any);
        }
      }

      onClose();
      setSelectedTarget(null);
    } catch (error) {
      console.error("Forward failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || messagesToForward.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {messagesToForward.length === 1
              ? "Forward Message"
              : `Forward ${messagesToForward.length} Messages`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            {messagesToForward.length === 1 ? (
              <p className="text-sm text-slate-700 line-clamp-3">
                {primaryMessage?.content}
              </p>
            ) : (
              <div className="space-y-2">
                {messagesToForward.slice(0, 3).map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white p-2"
                  >
                    <p className="text-xs font-semibold text-slate-500">
                      Message {index + 1}
                    </p>
                    <p className="text-sm text-slate-700 line-clamp-2">
                      {item.content}
                    </p>
                  </div>
                ))}
                {messagesToForward.length > 3 && (
                  <p className="text-xs text-slate-500">
                    +{messagesToForward.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Channels
              </h3>
              <div className="space-y-1">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() =>
                      setSelectedTarget({ type: "channel", id: channel.id })
                    }
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      selectedTarget?.type === "channel" &&
                      selectedTarget.id === channel.id
                        ? "bg-primary-100 text-primary-700"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Hash size={16} />
                    <span className="text-sm">{channel.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Direct Messages
              </h3>
              <div className="space-y-1">
                {dms.map((dm) => (
                  <button
                    key={dm.id}
                    onClick={() => setSelectedTarget({ type: "dm", id: dm.id })}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      selectedTarget?.type === "dm" &&
                      selectedTarget.id === dm.id
                        ? "bg-primary-100 text-primary-700"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <MessageSquare size={16} />
                    <span className="text-sm">{dm.other_user.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleForward}
            disabled={!selectedTarget || loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send size={16} />
            Forward
          </button>
        </div>
      </div>
    </div>
  );
}
