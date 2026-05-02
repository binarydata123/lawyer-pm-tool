import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Circle,
  Hash,
  Lock,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useWorkspaces } from "../contexts/WorkspaceContext";
import { supabase } from "../lib/supabase";
import {
  getNotificationBodyPreview,
  getNotificationKind,
  loadNotificationsForUser,
  type NotificationRecord,
  type NotificationSelection,
  type NotificationKind,
} from "../lib/notifications";
import { capitalizeFirst } from "../lib/text";
import type { MainAppMessage } from "./main-app/types";

type NotificationFilter =
  | "all"
  | "unread"
  | "channels"
  | "dms"
  | NotificationKind;

interface NotificationsPageProps {
  onBack: () => void;
  onNotificationSelect?: (notification: NotificationSelection) => void;
}

const FILTERS: Array<{
  id: NotificationFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "channels", label: "Channels" },
  { id: "dms", label: "Direct messages" },
  { id: "message", label: "Messages" },
  { id: "reply", label: "Replies" },
  { id: "reaction", label: "Reactions" },
  { id: "pin", label: "Pins" },
];

export function NotificationsPage({
  onBack,
  onNotificationSelect,
}: NotificationsPageProps) {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaces();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const rows = await loadNotificationsForUser(user.id, activeWorkspaceId);
        if (isMounted) {
          setNotifications(rows);
        }
      } catch (error) {
        console.error("Failed to load notifications page", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [activeWorkspaceId, user]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const groupedCounts = useMemo(() => {
    const counts = {
      all: notifications.length,
      unread: unreadCount,
      channels: notifications.filter(
        (notification) => notification.data?.channel_id,
      ).length,
      dms: notifications.filter((notification) => notification.data?.dm_id)
        .length,
      message: notifications.filter(
        (notification) => getNotificationKind(notification) === "message",
      ).length,
      reply: notifications.filter(
        (notification) => getNotificationKind(notification) === "reply",
      ).length,
      reaction: notifications.filter(
        (notification) => getNotificationKind(notification) === "reaction",
      ).length,
      pin: notifications.filter(
        (notification) => getNotificationKind(notification) === "pin",
      ).length,
    };

    return counts;
  }, [notifications, unreadCount]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const kind = getNotificationKind(notification);

      if (activeFilter === "all") return true;
      if (activeFilter === "unread") return !notification.is_read;
      if (activeFilter === "channels")
        return Boolean(notification.data?.channel_id);
      if (activeFilter === "dms") return Boolean(notification.data?.dm_id);
      return kind === activeFilter;
    });
  }, [activeFilter, notifications]);

  const markAsRead = async (notification: NotificationRecord) => {
    if (!user || notification.is_read) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item,
      ),
    );

    const { error } = await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true })),
    );

    const { error } = await (supabase as any)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  const openNotification = async (notification: NotificationRecord) => {
    await markAsRead(notification);

    let message: MainAppMessage | null = null;
    if (notification.data?.thread_id && notification.data?.channel_id) {
      const { data } = await (supabase as any)
        .from("messages")
        .select("*")
        .eq("id", notification.data.thread_id)
        .maybeSingle();
      message = data as MainAppMessage | null;
    } else if (notification.data?.thread_id && notification.data?.dm_id) {
      const { data } = await (supabase as any)
        .from("direct_message_messages")
        .select("*")
        .eq("id", notification.data.thread_id)
        .maybeSingle();
      message = data as MainAppMessage | null;
    }

    onNotificationSelect?.({
      channelId: notification.data?.channel_id || undefined,
      dmId: notification.data?.dm_id || undefined,
      recipientId: notification.data?.recipient_id || undefined,
      messageId:
        notification.entity_id || notification.data?.message_id || undefined,
      timestamp: notification.created_at,
      message,
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(49,120,198,0.14),_transparent_38%),linear-gradient(180deg,_#f8fafc,_#eef2ff_56%,_#f8fafc)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_38%),linear-gradient(180deg,_#020617,_#0f172a_56%,_#020617)] dark:text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:rounded-3xl sm:px-5 sm:py-5 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 sm:mt-1 sm:rounded-2xl dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                aria-label="Back to workspace"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3178c6] text-white shadow-lg shadow-blue-500/20 sm:h-12 sm:w-12 sm:rounded-2xl">
                    <Bell size={20} className="sm:lucide-sm" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-black tracking-tight sm:text-3xl">
                      Notifications
                    </h1>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Review reactions, replies, and updates in one place.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white sm:text-xs dark:bg-primary-600">
                    <Sparkles size={12} />
                    {unreadCount} unread
                  </span>
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <CheckCheck size={12} />
                    Mark all as read
                  </button>
                  <span className="hidden text-xs font-medium text-slate-500 sm:inline dark:text-slate-400">
                    {groupedCounts.all} total
                  </span>
                </div>
              </div>
            </div>

            {/* <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
              <Filter size={14} />
              <span>Filter activity</span>
            </div> */}
          </div>
        </header>

        <section className="mt-4 rounded-2xl border border-white/70 bg-white/80 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:mt-5 sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900/80">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            {/* Mobile Horizontal Scroll for Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:pb-0">
              {FILTERS.map((filter) => {
                const active = activeFilter === filter.id;
                const count = groupedCounts[filter.id] ?? 0;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm ${
                      active
                        ? "bg-[#3178c6] text-white shadow-md shadow-blue-500/20"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className="whitespace-nowrap">{filter.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[calc(100vh-280px)] overflow-y-auto sm:max-h-[calc(100vh-240px)]">
            {loading ? (
              <div className="flex min-h-[16rem] items-center justify-center sm:min-h-[24rem]">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-xl bg-slate-200 sm:h-12 sm:w-12 sm:rounded-2xl dark:bg-slate-700" />
                  <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
                    Loading notifications...
                  </p>
                </div>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onOpen={() => void openNotification(notification)}
                    onToggleRead={() => void markAsRead(notification)}
                  />
                ))}
              </div>
            ) : (
              <EmptyNotificationsState activeFilter={activeFilter} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function NotificationCard({
  notification,
  onOpen,
  onToggleRead,
}: {
  notification: NotificationRecord;
  onOpen: () => void;
  onToggleRead: () => void;
}) {
  const kind = getNotificationKind(notification);
  const bodyPreview = getNotificationBodyPreview(notification);
  const isSystemMessage = bodyPreview.kind === "system";
  const isInviteMessage = bodyPreview.kind === "invite";
  const isChannel = Boolean(notification.data?.channel_id);
  const isDm = Boolean(notification.data?.dm_id);

  const contextLabel = isChannel
    ? notification.channel
      ? `${notification.channel.is_private ? "Private" : "Channel"}`
      : "Channel"
    : isDm
      ? "Direct message"
      : "Workspace";

  const contextName = isChannel
    ? notification.channel?.name
      ? `#${capitalizeFirst(notification.channel.name)}`
      : "Channel"
    : isDm
      ? "DM"
      : "Workspace";

  const body =
    kind === "reaction"
      ? `Reacted with ${notification.body}`
      : kind === "pin"
        ? "Pinned a message"
        : bodyPreview.text;

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
  }).format(new Date(notification.created_at));

  return (
    <article
      className={`group relative flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:gap-4 sm:px-5 dark:hover:bg-slate-800/50 ${
        notification.is_read ? "" : "bg-blue-50/40 dark:bg-blue-950/20"
      }`}
    >
      {!notification.is_read && (
        <div className="absolute left-1.5 top-5 sm:top-1/2 sm:-translate-y-1/2">
          <Circle size={8} className="fill-blue-500 text-blue-500" />
        </div>
      )}

      {isSystemMessage ? (
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-inner sm:h-12 sm:w-12 sm:rounded-2xl sm:text-base"
            style={{
              backgroundColor: notification.actor?.avatar_color || "#3178c6",
            }}
          >
            {notification.actor?.full_name?.charAt(0).toUpperCase() || "?"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                {notification.actor?.full_name || "Someone"}
              </p>
              <div className="flex gap-1.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  system
                </span>
                <span className="hidden rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 sm:inline dark:bg-blue-900/30 dark:text-blue-300">
                  {contextLabel}
                </span>
              </div>
            </div>

            <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {notification.title}
            </p>
            <div className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {body}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                {isChannel ? (
                  notification.channel?.is_private ? (
                    <Lock size={10} />
                  ) : (
                    <Hash size={10} />
                  )
                ) : (
                  <Bell size={10} />
                )}
                <span className="max-w-[80px] truncate">{contextName}</span>
              </span>
              <span>{dateLabel}</span>
            </div>
          </div>
        </div>
      ) : isInviteMessage ? (
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-inner sm:h-12 sm:w-12 sm:rounded-2xl sm:text-base"
            style={{
              backgroundColor: notification.actor?.avatar_color || "#3178c6",
            }}
          >
            {notification.actor?.full_name?.charAt(0).toUpperCase() || "?"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                {notification.actor?.full_name || "Someone"}
              </p>
              <div className="flex gap-1.5">
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                  invite
                </span>
                <span className="hidden rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 sm:inline dark:bg-blue-900/30 dark:text-blue-300">
                  {contextLabel}
                </span>
              </div>
            </div>

            <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              Join #{bodyPreview.invite.channelName}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
              {body}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                {isChannel ? (
                  notification.channel?.is_private ? (
                    <Lock size={10} />
                  ) : (
                    <Hash size={10} />
                  )
                ) : (
                  <Bell size={10} />
                )}
                <span className="max-w-[80px] truncate">{contextName}</span>
              </span>
              <span>{dateLabel}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-inner sm:h-12 sm:w-12 sm:rounded-2xl sm:text-base"
            style={{
              backgroundColor: notification.actor?.avatar_color || "#3178c6",
            }}
          >
            {notification.actor?.full_name?.charAt(0).toUpperCase() || "?"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                {notification.actor?.full_name || "Someone"}
              </p>
              <div className="flex gap-1.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {kind}
                </span>
                <span className="hidden rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 sm:inline dark:bg-blue-900/30 dark:text-blue-300">
                  {contextLabel}
                </span>
              </div>
            </div>

            <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {notification.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
              {body}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                {isChannel ? (
                  notification.channel?.is_private ? (
                    <Lock size={10} />
                  ) : (
                    <Hash size={10} />
                  )
                ) : (
                  <Bell size={10} />
                )}
                <span className="max-w-[80px] truncate">{contextName}</span>
              </span>
              <span>{dateLabel}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2 pl-13 sm:ml-auto sm:pl-0">
        <button
          type="button"
          onClick={onToggleRead}
          className={`flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:flex-none sm:rounded-xl sm:px-3 sm:py-2 ${
            notification.is_read
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <CheckCheck size={14} />
            <span>{notification.is_read ? "Read" : "Mark read"}</span>
          </div>
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 items-center justify-center rounded-lg bg-[#3178c6] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#255f9c] sm:flex-none sm:rounded-xl sm:px-4 sm:py-2"
        >
          View
        </button>
      </div>
    </article>
  );
}

function EmptyNotificationsState({
  activeFilter,
}: {
  activeFilter: NotificationFilter;
}) {
  const message =
    activeFilter === "unread"
      ? "You do not have any unread notifications."
      : "No notifications match this filter yet.";

  return (
    <div className="flex min-h-[16rem] items-center justify-center px-6 py-12 text-center sm:min-h-[24rem]">
      <div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 sm:h-16 sm:w-16 sm:rounded-3xl dark:bg-slate-800 dark:text-slate-500">
          <Bell size={24} className="sm:lucide-lg" />
        </div>
        <h2 className="text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
          All caught up
        </h2>
        <p className="mt-2 max-w-xs text-xs text-slate-500 sm:max-w-sm sm:text-sm dark:text-slate-400">
          {message}
        </p>
      </div>
    </div>
  );
}
