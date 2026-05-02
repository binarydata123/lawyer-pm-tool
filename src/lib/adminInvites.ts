const ADMIN_INVITE_STORAGE_KEY = "teamspace:pending-admin-invite";

export interface AdminInviteLinkContext {
  token: string;
  email?: string;
}

const isBrowser = typeof window !== "undefined";

export function getAdminInviteLinkContextFromUrl(): AdminInviteLinkContext | null {
  if (!isBrowser) return null;

  const params = new URLSearchParams(window.location.search);
  const token = params.get("admin_invite");

  if (!token) return null;

  return {
    token,
    email: params.get("email") || undefined,
  };
}

export function stashAdminInviteLinkContextFromUrl() {
  if (!isBrowser) return;

  const inviteContext = getAdminInviteLinkContextFromUrl();
  if (!inviteContext) return;

  window.sessionStorage.setItem(
    ADMIN_INVITE_STORAGE_KEY,
    JSON.stringify(inviteContext),
  );

  const params = new URLSearchParams(window.location.search);
  params.delete("admin_invite");
  params.delete("email");

  const nextUrl = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  window.history.replaceState({}, "", nextUrl);
}

export function getStoredAdminInviteLinkContext(): AdminInviteLinkContext | null {
  if (!isBrowser) return null;

  const rawValue = window.sessionStorage.getItem(ADMIN_INVITE_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as AdminInviteLinkContext;
  } catch {
    window.sessionStorage.removeItem(ADMIN_INVITE_STORAGE_KEY);
    return null;
  }
}

export function clearStoredAdminInviteLinkContext() {
  if (!isBrowser) return;
  window.sessionStorage.removeItem(ADMIN_INVITE_STORAGE_KEY);
}
