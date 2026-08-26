import React, { useState, useEffect } from "react";
import { TestCase, DiagnosisResult, AuditEvent, FilterState } from "./types";
import { INITIAL_CASES } from "./data/casesData";
import { Navbar } from "./components/Navbar";
import { CaseExplorer } from "./components/CaseExplorer";
import { CaseDetailsView } from "./components/CaseDetailsView";
import { DiagnosisWorkbench } from "./components/DiagnosisWorkbench";
import { HitlApprovalGate } from "./components/HitlApprovalGate";
import { AuditDashboard } from "./components/AuditDashboard";
import { DatasetAnalyticsDashboard } from "./components/DatasetAnalyticsDashboard";
import { CliSimulatorModal } from "./components/CliSimulatorModal";
import { CodeViewerModal } from "./components/CodeViewerModal";
import { AuthModal } from "./components/AuthModal";
import { LoginPage } from "./components/LoginPage";
import { OAuthCallback } from "./components/OAuthCallback";
import { supabase, getSession } from "./lib/supabase";
import { User, Session } from "@supabase/supabase-js";

export function App() {
  const [cases, setCases] = useState<TestCase[]>(INITIAL_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("NET-001");
  const [diagnoses, setDiagnoses] = useState<Record<string, DiagnosisResult>>({});
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);
  const [activeTab, setActiveTab] = useState<"diagnose" | "analytics" | "audit">("diagnose");

  // Supabase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [guestMode, setGuestMode] = useState<boolean>(false);

  // Check if current window is an OAuth popup/callback
  const isPopupCallback = () => {
    if (typeof window === "undefined") return false;
    const isOpenerPopup = Boolean(window.opener && window.opener !== window);
    const hasHashTokens = window.location.hash.includes("access_token") || window.location.hash.includes("error=");
    const hasCodeParam = window.location.search.includes("code=");
    const isPopupName = window.name === "google_oauth_popup";

    return (isOpenerPopup && (hasHashTokens || hasCodeParam || isPopupName)) || (isPopupName && (hasHashTokens || hasCodeParam));
  };

  const [isOAuthPopup] = useState<boolean>(() => isPopupCallback());

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    layer: "All",
    severity: "All",
    conceptTag: "All"
  });

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isCliOpen, setIsCliOpen] = useState(false);
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false);

  // Fetch initial audit data, cases and check Supabase auth session
  useEffect(() => {
    if (isOAuthPopup) return;

    fetchAuditLog();
    fetchCases();

    // Check initial auth session
    getSession().then(s => {
      setSession(s);
      setUser(s?.user || null);
      setAuthInitialized(true);
    }).catch(() => {
      setAuthInitialized(true);
    });

    // Listen to messages from popup auth window
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "SUPABASE_OAUTH_SUCCESS") {
        if (event.data.session) {
          setSession(event.data.session);
          setUser(event.data.user || event.data.session.user || null);
          setGuestMode(false);
          setAuthInitialized(true);
        }
      }
    };

    window.addEventListener("message", handleAuthMessage);

    // Subscribe to Supabase auth state changes
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setAuthInitialized(true);
      });

      return () => {
        subscription.unsubscribe();
        window.removeEventListener("message", handleAuthMessage);
      };
    } else {
      setAuthInitialized(true);
      return () => {
        window.removeEventListener("message", handleAuthMessage);
      };
    }
  }, [isOAuthPopup]);


  const fetchCases = async () => {
    try {
      const res = await fetch("/api/cases");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCases(data);
        }
      }
    } catch {
      // Use INITIAL_CASES fallback
    }
  };

  const fetchAuditLog = async () => {
    try {
      const res = await fetch("/api/audit-log");
      if (res.ok) {
        const data = await res.json();
        if (data.events) {
          setAuditEvents(data.events);
        }
      }
    } catch {
      // Fallback handled gracefully
    }
  };

  const selectedCase = cases.find(c => c.case_id === selectedCaseId) || cases[0];

  const handleRunDiagnosis = async (forceAi: boolean = false) => {
    if (!selectedCase) return;
    setLoadingDiagnosis(true);

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: selectedCase.case_id,
          symptom: selectedCase.symptom,
          topology_note: selectedCase.topology_note,
          show_outputs: selectedCase.show_outputs,
          force_ai: forceAi
        })
      });

      if (res.ok) {
        const result: DiagnosisResult = await res.json();
        setDiagnoses(prev => ({ ...prev, [selectedCase.case_id]: result }));
      }
    } catch (error) {
      console.error("Diagnosis error:", error);
    } finally {
      setLoadingDiagnosis(false);
    }
  };

  const handleAuditAction = async (actionData: {
    caseId: string;
    source: "rule" | "ai";
    decision: "APPROVED" | "EDITED" | "REJECTED";
    agreed: boolean;
    suggestedFix: string[];
    finalCommands: string[];
    editsApplied?: string;
    note?: string;
  }) => {
    try {
      const res = await fetch("/api/audit-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actionData)
      });

      if (res.ok) {
        fetchAuditLog();
      }
    } catch (error) {
      console.error("Audit action error:", error);
    }
  };

  const approvedCount = auditEvents.filter(e => e.decision === "APPROVED").length;
  const totalCount = auditEvents.length;
  const agreementRate = totalCount > 0 ? Number(((approvedCount / totalCount) * 100).toFixed(1)) : 76.6;

  const diagnosedCaseIds = new Set(Object.keys(diagnoses));
  const currentDiagnosis = selectedCase ? diagnoses[selectedCase.case_id] || null : null;

  // Render standalone OAuth callback handler if running inside a popup window
  if (isOAuthPopup) {
    return <OAuthCallback />;
  }

  // Show full Login/Signup gateway for unauthenticated initial users
  if (authInitialized && !user && !guestMode) {
    return (
      <LoginPage
        onAuthenticated={(authenticatedUser) => {
          setUser(authenticatedUser);
          setGuestMode(false);
        }}
        onEnterGuest={() => {
          setGuestMode(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#101010] text-[#eeeeee] flex flex-col font-sans selection:bg-[#eeeeee] selection:text-[#101010]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCli={() => setIsCliOpen(true)}
        onOpenCodeViewer={() => setIsCodeViewerOpen(true)}
        agreementRate={agreementRate}
        totalReviewed={totalCount}
        currentUser={user}
        onOpenAuth={() => setIsAuthOpen(true)}
      />


      {/* Main Workspace View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "diagnose" && selectedCase && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: 30-Scenario Case Browser (4 cols) */}
            <div className="lg:col-span-4">
              <CaseExplorer
                cases={cases}
                selectedCaseId={selectedCase.case_id}
                onSelectCase={(id) => setSelectedCaseId(id)}
                filters={filters}
                setFilters={setFilters}
                diagnosedCaseIds={diagnosedCaseIds}
              />
            </div>

            {/* Right Column: Case Details, Telemetry, Diagnosis & HITL Gate (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* 1. Case Details & Cisco IOS Telemetry */}
              <CaseDetailsView testCase={selectedCase} />

              {/* 2. Dual Engine Diagnosis Workbench (Contains the Signature Light Surface Card on dark) */}
              <DiagnosisWorkbench
                testCase={selectedCase}
                diagnosis={currentDiagnosis}
                loading={loadingDiagnosis}
                onRunDiagnosis={handleRunDiagnosis}
              />

              {/* 3. Human-in-the-Loop (HITL) Gate */}
              {currentDiagnosis && (
                <HitlApprovalGate
                  testCase={selectedCase}
                  diagnosis={currentDiagnosis}
                  onAuditAction={handleAuditAction}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <DatasetAnalyticsDashboard
            cases={cases}
            onSelectCaseToDiagnose={(caseId) => {
              setSelectedCaseId(caseId);
              setActiveTab("diagnose");
            }}
          />
        )}

        {activeTab === "audit" && (
          <AuditDashboard
            cases={cases}
            auditEvents={auditEvents}
            onRefreshAudit={fetchAuditLog}
          />
        )}
      </main>

      {/* Virtual Packet Tracer Cisco CLI Terminal Simulator Modal */}
      <CliSimulatorModal
        isOpen={isCliOpen}
        onClose={() => setIsCliOpen(false)}
        initialCommand={currentDiagnosis?.next_command || "show ip int brief"}
      />

      {/* Generated Code & Project Files Modal */}
      <CodeViewerModal
        isOpen={isCodeViewerOpen}
        onClose={() => setIsCodeViewerOpen(false)}
      />

      {/* Supabase Authentication Modal (Email/Password Login & Register) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        currentSession={session}
        onAuthSuccess={(authenticatedUser) => {
          setUser(authenticatedUser);
          if (!authenticatedUser) {
            setGuestMode(false);
          }
        }}
      />


      {/* Footer */}
      <footer className="bg-[#101010] border-t border-[#3d3a39] py-4 px-6 text-xs text-[#8a8380]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-tight">NETSAGE AI &bull; CISCO PACKET TRACER DIAGNOSTIC PLATFORM</span>
          <div className="flex items-center space-x-4">
            <span className="text-[#8a8380] font-mono text-[11px] uppercase">CCNA / CCNP AUTOMATED LAB VERIFICATION</span>
            <button
              onClick={() => setIsCodeViewerOpen(true)}
              className="text-[#eeeeee] hover:underline font-mono text-[11px] uppercase cursor-pointer"
            >
              Inspect Source Code
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
