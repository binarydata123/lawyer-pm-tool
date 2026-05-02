import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { clearStoredAdminInviteLinkContext } from "../lib/adminInvites";
import { clearStoredInviteLinkContext } from "../lib/channelInvites";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  emailOtpRequired: boolean;
  emailTwoFactorEnabled: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    adminInviteToken?: string,
    channelInviteToken?: string,
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  verifyEmailOtp: (code: string) => Promise<{ error: Error | null }>;
  signOut: (options?: { preserveEmailOtpChallenge?: boolean }) => Promise<void>;
  profile: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailOtpRequired, setEmailOtpRequired] = useState(false);
  const [pendingOtpEmail, setPendingOtpEmail] = useState<string | null>(null);
  const [emailTwoFactorEnabled, setEmailTwoFactorEnabled] = useState(false);
  const emailOtpChallengePendingRef = useRef(false);
  const [profile, setProfile] = useState<any>(null);
  const syncTwoFactorState = (activeUser: User | null) => {
    setEmailTwoFactorEnabled(
      Boolean(activeUser?.user_metadata?.email_2fa_enabled),
    );

    if (!activeUser) {
      if (!emailOtpChallengePendingRef.current) {
        setEmailOtpRequired(false);
        setPendingOtpEmail(null);
      }
    }
  };

  const clearBrowserUrl = () => {
    if (typeof window === "undefined") return;

    const nextUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  };

  useEffect(() => {
    // Only used to prime the session if onAuthStateChange is slow,
    // but do NOT set loading=false here.
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Only update if onAuthStateChange hasn't fired yet
      setSession((prev) => prev ?? session);
      setUser((prev) => prev ?? session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        syncTwoFactorState(session?.user ?? null);
        setLoading(false); // ← Move loading=false to HERE

        if (session?.user) {
          const supabaseClient = supabase as any;

          // ✅ fetch profile (THIS IS IMPORTANT)
          const { data: profileData } = await supabaseClient
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          setProfile(profileData);

          await supabaseClient
            .from("profiles")
            .update({ is_signedin: true, last_seen: new Date().toISOString() })
            .eq("id", session.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const handleProfileUpdated = (event: Event) => {
      const nextProfile = (
        event as CustomEvent<{
          id?: string;
          full_name?: string | null;
          country_code?: string | null;
          phone_no?: number | null;
          title?: string | null;
          avatar_url?: string | null;
          avatar_color?: string | null;
        }>
      ).detail;

      if (nextProfile?.id !== user.id) return;

      setProfile((current: any) => ({
        ...(current ?? {}),
        ...nextProfile,
      }));
    };

    window.addEventListener("profile-updated", handleProfileUpdated);

    const profileSubscription = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setProfile(payload.new);
        },
      )
      .subscribe();

    const updateLastSeen = async () => {
      await (supabase as any)
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", user.id);
    };

    let interval: ReturnType<typeof setInterval> | null = null;

    const startHeartbeat = () => {
      updateLastSeen();
      interval = setInterval(updateLastSeen, 30000);
    };

    const stopHeartbeat = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const onVisible = () => startHeartbeat();
    const onHidden = () => stopHeartbeat();

    const handleVisibilityChange = () => {
      document.visibilityState === "visible" ? onVisible() : onHidden();
    };

    // Start heartbeat on mount
    startHeartbeat();

    // Named references so they can be removed in cleanup
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", onHidden);
    window.addEventListener("freeze", onHidden);
    window.addEventListener("pageshow", onVisible);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
      profileSubscription.unsubscribe();
      stopHeartbeat();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", onHidden);
      window.removeEventListener("freeze", onHidden);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [user]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    adminInviteToken?: string,
    channelInviteToken?: string,
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            admin_invite_token: adminInviteToken ?? null,
            channel_invite_token: channelInviteToken ?? null,
          },
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user?.user_metadata?.email_2fa_enabled) {
        emailOtpChallengePendingRef.current = true;
        setEmailOtpRequired(true);
        setPendingOtpEmail(email);

        try {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false,
            },
          });

          if (otpError) {
            if (otpError.code === "over_email_send_rate_limit") {
              throw new Error(
                "A code was sent recently. Check your inbox and use the latest email OTP.",
              );
            }

            throw otpError;
          }
        } finally {
          await signOut({ preserveEmailOtpChallenge: true });
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyEmailOtp = async (code: string) => {
    try {
      if (!pendingOtpEmail) {
        throw new Error("No email verification is currently pending.");
      }

      const { error } = await supabase.auth.verifyOtp({
        email: pendingOtpEmail,
        token: code,
        type: "email",
      });

      if (error) throw error;

      setEmailOtpRequired(false);
      setPendingOtpEmail(null);
      emailOtpChallengePendingRef.current = false;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async (options?: { preserveEmailOtpChallenge?: boolean }) => {
    if (user) {
      const supabaseClient = supabase as any;
      await supabaseClient
        .from("profiles")
        .update({ is_signedin: false, last_seen: new Date().toISOString() })
        .eq("id", user.id);
    }
    if (!options?.preserveEmailOtpChallenge) {
      emailOtpChallengePendingRef.current = false;
      setEmailOtpRequired(false);
      setPendingOtpEmail(null);
      clearStoredInviteLinkContext();
      clearStoredAdminInviteLinkContext();
      clearBrowserUrl();
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        emailOtpRequired,
        emailTwoFactorEnabled,
        signUp,
        signIn,
        verifyEmailOtp,
        signOut,
        profile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
