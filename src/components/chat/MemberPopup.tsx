import { useEffect, useRef } from "react";
import { Crown, Mail } from "lucide-react";
import { isOnline } from "../utils/isOnline";

export interface MemberPopupProfile {
  id: string;
  full_name: string;
  email: string;
  is_signedin: boolean;
  workspaceRole?: "owner" | "admin" | "member" | "guest" | null;
  avatar_url?: string | null;
  last_seen?: string;
  avatar_color?: string | null;
  currentChannelJoinedAt?: string | null;
  workspaceJoinedAt?: string | null;
  groupCount?: number | null;
}

export interface MemberPopupPosition {
  top: number;
  left: number;
}

export const MEMBER_POPUP_WIDTH = 352;
export const MEMBER_POPUP_HEIGHT = 290;
export const MEMBER_POPUP_GAP = 12;

export const getMemberPopupPosition = (rect: DOMRect): MemberPopupPosition => {
  const maxLeft = Math.max(16, window.innerWidth - MEMBER_POPUP_WIDTH - 16);
  const centeredLeft = rect.left + rect.width / 2 - MEMBER_POPUP_WIDTH / 2;
  const left = Math.min(maxLeft, Math.max(16, centeredLeft));
  const top = Math.max(16, rect.top - MEMBER_POPUP_HEIGHT - MEMBER_POPUP_GAP);

  return { top, left };
};

interface MemberPopupProps {
  member: MemberPopupProfile;
  position: MemberPopupPosition;
  currentUserId?: string;
  isStartingConvo?: boolean;
  isLoadingDetails?: boolean;
  onStartConversation: () => void;
  onClose: () => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return "Not available";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "Not available";

  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export function MemberPopup({
  member,
  position,
  currentUserId,
  isStartingConvo = false,
  isLoadingDetails = false,
  onStartConversation,
  onClose,
}: MemberPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const isWorkspaceOwner = member.workspaceRole === "owner";
  const statusLabel = isWorkspaceOwner
    ? "Owner of this workspace"
    : isOnline(member.is_signedin, member.last_seen || null)
      ? "Online now"
      : "Offline";

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-[22rem] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 flex-shrink-0">
          <div
            className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white"
            style={{
              backgroundColor: member.avatar_color || "#3178C6",
            }}
          >
            {member.full_name?.charAt(0).toUpperCase() || "?"}
            {member.avatar_url && (
              <img
                src={member.avatar_url}
                alt={member.full_name || "Member"}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>
          <span
            className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
              isOnline(member.is_signedin, member.last_seen || null)
                ? "bg-green-500"
                : "bg-slate-400"
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {member.full_name}
            </p>
            {isWorkspaceOwner && (
              <Crown size={14} className="flex-shrink-0 text-yellow-500" />
            )}
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">{member.email}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            {statusLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-sm">
          <span className="text-slate-500">Joined this group</span>
          <span className="text-right font-medium text-slate-900">
            {isLoadingDetails
              ? "Loading..."
              : formatDate(member.currentChannelJoinedAt)}
          </span>

          <span className="text-slate-500">Groups added</span>
          <span className="text-right font-medium text-slate-900">
            {isLoadingDetails
              ? "Loading..."
              : member.groupCount?.toString() ?? "Not available"}
          </span>

          <span className="text-slate-500">Company member since</span>
          <span className="text-right font-medium text-slate-900">
            {isLoadingDetails
              ? "Loading..."
              : formatDate(member.workspaceJoinedAt)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onStartConversation}
        disabled={isStartingConvo || member.id === currentUserId}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Mail size={16} />
        {member.id === currentUserId
          ? "This is you"
          : isStartingConvo
            ? "Starting..."
            : "Start A Conversation"}
      </button>
    </div>
  );
}
