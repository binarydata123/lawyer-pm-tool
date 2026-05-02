import { useAuth } from "../../contexts/AuthContext";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

export interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  message_id: string;
  channel_id?: string | null;
  dm_id?: string | null;
  workspace_id?: string | null;
  profiles?: {
    full_name: string;
  };
}

interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
  hasUserReacted: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  showEmojiPicker?: boolean;
  setShowEmojiPicker?: (show: boolean) => void;
  pickerAlign?: "left" | "right";
  reactions?: Reaction[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

export function MessageReactions({
  messageId,
  showEmojiPicker = false,
  setShowEmojiPicker = () => {},
  pickerAlign = "left",
  reactions = [],
  onToggleReaction,
}: MessageReactionsProps) {
  const { user } = useAuth();

  const groupReactions = (): ReactionGroup[] => {
    const groups = new Map<string, ReactionGroup>();

    reactions.forEach((reaction) => {
      const existing = groups.get(reaction.emoji);
      const userName = reaction.profiles?.full_name || "Unknown user";
      if (existing) {
        existing.count++;
        existing.users.push(userName);
        if (reaction.user_id === user?.id) {
          existing.hasUserReacted = true;
        }
      } else {
        groups.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          users: [userName],
          hasUserReacted: reaction.user_id === user?.id,
        });
      }
    });

    return Array.from(groups.values());
  };

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    onToggleReaction?.(messageId, emoji);
    setShowEmojiPicker(false);
  };

  const reactionGroups = groupReactions();

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {reactionGroups.map((group) => (
        <button
          key={group.emoji}
          onClick={() => handleReaction(group.emoji)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-colors ${
            group.hasUserReacted
              ? "bg-primary-100 border border-primary-300 text-primary-700"
              : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-150"
          }`}
          title={group.users.join(", ")}
        >
          <span>{group.emoji}</span>
          <span className="text-xs font-medium">{group.count}</span>
        </button>
      ))}

      <div className="relative">
        {/* <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="Add reaction"
        >
          <Smile size={16} />
        </button> */}

        {showEmojiPicker && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowEmojiPicker(false)}
            />

            <div
              className={`absolute bottom-full mb-2 shadow-lg z-20 ${
                pickerAlign === "right" ? "right-0" : "left-0"
              }`}
            >
              <Picker
                data={data}
                onEmojiSelect={(emoji: any) => handleReaction(emoji.native)}
                theme="light"
                previewPosition="none"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
