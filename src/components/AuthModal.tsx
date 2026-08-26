import React, { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOutUser
} from "../lib/supabase";
import { Shield, KeyRound, Mail, UserPlus, LogIn, CheckCircle2, AlertCircle, Eye, EyeOff, X, ExternalLink } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  currentSession: Session | null;
  onAuthSuccess: (user: User | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess
}) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Listen for OAuth completion messages
  useEffect(() => {
    if (!isOpen) return;

    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "SUPABASE_OAUTH_SUCCESS") {
        setGoogleLoading(false);
        if (event.data.user) {
          setSuccessMsg("Google authorization verified!");
          setTimeout(() => {
            onAuthSuccess(event.data.user);
            onClose();
          }, 400);
        }
      }
    };

    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, [isOpen, onAuthSuccess, onClose]);

  if (!isOpen) return null;

  const configured = isSupabaseConfigured();

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setErrorMsg(err.message || "Failed to initiate Google OAuth.");
      setGoogleLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg("Please provide both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (!configured) {
      setErrorMsg(
        "Supabase credentials (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) are not configured. Please set them in your project environment."
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { user } = await signInWithEmail(email, password);
        setSuccessMsg("Successfully signed in!");
        onAuthSuccess(user);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        const { user, session } = await signUpWithEmail(email, password, displayName);
        if (session) {
          setSuccessMsg("Registration successful! You are now logged in.");
          onAuthSuccess(user);
          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          setSuccessMsg("Registration successful! Please check your email to confirm your account.");
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMsg(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
      onAuthSuccess(null);
      setSuccessMsg("Successfully signed out.");
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] w-full max-w-md flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#101010] border-b border-[#3d3a39]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-[3px] bg-[#252220] border border-[#3d3a39] text-[#ee6018]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="eyebrow">SUPABASE AUTHENTICATION</div>
              <h2 className="text-sm font-medium text-[#eeeeee] font-sans">
                {currentUser
                  ? "Operator Profile"
                  : mode === "login"
                  ? "Operator Login"
                  : "Register Network Engineer"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a8380] hover:text-[#eeeeee] p-1 rounded-[3px] hover:bg-[#252220] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!configured && (
            <div className="bg-[#252220] border border-[#3d3a39] p-3.5 rounded-[3px] space-y-2">
              <div className="flex items-center space-x-2 text-[#ee6018] text-xs font-mono font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Supabase Configuration Notice</span>
              </div>
              <p className="text-xs text-[#b8b3b0] font-sans leading-relaxed">
                To connect to your live Supabase project, define the following variables in your project settings:
              </p>
              <div className="bg-[#101010] p-2 rounded-[2px] border border-[#3d3a39] font-mono text-[11px] text-[#eeeeee] space-y-1">
                <div>VITE_SUPABASE_URL=https://xyz.supabase.co</div>
                <div>VITE_SUPABASE_ANON_KEY=eyJhb...</div>
              </div>
            </div>
          )}

          {currentUser ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="bg-[#101010] border border-[#3d3a39] p-4 rounded-[3px] space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-[3px] bg-[#252220] border border-[#3d3a39] flex items-center justify-center font-mono text-base font-bold text-[#fafafa]">
                    {currentUser.email ? currentUser.email.substring(0, 2).toUpperCase() : "OP"}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-sm font-medium text-[#eeeeee] truncate">
                      {currentUser.user_metadata?.full_name || "Network Engineer"}
                    </div>
                    <div className="text-xs font-mono text-[#8a8380] truncate">
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#252220] grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[#8a8380] block text-[10px] uppercase">Role</span>
                    <span className="text-[#a0ca92]">Verified Operator</span>
                  </div>
                  <div>
                    <span className="text-[#8a8380] block text-[10px] uppercase">Auth Provider</span>
                    <span className="text-[#eeeeee]">Supabase Email/Password</span>
                  </div>
                </div>
              </div>

              {successMsg && (
                <div className="flex items-center space-x-2 text-xs text-[#a0ca92] bg-[#101010] p-2.5 rounded-[3px] border border-[#3d3a39]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="w-full py-2 bg-[#101010] hover:bg-[#252220] text-[#ee6018] border border-[#3d3a39] rounded-[3px] font-mono text-xs uppercase tracking-tight transition-colors disabled:opacity-50"
              >
                {loading ? "Signing Out..." : "Sign Out"}
              </button>
            </div>
          ) : (
            /* Auth Form (Login / Register) */
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-1 bg-[#101010] p-1 border border-[#3d3a39] rounded-[3px]">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-1.5 text-xs font-mono uppercase tracking-tight rounded-[2px] transition-colors flex items-center justify-center space-x-1.5 ${
                    mode === "login"
                      ? "bg-[#fafafa] text-[#101010] font-medium"
                      : "text-[#b8b3b0] hover:text-[#eeeeee]"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-1.5 text-xs font-mono uppercase tracking-tight rounded-[2px] transition-colors flex items-center justify-center space-x-1.5 ${
                    mode === "register"
                      ? "bg-[#fafafa] text-[#101010] font-medium"
                      : "text-[#b8b3b0] hover:text-[#eeeeee]"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>

              {/* Direct Google OAuth Option */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading || loading}
                  className="w-full py-2.5 px-4 bg-[#ffffff] hover:bg-[#f1f1f1] text-[#1f1f1f] rounded-[3px] font-sans text-xs font-semibold flex items-center justify-center space-x-2.5 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>
                    {googleLoading
                      ? "Connecting..."
                      : mode === "login"
                      ? "Direct Sign In with Google"
                      : "Direct Sign Up with Google"}
                  </span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-[#3d3a39] w-full"></div>
                  <span className="bg-[#1d1a18] px-2 text-[10px] font-mono text-[#8a8380] uppercase tracking-wider relative">
                    or with email &amp; password
                  </span>
                </div>
              </div>

              {mode === "register" && (
                <div>
                  <label className="eyebrow block mb-1.5">FULL NAME / OPERATOR ID</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Rivera (CCIE #5421)"
                    className="w-full px-3 py-2 text-xs bg-[#101010] border border-[#3d3a39] rounded-[3px] text-[#eeeeee] placeholder-[#8a8380] focus:outline-none focus:border-[#fafafa] font-sans"
                  />
                </div>
              )}

              <div>
                <label className="eyebrow block mb-1.5">EMAIL ADDRESS</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-[#8a8380]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@enterprise-net.org"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#101010] border border-[#3d3a39] rounded-[3px] text-[#eeeeee] placeholder-[#8a8380] focus:outline-none focus:border-[#fafafa] font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-1.5">PASSWORD</label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-3 top-3 text-[#8a8380]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-[#101010] border border-[#3d3a39] rounded-[3px] text-[#eeeeee] placeholder-[#8a8380] focus:outline-none focus:border-[#fafafa] font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#8a8380] hover:text-[#eeeeee]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start space-x-2 text-xs text-[#ee6018] bg-[#101010] p-2.5 rounded-[3px] border border-[#3d3a39]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-start space-x-2 text-xs text-[#a0ca92] bg-[#101010] p-2.5 rounded-[3px] border border-[#3d3a39]">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#fafafa] hover:bg-[#eaeaea] text-[#101010] rounded-[3px] font-mono text-xs uppercase font-medium tracking-tight transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : mode === "login" ? (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In With Supabase</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Operator Account</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
