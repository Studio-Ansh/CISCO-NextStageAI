import React, { useState } from "react";
import { TestCase, DiagnosisResult } from "../types";
import { Check, Edit3, XCircle, Terminal, Play } from "lucide-react";

interface HitlApprovalGateProps {
  testCase: TestCase;
  diagnosis: DiagnosisResult;
  onAuditAction: (action: {
    caseId: string;
    source: "rule" | "ai";
    decision: "APPROVED" | "EDITED" | "REJECTED";
    agreed: boolean;
    suggestedFix: string[];
    finalCommands: string[];
    editsApplied?: string;
    note?: string;
  }) => void;
}

export const HitlApprovalGate: React.FC<HitlApprovalGateProps> = ({
  testCase,
  diagnosis,
  onAuditAction
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCommands, setEditedCommands] = useState<string[]>(diagnosis.fix_steps);
  const [customCommandText, setCustomCommandText] = useState(diagnosis.fix_steps.join("\n"));
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Execution terminal state
  const [deploying, setDeploying] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [deploymentStatus, setDeploymentStatus] = useState<"idle" | "running" | "success" | "rejected">("idle");

  // Keep edited commands in sync if diagnosis changes
  React.useEffect(() => {
    setEditedCommands(diagnosis.fix_steps);
    setCustomCommandText(diagnosis.fix_steps.join("\n"));
    setIsEditing(false);
    setShowRejectDialog(false);
    setDeploymentStatus("idle");
    setTerminalLogs([]);
  }, [diagnosis]);

  const runSimulatedDeployment = (commands: string[], isEdited: boolean, note?: string) => {
    setDeploying(true);
    setDeploymentStatus("running");
    setTerminalLogs(["Connecting to Cisco IOS Target Device via SSH/Console..."]);

    let currentLog = [
      "Connecting to Cisco IOS Target Device via SSH/Console...",
      `Host: Core-Router-01 (Case: ${testCase.case_id})`,
      "Session authenticated with Network Admin credentials.",
      ""
    ];

    setTerminalLogs([...currentLog]);

    const stepDelay = 300;
    commands.forEach((cmd, idx) => {
      setTimeout(() => {
        const prompt = cmd.startsWith("configure")
          ? "Core-Router#"
          : cmd.startsWith("interface") || cmd.startsWith("router") || cmd.startsWith("ip access-list")
          ? "Core-Router(config)#"
          : "Core-Router(config-if)#";

        currentLog = [...currentLog, `${prompt} ${cmd}`];
        setTerminalLogs([...currentLog]);

        if (idx === commands.length - 1) {
          setTimeout(() => {
            currentLog = [
              ...currentLog,
              "",
              "Building configuration...",
              "[OK] Configuration successfully committed to NVRAM.",
              "%SYS-5-CONFIG_I: Configured from console by NetSage-Operator",
              "Status: REMEDIATION APPLIED AND VERIFIED"
            ];
            setTerminalLogs([...currentLog]);
            setDeploying(false);
            setDeploymentStatus("success");

            onAuditAction({
              caseId: testCase.case_id,
              source: diagnosis.source,
              decision: isEdited ? "EDITED" : "APPROVED",
              agreed: !isEdited,
              suggestedFix: diagnosis.fix_steps,
              finalCommands: commands,
              editsApplied: isEdited ? "Operator modified CLI syntax before deploy" : "None",
              note: note || (isEdited ? "Remediated with custom CLI modifications" : "Approved directly as recommended")
            });
          }, 350);
        }
      }, (idx + 1) * stepDelay);
    });
  };

  const handleApprove = () => {
    runSimulatedDeployment(diagnosis.fix_steps, false);
  };

  const handleApplyEdited = () => {
    const lines = customCommandText
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0);
    setEditedCommands(lines);
    setIsEditing(false);
    runSimulatedDeployment(lines, true, "Operator customized command sequence prior to push");
  };

  const handleRejectConfirm = () => {
    setDeploymentStatus("rejected");
    setShowRejectDialog(false);
    setTerminalLogs([
      `[SECURITY REJECTION] Recommendation for ${testCase.case_id} was rejected by Network Operator.`,
      `Reason: ${rejectionNote || "False positive or conflicting policy detected."}`,
      "No changes were written to Cisco network hardware."
    ]);

    onAuditAction({
      caseId: testCase.case_id,
      source: diagnosis.source,
      decision: "REJECTED",
      agreed: false,
      suggestedFix: diagnosis.fix_steps,
      finalCommands: [],
      editsApplied: "Deployment blocked by operator",
      note: rejectionNote || "Rejected as false positive"
    });
  };

  return (
    <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5 space-y-4">
      {/* HITL Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#3d3a39] pb-3">
        <div>
          <div className="eyebrow">HUMAN-IN-THE-LOOP (HITL) APPROVAL GATE</div>
          <h3 className="text-base font-medium tracking-[-0.4px] text-[#eeeeee]">
            Mandatory Operator Safety Review
          </h3>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#101010] border border-[#3d3a39] font-mono text-[11px] uppercase tracking-tight text-[#a0ca92]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]"></span>
          SAFETY GATE ARMED
        </span>
      </div>

      {/* Suggested Fix Steps Preview / Editor */}
      {!isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow">PROPOSED CLI REMEDIATION COMMANDS</span>
            <button
              id="btn-edit-commands"
              onClick={() => setIsEditing(true)}
              disabled={deploying}
              className="flex items-center space-x-1 text-xs font-mono uppercase text-[#b8b3b0] hover:text-[#eeeeee] px-2 py-1 rounded-[3px] bg-[#101010] hover:bg-[#252220] border border-[#3d3a39] transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Commands</span>
            </button>
          </div>

          <div className="bg-[#101010] text-[#eeeeee] font-mono text-xs p-3.5 rounded-[3px] border border-[#3d3a39] space-y-1">
            {editedCommands.map((cmd, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <span className="text-[#8a8380] select-none text-[10px] w-4">{idx + 1}.</span>
                <span>{cmd}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3 bg-[#101010] border border-[#3d3a39] p-4 rounded-[3px]">
          <div className="flex items-center justify-between">
            <span className="eyebrow flex items-center space-x-1.5 text-[#eeeeee]">
              <Edit3 className="w-3.5 h-3.5" />
              <span>CUSTOM CLI COMMAND EDITOR</span>
            </span>
            <button
              onClick={() => {
                setCustomCommandText(diagnosis.fix_steps.join("\n"));
                setIsEditing(false);
              }}
              className="text-xs font-mono uppercase text-[#8a8380] hover:text-[#eeeeee]"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-[#8a8380] font-sans">
            Edit the exact Cisco IOS CLI command strings below (one command per line):
          </p>

          <textarea
            id="custom-commands-textarea"
            rows={5}
            value={customCommandText}
            onChange={(e) => setCustomCommandText(e.target.value)}
            className="w-full font-mono text-xs p-3 bg-[#1d1a18] text-[#eeeeee] border border-[#3d3a39] rounded-[3px] focus:outline-none focus:border-[#fafafa]"
          />

          <div className="flex justify-end space-x-2 pt-1">
            <button
              id="btn-apply-edited-commands"
              onClick={handleApplyEdited}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#fafafa] hover:bg-[#eaeaea] text-[#101010] text-xs font-mono uppercase tracking-tight font-medium rounded-[3px] transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Save &amp; Deploy Custom Fix</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons Bar */}
      {!isEditing && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {/* Primary Commit: Approve & Deploy (Chalk #fafafa fill with dark #101010 text) */}
          <button
            id="btn-hitl-approve"
            onClick={handleApprove}
            disabled={deploying}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-[#fafafa] hover:bg-[#eaeaea] text-[#101010] text-xs font-mono uppercase tracking-tight font-medium rounded-[3px] disabled:opacity-50 transition-opacity"
          >
            <Check className="w-4 h-4" />
            <span>Approve &amp; Deploy</span>
          </button>

          {/* Secondary: Edit Commands (Carbon Lift #1d1a18 fill with #eeeeee text) */}
          <button
            id="btn-hitl-edit"
            onClick={() => setIsEditing(true)}
            disabled={deploying}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-[#1d1a18] hover:bg-[#252220] text-[#eeeeee] text-xs font-mono uppercase tracking-tight rounded-[3px] border border-[#3d3a39] disabled:opacity-50 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#8a8380]" />
            <span>Edit Commands</span>
          </button>

          {/* Secondary: Reject (Carbon Lift #1d1a18 fill with #eeeeee text) */}
          <button
            id="btn-hitl-reject"
            onClick={() => setShowRejectDialog(true)}
            disabled={deploying}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-[#1d1a18] hover:bg-[#252220] text-[#eeeeee] text-xs font-mono uppercase tracking-tight rounded-[3px] border border-[#3d3a39] disabled:opacity-50 transition-colors ml-auto"
          >
            <XCircle className="w-3.5 h-3.5 text-[#ee6018]" />
            <span>Reject</span>
          </button>
        </div>
      )}

      {/* Rejection Note Dialog */}
      {showRejectDialog && (
        <div className="border border-[#3d3a39] bg-[#101010] p-4 rounded-[3px] space-y-3">
          <div className="eyebrow text-[#ee6018]">
            CONFIRM REJECTION OF DIAGNOSTIC RECOMMENDATION
          </div>

          <p className="text-xs text-[#8a8380] font-sans">
            Provide the technical rationale for rejecting this recommendation (logged to Responsible AI Audit Trail):
          </p>

          <input
            id="rejection-note-input"
            type="text"
            placeholder="e.g. Would violate trunk security baseline / Incorrect sub-interface / Alternative route preferred"
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
            className="w-full text-xs font-sans p-2.5 bg-[#1d1a18] text-[#eeeeee] border border-[#3d3a39] rounded-[3px] focus:outline-none focus:border-[#fafafa]"
          />

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowRejectDialog(false)}
              className="px-3 py-1.5 text-xs font-mono uppercase text-[#8a8380] hover:text-[#eeeeee]"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-reject"
              onClick={handleRejectConfirm}
              className="px-4 py-1.5 bg-[#1d1a18] hover:bg-[#252220] border border-[#3d3a39] text-[#ee6018] text-xs font-mono uppercase tracking-tight rounded-[3px] font-medium"
            >
              Confirm Rejection
            </button>
          </div>
        </div>
      )}

      {/* Virtual Cisco Execution Terminal Output */}
      {terminalLogs.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-[#3d3a39]">
          <div className="flex items-center justify-between">
            <div className="eyebrow flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>VIRTUAL CISCO IOS EXECUTION CONSOLE</span>
            </div>
            {deploymentStatus === "running" && (
              <span className="text-[11px] font-mono uppercase text-[#ee6018] animate-pulse">
                [COMMITTING CLI CHANGES...]
              </span>
            )}
            {deploymentStatus === "success" && (
              <span className="text-[11px] font-mono uppercase text-[#a0ca92]">
                [DEPLOYED SUCCESSFULLY]
              </span>
            )}
            {deploymentStatus === "rejected" && (
              <span className="text-[11px] font-mono uppercase text-[#ee6018]">
                [DEPLOYMENT ABORTED]
              </span>
            )}
          </div>

          <div className="bg-[#101010] text-[#eeeeee] font-mono text-xs p-3.5 rounded-[3px] border border-[#3d3a39] max-h-48 overflow-y-auto space-y-1 leading-relaxed">
            {terminalLogs.map((log, i) => (
              <div key={i} className={log.includes("[OK]") || log.includes("REMEDIATION APPLIED") ? "text-[#a0ca92] font-medium" : log.includes("SECURITY REJECTION") ? "text-[#ee6018] font-medium" : ""}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
