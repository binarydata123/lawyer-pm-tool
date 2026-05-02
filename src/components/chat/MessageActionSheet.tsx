import { useEffect } from "react";
import {
  MessageSquare,
  Bookmark,
  Copy,
  Pencil,
  Pin,
  ListTodo,
  CornerUpLeft,
  CornerUpRight,
  Trash2,
  Smile,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  is_deleted?: boolean;
  user_id: string;
  is_pinned?: boolean;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface MessageActionSheetProps {
  message: Message;
  canChatReply: boolean;
  isOwner: boolean;
  isBookmarked: boolean;
  isPinned: boolean;
  canDeleteForEveryone: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onOpenEmojiPicker: () => void;
  onChatReply: () => void;
  onReply: () => void;
  onBookmark: () => void;
  onCopyText: () => void;
  onAddToTodo: () => void;
  onEdit: () => void;
  onPin: () => void;
  onForward: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
}

export function MessageActionSheet({
  message,
  canChatReply,
  isOwner,
  isBookmarked,
  isPinned,
  canDeleteForEveryone,
  onClose,
  onReact,
  onOpenEmojiPicker,
  onChatReply,
  onReply,
  onBookmark,
  onCopyText,
  onAddToTodo,
  onEdit,
  onPin,
  onForward,
  onDeleteForMe,
  onDeleteForEveryone,
}: MessageActionSheetProps) {
  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const actions = [
    {
      label: "Reply",
      icon: <CornerUpLeft size={17} />,
      onClick: onChatReply,
      show: canChatReply,
      danger: false,
    },
    {
      label: "Reply in thread",
      icon: <MessageSquare size={17} />,
      onClick: onReply,
      show: true,
      danger: false,
    },
    {
      label: isBookmarked ? "Remove bookmark" : "Bookmark",
      icon: (
        <Bookmark
          size={17}
          fill={isBookmarked ? "currentColor" : "none"}
          className={isBookmarked ? "text-amber-500" : ""}
        />
      ),
      onClick: onBookmark,
      show: true,
      danger: false,
    },
    {
      label: "Copy Text",
      icon: <Copy size={17} />,
      onClick: onCopyText,
      show: true,
      danger: false,
    },
    {
      label: "Add to Task",
      icon: <ListTodo size={17} />,
      onClick: onAddToTodo,
      show: true,
      danger: false,
    },
    {
      label: "Edit message",
      icon: <Pencil size={17} />,
      onClick: onEdit,
      show:
        isOwner &&
        Date.now() - new Date(message.created_at).getTime() <= 5 * 60 * 1000,
      danger: false,
    },
    {
      label: isPinned ? "Unpin message" : "Pin message",
      icon: (
        <Pin
          size={17}
          fill={isPinned ? "currentColor" : "none"}
          className={isPinned ? "text-[#3178C6]" : ""}
        />
      ),
      onClick: onPin,
      show: true,
      danger: false,
    },
    {
      label: "Forward",
      icon: <CornerUpRight size={17} />,
      onClick: onForward,
      show: true,
      danger: false,
    },
    {
      label: "Delete for me",
      icon: <Trash2 size={17} />,
      onClick: onDeleteForMe,
      show: true,
      danger: true,
    },
    {
      label: "Delete for everyone",
      icon: <Trash2 size={17} />,
      onClick: onDeleteForEveryone,
      show: isOwner && canDeleteForEveryone && !message.is_deleted,
      danger: true,
    },
  ].filter((a) => a.show);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-2xl shadow-xl z-10 pb-safe">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Message preview */}
        <div className="px-4 py-2 mx-4 mb-3 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-0.5">
            {message.profiles?.full_name ?? "Unknown"}
          </p>
          <p className="text-sm text-slate-700 line-clamp-2">
            {message.content}
          </p>
        </div>

        {/* Quick emoji row */}
        <div className="flex items-center gap-2 px-4 pb-3 border-b border-slate-100">
          {(["👍", "❤️", "😂", "🔥", "😮"] as const).map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-xl active:scale-90 transition-transform"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={onOpenEmojiPicker}
            className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 ml-auto active:scale-90 transition-transform"
          >
            <Smile size={20} />
          </button>
        </div>

        {/* Action list */}
        <ul className="py-1">
          {actions.map((action) => (
            <li key={action.label}>
              <button
                onClick={action.onClick}
                className={`flex items-center gap-4 w-full px-5 py-3.5 text-[15px] font-medium active:bg-slate-50 transition-colors ${
                  action.danger ? "text-red-500" : "text-slate-800"
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    action.danger ? "bg-red-50" : "bg-slate-100"
                  }`}
                >
                  {action.icon}
                </span>
                {action.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Cancel button */}
        <div className="px-4 pt-1 pb-4">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-slate-100 text-[15px] font-semibold text-slate-700 active:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
