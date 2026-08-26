import React, { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle
} from "../lib/supabase";
import {
  Shield,
  KeyRound,
  Mail,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Terminal,
  Activity
} from "lucide-react";

interface LoginPageProps {
  onAuthenticated: (user: User) => void;
  onEnterGuest: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onAuthenticated, onEnterGuest }) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  // Listen for OAuth completion messages from popup window
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "SUPABASE_OAUTH_SUCCESS") {
        setGoogleLoading(false);
        if (event.data.user) {
          setSuccessMsg("Google authorization verified! Entering workspace...");
          setTimeout(() => {
            onAuthenticated(event.data.user);
          }, 400);
        }
      }
    };

    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, [onAuthenticated]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { user } = await signInWithEmail(email.trim(), password);
        if (user) {
          setSuccessMsg("Authentication verified. Loading workspace...");
          setTimeout(() => {
            onAuthenticated(user);
          }, 600);
        }
      } else {
        const { user, session } = await signUpWithEmail(
          email.trim(),
          password,
          displayName.trim() || email.split("@")[0]
        );

        if (session && user) {
          setSuccessMsg("Account successfully provisioned! Logging you in...");
          setTimeout(() => {
            onAuthenticated(user);
          }, 800);
        } else {
          setSuccessMsg(
            "Account created! If email confirmation is enabled in your Supabase project, please check your inbox to verify."
          );
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMsg(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      // Supabase OAuth redirects to Google login provider
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setErrorMsg(
        err.message?.includes("provider is not enabled")
          ? "Google provider is not enabled in your Supabase project yet. See configuration guide below or use Email/Password."
          : err.message || "Failed to initiate Google OAuth."
      );
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101010] text-[#eeeeee] flex flex-col justify-between selection:bg-[#ee6018]/30 selection:text-white">
      {/* Top Banner Bar */}
      <header className="border-b border-[#252220] bg-[#141211] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] flex items-center justify-center text-[#ee6018]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#8a8380] uppercase tracking-wider">
                Autonomous Network Engine
              </div>
              <div className="text-sm font-semibold tracking-tight font-sans text-[#eeeeee]">
                NetDiagnostic Copilot
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] text-[#a0ca92]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92] animate-pulse"></span>
              <span>Supabase Auth Ready</span>
            </div>
            <button
              onClick={onEnterGuest}
              className="px-3 py-1 text-xs text-[#b8b3b0] hover:text-[#eeeeee] hover:bg-[#1d1a18] rounded-[3px] border border-transparent hover:border-[#3d3a39] transition-all font-mono uppercase"
            >
              Skip to Guest Sandbox →
            </button>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: System Overview & Value Prop */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-[2px] bg-[#252220] border border-[#3d3a39] text-[11px] font-mono text-[#ee6018]">
                <Shield className="w-3.5 h-3.5" />
                <span>ENTERPRISE OPERATOR GATEWAY</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#fafafa] font-sans leading-tight">
                Deterministic Network Root-Cause &amp; Remediation
              </h1>
              <p className="text-sm text-[#b8b3b0] leading-relaxed font-sans">
                Sign in with your Gmail or enterprise credentials to access real-time Cisco IOS/Juniper diagnosis, topology graphs, and audited human-in-the-loop CLI execution gates.
              </p>
            </div>

            {/* Feature Badges */}
            <div className="space-y-2.5 pt-2 border-t border-[#252220]">
              <div className="flex items-start space-x-3 p-2.5 rounded-[3px] bg-[#161413] border border-[#252220]">
                <ShieldCheck className="w-4 h-4 text-[#a0ca92] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-[#eeeeee]">Human-in-the-Loop Safeguards</div>
                  <div className="text-[11px] text-[#8a8380]">All generated IOS/JunOS remediations require cryptographic engineer approval.</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-[3px] bg-[#161413] border border-[#252220]">
                <Terminal className="w-4 h-4 text-[#ee6018] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-[#eeeeee]">Interactive CLI Sandbox</div>
                  <div className="text-[11px] text-[#8a8380]">Simulate show commands, route tables, and sub-interface states in real-time.</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-[3px] bg-[#161413] border border-[#252220]">
                <Activity className="w-4 h-4 text-[#60a5fa] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-[#eeeeee]">L1-L7 Diagnostic Graphs</div>
                  <div className="text-[11px] text-[#8a8380]">OSPF adjacency, MTU mismatch, trunking, and NAT overload resolution.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-6">
            <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[4px] p-6 sm:p-7 shadow-2xl space-y-5">
              
              {/* Header & Tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-[#8a8380] uppercase tracking-wider">
                    {mode === "login" ? "Operator Sign In" : "New Engineer Registration"}
                  </div>
                  <div className="text-[11px] font-mono text-[#ee6018] bg-[#252220] px-2 py-0.5 rounded-[2px] border border-[#3d3a39]">
                    Supabase Cloud
                  </div>
                </div>

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
                        ? "bg-[#fafafa] text-[#101010] font-semibold"
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
                        ? "bg-[#fafafa] text-[#101010] font-semibold"
                        : "text-[#b8b3b0] hover:text-[#eeeeee]"
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Account</span>
                  </button>
                </div>
              </div>

              {/* Direct Google OAuth Button */}
              <div className="space-y-3">
                <button
                  type="button"
                  id="btn-google-auth"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading || loading}
                  className="w-full py-2.5 px-4 bg-[#ffffff] hover:bg-[#f1f1f1] text-[#1f1f1f] rounded-[3px] font-sans text-xs font-semibold flex items-center justify-center space-x-2.5 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {/* Official Google Vector Logo */}
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
                      ? "Connecting to Google..."
                      : mode === "login"
                      ? "Direct Sign In with Google"
                      : "Direct Sign Up with Google"}
                  </span>
                </button>

                {/* Divider */}
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-[#3d3a39] w-full"></div>
                  <span className="bg-[#1d1a18] px-2 text-[10px] font-mono text-[#8a8380] uppercase tracking-wider relative">
                    or continue with email &amp; password
                  </span>
                </div>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                {mode === "register" && (
                  <div>
                    <label className="eyebrow block mb-1">OPERATOR FULL NAME</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Maya Chen, Lead NOC"
                      className="w-full px-3 py-2 text-xs bg-[#101010] border border-[#3d3a39] rounded-[3px] text-[#eeeeee] placeholder-[#6d6764] focus:outline-none focus:border-[#fafafa] font-sans"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="eyebrow">GMAIL / ENTERPRISE EMAIL</label>
                    {email && !email.includes("@") && (
                      <button
                        type="button"
                        onClick={() => setEmail(email + "@gmail.com")}
                        className="text-[10px] font-mono text-[#ee6018] hover:underline"
                      >
                        + @gmail.com
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-[#8a8380]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#101010] border border-[#3d3a39] rounded-[3px] text-[#eeeeee] placeholder-[#6d6764] focus:outline-none focus:border-[#fafafa] font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="eyebrow block mb-1">PASSWORD</label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 absolute left-3 top-3 text-[#8a8380]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2 text-xs bg-[#101010] border border-[#3d3a39] rounded-[3px] text-[#eeeeee] placeholder-[#6d6764] focus:outline-none focus:border-[#fafafa] font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#8a8380] hover:text-[#eeeeee]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Alerts */}
                {errorMsg && (
                  <div className="flex items-start space-x-2 text-xs text-[#ee6018] bg-[#141211] p-2.5 rounded-[3px] border border-[#ee6018]/30 font-sans">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="flex items-start space-x-2 text-xs text-[#a0ca92] bg-[#141211] p-2.5 rounded-[3px] border border-[#a0ca92]/30 font-sans">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-2.5 bg-[#fafafa] hover:bg-[#eaeaea] text-[#101010] rounded-[3px] font-mono text-xs uppercase font-semibold tracking-tight transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <span>Authenticating...</span>
                  ) : mode === "login" ? (
                    <>
                      <span>Sign In with Password</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Register Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Guest / Sandbox Mode Link */}
              <div className="pt-2 border-t border-[#252220] flex items-center justify-between text-xs font-mono text-[#8a8380]">
                <span>Evaluating the platform?</span>
                <button
                  type="button"
                  onClick={onEnterGuest}
                  className="text-[#eeeeee] hover:text-[#ee6018] underline transition-colors"
                >
                  Continue as Guest Operator
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#252220] bg-[#101010] py-3 px-6 text-center text-xs text-[#8a8380] font-mono">
        Autonomous Diagnostic System • Connected to Supabase Engine • AES-256 Auth Session Tokenization
      </footer>
    </div>
  );
};
