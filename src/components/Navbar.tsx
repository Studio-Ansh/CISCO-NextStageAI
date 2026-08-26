import React from "react";
import { Terminal, FileCode, Cpu, BarChart3, ShieldCheck, User as UserIcon, LogIn } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface NavbarProps {
  activeTab: "diagnose" | "analytics" | "audit";
  setActiveTab: (tab: "diagnose" | "analytics" | "audit") => void;
  onOpenCli: () => void;
  onOpenCodeViewer: () => void;
  agreementRate: number;
  totalReviewed: number;
  currentUser: User | null;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCli,
  onOpenCodeViewer,
  agreementRate,
  totalReviewed,
  currentUser,
  onOpenAuth
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#101010] border-b border-[#3d3a39]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Identity */}
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-sans text-xl font-medium tracking-[-0.5px] text-[#eeeeee]">NetSage AI</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#1d1a18] border border-[#3d3a39] font-mono text-[11px] uppercase tracking-tight text-[#eeeeee]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ee6018]"></span>
                  HITL GATE
                </span>
              </div>
              <p className="text-[11px] font-mono uppercase tracking-tight text-[#8a8380] hidden sm:block">
                CISCO PACKET TRACER LAB DIAGNOSTICS
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Flat, 3px radius, Geist Mono uppercase) */}
          <nav className="flex items-center space-x-1 bg-[#1d1a18] p-1 rounded-[3px] border border-[#3d3a39]">
            <button
              id="tab-btn-diagnose"
              onClick={() => setActiveTab("diagnose")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-[3px] text-xs font-mono uppercase tracking-tight transition-colors ${
                activeTab === "diagnose"
                  ? "bg-[#fafafa] text-[#101010] font-medium"
                  : "text-[#b8b3b0] hover:text-[#eeeeee] hover:bg-[#101010]"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Diagnostics</span>
            </button>
            <button
              id="tab-btn-analytics"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-[3px] text-xs font-mono uppercase tracking-tight transition-colors ${
                activeTab === "analytics"
                  ? "bg-[#fafafa] text-[#101010] font-medium"
                  : "text-[#b8b3b0] hover:text-[#eeeeee] hover:bg-[#101010]"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Dataset & Stats</span>
            </button>
            <button
              id="tab-btn-audit"
              onClick={() => setActiveTab("audit")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-[3px] text-xs font-mono uppercase tracking-tight transition-colors ${
                activeTab === "audit"
                  ? "bg-[#fafafa] text-[#101010] font-medium"
                  : "text-[#b8b3b0] hover:text-[#eeeeee] hover:bg-[#101010]"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Model Audit Log</span>
            </button>
          </nav>

          {/* Action Tools & Status */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Agreement Rate Tile Indicator */}
            <div className="hidden lg:flex items-center space-x-2 px-2.5 py-1 bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]"></span>
              <span className="text-[#8a8380] uppercase">AGREEMENT:</span>
              <span className="text-[#a0ca92] font-medium">{agreementRate}%</span>
              <span className="text-[10px] text-[#8a8380]">({totalReviewed})</span>
            </div>

            {/* Packet Tracer Terminal Simulator Button */}
            <button
              id="btn-open-cli"
              onClick={onOpenCli}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1d1a18] hover:bg-[#252220] border border-[#3d3a39] text-[#eeeeee] text-xs font-mono uppercase tracking-tight rounded-[3px] transition-colors"
              title="Open Virtual Packet Tracer CLI Terminal"
            >
              <Terminal className="w-3.5 h-3.5 text-[#b8b3b0]" />
              <span className="hidden sm:inline">IOS CLI</span>
            </button>

            {/* Generated Code & Repo Files Button */}
            <button
              id="btn-open-code"
              onClick={onOpenCodeViewer}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1d1a18] hover:bg-[#252220] border border-[#3d3a39] text-[#eeeeee] text-xs font-mono uppercase tracking-tight rounded-[3px] transition-colors"
              title="Inspect Generated Python, Config & Markdown Files"
            >
              <FileCode className="w-3.5 h-3.5 text-[#b8b3b0]" />
              <span className="hidden sm:inline">Repo Code</span>
            </button>

            {/* Supabase User / Auth Button */}
            <button
              id="btn-auth"
              onClick={onOpenAuth}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-[3px] text-xs font-mono uppercase tracking-tight border transition-colors ${
                currentUser
                  ? "bg-[#1d1a18] hover:bg-[#252220] border-[#a0ca92]/40 text-[#a0ca92]"
                  : "bg-[#fafafa] hover:bg-[#eaeaea] text-[#101010] border-[#fafafa] font-medium"
              }`}
              title={currentUser ? `Logged in as ${currentUser.email}` : "Sign In or Register with Supabase"}
            >
              {currentUser ? (
                <>
                  <UserIcon className="w-3.5 h-3.5 text-[#a0ca92]" />
                  <span className="max-w-[100px] truncate">{currentUser.email?.split("@")[0] || "Operator"}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

