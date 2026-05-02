import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { LogIn, UserPlus } from "lucide-react";
import { getStoredInviteLinkContext } from "../../lib/channelInvites";
import { getStoredAdminInviteLinkContext } from "../../lib/adminInvites";
import InstallButton from "../chat/InstallButton/InstallButton";

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, signOut, verifyEmailOtp, emailOtpRequired } =
    useAuth();
  const storedInvite = getStoredInviteLinkContext();
  const storedAdminInvite = getStoredAdminInviteLinkContext();

  useEffect(() => {
    const activeInvite = storedAdminInvite ?? storedInvite;
    if (!activeInvite) return;

    setIsSignUp(true);
    if (activeInvite.email) {
      setEmail((current) => current || activeInvite.email || "");
    }
  }, [
    storedAdminInvite?.email,
    storedAdminInvite?.token,
    storedInvite?.email,
    storedInvite?.token,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (emailOtpRequired) {
        const { error } = await verifyEmailOtp(otpCode);
        if (error) throw error;
      } else if (isSignUp) {
        const { error } = await signUp(
          email,
          password,
          fullName,
          storedAdminInvite?.token,
          storedInvite?.token,
        );
        if (error) throw error;
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-2xl font-bold text-white">PM</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">PM-Tool</h1>
          <p className="text-slate-600">Enterprise Team Collaboration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {(storedAdminInvite || storedInvite) && !emailOtpRequired && (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
              <p className="text-sm font-medium text-slate-900">
                {storedAdminInvite
                  ? "You were invited to a workspace"
                  : "You were invited to a channel"}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {storedAdminInvite
                  ? "Create an account with the invited email to join your admin's PM-Tool workspace."
                  : "Create an account or sign in with the invited email to receive a Join link in your personal chat."}
              </p>
            </div>
          )}
          {!emailOtpRequired && isSignUp && (
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="John Doe"
              />
            </div>
          )}

          {!emailOtpRequired && (
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="you@company.com"
              />
            </div>
          )}

          {!emailOtpRequired ? (
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm font-medium text-slate-900">
                  Email verification required
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Enter the OTP sent to your email to finish signing in.
                </p>
              </div>

              <div>
                <label
                  htmlFor="otpCode"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  OTP Code
                </label>
                <input
                  id="otpCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  minLength={6}
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none tracking-[0.3em]"
                  placeholder="123456"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Loading...</span>
            ) : (
              <>
                {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
                {emailOtpRequired
                  ? "Verify OTP"
                  : isSignUp
                    ? "Create Account"
                    : "Sign In"}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          {emailOtpRequired ? (
            <button
              onClick={() => {
                setError("");
                setOtpCode("");
                signOut();
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Use a different account
            </button>
          ) : (
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          )}
        </div>
        <InstallButton />
      </div>
    </div>
  );
}
