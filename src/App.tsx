import { useAuth } from "./contexts/AuthContext";
import { AuthForm } from "./components/auth/AuthForm";
import { MainApp } from "./pages/MainApp";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  clearStoredInviteLinkContext,
  getInviteLinkContextFromUrl,
  getStoredInviteLinkContext,
  stashInviteLinkContextFromUrl,
} from "./lib/channelInvites";
import {
  clearStoredAdminInviteLinkContext,
  getAdminInviteLinkContextFromUrl,
  getStoredAdminInviteLinkContext,
  stashAdminInviteLinkContextFromUrl,
} from "./lib/adminInvites";
import {
  ACTIVE_WORKSPACE_STORAGE_KEY,
  useWorkspaces,
} from "./contexts/WorkspaceContext";

const THEME_STORAGE_KEY = "teamspace-theme";

function App() {
  const { user, loading, emailOtpRequired } = useAuth();
  const { refreshWorkspaces, setActiveWorkspaceId } = useWorkspaces();
  const [inviteAccountMessage, setInviteAccountMessage] = useState<
    string | null
  >(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;

    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
  });

  useEffect(() => {
    const channelInvite = getInviteLinkContextFromUrl();
    const adminInvite = getAdminInviteLinkContextFromUrl();
    const storedChannelInvite = getStoredInviteLinkContext();
    const storedAdminInvite = getStoredAdminInviteLinkContext();
    const inviteContext =
      adminInvite ?? channelInvite ?? storedAdminInvite ?? storedChannelInvite;
    const invitedEmail = inviteContext?.email?.toLowerCase();
    const currentEmail = user?.email?.toLowerCase();

    if (user && invitedEmail && currentEmail && invitedEmail !== currentEmail) {
      clearStoredInviteLinkContext();
      clearStoredAdminInviteLinkContext();
      setInviteAccountMessage(
        "You are already logged in. To access this invite, you need to log out first.",
      );

      const params = new URLSearchParams(window.location.search);
      params.delete("invite");
      params.delete("admin_invite");
      params.delete("email");
      const nextUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
      return;
    }

    stashInviteLinkContextFromUrl();
    stashAdminInviteLinkContextFromUrl();
    setInviteAccountMessage(null);
  }, [user?.email]);

  useEffect(() => {
    const inviteContext = getStoredAdminInviteLinkContext();

    if (!user || !inviteContext?.token) return;

    const invitedEmail = inviteContext.email?.toLowerCase();
    const currentEmail = user.email?.toLowerCase();

    if (invitedEmail && currentEmail && invitedEmail !== currentEmail) {
      return;
    }

    let cancelled = false;

    const acceptWorkspaceInvite = async () => {
      const { data: acceptedWorkspaceId, error } = await (supabase as any).rpc(
        "accept_workspace_invite",
        {
          p_invite_token: inviteContext.token,
        },
      );

      if (cancelled) return;

      if (error) {
        if (
          error.message?.includes("already been accepted") ||
          error.message?.includes("duplicate key")
        ) {
          clearStoredAdminInviteLinkContext();
          return;
        }

        setInviteAccountMessage(error.message);
        return;
      }

      if (acceptedWorkspaceId) {
        window.localStorage.setItem(
          ACTIVE_WORKSPACE_STORAGE_KEY,
          acceptedWorkspaceId,
        );
        await refreshWorkspaces(acceptedWorkspaceId);

        if (!cancelled) {
          setActiveWorkspaceId(acceptedWorkspaceId);
        }
      }

      clearStoredAdminInviteLinkContext();
    };

    void acceptWorkspaceInvite();

    return () => {
      cancelled = true;
    };
  }, [refreshWorkspaces, setActiveWorkspaceId, user?.email, user?.id]);

  useEffect(() => {
    if (!inviteAccountMessage) return;

    const timeoutId = window.setTimeout(() => {
      setInviteAccountMessage(null);
    }, 6000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [inviteAccountMessage]);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.toggle("dark", isDarkMode);
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      isDarkMode ? "dark" : "light",
    );
  }, [isDarkMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 transition-colors dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 animate-pulse">
            <span className="text-2xl font-bold text-white">LPM</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  return user && !emailOtpRequired ? (
    <>
      {inviteAccountMessage && (
        <div className="fixed inset-x-0 top-0 z-[100] border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900 shadow-sm">
          {inviteAccountMessage}
        </div>
      )}
      <MainApp isDarkMode={isDarkMode} onToggleDarkMode={setIsDarkMode} />
    </>
  ) : (
    <AuthForm />
  );
}

export default App;
