import { useState, useEffect, useRef } from "react";
import { Camera, X, User, Bell, Lock, Trash2, LogOut } from "lucide-react";
import PhoneInput, {
  isValidPhoneNumber,
  parsePhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspaces } from "../../contexts/WorkspaceContext";
import { deleteUploadedFile, uploadFile } from "../../lib/file-upload";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, emailTwoFactorEnabled, signOut } = useAuth();
  const { canManageWorkspace } = useWorkspaces();
  const [activeTab, setActiveTab] = useState<
    "profile" | "notifications" | "privacy" | "logout"
  >("profile");
  const [fullName, setFullName] = useState("");
  const [phoneValue, setPhoneValue] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [email2faLoading, setEmail2faLoading] = useState(false);
  const [email2faStep, setEmail2faStep] = useState<"idle" | "verifying">(
    "idle",
  );
  const [email2faEnabled, setEmail2faEnabled] = useState(false);
  const [email2faError, setEmail2faError] = useState("");
  const [email2faSuccess, setEmail2faSuccess] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const hasInitializedSecurityState = useRef(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const EMAIL_2FA_COOLDOWN_MS = 60_000;

  const getEmail2faStorageKey = (email?: string) =>
    email ? `teamspace-email-2fa-pending:${email}` : "";

  const readEmail2faPendingAt = (email?: string) => {
    if (!email || typeof window === "undefined") return null;

    const raw = window.sessionStorage.getItem(getEmail2faStorageKey(email));
    if (!raw) return null;

    const pendingAt = Number(raw);
    if (!Number.isFinite(pendingAt)) return null;

    return pendingAt;
  };

  const writeEmail2faPendingAt = (email: string) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      getEmail2faStorageKey(email),
      String(Date.now()),
    );
  };

  const clearEmail2faPendingAt = (email?: string) => {
    if (!email || typeof window === "undefined") return;
    window.sessionStorage.removeItem(getEmail2faStorageKey(email));
  };

  useEffect(() => {
    if (!isOpen || !user) {
      hasInitializedSecurityState.current = false;
      return;
    }

    if (!hasInitializedSecurityState.current) {
      hasInitializedSecurityState.current = true;
      loadProfile();
      setEmail2faEnabled(Boolean(user.user_metadata?.email_2fa_enabled));
      const pendingAt = readEmail2faPendingAt(user.email ?? undefined);
      if (pendingAt && Date.now() - pendingAt < EMAIL_2FA_COOLDOWN_MS) {
        setEmail2faStep("verifying");
        setEmail2faSuccess(
          "We already sent a verification code. Check your email and enter it below.",
        );
      } else {
        clearEmail2faPendingAt(user.email ?? undefined);
        setEmailOtp("");
        setEmail2faStep("idle");
        setEmail2faError("");
        setEmail2faSuccess("");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setPasswordSuccess("");
      setDeleteConfirmText("");
      setDeleteError("");
      setAvatarError("");
      setProfileError("");
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    setEmail2faEnabled(emailTwoFactorEnabled);
  }, [emailTwoFactorEnabled]);

  useEffect(() => {
    if (!canManageWorkspace && activeTab === "privacy") {
      setActiveTab("profile");
    }
  }, [activeTab, canManageWorkspace]);

  const loadProfile = async () => {
    if (!user) return;

    const supabaseClient = supabase as any;
    const { data } = await supabaseClient
      .from("profiles")
      .select("full_name, country_code, phone_no, title, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setFullName(data.full_name || "");
      setPhoneValue(
        data.country_code && data.phone_no
          ? `${data.country_code}${data.phone_no}`
          : undefined,
      );
      setTitle(data.title || "");
      setAvatarUrl(data.avatar_url || null);
    }
  };

  const emitProfileUpdated = (nextProfile: {
    full_name?: string | null;
    country_code?: string | null;
    phone_no?: number | null;
    title?: string | null;
    avatar_url?: string | null;
  }) => {
    if (typeof window === "undefined" || !user) return;

    window.dispatchEvent(
      new CustomEvent("profile-updated", {
        detail: {
          id: user.id,
          full_name: nextProfile.full_name ?? fullName,
          country_code: nextProfile.country_code ?? getPhoneParts().countryCode,
          phone_no: nextProfile.phone_no ?? getPhoneParts().phoneNo,
          title: nextProfile.title ?? title,
          avatar_url: nextProfile.avatar_url ?? null,
        },
      }),
    );
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setAvatarError("");

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    setAvatarUploading(true);

    try {
      const previousAvatarUrl = avatarUrl;
      const result = await uploadFile(file, "avatars");
      const supabaseClient = supabase as any;
      const { error } = await supabaseClient
        .from("profiles")
        .update({ avatar_url: result.url })
        .eq("id", user.id);

      if (error) throw error;

      setAvatarUrl(result.url);
      emitProfileUpdated({ avatar_url: result.url });
      if (previousAvatarUrl) {
        void deleteUploadedFile(previousAvatarUrl).catch((deleteError) => {
          console.warn("Failed to delete previous avatar", deleteError);
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1000);
    } catch (error) {
      setAvatarError((error as Error).message);
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !avatarUrl) return;

    const previousAvatarUrl = avatarUrl;
    setAvatarRemoving(true);
    setAvatarError("");

    try {
      const supabaseClient = supabase as any;
      const { error } = await supabaseClient
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (error) throw error;

      setAvatarUrl(null);
      emitProfileUpdated({ avatar_url: null });
      void deleteUploadedFile(previousAvatarUrl).catch((deleteError) => {
        console.warn("Failed to delete removed avatar", deleteError);
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1000);
    } catch (error) {
      setAvatarError((error as Error).message);
    } finally {
      setAvatarRemoving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setProfileError("");

    if (phoneValue && !isValidPhoneNumber(phoneValue)) {
      setProfileError("Enter a valid phone number for the selected country.");
      return;
    }

    const phoneParts = getPhoneParts();

    setLoading(true);
    const supabaseClient = supabase as any;
    const { error } = await supabaseClient
      .from("profiles")
      .update({
        full_name: fullName,
        country_code: phoneParts.countryCode,
        phone_no: phoneParts.phoneNo,
        title,
        avatar_url: avatarUrl,
      })
      .eq("id", user.id);

    setLoading(false);

    if (!error) {
      emitProfileUpdated({
        full_name: fullName,
        country_code: phoneParts.countryCode,
        phone_no: phoneParts.phoneNo,
        title,
        avatar_url: avatarUrl,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 1000);
    }
  };

  const getPhoneParts = () => {
    if (!phoneValue) {
      return { countryCode: "", phoneNo: null };
    }

    const phoneNumber = parsePhoneNumber(phoneValue);

    if (!phoneNumber) {
      return { countryCode: "", phoneNo: null };
    }

    return {
      countryCode: `+${phoneNumber.countryCallingCode}`,
      phoneNo: Number(phoneNumber.nationalNumber),
    };
  };

  const handlePhoneValueChange = (nextPhoneValue?: string) => {
    setPhoneValue(nextPhoneValue);
    setProfileError("");
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.email) return;

    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("Choose a different password than your current one.");
      return;
    }

    setPasswordLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError((error as Error).message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSendEmail2faOtp = async () => {
    if (!user?.email) return;

    const pendingAt = readEmail2faPendingAt(user.email);
    if (pendingAt && Date.now() - pendingAt < EMAIL_2FA_COOLDOWN_MS) {
      setEmail2faStep("verifying");
      setEmail2faError("");
      setEmail2faSuccess(
        "We already sent a verification code. Check your inbox and enter it below.",
      );
      return;
    }

    setEmail2faLoading(true);
    setEmail2faError("");
    setEmail2faSuccess("");

    try {
      const { error } = await supabase.auth.reauthenticate();

      if (error) throw error;

      writeEmail2faPendingAt(user.email);
      setEmail2faStep("verifying");
      setEmail2faSuccess(
        "We sent a verification code to your email. Enter it below to enable 2FA.",
      );
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes("over_email_send_rate_limit")) {
        writeEmail2faPendingAt(user.email);
        setEmail2faStep("verifying");
        setEmail2faError("");
        setEmail2faSuccess(
          "A code was already sent recently. Check your inbox and use that code.",
        );
      } else {
        setEmail2faError(message);
      }
    } finally {
      setEmail2faLoading(false);
    }
  };

  const handleVerifyEmail2faOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.email) return;

    setEmail2faError("");
    setEmail2faSuccess("");

    if (emailOtp.length !== 6) {
      setEmail2faError("Enter the 6-digit OTP sent to your email.");
      return;
    }

    setEmail2faLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata || {}),
          email_2fa_enabled: true,
        },
        nonce: emailOtp,
      });

      if (updateError) throw updateError;

      setEmail2faEnabled(true);
      setEmailOtp("");
      setEmail2faStep("idle");
      clearEmail2faPendingAt(user.email);
      setEmail2faSuccess("Email-based 2FA is now enabled.");
    } catch (error) {
      setEmail2faError((error as Error).message);
    } finally {
      setEmail2faLoading(false);
    }
  };

  const handleDisableEmail2fa = async () => {
    if (!user) return;

    setEmail2faLoading(true);
    setEmail2faError("");
    setEmail2faSuccess("");

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata || {}),
          email_2fa_enabled: false,
        },
      });

      if (error) throw error;

      setEmail2faEnabled(false);
      setEmailOtp("");
      setEmail2faStep("idle");
      clearEmail2faPendingAt(user.email);
      setEmail2faSuccess("Email-based 2FA has been disabled.");
    } catch (error) {
      setEmail2faError((error as Error).message);
    } finally {
      setEmail2faLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setDeleteError("Exactly Type DELETE to confirm account removal.");
      setTimeout(() => {
        setDeleteError("");
      }, 1000);
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session expired. Please sign in again and retry.",
        );
      }

      const { error } = await supabase.functions.invoke("delete-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      await supabase.auth.signOut();
      onClose();
    } catch (error) {
      setDeleteError((error as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    ...(canManageWorkspace
      ? [{ id: "privacy" as const, label: "Privacy", icon: Lock }]
      : []),
    { id: "logout" as const, label: "Logout", icon: LogOut },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex h-[65vh] min-h-[520px] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl max-sm:h-[calc(100dvh-2rem)] max-sm:min-h-0">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-black rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
          <div className="w-full shrink-0 bg-white px-2 pt-2 sm:w-48 sm:border-b-0 sm:border-r sm:bg-slate-50 sm:p-4">
            <nav className="grid grid-cols-4 items-end gap-1 sm:flex sm:flex-col sm:items-stretch sm:space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex min-w-0 items-center justify-center gap-1 rounded-t-xl border px-1.5 py-2 text-[11px] transition-colors sm:justify-start sm:gap-3 sm:rounded-lg sm:border-0 sm:px-3 sm:text-base ${
                      activeTab === tab.id
                        ? "z-10 border-slate-200 border-b-white bg-white text-primary-700 font-medium shadow-sm sm:bg-primary-100"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white sm:bg-transparent sm:text-slate-700 sm:hover:bg-slate-100"
                    }`}
                  >
                    <Icon size={16} className="shrink-0 sm:h-[18px] sm:w-[18px]" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === "profile" && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Profile Settings
                </h3>
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Profile Photo
                    </label>
                    <div className="space-y-2">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <div className="flex items-center">
                        <div className="group/avatar relative h-[72px] w-[72px] shrink-0">
                          <div className="relative h-[72px] w-[72px] overflow-hidden rounded-full ring-1 ring-slate-200">
                            <div className="flex h-full w-full items-center justify-center bg-primary-600 text-xl font-bold text-white">
                              {(fullName || user?.email || "?")
                                .charAt(0)
                                .toUpperCase()}
                              {avatarUrl && (
                                <img
                                  src={avatarUrl}
                                  alt="Profile"
                                  className="absolute inset-0 h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                  }}
                                />
                              )}
                            </div>

                            {(avatarUploading || avatarRemoving) && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={avatarUploading || avatarRemoving}
                            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
                            title="Upload photo"
                            aria-label="Upload photo"
                          >
                            <Camera size={14} />
                          </button>

                          {avatarUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              disabled={avatarUploading || avatarRemoving}
                              className="absolute -left-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white opacity-100 shadow-sm transition-all hover:bg-red-700 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:opacity-50 sm:opacity-0 sm:group-hover/avatar:opacity-100"
                              title="Remove photo"
                              aria-label="Remove photo"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      {avatarError ? (
                        <p className="text-xs text-red-600">{avatarError}</p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          {avatarUploading
                            ? "Uploading photo..."
                            : avatarRemoving
                              ? "Removing photo..."
                              : "JPG, PNG, GIF, WebP, or SVG up to 10 MB"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Email cannot be changed
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-2 border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter your title"
                        className="w-full px-4 py-2 border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Phone No
                      </label>
                      <PhoneInput
                        international
                        defaultCountry="IN"
                        value={phoneValue}
                        onChange={handlePhoneValueChange}
                        className="w-full px-4 py-2 border border-slate-300 text-slate-900 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500"
                        numberInputProps={{
                          className:
                            "w-full bg-transparent text-slate-900 outline-none",
                        }}
                        countrySelectProps={{
                          className:
                            "mr-3 bg-transparent text-slate-900 outline-none",
                        }}
                      />
                      {profileError ? (
                        <p className="text-xs text-red-600 mt-1">
                          {profileError}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-1">
                          Select a country and enter the phone number.
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary-600 text-white py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "notifications" && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Notification Preferences
                </h3>
                <form onSubmit={handleSaveNotifications} className="space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">
                          Email Notifications
                        </p>
                        <p className="text-sm text-slate-600">
                          Receive notifications via email
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailNotifications}
                          onChange={(e) =>
                            setEmailNotifications(e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">
                          Push Notifications
                        </p>
                        <p className="text-sm text-slate-600">
                          Receive push notifications in browser
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pushNotifications}
                          onChange={(e) =>
                            setPushNotifications(e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="bg-primary-600 text-white py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    Save Preferences
                  </button>
                </form>
              </div>
            )}

            {activeTab === "privacy" && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Privacy & Security
                </h3>
                <div className="space-y-5">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900 mb-2">
                      Change Password
                    </p>
                    <p className="text-sm text-slate-600 mb-4">
                      Update your password to keep your account secure
                    </p>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-4 py-2 border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          minLength={6}
                          placeholder="Enter new password"
                          className="w-full px-4 py-2 border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          minLength={6}
                          placeholder="Confirm new password"
                          className="w-full px-4 py-2 border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      {passwordError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          {passwordError}
                        </div>
                      )}

                      {passwordSuccess && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                          {passwordSuccess}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
                      >
                        {passwordLoading ? "Updating..." : "Change Password"}
                      </button>
                    </form>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900 mb-2">
                      Two-Factor Authentication
                    </p>
                    <p className="text-sm text-slate-600 mb-4">
                      Send a one-time code to your email whenever you sign in
                    </p>

                    <div className="mb-4 p-3 bg-white border border-slate-200 rounded-lg">
                      <p className="text-sm font-medium text-slate-900">
                        Status:{" "}
                        {email2faEnabled
                          ? "Enabled"
                          : email2faStep === "verifying"
                            ? "Pending verification"
                            : "Disabled"}
                      </p>
                      {user?.email && (
                        <p className="text-xs text-slate-500 mt-1">
                          OTPs will be sent to {user.email}
                        </p>
                      )}
                    </div>

                    {email2faError && (
                      <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {email2faError}
                      </div>
                    )}

                    {email2faSuccess && (
                      <div className="p-3 mb-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        {email2faSuccess}
                      </div>
                    )}

                    {email2faEnabled ? (
                      <button
                        type="button"
                        onClick={handleDisableEmail2fa}
                        disabled={email2faLoading}
                        className="bg-slate-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
                      >
                        {email2faLoading ? "Updating..." : "Disable 2FA"}
                      </button>
                    ) : email2faStep === "verifying" ? (
                      <form
                        onSubmit={handleVerifyEmail2faOtp}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Email OTP
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={emailOtp}
                            onChange={(e) =>
                              setEmailOtp(
                                e.target.value.replace(/\D/g, "").slice(0, 6),
                              )
                            }
                            placeholder="123456"
                            minLength={6}
                            maxLength={6}
                            className="w-full px-4 py-2 border border-slate-300 text-slate-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 tracking-[0.3em]"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={email2faLoading}
                            className="bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
                          >
                            {email2faLoading ? "Verifying..." : "Verify OTP"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEmail2faStep("idle");
                              setEmailOtp("");
                              setEmail2faError("");
                              setEmail2faSuccess("");
                            }}
                            disabled={email2faLoading}
                            className="bg-slate-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendEmail2faOtp}
                        disabled={email2faLoading}
                        className="bg-slate-200 text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
                      >
                        {email2faLoading ? "Sending..." : "Enable 2FA"}
                      </button>
                    )}
                  </div>

                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-medium text-red-900 mb-2">
                      Delete Account
                    </p>
                    <p className="text-sm text-red-700 mb-4">
                      Permanently delete your account, messages, and files
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-red-900 mb-2">
                          Type DELETE to confirm
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="DELETE"
                          className="w-full px-4 py-2 border border-red-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-red-400 focus:border-red-400"
                        />
                      </div>

                      {deleteError && (
                        <div className="p-3 bg-white border border-red-200 rounded-lg text-sm text-red-700">
                          {deleteError}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={
                          deleteLoading || deleteConfirmText.trim() === ""
                        }
                        className="inline-flex items-center gap-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                        {deleteLoading ? "Deleting..." : "Delete Account"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* {activeTab === "appearance" && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  Appearance Settings
                </h3>
                <form onSubmit={handleSaveAppearance} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Theme
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="radio"
                          name="theme"
                          value="light"
                          checked={theme === "light"}
                          onChange={(e) =>
                            setTheme(e.target.value as "light" | "dark")
                          }
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-3 font-medium text-slate-900">
                          Light Mode
                        </span>
                      </label>
                      <label className="flex items-center p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="radio"
                          name="theme"
                          value="dark"
                          checked={theme === "dark"}
                          onChange={(e) =>
                            setTheme(e.target.value as "light" | "dark")
                          }
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-3 font-medium text-slate-900">
                          Dark Mode
                        </span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="bg-primary-600 text-white py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    Save Appearance
                  </button>
                </form>
              </div>
            )} */}
            {activeTab === "logout" && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 sm:px-6">
                {/* Icon */}
                <div className="w-14 h-14 flex items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V4"
                    />
                  </svg>
                </div>

                {/* Title */}
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
                  Log out of your account?
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-600 max-w-xs mb-6">
                  You’ll be signed out from this device. You can log back in
                  anytime.
                </p>

                {/* Actions */}
                <div className="flex w-full sm:w-auto gap-3">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => signOut()}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="absolute top-20 right-6 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in">
            Settings saved successfully!
          </div>
        )}
      </div>
    </div>
  );
}
