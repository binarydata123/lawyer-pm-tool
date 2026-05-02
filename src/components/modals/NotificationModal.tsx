import {
  X,
  Hash,
  Inbox,
  CheckCheck,
  CornerUpRight,
  Smile,
  Pin,
  AtSign,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import {
  loadNotificationsForUser,
  getNotificationBodyPreview,
  type NotificationRecord,
  type NotificationSelection,
} from "../../lib/notifications";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";
import type { MainAppMessage } from "../../pages/main-app/types";

type TabType = "for-you" | "unreads" | "direct";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationSelect?: (notification: NotificationSelection) => void;
  onViewMore?: () => void;
}

const NotificationModal = ({
  isOpen,
  onClose,
  onNotificationSelect,
  onViewMore,
}: NotificationModalProps) => {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaces();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("for-you");

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (!user) return;

        const mergedNotifs = await loadNotificationsForUser(
          user.id,
          activeWorkspaceId,
        );
        setNotifications(mergedNotifs);
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    if (isOpen) {
      loadNotifications();
      // Prevent scrolling on the body when modal is open on mobile
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activeWorkspaceId, user, isOpen]);

  // Keyboard and Logic remains the same...
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case "unreads":
        return notifications.filter((n) => !n.is_read);
      case "direct":
        return notifications.filter((n) => n.data?.dm_id);
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  if (!isOpen) return null;

  return (
    // Responsive Container: Full screen on mobile, floating box on Desktop
    <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-[#313338] md:inset-auto md:top-14 md:right-8 md:h-[600px] md:w-[480px] md:rounded-[8px] md:border md:border-[#e3e5e8] md:dark:border-[#1e1f22] md:shadow-[0_8px_24px_rgba(0,0,0,0.24)] overflow-hidden font-sans transition-all duration-200">
      {/* Header */}
      <div className="px-4 pt-4 pb-0 bg-[#f2f3f5] dark:bg-[#313338] shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[#060607] dark:text-[#f2f3f5]">
            <Inbox size={22} strokeWidth={2.5} className="md:w-5 md:h-5" />
            <h2 className="text-lg md:text-base font-bold tracking-tight">
              Notifications
            </h2>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={markAllAsRead}
              className="p-2 md:p-1.5 hover:bg-[#e3e5e8] dark:hover:bg-[#2b2d31] rounded-[4px] text-[#4e5058] dark:text-[#b5bac1]"
            >
              <CheckCheck size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 md:p-1.5 hover:bg-[#e3e5e8] dark:hover:bg-[#2b2d31] rounded-[4px] text-[#4e5058] dark:text-[#b5bac1]"
            >
              <X size={24} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Tabs - Scrollable on very small screens */}
        <div className="flex gap-6 md:gap-4 border-b border-[#e3e5e8] dark:border-[#1e1f22] overflow-x-auto scrollbar-hide">
          {(["for-you", "unreads", "direct"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[15px] md:text-[14px] font-medium border-b-[2px] transition-all whitespace-nowrap capitalize ${
                activeTab === tab
                  ? "text-[#060607] dark:text-[#f2f3f5] border-[#3178c6]"
                  : "text-[#4e5058] dark:text-[#b5bac1] border-transparent"
              }`}
            >
              {tab === "for-you"
                ? "For You"
                : tab === "direct"
                  ? "Direct"
                  : "Unreads"}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#313338] custom-scrollbar pb-safe">
        {filteredNotifications.length > 0 ? (
          <div className="flex flex-col">
            {filteredNotifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClose={onClose}
                onMarkRead={(id) =>
                  setNotifications((current) =>
                    current.map((notif) =>
                      notif.id === id ? { ...notif, is_read: true } : notif,
                    ),
                  )
                }
                onNotificationSelect={onNotificationSelect}
              />
            ))}
          </div>
        ) : (
          <EmptyState tab={activeTab} />
        )}
      </div>

      {/* Footer - Optimized for thumb reach on mobile */}
      {onViewMore && (
        <div className="p-4 md:block hidden md:p-3 bg-[#f2f3f5] dark:bg-[#2b2d31] border-t border-[#e3e5e8] dark:border-[#1e1f22] shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-3">
          <button
            type="button"
            onClick={onViewMore}
            className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#3178c6] py-3 md:py-2 text-sm font-medium text-white active:bg-[#2a65a5] md:hover:bg-[#4752C4] transition-colors"
          >
            View More Activity
          </button>
        </div>
      )}
    </div>
  );
};

const NotificationItem = ({
  notification: n,
  onClose,
  onMarkRead,
  onNotificationSelect,
}: {
  notification: NotificationRecord;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onNotificationSelect?: (notification: NotificationSelection) => void;
}) => {
  const isDM = !!n.data?.dm_id;
  const isReaction = n.type === "reaction" || n.body?.includes("reacted");
  const isReply = n.type === "reply" || !!n.data?.thread_id;
  const isPin = n.type === "pin" || n.body?.toLowerCase().includes("pinned");
  const bodyPreview = getNotificationBodyPreview(n);
  const isSystemMessage = bodyPreview.kind === "system";
  const isInviteMessage = bodyPreview.kind === "invite";

  const handleClick = async () => {
    try {
      await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("id", n.id);

      let message: MainAppMessage | null = null;

      if (n?.data?.thread_id || n?.data?.message_id) {
        const targetTable = isDM ? "direct_message_messages" : "messages";
        const targetId = n.data?.thread_id || n.data?.message_id || n.entity_id;

        const { data } = await (supabase as any)
          .from(targetTable)
          .select("*")
          .eq("id", targetId)
          .maybeSingle();
        message = data as MainAppMessage | null;
      }

      onMarkRead(n.id);
      onNotificationSelect?.({
        channelId: n.data?.channel_id,
        dmId: n.data?.dm_id,
        messageId: n.entity_id || n.data?.message_id,
        timestamp: n.created_at,
        message,
      });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = () => {
    if (isReaction) return <Smile size={16} className="text-[#b5bac1]" />;
    if (isPin) return <Pin size={16} className="text-[#b5bac1]" />;
    if (isReply) return <CornerUpRight size={16} className="text-[#b5bac1]" />;
    if (isInviteMessage) return <Hash size={16} className="text-[#b5bac1]" />;
    if (isDM) return <AtSign size={16} className="text-[#b5bac1]" />;
    return <Hash size={16} className="text-[#b5bac1]" />;
  };

  const getActionText = () => {
    if (!isDM && isReaction) return "reacted to your message in";
    if (isDM && isReaction) return "reacted to your message";
    if (!isDM && isPin) return "pinned a message to";
    if (isDM && isPin) return "pinned a message";
    if (!isDM && isReply) return "replied to you in";
    if (isDM && isReply) return "replied to you";
    if (isInviteMessage) return "shared a channel invite in";
    if (isSystemMessage) return "updated";
    if (isDM) return "sent you a direct message";
    if (!isDM) return "sent a message in";
    return "mentioned you in";
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col p-4 border-b border-[#e3e5e8] dark:border-[#1e1f22] cursor-pointer transition-colors active:bg-[#f2f3f5] md:hover:bg-[#f8f9fa] dark:active:bg-[#2b2d31] dark:md:hover:bg-[#2b2d31]/50`}
    >
      {/* Unread Indicator - More visible on mobile */}
      {!n.is_read && (
        <div className="absolute top-0 left-0 w-1.5 md:w-1 h-full bg-[#3178c6]" />
      )}

      {/* Context Header */}
      <div className="flex items-center gap-1.5 text-[12px] md:text-[11px] text-[#4e5058] dark:text-[#b5bac1] mb-2 pl-1">
        {getIcon()}
        <span className="font-bold text-[#060607] dark:text-[#f2f3f5] ml-0.5 max-w-[120px] truncate">
          {n.actor?.full_name || "Someone"}
        </span>
        <span className="truncate">{getActionText()}</span>
        {!isDM && (
          <span className="font-bold text-[#060607] dark:text-[#f2f3f5] truncate">
            {n.channel?.name ? `#${n.channel.name}` : "a channel"}
          </span>
        )}
      </div>

      {/* Message Card */}
      {isSystemMessage ? (
        <div className="relative flex gap-3 p-3 rounded-[8px] bg-[#f2f3f5] dark:bg-[#2b2d31] transition-colors ml-1">
          <div
            className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: n.actor?.avatar_color || "#3178c6" }}
          >
            {n.actor?.full_name?.charAt(0).toUpperCase() || "?"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-0.5">
              <span className="font-semibold text-[15px] text-[#060607] dark:text-[#f2f3f5] truncate">
                {n.actor?.full_name || "Unknown"}
              </span>
              <span className="text-[11px] text-[#4e5058] dark:text-[#949ba4]">
                {new Date(n.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-[14px] text-[#313338] dark:text-[#dbdee1] leading-[1.4] break-words line-clamp-3 md:line-clamp-none">
              {bodyPreview.text}
            </p>
          </div>
        </div>
      ) : isInviteMessage ? (
        <div className="relative ml-1 flex gap-3 rounded-[8px] border border-sky-100 bg-sky-50 p-3 transition-colors dark:border-sky-900/50 dark:bg-sky-950/20">
          <div
            className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: n.actor?.avatar_color || "#3178c6" }}
          >
            {n.actor?.full_name?.charAt(0).toUpperCase() || "?"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between mb-0.5">
              <span className="font-semibold text-[15px] text-[#060607] dark:text-[#f2f3f5] truncate">
                {n.actor?.full_name || "Unknown"}
              </span>
              <span className="text-[11px] text-[#4e5058] dark:text-[#949ba4]">
                {new Date(n.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-[14px] font-semibold text-sky-900 dark:text-sky-100">
              Join #{bodyPreview.invite.channelName}
            </p>
            <p className="mt-0.5 text-[14px] text-sky-800/90 dark:text-sky-100/80 leading-[1.4] break-words line-clamp-3 md:line-clamp-none">
              {bodyPreview.text}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative flex gap-3 p-3 rounded-[8px] bg-[#f2f3f5] dark:bg-[#2b2d31] transition-colors ml-1">
          <div
            className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: n.actor?.avatar_color || "#3178c6" }}
          >
            {n.actor?.full_name?.charAt(0).toUpperCase() || "?"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-0.5">
              <span className="font-semibold text-[15px] text-[#060607] dark:text-[#f2f3f5] truncate">
                {n.actor?.full_name || "Unknown"}
              </span>
              <span className="text-[11px] text-[#4e5058] dark:text-[#949ba4]">
                {new Date(n.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-[14px] text-[#313338] dark:text-[#dbdee1] leading-[1.4] break-words line-clamp-3 md:line-clamp-none">
              {bodyPreview.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ tab }: { tab: TabType }) => (
  <div className="h-full flex flex-col items-center justify-center p-12 text-center">
    <div className="w-[100px] h-[100px] mb-4 bg-center bg-no-repeat bg-contain opacity-80 flex items-center justify-center rounded-full bg-[#f2f3f5] dark:bg-[#2b2d31]">
      <Inbox size={40} className="text-[#dbdee1] dark:text-[#585a61]" />
    </div>
    <h3 className="text-[#060607] dark:text-[#f2f3f5] font-semibold text-[16px] mb-1">
      {tab === "unreads" ? "No unread messages" : "All caught up"}
    </h3>
    <p className="text-[14px] text-[#4e5058] dark:text-[#b5bac1] max-w-[200px] leading-snug">
      {tab === "unreads"
        ? "You've read everything here."
        : "When you receive notifications, they'll show up here."}
    </p>
  </div>
);

export default NotificationModal;
