const INVITE_STORAGE_KEY = "teamspace:pending-channel-invite";
const INVITE_MESSAGE_PREFIX = "__TEAMSPACE_CHANNEL_INVITE__:";

export interface InviteLinkContext {
  token: string;
  email?: string;
}

export interface InviteMessagePayload {
  token: string;
  channelId: string;
  channelName: string;
  invitedByName: string;
  invitedById?: string;
}

const isBrowser = typeof window !== "undefined";

export function getInviteLinkContextFromUrl(): InviteLinkContext | null {
  if (!isBrowser) return null;

  const params = new URLSearchParams(window.location.search);
  const token = params.get("invite");

  if (!token) return null;

  const email = params.get("email") || undefined;
  return { token, email };
}

export function stashInviteLinkContextFromUrl() {
  if (!isBrowser) return;

  const inviteContext = getInviteLinkContextFromUrl();
  if (!inviteContext) return;

  window.sessionStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(inviteContext));

  const params = new URLSearchParams(window.location.search);
  params.delete("invite");
  params.delete("email");

  const nextUrl = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  window.history.replaceState({}, "", nextUrl);
}

export function getStoredInviteLinkContext(): InviteLinkContext | null {
  if (!isBrowser) return null;

  const rawValue = window.sessionStorage.getItem(INVITE_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as InviteLinkContext;
  } catch {
    window.sessionStorage.removeItem(INVITE_STORAGE_KEY);
    return null;
  }
}

export function clearStoredInviteLinkContext() {
  if (!isBrowser) return;
  window.sessionStorage.removeItem(INVITE_STORAGE_KEY);
}

export function buildChannelInviteLink(token: string, email: string) {
  const inviteUrl = new URL(window.location.origin + window.location.pathname);
  inviteUrl.searchParams.set("invite", token);
  inviteUrl.searchParams.set("email", email);
  return inviteUrl.toString();
}

export function createChannelInviteMessageContent(payload: InviteMessagePayload) {
  return `${INVITE_MESSAGE_PREFIX}${encodeURIComponent(JSON.stringify(payload))}`;
}

export function parseChannelInviteMessageContent(content: string) {
  if (!content.startsWith(INVITE_MESSAGE_PREFIX)) return null;

  try {
    const payload = JSON.parse(
      decodeURIComponent(content.slice(INVITE_MESSAGE_PREFIX.length)),
    ) as InviteMessagePayload;

    if (!payload.token || !payload.channelId || !payload.channelName) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
