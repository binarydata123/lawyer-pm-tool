import { useEffect, useRef, useState } from "react";
import {
  Hash,
  Lock,
  // Settings,
  Search,
  ChevronRight,
  Bell,
  ArrowLeft,
  Archive,
  CalendarClock,
  History,
  Phone,
  ScreenShare,
  Video,
  MoreVertical,
  // Sun,
  // Moon,
} from "lucide-react";
// import { formatDistanceToNow } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";
import { capitalizeFirst } from "../../lib/text";
import { isOnline } from "../utils/isOnline";

interface ChannelHeaderProps {
  channelId?: string;
  dmId?: string;
  broadcastId?: string;
  otherUserId?: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onSearchClick?: () => void;
  onMembersClick?: () => void;
  onSettingsClick?: () => void;
  onPinnedClick?: () => void;
  onTitleClick?: () => void;
  onNotificationClick?: () => void;
  onBackClick?: () => void;
  onArchiveClick?: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  onStartScreenShare?: () => void;
  onOpenCallHistory?: () => void;
  isCallActive?: boolean;
}

interface ChannelInfo {
  name: string;
  description: string;
  is_private: boolean;
  member_count: number;
  current_user_role: string | null;
}

interface DMInfo {
  full_name: string;
  status: string;
  is_signedin: boolean;
  last_seen: string;
  avatar_url?: string | null;
  avatar_color?: string;
}

export function ChannelHeader({
  channelId,
  dmId,
  broadcastId,
  otherUserId,
  // isDarkMode,
  // onToggleDarkMode,
  onSearchClick,
  // onSettingsClick,
  onNotificationClick,
  onBackClick,
  onArchiveClick,
  onStartAudioCall,
  onStartVideoCall,
  onStartScreenShare,
  onOpenCallHistory,
  isCallActive = false,
  // onPinnedClick,
  onTitleClick,
}: ChannelHeaderProps) {
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [broadcastInfo, setBroadcastInfo] = useState<any>(null);
  const [dmInfo, setDMInfo] = useState<DMInfo | null>(null);
  const [isCallMenuOpen, setIsCallMenuOpen] = useState(false);
  const [callMenuStatus, setCallMenuStatus] = useState<string | null>(null);
  const callMenuRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaces();

  useEffect(() => {
    if (channelId) {
      setDMInfo(null);
      setBroadcastInfo(null);
      void loadChannelInfo();
    } else if (broadcastId) {
      setChannelInfo(null);
      setDMInfo(null);
      void loadBroadcastInfo();
    } else if (dmId) {
      setChannelInfo(null);
      setBroadcastInfo(null);
      void loadDMInfo();
    } else {
      setChannelInfo(null);
      setDMInfo(null);
      setBroadcastInfo(null);
    }
  }, [activeWorkspaceId, channelId, broadcastId, dmId, otherUserId, user?.id]);

  useEffect(() => {
    if (!channelId) return;

    const channelSubscription = supabase
      .channel(`channel-header-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channel_members" },
        (payload) => {
          const changedChannelId =
            (payload.new as { channel_id?: string } | null)?.channel_id ??
            (payload.old as { channel_id?: string } | null)?.channel_id;

          if (changedChannelId === channelId) {
            void loadChannelInfo();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        (payload) => {
          const changedChannelId =
            (payload.new as { id?: string } | null)?.id ??
            (payload.old as { id?: string } | null)?.id;

          if (changedChannelId === channelId) {
            void loadChannelInfo();
          }
        },
      )
      .subscribe();

    return () => {
      channelSubscription.unsubscribe();
    };
  }, [channelId]);

  useEffect(() => {
    if (!isCallMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!callMenuRef.current?.contains(event.target as Node)) {
        setIsCallMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isCallMenuOpen]);

  useEffect(() => {
    if (!callMenuStatus) return;

    const timer = window.setTimeout(() => setCallMenuStatus(null), 2500);
    return () => window.clearTimeout(timer);
  }, [callMenuStatus]);

  const loadChannelInfo = async () => {
    if (!channelId || !user) return;

    const [{ data: channel }, { count }, { data: membership }] =
      await Promise.all([
        supabase
          .from("channels")
          .select("name, description, is_private")
          .eq("id", channelId)
          .single(),
        supabase
          .from("channel_members")
          .select("*", { count: "exact", head: true })
          .eq("channel_id", channelId),
        supabase
          .from("channel_members")
          .select("role")
          .eq("channel_id", channelId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

    if (channel) {
      const channelData = channel as any;
      setChannelInfo({
        name: channelData.name,
        description: channelData.description,
        is_private: channelData.is_private,
        member_count: count || 0,
        current_user_role:
          (membership as { role?: string } | null)?.role ?? null,
      });
    }
  };

  const loadBroadcastInfo = async () => {
    if (!broadcastId || !user) return;
    const { data: broadcast } = await supabase
      .from("broadcasts")
      .select("name")
      .eq("id", broadcastId)
      .single();

    if (broadcast) {
      setBroadcastInfo(broadcast);
    }
  };

  const loadDMInfo = async () => {
    if (!dmId || !user || !activeWorkspaceId) return;

    let resolvedOtherUserId = otherUserId;

    if (!resolvedOtherUserId) {
      const { data: dm, error: dmError } = await (supabase as any)
        .from("direct_messages")
        .select("user1_id, user2_id")
        .eq("workspace_id", activeWorkspaceId)
        .eq("id", dmId)
        .maybeSingle();

      if (dmError) {
        console.error("Failed to load DM participants", dmError);
        return;
      }

      if (!dm) return;

      resolvedOtherUserId = dm.user1_id === user.id ? dm.user2_id : dm.user1_id;
    }

    if (!resolvedOtherUserId) return;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "full_name, status,is_signedin, last_seen,avatar_url,avatar_color",
      )
      .eq("id", resolvedOtherUserId)
      .maybeSingle();

    if (profileError) {
      console.error("Failed to load DM profile", profileError);
      return;
    }

    if (profile) {
      setDMInfo(profile);
    }
  };

  if (!channelInfo && !dmInfo && !broadcastInfo) {
    return (
      <div className="h-16 border-b border-slate-200 flex items-center px-6 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse dark:bg-slate-700"></div>
      </div>
    );
  }

  // const dmSubtext = dmInfo
  //   ? dmInfo.is_online
  //     ? dmInfo.status || "Active now"
  //     : dmInfo.last_seen
  //       ? `Last seen ${formatDistanceToNow(new Date(dmInfo.last_seen), { addSuffix: true })}`
  //       : "Offline"
  //   : "";
  // const canInviteTeammates =
  //   Boolean(channelInfo?.is_private) &&
  //   channelInfo?.current_user_role === "admin" &&
  //   !profile?.admin_user_id;

  return (
    <div className="h-12 border-b border-slate-200 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md sticky top-0 z-10 transition-colors dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex min-w-0 max-w-full items-center gap-1">
        <button
          type="button"
          onClick={onBackClick}
          aria-label="Back to chats"
          className="mr-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
        >
          <ArrowLeft size={21} />
        </button>
        <button
          type="button"
          onClick={onTitleClick}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          {broadcastInfo ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <Hash size={24} className="text-slate-400" strokeWidth={1.5} />
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="text-base max-w-44 md:max-w-full font-bold text-slate-900 truncate md:whitespace-normal">
                  {capitalizeFirst(broadcastInfo.name)}
                </h2>
                <ChevronRight
                  size={16}
                  className="shrink-0 text-slate-400 md:hidden"
                />
              </div>
            </div>
          ) : channelInfo ? (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                {channelInfo.is_private ? (
                  <Lock size={20} className="text-slate-400" strokeWidth={2} />
                ) : (
                  <Hash
                    size={24}
                    className="text-slate-400"
                    strokeWidth={1.5}
                  />
                )}
                <div className="flex min-w-0 items-center gap-1.5">
                  <h2 className="text-base max-w-44 md:max-w-84 w-full font-bold text-slate-900 truncate">
                    {capitalizeFirst(channelInfo.name)}
                  </h2>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-slate-400 md:hidden"
                  />
                </div>
              </div>
              {channelInfo.description && (
                <>
                  <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
                  <p className="hidden md:block text-xs font-medium text-slate-500 truncate">
                    {capitalizeFirst(channelInfo.description)}
                  </p>
                </>
              )}
            </>
          ) : dmInfo ? (
            <>
              {/* Discord uses 24x24 or 32x32 avatars in headers */}
              <div
                className="w-8 h-8 relative rounded-full flex items-center justify-center overflow-hidden text-white text-xs font-bold shrink-0"
                style={{
                  backgroundColor: dmInfo.avatar_color || "#3178C6",
                }}
              >
                {capitalizeFirst(dmInfo.full_name).charAt(0).toUpperCase()}
                {dmInfo.avatar_url && (
                  <img
                    src={dmInfo.avatar_url}
                    alt={capitalizeFirst(dmInfo.full_name)}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
                {isOnline(dmInfo.is_signedin, dmInfo.last_seen) && (
                  <div className="w-2.5 h-2.5 absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base max-w-44 font-bold text-slate-900 truncate">
                    {capitalizeFirst(dmInfo.full_name)}
                  </h2>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-slate-400 md:hidden"
                  />
                </div>
              </div>
            </>
          ) : null}
        </button>
      </div>

      {/* Toolbar - Use slate-500 for a more "standardized" app icon look */}
      <div className="flex items-center gap-1.5 text-slate-500">
        {/* {channelInfo && canInviteTeammates && (
          <button
            onClick={onMembersClick}
            className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 rounded-md transition-colors relative group text-sm font-medium text-slate-700 dark:hover:bg-slate-800 dark:text-slate-200"
            title="Invite teammates"
          >
            <Users size={18} strokeWidth={1.75} />
            <span>Invite teammates</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
              Private channel admin action
            </span>
          </button>
        )} */}

        {/* <button
          onClick={onPinnedClick}
          className="hidden md:block p-1.5 hover:bg-slate-100 rounded-md transition-colors"
          title="Pinned messages"
        >
          <Pin size={22} strokeWidth={1.75} />
        </button> */}

        <button
          onClick={onNotificationClick}
          className="hidden p-1.5 hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800 md:block"
          title="Notifications"
        >
          <Bell size={22} strokeWidth={1.75} />
        </button>
        <button
          onClick={onSearchClick}
          className="p-1.5 hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800"
          title="Search"
        >
          <Search size={22} strokeWidth={1.75} />
        </button>
        <div ref={callMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsCallMenuOpen((isOpen) => !isOpen)}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800"
            title="Call options"
            aria-label="Call options"
            aria-expanded={isCallMenuOpen}
          >
            <Phone size={22} strokeWidth={1.75} className="md:hidden" />
            <MoreVertical
              size={22}
              strokeWidth={1.75}
              className="hidden md:block"
            />
          </button>
          {isCallMenuOpen ? (
            <div className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setIsCallMenuOpen(false);
                  onStartAudioCall?.();
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Phone size={17} />
                <span>Audio call</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCallMenuOpen(false);
                  onStartVideoCall?.();
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Video size={17} />
                <span>Video call</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCallMenuOpen(false);
                  onOpenCallHistory?.();
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <History size={17} />
                <span>Call history</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCallMenuOpen(false);
                  setCallMenuStatus("Call scheduling will be available soon.");
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <CalendarClock size={17} />
                <span>Schedule call</span>
              </button>
            </div>
          ) : null}
        </div>
        {isCallActive ? (
          <button
            onClick={onStartScreenShare}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800"
            title="Share screen"
            aria-label="Share screen"
          >
            <ScreenShare size={22} strokeWidth={1.75} />
          </button>
        ) : null}
        {onArchiveClick ? (
          <button
            onClick={onArchiveClick}
            className="p-1.5 hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800 md:hidden"
            title="Archive chat"
            aria-label="Archive chat"
          >
            <Archive size={22} strokeWidth={1.75} />
          </button>
        ) : null}
        {callMenuStatus ? (
          <div className="absolute right-4 top-14 z-30 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            {callMenuStatus}
          </div>
        ) : null}

        {/* <button
          onClick={onSettingsClick}
          className="hidden md:block p-1.5 hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800"
          title="Settings"
        >
          <Settings size={22} strokeWidth={1.75} />
        </button> */}
        <button
          onClick={onTitleClick}
          className="p-1.5 lg:hidden hover:bg-slate-100 rounded-md transition-colors dark:hover:bg-slate-800"
          title="Chat details"
          aria-label="Chat details"
        >
          <MoreVertical size={24} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
