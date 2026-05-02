import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useAuth } from "../contexts/AuthContext";
import { useWorkspaces } from "../contexts/WorkspaceContext";
import { supabase } from "../lib/supabase";
import { MainAppShell } from "./main-app/MainAppShell";
import type { MainAppMessage } from "./main-app/types";
import { useStoredChannelInvite } from "./main-app/useStoredChannelInvite";
import { NewChannelModal } from "../components/modals/NewChannelModal";
import { NewBroadcastModal } from "../components/modals/NewBroadcastModal";
import {
  getMemberPopupPosition,
  type MemberPopupProfile,
} from "../components/chat/MemberPopup";
import { VAPID_PUBLIC_KEY } from "../config/push";
const MainAppModals = lazy(() =>
  import("./main-app/MainAppModals").then((module) => ({
    default: module.MainAppModals,
  })),
);
const NotificationsPage = lazy(() =>
  import("./NotificationsPage").then((module) => ({
    default: module.NotificationsPage,
  })),
);

interface MainAppProps {
  isDarkMode: boolean;
  onToggleDarkMode: (isDarkMode: boolean) => void;
}

export function MainApp({ isDarkMode, onToggleDarkMode }: MainAppProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string>();
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string>();
  const [selectedDMId, setSelectedDMId] = useState<string>();
  const [otherUserId, setOtherUserId] = useState<string>();
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [editChannelInfo, setEditChannelInfo] = useState<any>(null);
  const [editBroadcastInfo, setEditBroadcastInfo] = useState<any>(null);
  const [showNewBroadcastModal, setShowNewBroadcastModal] = useState(false);
  const [showNewDMModal, setShowNewDMModal] = useState(false);
  const [showInvitePeopleModal, setShowInvitePeopleModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showNotificationsPage, setShowNotificationsPage] = useState(false);
  const [showThreadPanel, setShowThreadPanel] = useState(false);
  const [composerFocusToken, setComposerFocusToken] = useState(0);
  const [threadParentMessage, setThreadParentMessage] =
    useState<MainAppMessage | null>(null);
  const [chatReplyTarget, setChatReplyTarget] = useState<MainAppMessage | null>(
    null,
  );
  const [highlightReplyId, setHighlightReplyId] = useState<string | undefined>(
    undefined,
  );
  const [showSavedMessages, setShowSavedMessages] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [showMobileChatDetails, setShowMobileChatDetails] = useState(false);
  const [requestedCallMode, setRequestedCallMode] = useState<
    "audio" | "video" | "screen" | null
  >(null);
  const [scrollToMessageTarget, setScrollToMessageTarget] = useState<{
    messageId: string;
    nonce: number;
    timestamp?: string;
  } | null>(null);
  const [messageToForward, setMessageToForward] =
    useState<MainAppMessage | null>(null);
  const [messagesToForward, setMessagesToForward] = useState<
    MainAppMessage[] | null
  >(null);
  const [selectedMember, setSelectedMember] =
    useState<MemberPopupProfile | null>(null);
  const [memberPopupPosition, setMemberPopupPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [isStartingMemberConvo, setIsStartingMemberConvo] = useState(false);
  const [isLoadingMemberDetails, setIsLoadingMemberDetails] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const { activeWorkspaceId } = useWorkspaces();
  const isSubscribing = useRef(false);
  const previousWorkspaceIdRef = useRef<string | null>(null);

  const updateUrl = (params: Record<string, string | undefined>) => {
    const nextParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) nextParams.set(key, value);
    });
    const nextUrl = nextParams.toString()
      ? `${window.location.pathname}?${nextParams.toString()}`
      : window.location.pathname;
    window.history.pushState({}, "", nextUrl);
  };

  const lazyPanelFallback = (
    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
      Loading...
    </div>
  );

  // const requestNotificationPermission = async () => {
  //   const permission = await Notification.requestPermission();
  //   return permission === "granted";
  // };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Notifications: Ctrl/Cmd + Q
      if (isCmdOrCtrl && e.code === "KeyQ") {
        e.preventDefault();
        e.stopPropagation();
        setShowNotificationModal(true);
        return;
      }

      // Search: Ctrl/Cmd + F
      if (isCmdOrCtrl && e.code === "KeyF") {
        e.preventDefault();
        e.stopPropagation();
        setShowSearchModal(true);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const setup = async () => {
      if (cancelled) return;
      const granted = await Notification.requestPermission();
      if (granted && !cancelled) {
        try {
          await subscribeToPush(user);
        } catch (error) {
          console.warn("Failed to subscribe to push notifications", error);
        }
      }
    };
    setup();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  const subscribeToPush = async (currentUser: any) => {
    if (isSubscribing.current) return;
    isSubscribing.current = true;
    try {
      const deviceId = localStorage.getItem("push_device_id");
      const resolvedDeviceId = deviceId ?? crypto.randomUUID();
      if (!deviceId) {
        localStorage.setItem("push_device_id", resolvedDeviceId);
      }

      const registration = await navigator.serviceWorker.ready;
      // 🔥 After await, check if user still matches
      if (currentUser.id !== user?.id) {
        console.log("User changed during subscription, aborting");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 🔥 Another check after second async
      if (currentUser.id !== user?.id) {
        console.log("User changed during subscription, aborting");
        return;
      }

      const { endpoint, keys }: any = subscription.toJSON();

      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("device_id", resolvedDeviceId);
      // 🔥 Check again after delete
      if (currentUser.id !== user?.id) return;

      await (supabase as any).from("push_subscriptions").insert({
        user_id: currentUser.id,
        device_id: resolvedDeviceId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
    } finally {
      isSubscribing.current = false;
    }
  };

  useEffect(() => {
    const syncSelectionFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view") || undefined;
      const channelId = params.get("channel") || undefined;
      const broadcastId = params.get("broadcast") || undefined;
      const dmId = params.get("dm") || undefined;
      const userId = params.get("user") || undefined;
      setShowNotificationsPage(view === "notifications");
      if (channelId) {
        setSelectedChannelId(channelId);
        setSelectedBroadcastId(undefined);
        setSelectedDMId(undefined);
        setOtherUserId(undefined);
        return;
      }
      if (broadcastId) {
        setSelectedBroadcastId(broadcastId);
        setSelectedChannelId(undefined);
        setSelectedDMId(undefined);
        setOtherUserId(undefined);
        return;
      }
      if (dmId) {
        setSelectedDMId(dmId);
        setOtherUserId(userId);
        setSelectedChannelId(undefined);
        setSelectedBroadcastId(undefined);
        return;
      }
      setSelectedChannelId(undefined);
      setSelectedBroadcastId(undefined);
      setSelectedDMId(undefined);
      setOtherUserId(undefined);
    };
    syncSelectionFromUrl();
    window.addEventListener("popstate", syncSelectionFromUrl);

    return () => {
      window.removeEventListener("popstate", syncSelectionFromUrl);
    };
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    if (!previousWorkspaceIdRef.current) {
      previousWorkspaceIdRef.current = activeWorkspaceId;
      return;
    }

    if (previousWorkspaceIdRef.current === activeWorkspaceId) return;

    previousWorkspaceIdRef.current = activeWorkspaceId;
    setSelectedChannelId(undefined);
    setSelectedBroadcastId(undefined);
    setSelectedDMId(undefined);
    setOtherUserId(undefined);
    setShowMobileChatDetails(false);
    updateUrl({
      channel: undefined,
      broadcast: undefined,
      dm: undefined,
      user: undefined,
    });
  }, [activeWorkspaceId]);

  useStoredChannelInvite({
    user,
    setInviteError,
    setSelectedDMId,
    setOtherUserId,
    setSelectedChannelId,
    updateUrl,
  });

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    setSelectedBroadcastId(undefined);
    setSelectedDMId(undefined);
    setOtherUserId(undefined);
    setChatReplyTarget(null);
    setShowMobileChatDetails(false);
    updateUrl({ channel: channelId });
  };

  const handleChannelCreated = (channelId: string, isPrivate: boolean) => {
    handleChannelSelect(channelId);
    if (isPrivate) {
      setShowMembersModal(true);
    }
  };

  const handleBroadcastSelect = (broadcastId: string) => {
    setSelectedBroadcastId(broadcastId);
    setSelectedChannelId(undefined);
    setSelectedDMId(undefined);
    setOtherUserId(undefined);
    setShowMobileChatDetails(false);
    updateUrl({ broadcast: broadcastId });
  };

  const handleBroadcastCreated = (broadcastId: string) => {
    handleBroadcastSelect(broadcastId);
    setShowMembersModal(true);
  };

  const handleDMSelect = (dmId: string, userId: string) => {
    setSelectedDMId(dmId);
    setOtherUserId(userId);
    setSelectedChannelId(undefined);
    setChatReplyTarget(null);
    setSelectedBroadcastId(undefined);
    setShowMobileChatDetails(false);
    updateUrl({ dm: dmId, user: userId });
  };

  const handleChannelLeft = () => {
    setSelectedChannelId(undefined);
    setSelectedBroadcastId(undefined);
    setSelectedDMId(undefined);
    setOtherUserId(undefined);
    setChatReplyTarget(null);
    setShowMobileChatDetails(false);
    updateUrl({
      channel: undefined,
      broadcast: undefined,
      dm: undefined,
      user: undefined,
    });
  };

  const handleArchiveCurrentChat = async () => {
    if (!user || !activeWorkspaceId) return;
    if (!selectedChannelId && !selectedBroadcastId && !selectedDMId) return;

    const archiveType = selectedChannelId
      ? "channel"
      : selectedBroadcastId
        ? "broadcast"
        : "dm";
    const archiveId = selectedChannelId ?? selectedBroadcastId ?? selectedDMId;
    const archivedAt = new Date().toISOString();
    const archiveRecord = {
      workspace_id: activeWorkspaceId,
      user_id: user.id,
      channel_id: selectedChannelId ?? null,
      broadcast_id: selectedBroadcastId ?? null,
      dm_id: selectedDMId ?? null,
      archived_at: archivedAt,
    };

    const { error } = await (supabase as any)
      .from("chat_archives")
      .upsert(archiveRecord, {
        onConflict: selectedChannelId
          ? "user_id,channel_id"
          : selectedBroadcastId
            ? "user_id,broadcast_id"
            : "user_id,dm_id",
      });

    if (error) {
      alert(error.message || "Failed to archive this chat.");
      return;
    }

    window.dispatchEvent(
      new CustomEvent("chat-archive-changed", {
        detail: {
          action: "archive",
          type: archiveType,
          id: archiveId,
          archived_at: archivedAt,
        },
      }),
    );
    handleChannelLeft();
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;
    const { error } = await (supabase as any)
      .from("channels")
      .delete()
      .eq("id", channelId);

    if (error) {
      alert("Failed to delete channel: " + error.message);
      return;
    }

    if (selectedChannelId === channelId) {
      handleChannelLeft();
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    if (!confirm("Are you sure you want to delete this broadcast?")) return;
    const { error } = await (supabase as any)
      .from("broadcasts")
      .delete()
      .eq("id", broadcastId);

    if (error) {
      alert("Failed to delete broadcast: " + error.message);
      return;
    }

    if (selectedBroadcastId === broadcastId) {
      handleChannelLeft();
    }
  };

  const handleEditCurrentChat = async () => {
    if (selectedChannelId) {
      const { data } = await supabase
        .from("channels")
        .select("*")
        .eq("id", selectedChannelId)
        .single();
      if (data) setEditChannelInfo(data);
    } else if (selectedBroadcastId) {
      const { data } = await supabase
        .from("broadcasts")
        .select("*")
        .eq("id", selectedBroadcastId)
        .single();
      if (data) setEditBroadcastInfo(data);
    }
  };

  const handleDeleteCurrentChat = () => {
    if (selectedChannelId) {
      handleDeleteChannel(selectedChannelId);
    } else if (selectedBroadcastId) {
      handleDeleteBroadcast(selectedBroadcastId);
    }
  };

  const openNotificationsPage = () => {
    setShowNotificationModal(false);
    setShowNotificationsPage(true);
    updateUrl({
      view: "notifications",
      channel: selectedChannelId,
      broadcast: selectedBroadcastId,
      dm: selectedDMId,
      user: otherUserId,
    });
  };

  const closeNotificationsPage = () => {
    setShowNotificationsPage(false);
    updateUrl({
      channel: selectedChannelId,
      broadcast: selectedBroadcastId,
      dm: selectedDMId,
      user: otherUserId,
    });
  };

  useEffect(() => {
    if (!selectedChannelId || !user) return;

    let isActive = true;

    const redirectToHomeIfRemoved = async () => {
      const [
        { data: channelData, error: channelError },
        { data: membershipData, error: membershipError },
      ] = await Promise.all([
        supabase
          .from("channels")
          .select("is_private, created_by")
          .eq("id", selectedChannelId)
          .maybeSingle(),
        supabase
          .from("channel_members")
          .select("channel_id")
          .eq("channel_id", selectedChannelId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (!isActive) return;

      if (channelError || membershipError) {
        console.error(
          "Failed to verify current channel access",
          channelError || membershipError,
        );
        return;
      }

      const isPrivateChannel =
        (channelData as { is_private?: boolean } | null)?.is_private === true;
      const channelCreatedBy = (
        channelData as { created_by?: string | null } | null
      )?.created_by;

      if (
        !membershipData &&
        (isPrivateChannel || channelCreatedBy !== user.id)
      ) {
        handleChannelLeft();
      }
    };

    void redirectToHomeIfRemoved();

    const membershipSubscription = supabase
      .channel(`active-channel-membership-${selectedChannelId}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channel_members" },
        (payload) => {
          const changedChannelId =
            (payload.new as { channel_id?: string } | null)?.channel_id ??
            (payload.old as { channel_id?: string } | null)?.channel_id;
          const changedUserId =
            (payload.new as { user_id?: string } | null)?.user_id ??
            (payload.old as { user_id?: string } | null)?.user_id;

          if (
            changedChannelId === selectedChannelId &&
            changedUserId === user.id
          ) {
            void redirectToHomeIfRemoved();
          }
        },
      )
      .subscribe();

    return () => {
      isActive = false;
      membershipSubscription.unsubscribe();
    };
  }, [selectedChannelId, user?.id]);

  useEffect(() => {
    if (!selectedDMId || !user) return;

    let isActive = true;

    const redirectToHomeIfDMRemoved = async () => {
      const { data: directMessage, error } = await supabase
        .from("direct_messages")
        .select("id")
        .eq("workspace_id", activeWorkspaceId ?? "")
        .eq("id", selectedDMId)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle();

      if (!isActive) return;

      if (error) {
        console.error("Failed to verify current DM access", error);
        return;
      }

      if (!directMessage) {
        handleChannelLeft();
      }
    };

    void redirectToHomeIfDMRemoved();

    const dmSubscription = supabase
      .channel(`active-dm-${selectedDMId}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        (payload) => {
          const changedDMId =
            (payload.new as { id?: string } | null)?.id ??
            (payload.old as { id?: string } | null)?.id;

          if (changedDMId === selectedDMId) {
            void redirectToHomeIfDMRemoved();
          }
        },
      )
      .subscribe();

    return () => {
      isActive = false;
      dmSubscription.unsubscribe();
    };
  }, [activeWorkspaceId, selectedDMId, user?.id]);

  useEffect(() => {
    setSelectedMember(null);
    setMemberPopupPosition(null);
    setIsStartingMemberConvo(false);
  }, [otherUserId, selectedChannelId, selectedBroadcastId, selectedDMId]);

  useEffect(() => {
    setChatReplyTarget(null);
  }, [selectedChannelId, selectedDMId]);

  useEffect(() => {
    if (!selectedMember?.id || !activeWorkspaceId) {
      setIsLoadingMemberDetails(false);
      return;
    }

    let isActive = true;

    const loadMemberDetails = async () => {
      setIsLoadingMemberDetails(true);

      const [
        { data: channelMember, error: channelMemberError },
        { data: workspaceMember, error: workspaceMemberError },
        { count, error: groupCountError },
      ] = await Promise.all([
        selectedChannelId
          ? (supabase as any)
              .from("channel_members")
              .select("joined_at")
              .eq("channel_id", selectedChannelId)
              .eq("user_id", selectedMember.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        (supabase as any)
          .from("workspace_members")
          .select("joined_at, role")
          .eq("workspace_id", activeWorkspaceId)
          .eq("user_id", selectedMember.id)
          .eq("is_active", true)
          .is("removed_at", null)
          .maybeSingle(),
        (supabase as any)
          .from("channel_members")
          .select("id, channels!inner(workspace_id)", {
            count: "exact",
            head: true,
          })
          .eq("user_id", selectedMember.id)
          .eq("channels.workspace_id", activeWorkspaceId),
      ]);

      if (!isActive) return;

      if (workspaceMemberError) {
        console.error(
          "Failed to load workspace membership details",
          workspaceMemberError,
        );
      }

      if (channelMemberError) {
        console.error(
          "Failed to load channel membership details",
          channelMemberError,
        );
      }

      if (groupCountError) {
        console.error("Failed to load member group count", groupCountError);
      }

      setSelectedMember((current) =>
        current?.id === selectedMember.id
          ? {
              ...current,
              currentChannelJoinedAt:
                (channelMember as { joined_at?: string | null } | null)
                  ?.joined_at ??
                current.currentChannelJoinedAt ??
                null,
              workspaceRole:
                (
                  workspaceMember as {
                    role?: "owner" | "admin" | "member" | "guest" | null;
                  } | null
                )?.role ??
                current.workspaceRole ??
                null,
              workspaceJoinedAt:
                (workspaceMember as { joined_at?: string | null } | null)
                  ?.joined_at ?? null,
              groupCount: count ?? null,
            }
          : current,
      );
      setIsLoadingMemberDetails(false);
    };

    void loadMemberDetails();

    return () => {
      isActive = false;
    };
  }, [activeWorkspaceId, selectedChannelId, selectedMember?.id]);

  const closeMemberPopup = () => {
    setSelectedMember(null);
    setMemberPopupPosition(null);
    setIsStartingMemberConvo(false);
    setIsLoadingMemberDetails(false);
  };

  const handleMentionClick = async (
    mentionName: string,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();

    const { data: resolvedProfile, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, is_signedin, last_seen, avatar_url")
      .ilike("full_name", mentionName)
      .maybeSingle();

    if (error) {
      console.error("Failed to load mentioned profile", error);
      return;
    }

    if (!resolvedProfile) return;

    setSelectedMember(resolvedProfile as MemberPopupProfile);
    setIsLoadingMemberDetails(true);
    setMemberPopupPosition(getMemberPopupPosition(rect));
  };

  const openMemberPopupByUserId = async (
    targetUserId: string,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();

    const { data: resolvedProfile, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, is_signedin, last_seen, avatar_url, avatar_color",
      )
      .eq("id", targetUserId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load member profile", error);
      return;
    }

    if (!resolvedProfile) return;

    setSelectedMember(resolvedProfile as MemberPopupProfile);
    setIsLoadingMemberDetails(true);
    setMemberPopupPosition(getMemberPopupPosition(rect));
  };

  const handleStartMemberConversation = async () => {
    if (!user || !selectedMember || !activeWorkspaceId) return;

    setIsStartingMemberConvo(true);

    try {
      const [userId1, userId2] = [user.id, selectedMember.id].sort();
      const { data: existingDM, error: existingDMError } = await supabase
        .from("direct_messages")
        .select("id")
        .eq("workspace_id", activeWorkspaceId)
        .eq("user1_id", userId1)
        .eq("user2_id", userId2)
        .maybeSingle();

      if (existingDMError) throw existingDMError;

      if (existingDM) {
        handleDMSelect((existingDM as { id: string }).id, selectedMember.id);
      } else {
        const { data: newDM, error: newDMError } = await supabase
          .from("direct_messages")
          .insert({
            workspace_id: activeWorkspaceId,
            user1_id: userId1,
            user2_id: userId2,
          } as never)
          .select("id")
          .single();

        if (newDMError) throw newDMError;
        if (newDM) {
          handleDMSelect((newDM as { id: string }).id, selectedMember.id);
        }
      }

      closeMemberPopup();
    } catch (error) {
      console.error("Failed to start direct message", error);
    } finally {
      setIsStartingMemberConvo(false);
    }
  };

  const handleMessageSenderClick = async (
    targetUserId: string,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    if (!targetUserId) {
      return;
    }

    await openMemberPopupByUserId(targetUserId, event);
  };

  const scrollToMessage = (messageId: string, timestamp?: string) => {
    setScrollToMessageTarget({
      messageId,
      nonce: Date.now(),
      timestamp,
    });
  };

  const focusComposer = () => {
    setComposerFocusToken((current) => current + 1);
  };

  const handleSavedMessageClick = async ({
    messageId,
    channelId,
    dmId,
  }: {
    messageId: string;
    channelId?: string | null;
    dmId?: string | null;
  }) => {
    scrollToMessage(messageId);

    if (channelId) {
      if (selectedChannelId !== channelId) {
        handleChannelSelect(channelId);
      }
      return;
    }

    if (!dmId || selectedDMId === dmId) return;

    const { data: directMessage } = await supabase
      .from("direct_messages")
      .select("user1_id, user2_id")
      .eq("workspace_id", activeWorkspaceId ?? "")
      .eq("id", dmId)
      .maybeSingle();

    const dm = directMessage as { user1_id: string; user2_id: string } | null;
    if (!dm || !user) return;

    handleDMSelect(dmId, dm.user1_id === user.id ? dm.user2_id : dm.user1_id);
  };

  const handleNotificationSelect = async ({
    channelId,
    dmId,
    recipientId,
    messageId,
    timestamp,
    message,
  }: {
    channelId?: string;
    dmId?: string;
    recipientId?: string;
    messageId?: string;
    timestamp?: string;
    message?: MainAppMessage | null;
  }) => {
    setShowNotificationModal(false);
    setShowNotificationsPage(false);

    const shouldOpenThreadOnly = Boolean(message);

    console.log("Message Cme as : ", message);

    if (message) {
      setThreadParentMessage(message);
      setHighlightReplyId(messageId);
      setShowThreadPanel(true);
    }

    if (channelId) {
      handleChannelSelect(channelId);
      if (messageId && !shouldOpenThreadOnly) {
        scrollToMessage(messageId, timestamp);
      }
      return;
    }

    if (!dmId) return;

    let resolvedOtherUserId = recipientId;

    if (!resolvedOtherUserId) {
      const { data: directMessage } = await supabase
        .from("direct_messages")
        .select("user1_id, user2_id")
        .eq("workspace_id", activeWorkspaceId ?? "")
        .eq("id", dmId)
        .maybeSingle();

      const dm = directMessage as { user1_id: string; user2_id: string } | null;
      if (!dm || !user) return;
      resolvedOtherUserId = dm.user1_id === user.id ? dm.user2_id : dm.user1_id;
    }

    handleDMSelect(dmId, resolvedOtherUserId);
    if (messageId && !shouldOpenThreadOnly) {
      scrollToMessage(messageId, timestamp);
    }
  };

  const handleSearchResultSelect = async (result: {
    id: string;
    type: string;
    channelId?: string;
    broadcastId?: string;
    dmId?: string;
    timestamp?: string;
  }) => {
    setShowSearchModal(false);

    if (result.channelId) {
      handleChannelSelect(result.channelId);
      focusComposer();
      if (result.type === "message") {
        scrollToMessage(result.id, result.timestamp);
      }
      return;
    }
    if (result.broadcastId) {
      handleBroadcastSelect(result.broadcastId);
      focusComposer();
      if (result.type === "message") {
        scrollToMessage(result.id, result.timestamp);
      }
      return;
    }

    if (!result.dmId) return;

    const { data: directMessage } = await supabase
      .from("direct_messages")
      .select("user1_id, user2_id")
      .eq("workspace_id", activeWorkspaceId ?? "")
      .eq("id", result.dmId)
      .maybeSingle();

    const dm = directMessage as { user1_id: string; user2_id: string } | null;
    if (!dm || !user) return;

    handleDMSelect(
      result.dmId,
      dm.user1_id === user.id ? dm.user2_id : dm.user1_id,
    );
    focusComposer();

    if (result.type === "message") {
      scrollToMessage(result.id, result.timestamp);
    }
  };

  return (
    <>
      <MainAppShell
        isDarkMode={isDarkMode}
        profile={profile}
        userId={user?.id}
        selectedChannelId={selectedChannelId}
        selectedBroadcastId={selectedBroadcastId}
        selectedDMId={selectedDMId}
        otherUserId={otherUserId}
        inviteError={inviteError}
        showPinnedMessages={showPinnedMessages}
        showMobileChatDetails={showMobileChatDetails}
        showThreadPanel={showThreadPanel}
        selectedMember={selectedMember}
        memberPopupPosition={memberPopupPosition}
        isStartingMemberConvo={isStartingMemberConvo}
        isLoadingMemberDetails={isLoadingMemberDetails}
        scrollToMessageTarget={scrollToMessageTarget}
        composerFocusToken={composerFocusToken}
        threadParentMessage={threadParentMessage}
        highlightReplyId={highlightReplyId}
        onToggleDarkMode={() => onToggleDarkMode(!isDarkMode)}
        onChannelSelect={handleChannelSelect}
        onBroadcastSelect={handleBroadcastSelect}
        onDMSelect={handleDMSelect}
        onEditChannel={setEditChannelInfo}
        onDeleteChannel={handleDeleteChannel}
        onEditBroadcast={setEditBroadcastInfo}
        onDeleteBroadcast={handleDeleteBroadcast}
        onOpenNewChannel={() => setShowNewChannelModal(true)}
        onOpenNewBroadcast={() => setShowNewBroadcastModal(true)}
        onOpenNewDM={() => setShowNewDMModal(true)}
        onOpenInvitePeople={() => setShowInvitePeopleModal(true)}
        onOpenSearch={() => setShowSearchModal(true)}
        onOpenMembers={() => setShowMembersModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onToggleNotifications={() => setShowNotificationModal((prev) => !prev)}
        onTogglePinnedMessages={() => setShowPinnedMessages((prev) => !prev)}
        onClosePinnedMessages={() => setShowPinnedMessages(false)}
        onShowMobileChatDetails={() => setShowMobileChatDetails(true)}
        onCloseMobileChatDetails={() => setShowMobileChatDetails(false)}
        onCloseThread={() => {
          setShowThreadPanel(false);
          setThreadParentMessage(null);
          setHighlightReplyId(undefined);
        }}
        onScrollToMessage={scrollToMessage}
        onThreadOpen={(message) => {
          setThreadParentMessage(message);
          setHighlightReplyId(undefined);
          setShowThreadPanel(true);
        }}
        onReplyToMessage={(message) => {
          setChatReplyTarget(message);
          focusComposer();
        }}
        onCancelReply={() => setChatReplyTarget(null)}
        chatReplyTarget={chatReplyTarget}
        onForwardMessage={(message) => {
          setMessageToForward(message);
          setMessagesToForward(null);
        }}
        onForwardMessages={(messages) => {
          setMessagesToForward(messages);
          setMessageToForward(null);
        }}
        onMessageSenderClick={handleMessageSenderClick}
        onMentionClick={handleMentionClick}
        onMemberClick={(member, position) => {
          setSelectedMember(member);
          setIsLoadingMemberDetails(true);
          setMemberPopupPosition(position);
        }}
        onStartMemberConversation={handleStartMemberConversation}
        onCloseMemberPopup={closeMemberPopup}
        onChannelLeft={handleChannelLeft}
        onArchiveCurrentChat={handleArchiveCurrentChat}
        onEditChat={handleEditCurrentChat}
        onDeleteChat={handleDeleteCurrentChat}
        requestedCallMode={requestedCallMode}
        onStartCall={setRequestedCallMode}
        onCallRequestHandled={() => setRequestedCallMode(null)}
        notificationsView={
          showNotificationsPage ? (
            <Suspense fallback={lazyPanelFallback}>
              <NotificationsPage
                onBack={closeNotificationsPage}
                onNotificationSelect={handleNotificationSelect}
              />
            </Suspense>
          ) : undefined
        }
        onCloseNotificationsView={closeNotificationsPage}
      />

      <Suspense fallback={null}>
        <MainAppModals
          showNewChannelModal={showNewChannelModal}
          showNewBroadcastModal={showNewBroadcastModal}
          showNewDMModal={showNewDMModal}
          showInvitePeopleModal={showInvitePeopleModal}
          showSearchModal={showSearchModal}
          showSettingsModal={showSettingsModal}
          showMembersModal={showMembersModal}
          showNotificationModal={showNotificationModal}
          showSavedMessages={showSavedMessages}
          selectedChannelId={selectedChannelId}
          selectedBroadcastId={selectedBroadcastId}
          messageToForward={messageToForward}
          messagesToForward={messagesToForward}
          onCloseNewChannel={() => setShowNewChannelModal(false)}
          onCloseNewBroadcast={() => setShowNewBroadcastModal(false)}
          onCloseNewDM={() => setShowNewDMModal(false)}
          onCloseInvitePeople={() => setShowInvitePeopleModal(false)}
          onCloseSearch={() => setShowSearchModal(false)}
          onCloseSettings={() => setShowSettingsModal(false)}
          onCloseMembers={() => setShowMembersModal(false)}
          onCloseNotifications={() => setShowNotificationModal(false)}
          onCloseSavedMessages={() => setShowSavedMessages(false)}
          onCloseForwardMessage={() => {
            setMessageToForward(null);
            setMessagesToForward(null);
          }}
          onChannelCreated={handleChannelCreated}
          onBroadcastCreated={handleBroadcastCreated}
          onDMCreated={handleDMSelect}
          onChannelLeft={handleChannelLeft}
          onNotificationSelect={handleNotificationSelect}
          onSavedMessageClick={handleSavedMessageClick}
          onSearchResultSelect={handleSearchResultSelect}
          onViewMoreNotifications={openNotificationsPage}
        />
      </Suspense>

      <NewChannelModal
        isOpen={Boolean(editChannelInfo)}
        onClose={() => setEditChannelInfo(null)}
        isFrom="edit"
        channelInfo={editChannelInfo}
      />
      <NewBroadcastModal
        isOpen={Boolean(editBroadcastInfo)}
        onClose={() => setEditBroadcastInfo(null)}
        isFrom="edit"
        broadcastInfo={editBroadcastInfo}
      />
    </>
  );
}
