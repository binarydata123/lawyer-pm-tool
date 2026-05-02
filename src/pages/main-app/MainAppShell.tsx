import { Sidebar } from "../../components/layout/Sidebar";
import { ChannelHeader } from "../../components/chat/ChannelHeader";
import { MessageList } from "../../components/chat/MessageList";
import { MessageInput } from "../../components/chat/MessageInput";
import { TypingIndicator } from "../../components/chat/TypingIndicator";
import { PinnedMessagesPanel } from "../../components/chat/PinnedMessagesPanel";
import { ChatDetailsPanel } from "../../components/chat/ChatDetailsPanel";
import { ThreadPanel } from "../../components/chat/ThreadPanel";
import { CallDock } from "../../components/chat/CallDock";
import { CallHistoryPage } from "../../components/chat/CallHistoryModal";
import {
  MemberPopup,
  type MemberPopupProfile,
} from "../../components/chat/MemberPopup";
import type { MainAppMessage } from "./types";
import { useWorkspaces } from "../../contexts/WorkspaceContext";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../../lib/supabase";

type CallMode = "audio" | "video" | "screen";
const RINGTONE_AUDIO_SRC = "/audio/universfield-ringtone-082-496370.mp3";
const MESSAGE_BEEP_AUDIO_SRC =
  "/audio/soundshelfstudio-ui-digital-target-lock-beep-526191.mp3";
const MESSAGE_BEEP_VOLUME = 0.95;
const AUDIO_UNLOCK_EVENTS = [
  "pointerdown",
  "touchstart",
  "click",
  "keydown",
] as const;

interface GlobalIncomingCall {
  callId: string;
  callLogId?: string;
  roomId: string;
  roomType: "channel" | "dm";
  mode: CallMode;
  from: string;
  name: string;
}

interface GlobalCallEndedPayload {
  callId?: string;
  to?: string;
}

interface GlobalCallBusyPayload {
  callId?: string;
  to?: string;
  from?: string;
}

interface MainAppShellProps {
  isDarkMode: boolean;
  profile: {
    admin_user_id?: string | null;
    deleted_by_admin_user_id?: string | null;
  } | null;
  userId?: string;
  selectedChannelId?: string;
  selectedBroadcastId?: string;
  selectedDMId?: string;
  otherUserId?: string;
  inviteError: string | null;
  showPinnedMessages: boolean;
  showMobileChatDetails: boolean;
  showThreadPanel: boolean;
  selectedMember: MemberPopupProfile | null;
  memberPopupPosition: { top: number; left: number } | null;
  isStartingMemberConvo: boolean;
  isLoadingMemberDetails: boolean;
  scrollToMessageTarget: {
    messageId: string;
    nonce: number;
    timestamp?: string;
  } | null;
  composerFocusToken?: number;
  threadParentMessage: MainAppMessage | null;
  chatReplyTarget: MainAppMessage | null;
  highlightReplyId?: string;
  onToggleDarkMode: () => void;
  onChannelSelect: (channelId: string) => void;
  onBroadcastSelect?: (broadcastId: string) => void;
  onDMSelect: (dmId: string, userId: string) => void;
  onOpenNewChannel: () => void;
  onOpenNewBroadcast?: () => void;
  onOpenNewDM: () => void;
  onOpenInvitePeople: () => void;
  onOpenSearch: () => void;
  onOpenMembers: () => void;
  onOpenSettings: () => void;
  onToggleNotifications: () => void;
  onTogglePinnedMessages: () => void;
  onClosePinnedMessages: () => void;
  onShowMobileChatDetails: () => void;
  onCloseMobileChatDetails: () => void;
  onCloseThread: () => void;
  onScrollToMessage: (messageId: string, timestamp?: string) => void;
  onThreadOpen: (message: MainAppMessage) => void;
  onReplyToMessage: (message: MainAppMessage) => void;
  onCancelReply: () => void;
  onForwardMessage: (message: MainAppMessage) => void;
  onForwardMessages: (messages: MainAppMessage[]) => void;
  onMessageSenderClick: (
    userId: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  onMentionClick: (
    mentionName: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  onMemberClick: (
    member: MemberPopupProfile,
    position: { top: number; left: number },
  ) => void;
  onStartMemberConversation: () => void;
  onCloseMemberPopup: () => void;
  onChannelLeft: () => void;

  onEditChannel?: (channel: any) => void;
  onDeleteChannel?: (id: string) => void;
  onEditBroadcast?: (broadcast: any) => void;
  onDeleteBroadcast?: (id: string) => void;
  onArchiveCurrentChat: () => void;
  onEditChat?: () => void;
  onDeleteChat?: () => void;
  notificationsView?: ReactNode;
  onCloseNotificationsView?: () => void;
  requestedCallMode: "audio" | "video" | "screen" | null;
  onStartCall: (mode: "audio" | "video" | "screen") => void;
  onCallRequestHandled: () => void;
}

export function MainAppShell({
  isDarkMode,
  profile,
  userId,
  selectedChannelId,
  selectedBroadcastId,
  selectedDMId,
  otherUserId,
  inviteError,
  showPinnedMessages,
  showMobileChatDetails,
  showThreadPanel,
  selectedMember,
  memberPopupPosition,
  isStartingMemberConvo,
  isLoadingMemberDetails,
  scrollToMessageTarget,
  composerFocusToken,
  threadParentMessage,
  chatReplyTarget,
  highlightReplyId,
  onToggleDarkMode,
  onChannelSelect,
  onBroadcastSelect,
  onDMSelect,
  onOpenNewChannel,
  onOpenNewBroadcast,
  onOpenNewDM,
  onOpenInvitePeople,
  onOpenSearch,
  onOpenMembers,
  onOpenSettings,
  onToggleNotifications,
  onTogglePinnedMessages,
  onClosePinnedMessages,
  onShowMobileChatDetails,
  onCloseMobileChatDetails,
  onCloseThread,
  onScrollToMessage,
  onThreadOpen,
  onReplyToMessage,
  onCancelReply,
  onForwardMessage,
  onForwardMessages,
  onMessageSenderClick,
  onMentionClick,
  onMemberClick,
  onStartMemberConversation,
  onCloseMemberPopup,
  onChannelLeft,
  onArchiveCurrentChat,
  onEditChannel,
  onDeleteChannel,
  onEditBroadcast,
  onDeleteBroadcast,
  onEditChat,
  onDeleteChat,
  notificationsView,
  onCloseNotificationsView,
  requestedCallMode,
  onStartCall,
  onCallRequestHandled,
}: MainAppShellProps) {
  const MIN_SIDEBAR_WIDTH = 180;
  const MAX_SIDEBAR_WIDTH = 500;
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);

  const { canManageWorkspace } = useWorkspaces();
  const hasActiveChat = Boolean(
    selectedChannelId || selectedDMId || selectedBroadcastId,
  );
  const [isCallActive, setIsCallActive] = useState(false);
  const [messageSentToken, setMessageSentToken] = useState(0);
  const isCallActiveRef = useRef(false);
  const [isCallHistoryOpen, setIsCallHistoryOpen] = useState(false);
  const [globalIncomingCall, setGlobalIncomingCall] =
    useState<GlobalIncomingCall | null>(null);
  const [acceptedIncomingCall, setAcceptedIncomingCall] =
    useState<GlobalIncomingCall | null>(null);
  const endedGlobalCallIdsRef = useRef<Set<string>>(new Set());
  const startCallHandlerRef = useRef<((mode: CallMode) => void) | null>(null);
  const ringtoneAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneAudioContextRef = useRef<AudioContext | null>(null);
  const ringtoneAudioBufferPromiseRef = useRef<Promise<AudioBuffer> | null>(
    null,
  );
  const ringtoneSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const shouldPlayRingtoneRef = useRef(false);
  const ringtonePlayTokenRef = useRef(0);
  const messageBeepAudioRef = useRef<HTMLAudioElement | null>(null);
  const recentMessageBeepIdsRef = useRef<Set<string>>(new Set());
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 1023px)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const handleChange = () => setIsMobileOrTablet(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing],
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const showMobileListMode = !hasActiveChat && isMobileOrTablet;
  const activeRoomId = selectedChannelId ?? selectedDMId;
  const activeRoomType = selectedChannelId
    ? "channel"
    : selectedDMId
      ? "dm"
      : null;
  const previousRoomKeyRef = useRef<string | null>(null);
  const acceptedCallForActiveRoom =
    acceptedIncomingCall &&
    acceptedIncomingCall.roomId === activeRoomId &&
    acceptedIncomingCall.roomType === activeRoomType
      ? acceptedIncomingCall
      : null;
  const handleStartCallFromHeader = useCallback(
    (mode: CallMode) => {
      if (startCallHandlerRef.current) {
        startCallHandlerRef.current(mode);
        onCallRequestHandled();
        return;
      }

      onStartCall(mode);
    },
    [onCallRequestHandled, onStartCall],
  );

  const handleActiveCallChange = useCallback((active: boolean) => {
    isCallActiveRef.current = active;
    setIsCallActive(active);
  }, []);

  useEffect(() => {
    const nextRoomKey =
      activeRoomId && activeRoomType
        ? `${activeRoomType}:${activeRoomId}`
        : null;

    if (
      previousRoomKeyRef.current &&
      previousRoomKeyRef.current !== nextRoomKey
    ) {
      setIsCallHistoryOpen(false);
    }

    previousRoomKeyRef.current = nextRoomKey;
  }, [activeRoomId, activeRoomType]);

  const playMessageBeep = useCallback(() => {
    const audio =
      messageBeepAudioRef.current ?? new Audio(MESSAGE_BEEP_AUDIO_SRC);
    messageBeepAudioRef.current = audio;
    audio.loop = false;
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = MESSAGE_BEEP_VOLUME;
    audio.currentTime = 0;

    void audio.play().catch((error) => {
      console.warn("Unable to play message beep", error);
    });
  }, []);

  useEffect(() => {
    const primeMessageBeepAudio = () => {
      const audio =
        messageBeepAudioRef.current ?? new Audio(MESSAGE_BEEP_AUDIO_SRC);
      audio.loop = false;
      audio.preload = "auto";
      audio.volume = MESSAGE_BEEP_VOLUME;
      messageBeepAudioRef.current = audio;
      audio.load();

      const previousMuted = audio.muted;
      audio.muted = true;
      void audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => undefined)
        .finally(() => {
          audio.muted = previousMuted;
        });
    };

    AUDIO_UNLOCK_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, primeMessageBeepAudio, {
        once: true,
        passive: true,
        capture: true,
      });
    });

    return () => {
      AUDIO_UNLOCK_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, primeMessageBeepAudio, {
          capture: true,
        });
      });
    };
  }, []);

  useEffect(() => {
    return () => {
      messageBeepAudioRef.current?.pause();
      messageBeepAudioRef.current = null;
    };
  }, []);

  const playBeepForMessageOutsideActiveChat = useCallback(
    ({
      id,
      user_id,
      channel_id,
      dm_id,
    }: {
      id?: string;
      user_id?: string;
      channel_id?: string | null;
      dm_id?: string | null;
    }) => {
      if (isCallActive) return;
      if (!id || !userId || user_id === userId) return;

      const isCurrentChat =
        (channel_id &&
          activeRoomType === "channel" &&
          channel_id === activeRoomId) ||
        (dm_id && activeRoomType === "dm" && dm_id === activeRoomId);

      if (isCurrentChat) return;
      if (recentMessageBeepIdsRef.current.has(id)) return;

      recentMessageBeepIdsRef.current.add(id);
      window.setTimeout(() => {
        recentMessageBeepIdsRef.current.delete(id);
      }, 30_000);

      playMessageBeep();
    },
    [activeRoomId, activeRoomType, isCallActive, playMessageBeep, userId],
  );

  const sendGlobalCallBusy = useCallback(
    async (recipientId?: string, callId?: string) => {
      if (!recipientId || !userId || !callId) return;

      const busyChannel = supabase.channel(`webrtc-user-${recipientId}`);

      await new Promise<void>((resolve) => {
        const timeoutId = window.setTimeout(resolve, 1500);
        busyChannel.subscribe((status) => {
          if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR") {
            window.clearTimeout(timeoutId);
            resolve();
          }
        });
      });

      await busyChannel.send({
        type: "broadcast",
        event: "global-call-busy",
        payload: {
          callId,
          from: userId,
          to: recipientId,
        },
      });

      void busyChannel.unsubscribe();
    },
    [userId],
  );

  const stopRingtone = useCallback(() => {
    shouldPlayRingtoneRef.current = false;
    ringtonePlayTokenRef.current += 1;

    const source = ringtoneSourceRef.current;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
      source.disconnect();
      ringtoneSourceRef.current = null;
    }

    const audio = ringtoneAudioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
    audio.load();
    ringtoneAudioRef.current = null;
  }, []);

  useEffect(() => {
    const primeRingtoneAudio = () => {
      const AudioContextConstructor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextConstructor) return;

      const context =
        ringtoneAudioContextRef.current ?? new AudioContextConstructor();
      ringtoneAudioContextRef.current = context;
      void context.resume().catch(() => undefined);
    };

    AUDIO_UNLOCK_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, primeRingtoneAudio, {
        once: true,
        passive: true,
        capture: true,
      });
    });

    return () => {
      AUDIO_UNLOCK_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, primeRingtoneAudio, {
          capture: true,
        });
      });
    };
  }, []);

  const getRingtoneAudioBuffer = useCallback(async (context: AudioContext) => {
    if (!ringtoneAudioBufferPromiseRef.current) {
      ringtoneAudioBufferPromiseRef.current = fetch(RINGTONE_AUDIO_SRC)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => context.decodeAudioData(arrayBuffer));
    }

    return ringtoneAudioBufferPromiseRef.current;
  }, []);

  const startRingtone = useCallback(() => {
    if (isCallActiveRef.current) {
      console.warn(
        "[Call ringtone] blocked global ringtone during active call",
      );
      stopRingtone();
      return;
    }

    shouldPlayRingtoneRef.current = true;
    const playToken = ringtonePlayTokenRef.current + 1;
    ringtonePlayTokenRef.current = playToken;

    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context =
      ringtoneAudioContextRef.current ?? new AudioContextConstructor();
    ringtoneAudioContextRef.current = context;

    const playRingtone = async () => {
      if (isCallActiveRef.current) {
        console.warn(
          "[Call ringtone] stopped global ringtone before play because call is active",
        );
        stopRingtone();
        return;
      }

      if (
        !shouldPlayRingtoneRef.current ||
        ringtonePlayTokenRef.current !== playToken
      ) {
        return;
      }

      try {
        await context.resume();
        const buffer = await getRingtoneAudioBuffer(context);
        if (
          isCallActiveRef.current ||
          !shouldPlayRingtoneRef.current ||
          ringtonePlayTokenRef.current !== playToken
        ) {
          return;
        }

        ringtoneSourceRef.current?.stop();
        ringtoneSourceRef.current?.disconnect();

        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0.85;
        source.connect(gain);
        gain.connect(context.destination);
        ringtoneSourceRef.current = source;
        source.start();
      } catch (error) {
        console.warn("Unable to play incoming call ringtone", error);
      }
    };

    void playRingtone();
  }, [getRingtoneAudioBuffer, stopRingtone]);

  useEffect(() => {
    if (!userId) return;

    const channelMessageSubscription = supabase
      .channel(`message-beep-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        ({ new: message }) => {
          playBeepForMessageOutsideActiveChat(
            message as {
              id?: string;
              user_id?: string;
              channel_id?: string | null;
            },
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_message_messages",
        },
        ({ new: message }) => {
          playBeepForMessageOutsideActiveChat(
            message as {
              id?: string;
              user_id?: string;
              dm_id?: string | null;
            },
          );
        },
      )
      .subscribe();

    return () => {
      channelMessageSubscription.unsubscribe();
    };
  }, [playBeepForMessageOutsideActiveChat, userId]);

  useEffect(() => {
    if (!userId) return;

    const globalCallSubscription = supabase
      .channel(`webrtc-user-${userId}`)
      .on("broadcast", { event: "global-call-invite" }, ({ payload }) => {
        const incoming = payload as Partial<GlobalIncomingCall> & {
          to?: string;
        };

        if (
          incoming.to !== userId ||
          !incoming.callId ||
          !incoming.roomId ||
          !incoming.roomType ||
          !incoming.mode ||
          !incoming.from ||
          incoming.from === userId
        ) {
          return;
        }

        if (endedGlobalCallIdsRef.current.has(incoming.callId)) {
          return;
        }

        if (isCallActiveRef.current) {
          stopRingtone();
          setGlobalIncomingCall(null);
          void sendGlobalCallBusy(incoming.from, incoming.callId);
          return;
        }

        if (
          incoming.roomId === activeRoomId &&
          incoming.roomType === activeRoomType &&
          !isCallHistoryOpen &&
          !notificationsView
        ) {
          return;
        }

        const nextCall = {
          callId: incoming.callId,
          callLogId: incoming.callLogId,
          roomId: incoming.roomId,
          roomType: incoming.roomType,
          mode: incoming.mode,
          from: incoming.from,
          name: incoming.name ?? "Teammate",
        };

        setGlobalIncomingCall((current) => {
          if (current?.callId === nextCall.callId) return current;
          return nextCall;
        });
      })
      .on("broadcast", { event: "global-call-ended" }, ({ payload }) => {
        const ended = payload as GlobalCallEndedPayload;

        if (ended.to !== userId || !ended.callId) return;

        endedGlobalCallIdsRef.current.add(ended.callId);
        setGlobalIncomingCall((current) =>
          current?.callId === ended.callId ? null : current,
        );
      })
      .on("broadcast", { event: "global-call-busy" }, ({ payload }) => {
        const busy = payload as GlobalCallBusyPayload;

        if (busy.to !== userId || !busy.callId) return;

        window.dispatchEvent(
          new CustomEvent("call-busy", {
            detail: {
              callId: busy.callId,
              from: busy.from,
            },
          }),
        );
      })
      .subscribe();

    return () => {
      globalCallSubscription.unsubscribe();
    };
  }, [
    activeRoomId,
    activeRoomType,
    isCallHistoryOpen,
    isCallActive,
    notificationsView,
    sendGlobalCallBusy,
    stopRingtone,
    userId,
  ]);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
    if (!isCallActive) return;

    stopRingtone();
    setGlobalIncomingCall(null);
  }, [isCallActive, stopRingtone]);

  useEffect(() => {
    if (globalIncomingCall && !isCallActiveRef.current) {
      startRingtone();
      return stopRingtone;
    }

    stopRingtone();
    return undefined;
  }, [globalIncomingCall?.callId, isCallActive, startRingtone, stopRingtone]);

  useEffect(() => {
    return () => {
      stopRingtone();
      void ringtoneAudioContextRef.current?.close();
      ringtoneAudioContextRef.current = null;
      ringtoneAudioRef.current = null;
    };
  }, [stopRingtone]);

  const acceptGlobalCall = () => {
    if (!globalIncomingCall) return;

    stopRingtone();
    onCloseNotificationsView?.();

    if (globalIncomingCall.roomType === "channel") {
      onChannelSelect(globalIncomingCall.roomId);
    } else {
      onDMSelect(globalIncomingCall.roomId, globalIncomingCall.from);
    }

    setAcceptedIncomingCall(globalIncomingCall);
    setGlobalIncomingCall(null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white transition-colors dark:bg-slate-950">
      <aside
        style={{
          width: isMobileOrTablet ? undefined : sidebarWidth,
          flexBasis: isMobileOrTablet ? undefined : sidebarWidth,
        }}
        className={`relative flex flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50 ${isResizing ? "" : "transition-all duration-300 ease-in-out"} dark:border-slate-800 dark:bg-slate-900 ${
          hasActiveChat
            ? "hidden w-16 basis-16 lg:flex"
            : "w-full basis-full lg:flex"
        }`}
      >
        <Sidebar
          onChannelSelect={onChannelSelect}
          onBroadcastSelect={onBroadcastSelect}
          onDMSelect={onDMSelect}
          onNewChannel={onOpenNewChannel}
          onNewBroadcast={onOpenNewBroadcast}
          onNewDM={onOpenNewDM}
          onInvitePeople={onOpenInvitePeople}
          onSearch={onOpenSearch}
          selectedChannelId={selectedChannelId}
          selectedBroadcastId={selectedBroadcastId}
          selectedDMId={selectedDMId}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          onToggleNotifications={onToggleNotifications}
          onStartDMCall={(mode) => onStartCall(mode)}
          onEditChannel={onEditChannel}
          onDeleteChannel={onDeleteChannel}
          onEditBroadcast={onEditBroadcast}
          onDeleteBroadcast={onDeleteBroadcast}
          mobileListMode={showMobileListMode}
        />
        {/* Resizer Handle */}
        <div
          onMouseDown={startResizing}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#3178c6]/50 active:bg-[#3178c6] transition-colors z-50 hidden lg:block"
        />
      </aside>

      <main
        className={`relative min-w-0 flex-1 flex-col overflow-hidden bg-white transition-colors dark:bg-slate-950 ${
          hasActiveChat || notificationsView ? "flex" : "hidden lg:flex"
        }`}
      >
        {inviteError && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {inviteError}
          </div>
        )}

        {notificationsView ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {notificationsView}
          </div>
        ) : isCallHistoryOpen &&
          (selectedChannelId || selectedDMId || selectedBroadcastId) ? (
          <CallHistoryPage
            roomId={selectedChannelId ?? selectedDMId}
            roomType={selectedChannelId ? "channel" : "dm"}
            onBack={() => setIsCallHistoryOpen(false)}
          />
        ) : selectedChannelId || selectedDMId || selectedBroadcastId ? (
          <>
            <div className="relative">
              <ChannelHeader
                channelId={selectedChannelId}
                broadcastId={selectedBroadcastId}
                dmId={selectedDMId}
                otherUserId={otherUserId}
                isDarkMode={isDarkMode}
                onToggleDarkMode={onToggleDarkMode}
                onSearchClick={onOpenSearch}
                onPinnedClick={onTogglePinnedMessages}
                onMembersClick={onOpenMembers}
                onSettingsClick={onOpenSettings}
                onTitleClick={() => {
                  if (window.innerWidth < 1280) {
                    onShowMobileChatDetails();
                  }
                }}
                onNotificationClick={onToggleNotifications}
                onBackClick={onChannelLeft}
                onArchiveClick={onArchiveCurrentChat}
                onStartAudioCall={() => handleStartCallFromHeader("audio")}
                onStartVideoCall={() => handleStartCallFromHeader("video")}
                onStartScreenShare={() => handleStartCallFromHeader("screen")}
                onOpenCallHistory={() => setIsCallHistoryOpen(true)}
                isCallActive={isCallActive}
              />
              <PinnedMessagesPanel
                isOpen={showPinnedMessages}
                broadcastId={selectedBroadcastId}
                onClose={onClosePinnedMessages}
                channelId={selectedChannelId}
                dmId={selectedDMId}
                onPinnedMessageClick={(messageId) =>
                  onScrollToMessage(messageId)
                }
              />
            </div>

            <div className="flex min-h-0 flex-1 relative">
              <div className="flex min-h-0 flex-1 flex-col">
                <MessageList
                  broadcastId={selectedBroadcastId}
                  channelId={selectedChannelId}
                  dmId={selectedDMId}
                  messageSentToken={messageSentToken}
                  onChannelJoin={onChannelSelect}
                  onDMSelect={onMessageSenderClick}
                  scrollToMessageTarget={scrollToMessageTarget}
                  onThreadOpen={onThreadOpen}
                  onReplyToMessage={onReplyToMessage}
                  onForwardMessage={onForwardMessage}
                  onForwardMessages={onForwardMessages}
                  onMentionClick={onMentionClick}
                />
                <TypingIndicator
                  channelId={selectedChannelId}
                  dmId={selectedDMId}
                  broadcastId={selectedBroadcastId}
                />
                <MessageInput
                  key={selectedChannelId ?? selectedDMId ?? selectedBroadcastId}
                  channelId={selectedChannelId}
                  dmId={selectedDMId}
                  broadcastId={selectedBroadcastId}
                  focusToken={composerFocusToken}
                  replyTarget={chatReplyTarget}
                  onCancelReply={onCancelReply}
                  onMessageSent={() =>
                    setMessageSentToken((current) => current + 1)
                  }
                />
              </div>

              {showThreadPanel ? (
                <ThreadPanel
                  isOpen={showThreadPanel}
                  onClose={onCloseThread}
                  parentMessage={threadParentMessage}
                  channelId={selectedChannelId}
                  broadcastId={selectedBroadcastId}
                  dmId={selectedDMId}
                  highlightReplyId={highlightReplyId}
                />
              ) : (
                <ChatDetailsPanel
                  channelId={selectedChannelId}
                  dmId={selectedDMId}
                  broadcastId={selectedBroadcastId}
                  otherUserId={otherUserId}
                  mobileOpen={showMobileChatDetails}
                  onCloseMobile={onCloseMobileChatDetails}
                  onMemberClick={onMemberClick}
                  onBookmarkClick={(messageId) => {
                    onCloseMobileChatDetails();
                    onScrollToMessage(messageId);
                  }}
                  onMembersClick={onOpenMembers}
                  onPinnedClick={onTogglePinnedMessages}
                  onPinnedMessageClick={(messageId) => {
                    onCloseMobileChatDetails();
                    onScrollToMessage(messageId);
                  }}
                  onSettingsClick={onOpenSettings}
                  onChannelLeft={onChannelLeft}
                  onEditChat={onEditChat}
                  onDeleteChat={onDeleteChat}
                />
              )}
            </div>

            {selectedMember && memberPopupPosition && (
              <MemberPopup
                member={selectedMember}
                position={memberPopupPosition}
                currentUserId={userId}
                isStartingConvo={isStartingMemberConvo}
                isLoadingDetails={isLoadingMemberDetails}
                onStartConversation={onStartMemberConversation}
                onClose={onCloseMemberPopup}
              />
            )}
            <CallDock
              roomId={selectedChannelId ?? selectedBroadcastId ?? selectedDMId}
              roomType={
                selectedChannelId
                  ? "channel"
                  : selectedBroadcastId
                    ? "broadcast"
                    : "dm"
              }
              currentUserId={userId}
              currentUserName={
                (profile as { full_name?: string } | null)?.full_name
              }
              requestedMode={requestedCallMode}
              onRequestHandled={onCallRequestHandled}
              onStartCallHandlerChange={(handler) => {
                startCallHandlerRef.current = handler;
              }}
              acceptedIncomingCall={acceptedCallForActiveRoom}
              onAcceptedIncomingCallHandled={() =>
                setAcceptedIncomingCall(null)
              }
              onActiveCallChange={handleActiveCallChange}
            />
          </>
        ) : (
          <div className="hidden flex-1 items-center justify-center lg:flex">
            <div className="text-center">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-100 dark:bg-primary-900/40">
                <span className="text-4xl font-bold text-primary-600">PM</span>
              </div>
              <h2 className="mb-3 text-3xl font-bold text-slate-900 dark:text-white">
                Welcome to PM-Tool
              </h2>
              <p className="mb-8 max-w-md text-slate-600 dark:text-slate-300">
                Select a channel or start a direct message to begin
                collaborating with your team.
              </p>
              <div className="flex justify-center gap-3">
                {canManageWorkspace && (
                  <button
                    onClick={onOpenNewChannel}
                    className="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700"
                  >
                    Create Channel
                  </button>
                )}
                <button
                  onClick={onOpenNewDM}
                  className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {globalIncomingCall ? (
        <div className="fixed left-1/2 top-4 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {globalIncomingCall.name} is calling
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {globalIncomingCall.mode === "audio"
                  ? "Audio call"
                  : globalIncomingCall.mode === "video"
                    ? "Video call"
                    : "Screen share"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={acceptGlobalCall}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => {
                  stopRingtone();
                  setGlobalIncomingCall(null);
                }}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
