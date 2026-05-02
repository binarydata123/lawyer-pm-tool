import {
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  Phone,
  PhoneOff,
  ScreenShareOff,
  Video,
  VideoOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useWorkspaces } from "../../contexts/WorkspaceContext";

type CallMode = "audio" | "video" | "screen";
const RINGTONE_AUDIO_SRC = "/audio/universfield-ringtone-082-496370.mp3";
const AUDIO_UNLOCK_EVENTS = [
  "pointerdown",
  "touchstart",
  "click",
  "keydown",
] as const;
type SignalType =
  | "call-invite"
  | "call-busy"
  | "join-call"
  | "offer"
  | "answer"
  | "ice-candidate"
  | "leave-call"
  | "media-state"
  | "transcript-segment";

interface SignalPayload {
  type: SignalType;
  callId: string;
  callLogId?: string;
  from: string;
  to?: string;
  name?: string;
  mode?: CallMode;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  screenSharing?: boolean;
  transcriptText?: string;
  transcriptAt?: number;
  transcriptIsFull?: boolean;
  endForAll?: boolean;
}

interface AcceptedIncomingCall {
  callId: string;
  callLogId?: string;
  mode: CallMode;
}

interface RemoteParticipant {
  id: string;
  name: string;
  stream: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
}

interface IncomingCall {
  callId: string;
  callLogId?: string;
  name: string;
  mode: CallMode;
}

interface TranscriptSegment {
  speakerId: string;
  speakerName: string;
  text: string;
  at: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface CallDockProps {
  roomId?: string;
  roomType?: "channel" | "dm" | "broadcast";
  currentUserId?: string;
  currentUserName?: string;
  requestedMode: CallMode | null;
  onRequestHandled: () => void;
  onStartCallHandlerChange?: (
    handler: ((mode: CallMode) => void) | null,
  ) => void;
  acceptedIncomingCall?: AcceptedIncomingCall | null;
  onAcceptedIncomingCallHandled?: () => void;
  onActiveCallChange?: (isActive: boolean) => void;
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
// const CHANNEL_CALL_LOG_SELECT =
//   "id, content, created_at, updated_at, is_edited, user_id, attachment_url, attachment_name, attachment_size, attachment_type, thread_id, reply_count, is_pinned, channel_id, workspace_id, profiles:profiles!messages_user_id_fkey(full_name, avatar_url, avatar_color)";
// const DM_CALL_LOG_SELECT =
//   "id, content, created_at, updated_at, is_edited, user_id, attachment_url, attachment_name, attachment_size, attachment_type, thread_id, reply_count, is_pinned, dm_id, workspace_id, profiles:profiles!direct_message_messages_user_id_fkey(full_name, avatar_url, avatar_color)";
// const BROADCAST_CALL_LOG_SELECT =
//   "id, content, created_at, updated_at, is_edited, user_id, attachment_url, attachment_name, attachment_size, attachment_type, thread_id, reply_count, is_pinned, broadcast_id, workspace_id, profiles:profiles!broadcast_messages_user_id_fkey(full_name, avatar_url, avatar_color)";
// Gemini summary generation is paused for now. The first priority is reliable
// call audio transcription saved to the database.
// const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// const GEMINI_MODEL = "gemini-2.0-flash";
const CHANNEL_MESSAGE_SELECT =
  "*, profiles:profiles!messages_user_id_fkey(full_name, avatar_url, avatar_color)";
const DM_MESSAGE_SELECT =
  "*, profiles:profiles!direct_message_messages_user_id_fkey(full_name, avatar_url, avatar_color)";

function isMissingDeviceError(error: unknown) {
  return (
    error instanceof DOMException &&
    ["NotFoundError", "DevicesNotFoundError"].includes(error.name)
  );
}

async function getAvailableMediaKinds() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { hasAudioInput: true, hasVideoInput: true };
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  return {
    hasAudioInput: devices.some((device) => device.kind === "audioinput"),
    hasVideoInput: devices.some((device) => device.kind === "videoinput"),
  };
}

function getCallStartErrorMessage(mode: CallMode, error: unknown) {
  if (isMissingDeviceError(error)) {
    if (mode === "audio") return "No microphone was found for this audio call.";
    if (mode === "video") return "No camera or microphone was found.";
    return "No screen source was found.";
  }

  if (
    error instanceof DOMException &&
    ["NotAllowedError", "PermissionDeniedError"].includes(error.name)
  ) {
    return "Please allow camera and microphone access to join the call.";
  }

  if (!navigator.mediaDevices) {
    return "Calling requires localhost or HTTPS in this browser.";
  }

  return "Unable to start the call on this device.";
}

function isPermissionDeniedError(error: unknown) {
  return (
    error instanceof DOMException &&
    ["NotAllowedError", "PermissionDeniedError"].includes(error.name)
  );
}

function buildTranscriptText(segments: TranscriptSegment[]) {
  return segments
    .slice()
    .sort((left, right) => left.at - right.at)
    .map((segment) => `${segment.speakerName}: ${segment.text}`)
    .join("\n");
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function isMobileTranscriptFallbackTarget() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return getMobileTranscriptFallbackSignals().enabled;
}

function getMobileTranscriptFallbackSignals() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      enabled: false,
      isAppMobileWidth: false,
      isViewportMobileWidth: false,
      hasTouch: false,
      isMobileUserAgent: false,
      innerWidth: 0,
      visualViewportWidth: 0,
      maxTouchPoints: 0,
      userAgent: "",
    };
  }

  const innerWidth = window.innerWidth;
  const visualViewportWidth = window.visualViewport?.width ?? innerWidth;
  const isAppMobileWidth = window.matchMedia("(max-width: 1023px)").matches;
  const isViewportMobileWidth =
    innerWidth <= 1023 || visualViewportWidth <= 1023;
  const hasTouch = navigator.maxTouchPoints > 0;
  const isMobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(
    navigator.userAgent,
  );

  return {
    enabled:
      isAppMobileWidth ||
      isViewportMobileWidth ||
      hasTouch ||
      isMobileUserAgent,
    isAppMobileWidth,
    isViewportMobileWidth,
    hasTouch,
    isMobileUserAgent,
    innerWidth,
    visualViewportWidth,
    maxTouchPoints: navigator.maxTouchPoints,
    userAgent: navigator.userAgent,
  };
}

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];

  return (
    candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ??
    ""
  );
}

function getReusableVideoSender(peer: RTCPeerConnection) {
  const activeVideoSender = peer
    .getSenders()
    .find((sender) => sender.track?.kind === "video");

  if (activeVideoSender) return activeVideoSender;

  return (
    peer
      .getTransceivers()
      .find((transceiver) => transceiver.receiver.track.kind === "video")
      ?.sender ?? null
  );
}

function formatCallDuration(startedAt: number, endedAt: number) {
  const seconds = Math.max(1, Math.round((endedAt - startedAt) / 1000));
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const hourLabel = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const minuteLabel = `${remainingMinutes} ${
    remainingMinutes === 1 ? "minute" : "minutes"
  }`;
  return remainingMinutes ? `${hourLabel} ${minuteLabel}` : hourLabel;
}

function buildCallEndedMessage({
  mode,
  callerName,
  startedAt,
  endedAt,
  summary,
}: {
  mode: CallMode | null;
  callerName?: string | null;
  startedAt: number;
  endedAt: number;
  summary: string | null;
}) {
  const name = callerName?.trim() || "Someone";
  const callLabel = mode === "video" ? "video call" : "call";
  const headline = `${name} started a ${callLabel} that lasted ${formatCallDuration(
    startedAt,
    endedAt,
  )}.`;

  if (summary) {
    return `${headline}\n\nSummary:\n${summary}`;
  }

  return headline;
}

// async function generateCallSummary(transcript: string) {
//   if (!GEMINI_API_KEY) {
//     throw new Error("Missing Gemini API key");
//   }
//
//   const prompt = `Summarize this call transcript for a workplace chat.
//
// Return a concise summary with:
// - Main points
// - Decisions
// - Action items with owners when mentioned
// - Open questions
//
// If the transcript is too short or unclear, say what could be determined without inventing details.
//
// Transcript:
// ${transcript}`;
//
//   const response = await fetch(
//     `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
//       GEMINI_API_KEY,
//     )}`,
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         contents: [
//           {
//             role: "user",
//             parts: [{ text: prompt }],
//           },
//         ],
//         generationConfig: {
//           temperature: 0.2,
//           maxOutputTokens: 1200,
//         },
//       }),
//     },
//   );
//
//   if (!response.ok) {
//     throw new Error(`Gemini summary failed with ${response.status}`);
//   }
//
//   const data = await response.json();
//   const summary = data?.candidates?.[0]?.content?.parts
//     ?.map((part: { text?: string }) => part.text)
//     .filter(Boolean)
//     .join("\n")
//     .trim();
//
//   if (!summary) {
//     throw new Error("Gemini returned an empty summary");
//   }
//
//   return summary;
// }

async function sendUserCallEvent(
  recipientId: string,
  event: "global-call-invite" | "global-call-ended",
  payload: {
    callId: string;
    callLogId?: string | null;
    roomId?: string;
    roomType?: "channel" | "dm" | "broadcast";
    from: string;
    name?: string;
    mode?: CallMode;
  },
) {
  const inviteChannel = supabase.channel(`webrtc-user-${recipientId}`);

  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(resolve, 1500);
    inviteChannel.subscribe((status) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR") {
        window.clearTimeout(timeoutId);
        resolve();
      }
    });
  });

  await inviteChannel.send({
    type: "broadcast",
    event,
    payload: {
      ...payload,
      to: recipientId,
    },
  });

  void inviteChannel.unsubscribe();
}

export function CallDock({
  roomId,
  roomType,
  currentUserId,
  currentUserName,
  requestedMode,
  onRequestHandled,
  onStartCallHandlerChange,
  acceptedIncomingCall,
  onAcceptedIncomingCallHandled,
  onActiveCallChange,
}: CallDockProps) {
  const { activeWorkspaceId } = useWorkspaces();
  const [callId, setCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<
    RemoteParticipant[]
  >([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [transcriptStatus, setTranscriptStatus] = useState<string | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldTranscribeRef = useRef(false);
  const transcriptSegmentsRef = useRef<TranscriptSegment[]>([]);
  const speechTranscriptRef = useRef("");
  const speechStartInFlightRef = useRef(false);
  const startCallInFlightRef = useRef(false);
  const restartTranscriptionTimeoutRef = useRef<number | null>(null);
  const mobileTranscriptRecorderRef = useRef<MediaRecorder | null>(null);
  const mobileTranscriptChunksRef = useRef<Blob[]>([]);
  const mobileTranscriptEnabledRef = useRef(false);
  const negotiatingPeersRef = useRef<Set<string>>(new Set());
  const queuedNegotiationPeersRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callIdRef = useRef<string | null>(null);
  const callLogIdRef = useRef<string | null>(null);
  const callStartedAtRef = useRef<number | null>(null);
  const callModeRef = useRef<CallMode | null>(null);
  const callStartedByCurrentUserRef = useRef(false);
  const hasLoggedCurrentCallRef = useRef(false);
  const callParticipantIdsRef = useRef<string[]>([]);
  const callParticipantNamesRef = useRef<Record<string, string>>({});
  const globalInviteRecipientIdsRef = useRef<string[]>([]);
  const endedCallIdsRef = useRef<Set<string>>(new Set());
  const cameraWasEnabledBeforeScreenShareRef = useRef(false);
  const ringtoneAudioRef = useRef<HTMLAudioElement | null>(null);
  const incomingToneAudioContextRef = useRef<AudioContext | null>(null);
  const incomingToneAudioBufferPromiseRef = useRef<Promise<AudioBuffer> | null>(
    null,
  );
  const incomingToneSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const shouldPlayIncomingToneRef = useRef(false);
  const incomingTonePlayTokenRef = useRef(0);
  const roomKey = useMemo(
    () => (roomId && roomType ? `webrtc-${roomType}-${roomId}` : null),
    [roomId, roomType],
  );
  const handleSignalRef = useRef<
    ((payload: SignalPayload) => Promise<void>) | null
  >(null);
  const endCallRef = useRef<
    ((announce?: boolean, saveLog?: boolean) => Promise<void>) | null
  >(null);

  const syncCallParticipants = useCallback(() => {
    const activeLogId = callLogIdRef.current;
    if (!activeLogId) return;

    void (supabase as any)
      .from("call_logs")
      .update({
        participant_ids: callParticipantIdsRef.current,
        participant_names: callParticipantNamesRef.current,
      })
      .eq("id", activeLogId);
  }, []);

  const stopIncomingTone = useCallback(() => {
    shouldPlayIncomingToneRef.current = false;
    incomingTonePlayTokenRef.current += 1;

    const source = incomingToneSourceRef.current;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
      source.disconnect();
      incomingToneSourceRef.current = null;
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
    const primeIncomingToneAudio = () => {
      const AudioContextConstructor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextConstructor) return;

      const context =
        incomingToneAudioContextRef.current ?? new AudioContextConstructor();
      incomingToneAudioContextRef.current = context;
      void context.resume().catch(() => undefined);
    };

    AUDIO_UNLOCK_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, primeIncomingToneAudio, {
        once: true,
        passive: true,
        capture: true,
      });
    });

    return () => {
      AUDIO_UNLOCK_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, primeIncomingToneAudio, {
          capture: true,
        });
      });
    };
  }, []);

  const getIncomingToneAudioBuffer = useCallback(
    async (context: AudioContext) => {
      if (!incomingToneAudioBufferPromiseRef.current) {
        incomingToneAudioBufferPromiseRef.current = fetch(RINGTONE_AUDIO_SRC)
          .then((response) => response.arrayBuffer())
          .then((arrayBuffer) => context.decodeAudioData(arrayBuffer));
      }

      return incomingToneAudioBufferPromiseRef.current;
    },
    [],
  );

  const startIncomingTone = useCallback(() => {
    if (callIdRef.current) {
      console.warn(
        "[Call ringtone] blocked in-room ringtone during active call",
      );
      stopIncomingTone();
      return;
    }

    shouldPlayIncomingToneRef.current = true;
    const playToken = incomingTonePlayTokenRef.current + 1;
    incomingTonePlayTokenRef.current = playToken;

    const AudioContextConstructor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context =
      incomingToneAudioContextRef.current ?? new AudioContextConstructor();
    incomingToneAudioContextRef.current = context;

    const playIncomingTone = async () => {
      if (callIdRef.current) {
        console.warn(
          "[Call ringtone] stopped in-room ringtone before play because call is active",
        );
        stopIncomingTone();
        return;
      }

      if (
        !shouldPlayIncomingToneRef.current ||
        incomingTonePlayTokenRef.current !== playToken
      ) {
        return;
      }

      try {
        await context.resume();
        const buffer = await getIncomingToneAudioBuffer(context);
        if (
          callIdRef.current ||
          !shouldPlayIncomingToneRef.current ||
          incomingTonePlayTokenRef.current !== playToken
        ) {
          return;
        }

        incomingToneSourceRef.current?.stop();
        incomingToneSourceRef.current?.disconnect();

        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0.85;
        source.connect(gain);
        gain.connect(context.destination);
        incomingToneSourceRef.current = source;
        source.start();
      } catch (error) {
        console.warn("Unable to play incoming call ringtone", error);
      }
    };

    void playIncomingTone();
  }, [getIncomingToneAudioBuffer, stopIncomingTone]);

  const registerCallParticipant = useCallback(
    (participantId: string, participantName?: string) => {
      const displayName = participantName?.trim() || "Teammate";
      if (!callParticipantIdsRef.current.includes(participantId)) {
        callParticipantIdsRef.current = [
          ...callParticipantIdsRef.current,
          participantId,
        ];
      }

      callParticipantNamesRef.current = {
        ...callParticipantNamesRef.current,
        [participantId]: displayName,
      };

      syncCallParticipants();
    },
    [syncCallParticipants],
  );

  const createCallLog = useCallback(
    async (mode: CallMode, startedAt: number) => {
      if (!roomId || !roomType || !currentUserId) return;

      const currentDisplayName = currentUserName?.trim() || "You";
      callParticipantIdsRef.current = [currentUserId];
      callParticipantNamesRef.current = {
        [currentUserId]: currentDisplayName,
      };

      const { data, error } = await (supabase as any)
        .from("call_logs")
        .insert({
          workspace_id: activeWorkspaceId ?? null,
          caller_id: currentUserId,
          call_type: mode,
          started_at: new Date(startedAt).toISOString(),
          participant_ids: callParticipantIdsRef.current,
          participant_names: callParticipantNamesRef.current,
          summary_status: "skipped",
          ...(roomType === "channel"
            ? { channel_id: roomId }
            : { dm_id: roomId }),
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to create call log", error);
        return;
      }

      callLogIdRef.current = data?.id ?? null;
    },
    [activeWorkspaceId, currentUserId, currentUserName, roomId, roomType],
  );

  const findActiveCallLog = useCallback(async () => {
    if (!roomId || !roomType) return null;

    const query = (supabase as any)
      .from("call_logs")
      .select("id, participant_ids, participant_names, transcript")
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1);

    const { data, error } =
      roomType === "channel"
        ? await query.eq("channel_id", roomId).maybeSingle()
        : await query.eq("dm_id", roomId).maybeSingle();

    if (error) {
      console.error("[Call transcript] failed to find active call log", error);
      return null;
    }

    console.log("[Call transcript] active call log lookup", {
      callLogId: data?.id ?? null,
      hasTranscript: Boolean(data?.transcript),
    });

    return data as {
      id: string;
      participant_ids?: string[] | null;
      participant_names?: Record<string, string> | null;
      transcript?: string | null;
    } | null;
  }, [roomId, roomType]);

  const createCallEndedChatMessage = useCallback(
    async (content: string) => {
      if (!roomId || !roomType || !currentUserId) return;

      const messageData: Record<string, unknown> = {
        user_id: currentUserId,
        content,
        workspace_id: activeWorkspaceId ?? null,
      };

      const { data, error } =
        roomType === "channel"
          ? await (supabase as any)
              .from("messages")
              .insert({ ...messageData, channel_id: roomId })
              .select(CHANNEL_MESSAGE_SELECT)
              .single()
          : await (supabase as any)
              .from("direct_message_messages")
              .insert({ ...messageData, dm_id: roomId })
              .select(DM_MESSAGE_SELECT)
              .single();

      if (error) {
        console.error("Failed to send call summary message", error);
        return;
      }

      window.dispatchEvent(
        new CustomEvent("message-created", {
          detail: data,
        }),
      );
    },
    [activeWorkspaceId, currentUserId, roomId, roomType],
  );

  const sendSignal = useCallback(
    (payload: Omit<SignalPayload, "from" | "name"> & { name?: string }) => {
      if (!channelRef.current || !currentUserId) return;

      void channelRef.current.send({
        type: "broadcast",
        event: "webrtc-signal",
        payload: {
          ...payload,
          from: currentUserId,
          name: payload.name ?? currentUserName ?? "Teammate",
        } satisfies SignalPayload,
      });
    },
    [currentUserId, currentUserName],
  );

  const sendGlobalInvites = useCallback(
    async (activeCallId: string, mode: CallMode) => {
      if (!roomId || !roomType || !currentUserId) return;

      let recipientIds: string[] = [];

      if (roomType === "channel") {
        const { data, error } = await (supabase as any)
          .from("channel_members")
          .select("user_id")
          .eq("channel_id", roomId)
          .neq("user_id", currentUserId);

        if (error) {
          console.error("Failed to load call invite recipients", error);
          return;
        }

        recipientIds = (data ?? [])
          .map((member: { user_id?: string }) => member.user_id)
          .filter(Boolean) as string[];
      } else {
        const { data, error } = await (supabase as any)
          .from("direct_messages")
          .select("user1_id, user2_id")
          .eq("id", roomId)
          .maybeSingle();

        if (error) {
          console.error("Failed to load DM call recipient", error);
          return;
        }

        const dm = data as { user1_id?: string; user2_id?: string } | null;
        const recipientId =
          dm?.user1_id === currentUserId ? dm.user2_id : dm?.user1_id;
        recipientIds = recipientId ? [recipientId] : [];
      }

      globalInviteRecipientIdsRef.current = recipientIds;

      if (
        callIdRef.current !== activeCallId ||
        endedCallIdsRef.current.has(activeCallId)
      ) {
        await Promise.all(
          recipientIds.map((recipientId) =>
            sendUserCallEvent(recipientId, "global-call-ended", {
              callId: activeCallId,
              from: currentUserId,
            }).catch((error) => {
              console.error(
                "Failed to send late global call ended signal",
                error,
              );
            }),
          ),
        );
        return;
      }

      await Promise.all(
        recipientIds.map((recipientId) =>
          sendUserCallEvent(recipientId, "global-call-invite", {
            callId: activeCallId,
            callLogId: callLogIdRef.current,
            roomId,
            roomType,
            from: currentUserId,
            name: currentUserName?.trim() || "Teammate",
            mode,
          }).catch((error) => {
            console.error("Failed to send global call invite", error);
          }),
        ),
      );
    },
    [currentUserId, currentUserName, roomId, roomType],
  );

  const sendGlobalCallEnded = useCallback(
    (activeCallId: string) => {
      endedCallIdsRef.current.add(activeCallId);
      if (!currentUserId || !globalInviteRecipientIdsRef.current.length) return;

      void Promise.all(
        globalInviteRecipientIdsRef.current.map((recipientId) =>
          sendUserCallEvent(recipientId, "global-call-ended", {
            callId: activeCallId,
            from: currentUserId,
          }).catch((error) => {
            console.error("Failed to send global call ended signal", error);
          }),
        ),
      );
    },
    [currentUserId],
  );

  const removeParticipant = useCallback((participantId: string) => {
    peersRef.current.get(participantId)?.close();
    peersRef.current.delete(participantId);
    setRemoteParticipants((participants) =>
      participants.filter((participant) => participant.id !== participantId),
    );
  }, []);

  const saveTranscriptSnapshot = useCallback(() => {
    const activeLogId = callLogIdRef.current;
    if (!activeLogId) return;

    const transcript = buildTranscriptText(transcriptSegmentsRef.current);
    if (!transcript) return;

    console.log("[Call transcript] saveTranscriptSnapshot", {
      callLogId: activeLogId,
      transcriptLength: transcript.length,
      segmentCount: transcriptSegmentsRef.current.length,
      startedByCurrentUser: callStartedByCurrentUserRef.current,
    });

    if (!callStartedByCurrentUserRef.current) {
      void supabase.functions
        .invoke("save-call-transcript", {
          body: {
            callLogId: activeLogId,
            transcript,
            participantIds: callParticipantIdsRef.current,
            participantNames: callParticipantNamesRef.current,
          },
        })
        .then(({ error }) => {
          if (error) {
            console.error(
              "[Call transcript] participant transcript save failed",
              error,
            );
          }
        });
      return;
    }

    void (supabase as any)
      .from("call_logs")
      .update({
        transcript,
        participant_ids: callParticipantIdsRef.current,
        participant_names: callParticipantNamesRef.current,
        summary: null,
        summary_status: "skipped",
      })
      .eq("id", activeLogId)
      .then(({ error }: { error?: Error | null }) => {
        if (!error) return;

        console.error("Failed to save call transcript", error);
        void supabase.functions
          .invoke("save-call-transcript", {
            body: {
              callLogId: activeLogId,
              transcript,
              participantIds: callParticipantIdsRef.current,
              participantNames: callParticipantNamesRef.current,
            },
          })
          .then(({ error: functionError }) => {
            if (functionError) {
              console.error(
                "[Call transcript] server transcript save failed",
                functionError,
              );
            }
          });
      });
  }, []);

  const transcribeMobileAudio = useCallback(async (audioBlob: Blob) => {
    console.log("[Call transcript] mobile fallback: sending audio to STT", {
      size: audioBlob.size,
      type: audioBlob.type,
    });

    const formData = new FormData();
    const extension = audioBlob.type.includes("mp4") ? "mp4" : "webm";
    formData.append("file", audioBlob, `call-audio.${extension}`);

    const { data, error } = await supabase.functions.invoke(
      "transcribe-call-audio",
      { body: formData },
    );

    if (error) {
      console.error("[Call transcript] mobile fallback STT failed", error);
      return "";
    }

    const transcript = typeof data?.text === "string" ? data.text.trim() : "";
    console.log("[Call transcript] mobile fallback STT result", {
      hasTranscript: Boolean(transcript),
      length: transcript.length,
    });
    return transcript;
  }, []);

  const startMobileTranscriptRecording = useCallback((stream: MediaStream) => {
    const mobileSignals = getMobileTranscriptFallbackSignals();
    mobileTranscriptEnabledRef.current = mobileSignals.enabled;
    mobileTranscriptChunksRef.current = [];

    console.log("[Call transcript] mobile recorder check", {
      enabled: mobileTranscriptEnabledRef.current,
      hasMediaRecorder: typeof MediaRecorder !== "undefined",
      audioTracks: stream.getAudioTracks().length,
      mobileSignals,
    });

    if (
      !mobileTranscriptEnabledRef.current ||
      typeof MediaRecorder === "undefined"
    ) {
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      console.warn("[Call transcript] mobile recorder: no audio track");
      return;
    }

    try {
      const audioStream = new MediaStream(audioTracks);
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(audioStream, { mimeType })
        : new MediaRecorder(audioStream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mobileTranscriptChunksRef.current.push(event.data);
          console.log("[Call transcript] mobile recorder chunk", {
            size: event.data.size,
            chunks: mobileTranscriptChunksRef.current.length,
          });
        }
      };
      recorder.onerror = (event) => {
        console.error("[Call transcript] mobile recorder error", event);
      };
      recorder.onstart = () => {
        console.log("[Call transcript] mobile recorder started", {
          mimeType: recorder.mimeType,
        });
      };
      recorder.onstop = () => {
        console.log("[Call transcript] mobile recorder stopped", {
          chunks: mobileTranscriptChunksRef.current.length,
        });
      };

      mobileTranscriptRecorderRef.current = recorder;
      recorder.start(1000);
    } catch (error) {
      console.error("[Call transcript] mobile recorder could not start", error);
      mobileTranscriptRecorderRef.current = null;
    }
  }, []);

  const flushMobileTranscriptRecording = useCallback(
    async (shouldTranscribe = true) => {
      const recorder = mobileTranscriptRecorderRef.current;

      console.log("[Call transcript] mobile recorder flush", {
        enabled: mobileTranscriptEnabledRef.current,
        hasRecorder: Boolean(recorder),
        recorderState: recorder?.state,
        chunks: mobileTranscriptChunksRef.current.length,
        existingTranscriptLength: buildTranscriptText(
          transcriptSegmentsRef.current,
        ).length,
      });

      if (!mobileTranscriptEnabledRef.current || !recorder) return "";

      if (recorder.state === "recording") {
        await new Promise<void>((resolve) => {
          const previousOnStop = recorder.onstop;
          recorder.onstop = (event) => {
            previousOnStop?.call(recorder, event);
            resolve();
          };
          try {
            recorder.requestData();
            recorder.stop();
          } catch (error) {
            console.error(
              "[Call transcript] mobile recorder stop failed",
              error,
            );
            resolve();
          }
        });
      }

      mobileTranscriptRecorderRef.current = null;

      if (!mobileTranscriptChunksRef.current.length) {
        console.warn("[Call transcript] mobile recorder produced no chunks");
        return "";
      }

      if (!shouldTranscribe) {
        mobileTranscriptChunksRef.current = [];
        return "";
      }

      const type =
        recorder.mimeType ||
        mobileTranscriptChunksRef.current[0]?.type ||
        "audio/webm";
      const audioBlob = new Blob(mobileTranscriptChunksRef.current, { type });
      mobileTranscriptChunksRef.current = [];

      return transcribeMobileAudio(audioBlob);
    },
    [transcribeMobileAudio],
  );

  const addTranscriptSegment = useCallback(
    (segment: TranscriptSegment) => {
      transcriptSegmentsRef.current = [
        ...transcriptSegmentsRef.current,
        segment,
      ];
      setTranscriptStatus("Call audio");
      saveTranscriptSnapshot();
    },
    [saveTranscriptSnapshot],
  );

  const publishLocalTranscriptSnapshot = useCallback(
    (text: string, at = Date.now()) => {
      const normalizedText = text.trim();
      if (!normalizedText || !currentUserId) return;

      const segment = {
        speakerId: currentUserId,
        speakerName: currentUserName?.trim() || "Teammate",
        text: normalizedText,
        at,
      };

      transcriptSegmentsRef.current = [
        ...transcriptSegmentsRef.current.filter(
          (candidate) => candidate.speakerId !== currentUserId,
        ),
        segment,
      ];
      setTranscriptStatus("Call audio");
      saveTranscriptSnapshot();

      if (callIdRef.current) {
        sendSignal({
          type: "transcript-segment",
          callId: callIdRef.current,
          transcriptText: normalizedText,
          transcriptAt: segment.at,
          transcriptIsFull: true,
        });
      }
    },
    [currentUserId, currentUserName, saveTranscriptSnapshot, sendSignal],
  );

  const stopTranscription = useCallback(() => {
    const latestTranscript = speechTranscriptRef.current.trim();
    console.log("[Call transcript] stopTranscription", {
      latestTranscriptLength: latestTranscript.length,
      segmentCount: transcriptSegmentsRef.current.length,
      recognitionActive: Boolean(recognitionRef.current),
    });
    if (latestTranscript) {
      publishLocalTranscriptSnapshot(latestTranscript);
    }

    shouldTranscribeRef.current = false;
    speechStartInFlightRef.current = false;
    if (restartTranscriptionTimeoutRef.current) {
      window.clearTimeout(restartTranscriptionTimeoutRef.current);
      restartTranscriptionTimeoutRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch (error) {
      console.warn("[Call transcript] recognition.stop() failed", error);
    }
    recognitionRef.current = null;
    setTranscriptStatus(null);
  }, [publishLocalTranscriptSnapshot]);

  const startTranscription = useCallback(() => {
    if (mobileTranscriptEnabledRef.current) {
      console.log(
        "[Call transcript] Web Speech skipped because mobile recorder fallback is active",
      );
      shouldTranscribeRef.current = false;
      speechStartInFlightRef.current = false;
      setTranscriptStatus("Call audio");
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    console.log("[Call transcript] startTranscription triggered", {
      supported: Boolean(Recognition),
      mobileFallbackTarget: isMobileTranscriptFallbackTarget(),
      callId: callIdRef.current,
    });
    if (!Recognition) {
      console.warn("[Call transcript] SpeechRecognition not supported");
      setTranscriptStatus(
        "Call transcription is not supported in this browser",
      );
      return;
    }

    if (recognitionRef.current || speechStartInFlightRef.current) {
      console.log("[Call transcript] recognition start skipped", {
        hasRecognition: Boolean(recognitionRef.current),
        startInFlight: speechStartInFlightRef.current,
      });
      return;
    }

    shouldTranscribeRef.current = true;
    speechStartInFlightRef.current = true;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      console.log("[Call transcript] recognition.onresult", {
        resultIndex: event.resultIndex,
        resultCount: event.results.length,
      });
      const result = event.results[event.resultIndex] ?? event.results[0];
      const transcript = result?.[0]?.transcript?.trim();
      if (!transcript) return;

      const nextTranscript = [speechTranscriptRef.current, transcript]
        .filter(Boolean)
        .join(" ")
        .trim();

      speechTranscriptRef.current = nextTranscript;
      publishLocalTranscriptSnapshot(nextTranscript);
    };
    recognition.onerror = (event) => {
      console.warn("[Call transcript] recognition.onerror", event.error);
      if (event.error === "no-speech") return;
      if (["not-allowed", "service-not-allowed"].includes(event.error)) {
        shouldTranscribeRef.current = false;
      }
      setTranscriptStatus(
        event.error === "not-allowed"
          ? "Microphone access is needed for transcription"
          : "Call transcription paused",
      );
    };
    recognition.onend = () => {
      console.log("[Call transcript] recognition.onend", {
        shouldTranscribe: shouldTranscribeRef.current,
        callId: callIdRef.current,
        transcriptLength: speechTranscriptRef.current.length,
        segmentCount: transcriptSegmentsRef.current.length,
      });
      recognitionRef.current = null;
      speechStartInFlightRef.current = false;

      if (!shouldTranscribeRef.current || !callIdRef.current) return;

      console.log(
        "[Call transcript] recognition ended; not auto-restarting to avoid repeated mic access",
      );
    };

    try {
      console.log("[Call transcript] recognition.start()");
      recognition.start();
      recognitionRef.current = recognition;
      setTranscriptStatus("Call audio");
    } catch (error) {
      console.warn("[Call transcript] recognition.start() failed", error);
      setTranscriptStatus("Call transcription could not start");
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      speechStartInFlightRef.current = false;
    } finally {
      if (recognitionRef.current !== recognition) {
        speechStartInFlightRef.current = false;
      }
    }
  }, [publishLocalTranscriptSnapshot]);

  const stopLocalMedia = useCallback(() => {
    const tracksToStop = new Set<MediaStreamTrack>();

    localStreamRef.current
      ?.getTracks()
      .forEach((track) => tracksToStop.add(track));

    if (screenTrackRef.current) {
      tracksToStop.add(screenTrackRef.current);
    }

    peersRef.current.forEach((peer) => {
      peer.getSenders().forEach((sender) => {
        if (sender.track) tracksToStop.add(sender.track);
        void sender.replaceTrack(null).catch(() => undefined);
      });
    });

    tracksToStop.forEach((track) => {
      track.enabled = false;
      if (track.readyState !== "ended") {
        track.stop();
      }
    });

    localStreamRef.current = null;
    screenTrackRef.current = null;
    setLocalStream(null);
    setMicEnabled(false);
    setCameraEnabled(false);
    setScreenSharing(false);
  }, []);

  const finishCallLog = useCallback(async () => {
    const startedAt = callStartedAtRef.current;
    if (
      !startedAt ||
      !callStartedByCurrentUserRef.current ||
      hasLoggedCurrentCallRef.current
    ) {
      console.log("[Call transcript] finishCallLog skipped", {
        hasStartedAt: Boolean(startedAt),
        startedByCurrentUser: callStartedByCurrentUserRef.current,
        alreadyLogged: hasLoggedCurrentCallRef.current,
      });
      return;
    }

    hasLoggedCurrentCallRef.current = true;

    const activeLogId = callLogIdRef.current;
    const endedAtMs = Date.now();
    const endedAt = new Date(endedAtMs).toISOString();
    const existingTranscript = buildTranscriptText(
      transcriptSegmentsRef.current,
    );
    console.log("[Call transcript] finishCallLog before mobile fallback", {
      callLogId: activeLogId,
      existingTranscriptLength: existingTranscript.length,
      segmentCount: transcriptSegmentsRef.current.length,
    });

    if (mobileTranscriptEnabledRef.current) {
      const fallbackTranscript =
        await flushMobileTranscriptRecording(!existingTranscript);
      if (fallbackTranscript && !existingTranscript) {
        publishLocalTranscriptSnapshot(fallbackTranscript);
      }
    }

    const transcript = buildTranscriptText(transcriptSegmentsRef.current);
    console.log("[Call transcript] finishCallLog final transcript", {
      callLogId: activeLogId,
      transcriptLength: transcript.length,
      segmentCount: transcriptSegmentsRef.current.length,
      transcript,
    });
    let finalTranscript = transcript;
    if (!finalTranscript && activeLogId) {
      const { data: existingLog, error: existingLogError } = await (
        supabase as any
      )
        .from("call_logs")
        .select("transcript")
        .eq("id", activeLogId)
        .maybeSingle();

      if (existingLogError) {
        console.error(
          "[Call transcript] failed to load existing transcript",
          existingLogError,
        );
      } else if (existingLog?.transcript) {
        finalTranscript = existingLog.transcript;
        console.log("[Call transcript] using existing saved transcript", {
          length: finalTranscript.length,
        });
      }
    }
    const mode = callModeRef.current;
    const baseUpdate = {
      ended_at: endedAt,
      participant_ids: callParticipantIdsRef.current,
      participant_names: callParticipantNamesRef.current,
      transcript: finalTranscript || null,
    };

    if (!finalTranscript) {
      console.warn("Call ended without a captured transcript.", {
        callLogId: activeLogId,
        callId: callIdRef.current,
        roomId,
        roomType,
      });

      if (activeLogId) {
        const { error } = await (supabase as any)
          .from("call_logs")
          .update({
            ...baseUpdate,
            summary: null,
            summary_status: "skipped",
          })
          .eq("id", activeLogId);

        if (error) console.error("Failed to update call log", error);
      }

      await createCallEndedChatMessage(
        buildCallEndedMessage({
          mode,
          callerName: currentUserName,
          startedAt,
          endedAt: endedAtMs,
          summary: null,
        }),
      );
      return;
    }

    try {
      if (activeLogId) {
        const { error: updateError } = await (supabase as any)
          .from("call_logs")
          .update({
            ...baseUpdate,
            summary: null,
            summary_status: "skipped",
          })
          .eq("id", activeLogId);

        if (updateError)
          console.error("Failed to update call log", updateError);
      }

      await createCallEndedChatMessage(
        buildCallEndedMessage({
          mode,
          callerName: currentUserName,
          startedAt,
          endedAt: endedAtMs,
          summary: null,
        }),
      );
    } catch (error) {
      console.error("Failed to finish call log", error);
    } finally {
      setTranscriptStatus(null);
    }
  }, [
    createCallEndedChatMessage,
    currentUserName,
    flushMobileTranscriptRecording,
    publishLocalTranscriptSnapshot,
    roomId,
    roomType,
  ]);

  const endCall = useCallback(
    async (announce = true, saveLog = announce) => {
      stopTranscription();

      if (
        !callStartedByCurrentUserRef.current &&
        mobileTranscriptEnabledRef.current
      ) {
        const existingTranscript = buildTranscriptText(
          transcriptSegmentsRef.current,
        );
        const fallbackTranscript =
          await flushMobileTranscriptRecording(!existingTranscript);
        if (fallbackTranscript && !existingTranscript) {
          publishLocalTranscriptSnapshot(fallbackTranscript);
        }
      }

      if (announce && callIdRef.current) {
        const shouldEndForAll =
          roomType === "dm" || callStartedByCurrentUserRef.current;
        sendGlobalCallEnded(callIdRef.current);
        sendSignal({
          type: "leave-call",
          callId: callIdRef.current,
          endForAll: shouldEndForAll,
        });
      }

      if (saveLog) {
        await finishCallLog();
      }

      stopIncomingTone();
      stopLocalMedia();
      peersRef.current.forEach((peer) => peer.close());
      peersRef.current.clear();
      negotiatingPeersRef.current.clear();
      queuedNegotiationPeersRef.current.clear();
      callIdRef.current = null;
      callLogIdRef.current = null;
      callStartedAtRef.current = null;
      callModeRef.current = null;
      callStartedByCurrentUserRef.current = false;
      hasLoggedCurrentCallRef.current = false;
      callParticipantIdsRef.current = [];
      callParticipantNamesRef.current = {};
      globalInviteRecipientIdsRef.current = [];
      transcriptSegmentsRef.current = [];
      startCallInFlightRef.current = false;
      setCallId(null);
      setIncomingCall(null);
      setRemoteParticipants([]);
      setIsExpanded(false);
      setStatusText(null);
    },
    [
      finishCallLog,
      flushMobileTranscriptRecording,
      publishLocalTranscriptSnapshot,
      roomType,
      sendGlobalCallEnded,
      sendSignal,
      stopIncomingTone,
      stopLocalMedia,
      stopTranscription,
    ],
  );

  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  const publishMediaState = useCallback(() => {
    const activeCallId = callIdRef.current;
    const stream = localStreamRef.current;
    if (!activeCallId || !stream) return;

    sendSignal({
      type: "media-state",
      callId: activeCallId,
      audioEnabled: stream.getAudioTracks().some((track) => track.enabled),
      videoEnabled: stream.getVideoTracks().some((track) => track.enabled),
      screenSharing: Boolean(screenTrackRef.current),
    });
  }, [sendSignal]);

  const sendPeerOffer = useCallback(
    async (
      peer: RTCPeerConnection,
      participantId: string,
      activeCallId: string,
    ) => {
      if (
        negotiatingPeersRef.current.has(participantId) ||
        peer.signalingState !== "stable"
      ) {
        queuedNegotiationPeersRef.current.add(participantId);
        return;
      }

      negotiatingPeersRef.current.add(participantId);
      try {
        if (peer.signalingState !== "stable") {
          queuedNegotiationPeersRef.current.add(participantId);
          return;
        }

        const offer = await peer.createOffer();
        if (peer.signalingState !== "stable") {
          queuedNegotiationPeersRef.current.add(participantId);
          return;
        }

        await peer.setLocalDescription(offer);
        await sendSignal({
          type: "offer",
          callId: activeCallId,
          to: participantId,
          description: offer,
        });
      } catch (error) {
        console.warn("Unable to negotiate peer connection", {
          participantId,
          signalingState: peer.signalingState,
          error,
        });
      } finally {
        negotiatingPeersRef.current.delete(participantId);
      }
    },
    [sendSignal],
  );

  const createPeer = useCallback(
    (participantId: string, participantName?: string) => {
      const existingPeer = peersRef.current.get(participantId);
      if (existingPeer) return existingPeer;

      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peersRef.current.set(participantId, peer);

      localStreamRef.current?.getTracks().forEach((track) => {
        const stream = localStreamRef.current;
        if (stream) peer.addTrack(track, stream);
      });

      peer.onicecandidate = (event) => {
        if (!event.candidate || !callIdRef.current) return;
        sendSignal({
          type: "ice-candidate",
          callId: callIdRef.current,
          to: participantId,
          candidate: event.candidate.toJSON(),
        });
      };

      peer.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;

        setRemoteParticipants((participants) => {
          const existing = participants.find(
            (participant) => participant.id === participantId,
          );

          if (existing) {
            return participants.map((participant) =>
              participant.id === participantId
                ? { ...participant, stream }
                : participant,
            );
          }

          return [
            ...participants,
            {
              id: participantId,
              name: participantName ?? "Teammate",
              stream,
              audioEnabled: true,
              videoEnabled: stream.getVideoTracks().length > 0,
              screenSharing: false,
            },
          ];
        });
      };

      peer.onnegotiationneeded = () => {
        const activeCallId = callIdRef.current;
        if (!activeCallId) return;

        void sendPeerOffer(peer, participantId, activeCallId);
      };

      peer.onsignalingstatechange = () => {
        const activeCallId = callIdRef.current;
        if (
          !activeCallId ||
          peer.signalingState !== "stable" ||
          !queuedNegotiationPeersRef.current.has(participantId)
        ) {
          return;
        }

        queuedNegotiationPeersRef.current.delete(participantId);
        window.setTimeout(() => {
          if (peer.signalingState === "stable" && callIdRef.current) {
            void sendPeerOffer(peer, participantId, callIdRef.current);
          }
        }, 0);
      };

      peer.onconnectionstatechange = () => {
        if (
          ["closed", "disconnected", "failed"].includes(peer.connectionState)
        ) {
          removeParticipant(participantId);
        }
      };

      return peer;
    },
    [removeParticipant, sendPeerOffer, sendSignal],
  );

  const getLocalMedia = useCallback(
    async (mode: CallMode) => {
      if (!navigator.mediaDevices) {
        throw new DOMException(
          "Media devices are unavailable.",
          "NotAllowedError",
        );
      }

      if (mode === "screen") {
        let displayStream: MediaStream | null = null;

        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false,
          });
          const stream = new MediaStream(displayStream.getVideoTracks());
          const [screenTrack] = stream.getVideoTracks();

          if (screenTrack) {
            screenTrackRef.current = screenTrack;
            screenTrack.onended = () => {
              stream.removeTrack(screenTrack);
              setScreenSharing(false);
              screenTrackRef.current = null;
              setLocalStream(new MediaStream(stream.getTracks()));
              publishMediaState();
            };
          }

          try {
            const { hasAudioInput } = await getAvailableMediaKinds();
            if (hasAudioInput) {
              const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
              });
              audioStream
                .getAudioTracks()
                .forEach((track) => stream.addTrack(track));
            }
          } catch (error) {
            if (!isMissingDeviceError(error)) throw error;
          }

          localStreamRef.current = stream;
          setLocalStream(stream);
          setMicEnabled(stream.getAudioTracks().some((track) => track.enabled));
          setCameraEnabled(false);
          setScreenSharing(true);
          return stream;
        } catch (error) {
          displayStream?.getTracks().forEach((track) => track.stop());
          throw error;
        }
      }

      const { hasAudioInput, hasVideoInput } = await getAvailableMediaKinds();
      const needsAudio = mode === "audio" || hasAudioInput;
      const needsVideo = mode === "video" && hasVideoInput;

      if (mode === "audio" && !hasAudioInput) {
        throw new DOMException("No microphone was found.", "NotFoundError");
      }

      if (mode === "video" && !hasAudioInput && !hasVideoInput) {
        throw new DOMException(
          "No camera or microphone was found.",
          "NotFoundError",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: needsAudio,
        video: needsVideo,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      setMicEnabled(stream.getAudioTracks().some((track) => track.enabled));
      setCameraEnabled(stream.getVideoTracks().length > 0);
      setScreenSharing(false);
      return stream;
    },
    [publishMediaState],
  );

  const startCall = useCallback(
    async (
      mode: CallMode,
      existingCallId?: string,
      existingCallLogId?: string | null,
    ) => {
      if (!roomKey || !currentUserId) return;
      if (startCallInFlightRef.current || callIdRef.current) return;

      startCallInFlightRef.current = true;
      try {
        setStatusText(null);
        stopLocalMedia();
        const nextCallId = existingCallId ?? crypto.randomUUID();
        const stream = await getLocalMedia(mode);
        callStartedAtRef.current = Date.now();
        callModeRef.current = mode;
        callStartedByCurrentUserRef.current = !existingCallId;
        hasLoggedCurrentCallRef.current = false;
        transcriptSegmentsRef.current = [];
        speechTranscriptRef.current = "";
        mobileTranscriptChunksRef.current = [];
        callIdRef.current = nextCallId;
        setCallId(nextCallId);
        setIncomingCall(null);
        stopIncomingTone();
        if (!existingCallId) {
          await createCallLog(mode, callStartedAtRef.current);
        } else if (existingCallLogId) {
          callLogIdRef.current = existingCallLogId;
        } else {
          const activeLog = await findActiveCallLog();
          callLogIdRef.current = activeLog?.id ?? null;
          if (activeLog?.participant_ids?.length) {
            callParticipantIdsRef.current = activeLog.participant_ids;
          }
          if (activeLog?.participant_names) {
            callParticipantNamesRef.current = activeLog.participant_names;
          }
        }
        console.log("[Call transcript] call log attached", {
          callLogId: callLogIdRef.current,
          existingCall: Boolean(existingCallId),
        });
        startMobileTranscriptRecording(stream);
        startTranscription();
        if (existingCallId) {
          sendSignal({
            type: "join-call",
            callId: nextCallId,
            callLogId: callLogIdRef.current ?? undefined,
            name: currentUserName?.trim() || "Teammate",
          });
        } else {
          sendSignal({
            type: "call-invite",
            callId: nextCallId,
            callLogId: callLogIdRef.current ?? undefined,
            mode,
          });
          void sendGlobalInvites(nextCallId, mode);
        }
      } catch (error) {
        if (isMissingDeviceError(error)) {
          console.warn("Unable to start call", error);
        } else {
          console.error("Unable to start call", error);
        }
        const errorMessage = getCallStartErrorMessage(mode, error);
        setStatusText(errorMessage);

        if (existingCallId && isPermissionDeniedError(error)) {
          stopLocalMedia();
          stopIncomingTone();
          return;
        }

        await endCall(false);
        setStatusText(errorMessage);
      } finally {
        startCallInFlightRef.current = false;
      }
    },
    [
      createCallLog,
      currentUserId,
      endCall,
      findActiveCallLog,
      getLocalMedia,
      roomKey,
      sendGlobalInvites,
      sendSignal,
      stopLocalMedia,
      startMobileTranscriptRecording,
      startTranscription,
      stopIncomingTone,
    ],
  );

  const callRemoteParticipant = useCallback(
    async (participantId: string, participantName?: string) => {
      if (!callIdRef.current || participantId === currentUserId) return;

      const peer = createPeer(participantId, participantName);
      await sendPeerOffer(peer, participantId, callIdRef.current);
    },
    [createPeer, currentUserId, sendPeerOffer],
  );

  const handleSignal = useCallback(
    async (payload: SignalPayload) => {
      if (!currentUserId || payload.from === currentUserId) return;
      if (payload.to && payload.to !== currentUserId) return;

      if (payload.type === "call-invite") {
        if (endedCallIdsRef.current.has(payload.callId)) return;

        if (callIdRef.current) {
          stopIncomingTone();
          setIncomingCall(null);
          sendSignal({
            type: "call-busy",
            callId: payload.callId,
            to: payload.from,
          });
          return;
        }

        if (payload.mode) {
          setIncomingCall({
            callId: payload.callId,
            callLogId: payload.callLogId,
            name: payload.name ?? "Teammate",
            mode: payload.mode,
          });
        }
        return;
      }

      if (payload.type === "call-busy") {
        if (payload.callId === callIdRef.current) {
          setStatusText("User is busy");
        }
        return;
      }

      if (payload.type === "join-call") {
        if (payload.callId === callIdRef.current) {
          registerCallParticipant(payload.from, payload.name);
          await callRemoteParticipant(payload.from, payload.name);
        }
        return;
      }

      if (payload.type === "offer") {
        if (payload.callId !== callIdRef.current || !payload.description)
          return;

        const peer = createPeer(payload.from, payload.name);
        await peer.setRemoteDescription(payload.description);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSignal({
          type: "answer",
          callId: payload.callId,
          to: payload.from,
          description: answer,
        });
        return;
      }

      if (payload.type === "answer") {
        if (payload.callId !== callIdRef.current || !payload.description)
          return;
        await peersRef.current
          .get(payload.from)
          ?.setRemoteDescription(payload.description);
        return;
      }

      if (payload.type === "ice-candidate") {
        if (payload.callId !== callIdRef.current || !payload.candidate) return;
        await peersRef.current
          .get(payload.from)
          ?.addIceCandidate(payload.candidate);
        return;
      }

      if (payload.type === "media-state") {
        setRemoteParticipants((participants) =>
          participants.map((participant) =>
            participant.id === payload.from
              ? {
                  ...participant,
                  audioEnabled:
                    payload.audioEnabled ?? participant.audioEnabled,
                  videoEnabled:
                    payload.videoEnabled ?? participant.videoEnabled,
                  screenSharing:
                    payload.screenSharing ?? participant.screenSharing,
                }
              : participant,
          ),
        );
        return;
      }

      if (payload.type === "transcript-segment") {
        if (payload.callId !== callIdRef.current || !payload.transcriptText) {
          return;
        }

        if (payload.transcriptIsFull) {
          transcriptSegmentsRef.current = [
            ...transcriptSegmentsRef.current.filter(
              (segment) => segment.speakerId !== payload.from,
            ),
            {
              speakerId: payload.from,
              speakerName: payload.name ?? "Teammate",
              text: payload.transcriptText,
              at: payload.transcriptAt ?? Date.now(),
            },
          ];
          setTranscriptStatus("Call audio");
          return;
        }

        addTranscriptSegment({
          speakerId: payload.from,
          speakerName: payload.name ?? "Teammate",
          text: payload.transcriptText,
          at: payload.transcriptAt ?? Date.now(),
        });
        return;
      }

      if (payload.type === "leave-call") {
        endedCallIdsRef.current.add(payload.callId);
        setIncomingCall((current) =>
          current?.callId === payload.callId ? null : current,
        );

        if (payload.endForAll && payload.callId === callIdRef.current) {
          await endCall(false, roomType === "dm");
          return;
        }

        if (payload.callId === callIdRef.current) {
          removeParticipant(payload.from);
        }
      }
    },
    [
      addTranscriptSegment,
      callRemoteParticipant,
      createPeer,
      currentUserId,
      endCall,
      registerCallParticipant,
      removeParticipant,
      roomType,
      sendSignal,
      stopIncomingTone,
    ],
  );

  useEffect(() => {
    handleSignalRef.current = handleSignal;
  }, [handleSignal]);

  const toggleMic = () => {
    const nextEnabled = !micEnabled;
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = nextEnabled));
    setMicEnabled(nextEnabled);
    if (nextEnabled) {
      startTranscription();
    } else {
      stopTranscription();
    }
    publishMediaState();
  };

  const toggleCamera = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (cameraEnabled) {
      stream.getVideoTracks().forEach((track) => {
        if (track !== screenTrackRef.current) {
          peersRef.current.forEach((peer) => {
            const sender = peer
              .getSenders()
              .find((candidate) => candidate.track === track);
            if (sender) void sender.replaceTrack(null);
          });
          stream.removeTrack(track);
          track.stop();
        }
      });
      setLocalStream(new MediaStream(stream.getTracks()));
      setCameraEnabled(false);
      publishMediaState();
      return;
    }

    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    const [videoTrack] = cameraStream.getVideoTracks();
    if (!videoTrack) return;

    stream.addTrack(videoTrack);
    peersRef.current.forEach((peer) => {
      const videoSender = getReusableVideoSender(peer);

      if (videoSender) {
        void videoSender.replaceTrack(videoTrack);
        return;
      }

      peer.addTrack(videoTrack, stream);
    });
    setLocalStream(new MediaStream(stream.getTracks()));
    setCameraEnabled(true);
    publishMediaState();
  };

  const stopScreenShare = useCallback(
    async (restoreCamera = cameraWasEnabledBeforeScreenShareRef.current) => {
      const stream = localStreamRef.current;
      const screenTrack = screenTrackRef.current;
      if (!stream || !screenTrack) return;

      screenTrackRef.current = null;
      stream.removeTrack(screenTrack);
      if (screenTrack.readyState !== "ended") {
        screenTrack.stop();
      }

      let replacementCameraTrack: MediaStreamTrack | null = null;
      if (restoreCamera) {
        try {
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          replacementCameraTrack = cameraStream.getVideoTracks()[0] ?? null;
          if (replacementCameraTrack) {
            stream.addTrack(replacementCameraTrack);
          }
        } catch (error) {
          console.error("Unable to restore camera after screen share", error);
          setStatusText(
            "Screen sharing stopped. Turn your camera back on when ready.",
          );
        }
      }

      peersRef.current.forEach((peer) => {
        const screenSender =
          peer
            .getSenders()
            .find((candidate) => candidate.track === screenTrack) ??
          getReusableVideoSender(peer);

        if (screenSender) {
          if (replacementCameraTrack) {
            void screenSender.replaceTrack(replacementCameraTrack);
          } else {
            void screenSender.replaceTrack(null);
          }
          return;
        }

        if (replacementCameraTrack) {
          peer.addTrack(replacementCameraTrack, stream);
        }
      });

      cameraWasEnabledBeforeScreenShareRef.current = false;
      setLocalStream(new MediaStream(stream.getTracks()));
      setCameraEnabled(Boolean(replacementCameraTrack));
      setScreenSharing(false);
      publishMediaState();
    },
    [publishMediaState],
  );

  const toggleScreenShare = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (screenTrackRef.current) {
      await stopScreenShare();
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatusText(
        "Screen sharing is not supported on this device or browser.",
      );
      return;
    }

    let displayStream: MediaStream;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
    } catch (error) {
      console.warn("Unable to start screen share", error);
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setStatusText("Screen sharing permission was blocked.");
      } else {
        setStatusText("Screen sharing could not start on this device.");
      }
      return;
    }

    const [screenTrack] = displayStream.getVideoTracks();
    if (!screenTrack) return;

    cameraWasEnabledBeforeScreenShareRef.current = cameraEnabled;
    const cameraTracks = stream
      .getVideoTracks()
      .filter((track) => track !== screenTrackRef.current);

    screenTrackRef.current = screenTrack;
    cameraTracks.forEach((track) => {
      stream.removeTrack(track);
      track.stop();
    });
    stream.addTrack(screenTrack);

    peersRef.current.forEach((peer) => {
      const cameraSender =
        peer
          .getSenders()
          .find(
            (candidate) =>
              candidate.track?.kind === "video" &&
              cameraTracks.includes(candidate.track),
          ) ?? getReusableVideoSender(peer);

      if (cameraSender) {
        void cameraSender.replaceTrack(screenTrack);
        return;
      }

      peer.addTrack(screenTrack, stream);
    });

    screenTrack.onended = () => {
      void stopScreenShare();
    };
    setLocalStream(new MediaStream(stream.getTracks()));
    setCameraEnabled(false);
    setScreenSharing(true);
    publishMediaState();
  };

  useEffect(() => {
    if (!roomKey) return;

    const realtimeChannel = supabase
      .channel(roomKey)
      .on("broadcast", { event: "webrtc-signal" }, ({ payload }) => {
        void handleSignalRef
          .current?.(payload as SignalPayload)
          .catch((error) => {
            console.warn("Failed to handle WebRTC signal", error);
          });
      })
      .subscribe();

    channelRef.current = realtimeChannel;

    return () => {
      void endCallRef.current?.(false);
      realtimeChannel.unsubscribe();
      if (channelRef.current === realtimeChannel) channelRef.current = null;
    };
  }, [roomKey]);

  useEffect(() => {
    if (incomingCall && callId) {
      setIncomingCall(null);
      stopIncomingTone();
      return undefined;
    }

    if (incomingCall && !callId) {
      startIncomingTone();
      return stopIncomingTone;
    }

    stopIncomingTone();
    return undefined;
  }, [callId, incomingCall?.callId, startIncomingTone, stopIncomingTone]);

  useEffect(() => {
    const handleCallBusy = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          callId?: string;
        }>
      ).detail;

      if (detail?.callId === callIdRef.current) {
        setStatusText("User is busy");
      }
    };

    window.addEventListener("call-busy", handleCallBusy);
    return () => {
      window.removeEventListener("call-busy", handleCallBusy);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopIncomingTone();
      void incomingToneAudioContextRef.current?.close();
      incomingToneAudioContextRef.current = null;
      ringtoneAudioRef.current = null;
    };
  }, [stopIncomingTone]);

  useEffect(() => {
    if (!onStartCallHandlerChange) return undefined;

    onStartCallHandlerChange((mode) => {
      if (mode === "screen" && callIdRef.current) {
        void toggleScreenShare();
        return;
      }

      if (callIdRef.current) return;
      void startCall(mode);
    });

    return () => onStartCallHandlerChange(null);
  }, [onStartCallHandlerChange, startCall, toggleScreenShare]);

  useEffect(() => {
    if (!requestedMode) return;
    onRequestHandled();
    if (requestedMode === "screen" && callIdRef.current) {
      void toggleScreenShare();
      return;
    }
    if (callIdRef.current) return;
    void startCall(requestedMode);
  }, [onRequestHandled, requestedMode, startCall, toggleScreenShare]);

  useEffect(() => {
    if (!acceptedIncomingCall) return;
    onAcceptedIncomingCallHandled?.();
    if (callIdRef.current) return;
    void startCall(
      acceptedIncomingCall.mode,
      acceptedIncomingCall.callId,
      acceptedIncomingCall.callLogId,
    );
  }, [acceptedIncomingCall, onAcceptedIncomingCallHandled, startCall]);

  useEffect(() => {
    onActiveCallChange?.(Boolean(callId));
  }, [callId, onActiveCallChange]);

  if (!roomId || !currentUserId) return null;

  const hasActiveCall = Boolean(callId);
  const mainRemoteParticipant =
    remoteParticipants.find((participant) => participant.screenSharing) ??
    remoteParticipants[0] ??
    null;
  const showLocalScreenShare = screenSharing;
  const showLocalPreview = Boolean(
    localStream && cameraEnabled && !screenSharing,
  );
  const showRemotePreview = Boolean(screenSharing && mainRemoteParticipant);
  const showGroupParticipantGrid =
    roomType === "channel" && !screenSharing && remoteParticipants.length > 0;
  const callDockClassName = isExpanded
    ? "fixed inset-0 z-50 flex flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900"
    : "absolute bottom-4 right-4 z-30 w-[min(92vw,520px)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900";
  const callVideoGridClassName = isExpanded
    ? "relative flex min-h-0 flex-1 overflow-hidden bg-slate-950 p-3"
    : "relative overflow-hidden bg-slate-950 p-2";
  const mainVideoWrapperClassName = isExpanded
    ? "relative h-full min-h-0 w-full overflow-hidden rounded bg-slate-900"
    : "relative aspect-video w-full overflow-hidden rounded bg-slate-900";
  const callVideoClassName = isExpanded
    ? "h-full min-h-0 w-full object-contain"
    : "h-full w-full object-cover";
  const previewClassName = isExpanded
    ? "absolute bottom-5 right-5 z-10 h-36 w-52 overflow-hidden rounded-lg border border-white/20 bg-slate-900 shadow-2xl sm:h-44 sm:w-64"
    : "absolute bottom-4 right-4 z-10 h-20 w-28 overflow-hidden rounded-md border border-white/20 bg-slate-900 shadow-xl";
  const placeholderClassName = isExpanded
    ? "flex h-full min-h-0 items-center justify-center rounded bg-slate-900 px-4 text-center text-sm text-slate-300"
    : "flex aspect-video items-center justify-center rounded bg-slate-900 px-4 text-center text-xs text-slate-300";
  const participantGridClassName = isExpanded
    ? "grid h-full min-h-0 w-full auto-rows-fr grid-cols-1 gap-3 overflow-auto sm:grid-cols-2 xl:grid-cols-3"
    : "grid aspect-video w-full grid-cols-2 gap-2 overflow-hidden";
  const participantTileClassName =
    "relative min-h-0 overflow-hidden rounded bg-slate-900";
  const expandButtonClassName = isExpanded
    ? "absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800"
    : "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800";

  return (
    <>
      {incomingCall && !hasActiveCall ? (
        <div className="absolute left-1/2 top-16 z-30 w-[min(92vw,420px)] -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {incomingCall.name} is calling
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {incomingCall.mode === "audio"
                    ? "Audio call"
                    : incomingCall.mode === "video"
                      ? "Video call"
                      : "Screen share"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopIncomingTone();
                    void startCall(
                      incomingCall.mode,
                      incomingCall.callId,
                      incomingCall.callLogId,
                    );
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                  aria-label="Accept call"
                  title="Accept call"
                >
                  <Phone size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopIncomingTone();
                    setIncomingCall(null);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700"
                  aria-label="Decline call"
                  title="Decline call"
                >
                  <PhoneOff size={18} />
                </button>
              </div>
            </div>
            {statusText ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                {statusText}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasActiveCall ? (
        <div className={callDockClassName}>
          <div className={callVideoGridClassName}>
            <button
              type="button"
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className={expandButtonClassName}
              aria-label={isExpanded ? "Minimize call" : "Expand call"}
              title={isExpanded ? "Minimize call" : "Expand call"}
            >
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            {showGroupParticipantGrid ? (
              <div className={participantGridClassName}>
                {localStream ? (
                  <StreamVideo
                    stream={localStream}
                    muted
                    className="h-full w-full object-cover"
                    wrapperClassName={participantTileClassName}
                    label={
                      micEnabled
                        ? currentUserName?.trim() || "You"
                        : `${currentUserName?.trim() || "You"} muted`
                    }
                  />
                ) : (
                  <div className={placeholderClassName}>You</div>
                )}
                {remoteParticipants.map((participant) => (
                  <RemoteVideo
                    key={participant.id}
                    participant={participant}
                    isExpanded={isExpanded}
                    wrapperClassName={participantTileClassName}
                    labelPrefix=""
                  />
                ))}
              </div>
            ) : showLocalScreenShare ? (
              <StreamVideo
                stream={localStream}
                muted
                className={callVideoClassName}
                wrapperClassName={mainVideoWrapperClassName}
                label="You are sharing"
              />
            ) : mainRemoteParticipant ? (
              <RemoteVideo
                key={mainRemoteParticipant.id}
                participant={mainRemoteParticipant}
                isExpanded={isExpanded}
              />
            ) : (
              <div className={placeholderClassName}>
                Waiting for others to join
              </div>
            )}
            {!showGroupParticipantGrid && showLocalPreview && localStream ? (
              <StreamVideo
                stream={localStream}
                muted
                className="h-full w-full object-cover"
                wrapperClassName={previewClassName}
                label="You"
              />
            ) : null}
            {!showGroupParticipantGrid &&
            showRemotePreview &&
            mainRemoteParticipant ? (
              <RemoteVideo
                participant={mainRemoteParticipant}
                isExpanded={false}
                wrapperClassName={previewClassName}
                labelPrefix=""
              />
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-3 dark:border-slate-700">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Live call
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {transcriptStatus
                  ? transcriptStatus
                  : remoteParticipants.length
                    ? `${remoteParticipants.length + 1} participants`
                    : "Share the room by keeping this chat open"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={toggleMic}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                aria-label={
                  micEnabled ? "Mute microphone" : "Unmute microphone"
                }
                title={micEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                type="button"
                onClick={() => void toggleCamera()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                aria-label={
                  cameraEnabled ? "Turn camera off" : "Turn camera on"
                }
                title={cameraEnabled ? "Turn camera off" : "Turn camera on"}
              >
                {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              <button
                type="button"
                onClick={() => void toggleScreenShare()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                aria-label={
                  screenSharing ? "Stop sharing screen" : "Share screen"
                }
                title={screenSharing ? "Stop sharing screen" : "Share screen"}
              >
                {screenSharing ? (
                  <ScreenShareOff size={18} />
                ) : (
                  <MonitorUp size={18} />
                )}
              </button>
              <button
                type="button"
                onClick={() => endCall()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700"
                aria-label="Leave call"
                title="Leave call"
              >
                <PhoneOff size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {statusText ? (
        <div className="absolute bottom-4 right-4 z-30 max-w-sm rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-lg dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
          {statusText}
        </div>
      ) : null}
    </>
  );
}

function StreamVideo({
  stream,
  muted = false,
  className,
  wrapperClassName,
  label,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className: string;
  wrapperClassName?: string;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    return () => {
      if (videoRef.current?.srcObject === stream) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className={wrapperClassName}>
      <video
        ref={videoRef}
        autoPlay
        muted={muted}
        playsInline
        className={className}
      />
      {label ? (
        <div className="absolute bottom-2 left-2 max-w-[80%] truncate rounded bg-slate-950/70 px-2 py-1 text-xs text-white">
          {label}
        </div>
      ) : null}
    </div>
  );
}

function RemoteVideo({
  participant,
  isExpanded,
  wrapperClassName,
  labelPrefix,
}: {
  participant: RemoteParticipant;
  isExpanded: boolean;
  wrapperClassName?: string;
  labelPrefix?: string;
}) {
  const defaultWrapperClassName = isExpanded
    ? "relative h-full min-h-0 w-full overflow-hidden rounded bg-slate-900"
    : "relative aspect-video w-full overflow-hidden rounded bg-slate-900";
  const participantLabel = `${labelPrefix ?? ""}${participant.name}${
    !participant.audioEnabled ? " muted" : ""
  }${participant.screenSharing ? " sharing" : ""}`;

  return (
    <StreamVideo
      stream={participant.stream}
      className={`h-full w-full ${isExpanded ? "object-contain" : "object-cover"}`}
      wrapperClassName={wrapperClassName ?? defaultWrapperClassName}
      label={participantLabel}
    />
  );
}
