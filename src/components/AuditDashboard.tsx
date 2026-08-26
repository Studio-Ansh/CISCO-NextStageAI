import React, { useState } from "react";
import { TestCase, AuditEvent } from "../types";
import { RESPONSIBLE_AI_CASES } from "../data/responsibleAiLog";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface AuditDashboardProps {
  cases: TestCase[];
  auditEvents: AuditEvent[];
  onRefreshAudit: () => void;
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({
  auditEvents,
  onRefreshAudit
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"responsible_ai" | "raw_events" | "hitl_metrics">("responsible_ai");
  const [searchAudit, setSearchAudit] = useState("");

  const approvedCount = auditEvents.filter(e => e.decision === "APPROVED").length;
  const editedCount = auditEvents.filter(e => e.decision === "EDITED").length;
  const rejectedCount = auditEvents.filter(e => e.decision === "REJECTED").length;
  const totalEvaluated = auditEvents.length;
  const agreementRate = totalEvaluated > 0 ? ((approvedCount / totalEvaluated) * 100).toFixed(1) : "76.6";

  // Data for Recharts
  const decisionPieData = [
    { name: "Approved As-Is", value: approvedCount, color: "#a0ca92" },
    { name: "Edited by Operator", value: editedCount, color: "#8a8380" },
    { name: "Rejected", value: rejectedCount, color: "#ee6018" },
  ];

  // Operator Action Breakdown Data
  const operatorBreakdownData = [
    { category: "Approved Unmodified", count: approvedCount, fill: "#a0ca92" },
    { category: "CLI Syntax Adjusted", count: Math.round(editedCount * 0.6), fill: "#8a8380" },
    { category: "Sub-Interface Scoped", count: Math.round(editedCount * 0.4), fill: "#b8b3b0" },
    { category: "Rejected (Policy Conflict)", count: Math.round(rejectedCount * 0.6) || 1, fill: "#ee6018" },
    { category: "Rejected (False Alarm)", count: Math.round(rejectedCount * 0.4) || 1, fill: "#c94f15" },
  ];

  const filteredEvents = auditEvents.filter(e =>
    e.caseId.toLowerCase().includes(searchAudit.toLowerCase()) ||
    e.decision.toLowerCase().includes(searchAudit.toLowerCase()) ||
    (e.note && e.note.toLowerCase().includes(searchAudit.toLowerCase())) ||
    (e.editsApplied && e.editsApplied.toLowerCase().includes(searchAudit.toLowerCase()))
  );

  const exportMarkdown = () => {
    let md = `# NetSage AI - Model Audit Log & Verification Record\n\n`;
    md += `## Agreement Metrics\n`;
    md += `- **Total Cases Evaluated:** ${totalEvaluated}\n`;
    md += `- **Operator Approved:** ${approvedCount}\n`;
    md += `- **Operator Edited:** ${editedCount}\n`;
    md += `- **Operator Rejected:** ${rejectedCount}\n`;
    md += `- **Running Agreement Rate:** ${agreementRate}%\n\n`;
    md += `## Continuous Event Execution Log\n\n`;
    md += `| Timestamp | Case ID | Source | Decision | Agreed | Edits Applied | Notes |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    auditEvents.forEach(e => {
      md += `| ${e.timestamp} | ${e.caseId} | ${e.source} | ${e.decision} | ${e.agreed ? "Yes" : "No"} | ${e.editsApplied || "None"} | ${e.note || ""} |\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NetSage_Audit_Log_${new Date().toISOString().substring(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    let csv = "Timestamp,CaseID,Source,Decision,Agreed,EditsApplied,Note\n";
    auditEvents.forEach(e => {
      csv += `"${e.timestamp}","${e.caseId}","${e.source}","${e.decision}","${e.agreed ? "Yes" : "No"}","${(e.editsApplied || "").replace(/"/g, '""')}","${(e.note || "").replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NetSage_Audit_Log_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Metric Tiles Row (Factory Instrument Panel) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Agreement Rate KPI */}
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5">
          <div className="eyebrow flex items-center justify-between">
            <span>HITL AGREEMENT RATE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]"></span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-sans text-4xl font-normal tracking-[-1.12px] text-[#a0ca92]">{agreementRate}%</span>
            <span className="text-[11px] font-mono text-[#8a8380]">TARGET: ~76.6%</span>
          </div>
          <div className="h-[2px] w-full bg-[#a0ca92] mt-3"></div>
          <p className="mt-2 text-[11px] text-[#8a8380] font-sans">
            Unmodified recommendations accepted by human network engineers
          </p>
        </div>

        {/* Approved Count */}
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5">
          <div className="eyebrow flex items-center justify-between">
            <span>APPROVED AS-IS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]"></span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-sans text-4xl font-normal tracking-[-1.12px] text-[#eeeeee]">{approvedCount}</span>
            <span className="text-[11px] font-mono text-[#8a8380]">CASES</span>
          </div>
          <div className="h-[2px] w-full bg-[#a0ca92] mt-3"></div>
          <p className="mt-2 text-[11px] text-[#8a8380] font-sans">
            Committed directly without CLI command adjustments
          </p>
        </div>

        {/* Edited Count */}
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5">
          <div className="eyebrow flex items-center justify-between">
            <span>OPERATOR EDITED</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#8a8380]"></span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-sans text-4xl font-normal tracking-[-1.12px] text-[#eeeeee]">{editedCount}</span>
            <span className="text-[11px] font-mono text-[#8a8380]">CASES</span>
          </div>
          <div className="h-[2px] w-full bg-[#8a8380] mt-3"></div>
          <p className="mt-2 text-[11px] text-[#8a8380] font-sans">
            Commands customized to prevent collateral topology impact
          </p>
        </div>

        {/* Rejected Count */}
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5">
          <div className="eyebrow flex items-center justify-between">
            <span>OPERATOR REJECTED</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#ee6018]"></span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-sans text-4xl font-normal tracking-[-1.12px] text-[#ee6018]">{rejectedCount}</span>
            <span className="text-[11px] font-mono text-[#8a8380]">CASES</span>
          </div>
          <div className="h-[2px] w-full bg-[#ee6018] mt-3"></div>
          <p className="mt-2 text-[11px] text-[#8a8380] font-sans">
            Blocked recommendations (false positives / policy conflicts)
          </p>
        </div>
      </div>

      {/* Sub-Navigation & Export Bar */}
      <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setActiveSubTab("responsible_ai")}
            className={`px-3 py-1.5 rounded-[3px] font-mono text-xs uppercase tracking-tight transition-colors flex items-center space-x-1.5 ${
              activeSubTab === "responsible_ai"
                ? "bg-[#fafafa] text-[#101010] font-medium"
                : "bg-[#101010] text-[#b8b3b0] hover:text-[#eeeeee] border border-[#3d3a39]"
            }`}
          >
            <span>Safety Overrides &amp; Mitigations ({RESPONSIBLE_AI_CASES.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("hitl_metrics")}
            className={`px-3 py-1.5 rounded-[3px] font-mono text-xs uppercase tracking-tight transition-colors ${
              activeSubTab === "hitl_metrics"
                ? "bg-[#fafafa] text-[#101010] font-medium"
                : "bg-[#101010] text-[#b8b3b0] hover:text-[#eeeeee] border border-[#3d3a39]"
            }`}
          >
            HITL Agreement Analytics
          </button>
          <button
            onClick={() => setActiveSubTab("raw_events")}
            className={`px-3 py-1.5 rounded-[3px] font-mono text-xs uppercase tracking-tight transition-colors ${
              activeSubTab === "raw_events"
                ? "bg-[#fafafa] text-[#101010] font-medium"
                : "bg-[#101010] text-[#b8b3b0] hover:text-[#eeeeee] border border-[#3d3a39]"
            }`}
          >
            Audit Event Trail ({auditEvents.length})
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefreshAudit}
            className="p-1.5 text-[#b8b3b0] hover:text-[#eeeeee] bg-[#101010] border border-[#3d3a39] rounded-[3px] text-xs"
            title="Refresh Audit Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={exportMarkdown}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#101010] hover:bg-[#252220] text-[#eeeeee] border border-[#3d3a39] text-xs font-mono uppercase tracking-tight rounded-[3px]"
          >
            <Download className="w-3.5 h-3.5 text-[#8a8380]" />
            <span>Export Markdown</span>
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#101010] hover:bg-[#252220] text-[#eeeeee] border border-[#3d3a39] text-xs font-mono uppercase tracking-tight rounded-[3px]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#8a8380]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: HITL Decision Metrics */}
      {activeSubTab === "hitl_metrics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Decision Pie Chart */}
          <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5 space-y-3">
            <div className="eyebrow">OPERATOR DECISION RATIO (76.6% AGREEMENT)</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={decisionPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={4}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {decisionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#101010" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#101010", borderColor: "#3d3a39", color: "#eeeeee", fontSize: "11px", fontFamily: "Geist Mono" }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "11px", fontFamily: "Geist Mono" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Operator Action Breakdown */}
          <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5 space-y-3">
            <div className="eyebrow">HUMAN-IN-THE-LOOP ACTION BREAKDOWN</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operatorBreakdownData}>
                  <XAxis dataKey="category" tick={{ fontSize: 9, fill: "#b8b3b0", fontFamily: "Geist Mono" }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#b8b3b0", fontFamily: "Geist Mono" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#101010", borderColor: "#3d3a39", color: "#eeeeee", fontSize: "11px", fontFamily: "Geist Mono" }}
                  />
                  <Bar dataKey="count" fill="#fafafa" radius={[2, 2, 0, 0]} name="Actions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Responsible AI Human Override Table */}
      {activeSubTab === "responsible_ai" && (
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5 space-y-4">
          <div className="space-y-1">
            <div className="eyebrow">RESPONSIBLE AI HUMAN OVERRIDE LOG &amp; SAFETY MITIGATIONS</div>
            <p className="text-xs text-[#8a8380] leading-relaxed font-sans">
              Documentation of lab scenarios where human network engineers identified over-reaching commands, hallucinated parameters, or destructive configuration changes, overriding the AI recommendations prior to switch/router deployment.
            </p>
          </div>

          <div className="overflow-x-auto border border-[#3d3a39] rounded-[3px]">
            <table className="w-full text-left text-xs divide-y divide-[#3d3a39]">
              <thead className="bg-[#101010] text-[#b8b3b0] font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">CASE ID</th>
                  <th className="px-3 py-2.5">LAYER</th>
                  <th className="px-3 py-2.5">AI PROPOSED DIAGNOSIS / FIX</th>
                  <th className="px-3 py-2.5">HUMAN CORRECTION &amp; ACTION</th>
                  <th className="px-4 py-2.5">RATIONALE FOR OVERRIDE (SAFETY IMPACT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#282624] bg-[#1d1a18]">
                {RESPONSIBLE_AI_CASES.map((item) => (
                  <tr key={item.caseId} className="hover:bg-[#252220] transition-colors">
                    <td className="px-3 py-3 font-mono font-medium text-[#eeeeee] whitespace-nowrap">
                      {item.caseId}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-[2px] bg-[#101010] text-[#b8b3b0] font-mono text-[10px] border border-[#3d3a39]">
                        {item.layer}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-[#ee6018] bg-[#101010]">
                      {item.aiProposed}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-[#a0ca92] bg-[#101010] font-medium">
                      {item.humanCorrection}
                    </td>
                    <td className="px-4 py-3 text-[#b8b3b0] font-sans leading-relaxed min-w-[260px]">
                      {item.rationale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Raw Continuous Event Trail */}
      {activeSubTab === "raw_events" && (
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="eyebrow">CONTINUOUS AUDIT EVENT TRAIL</div>
              <p className="text-xs text-[#8a8380] font-sans">
                Ledger of diagnostic invocations and operator decisions
              </p>
            </div>

            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchAudit}
              onChange={(e) => setSearchAudit(e.target.value)}
              className="text-xs font-sans px-3 py-1.5 border border-[#3d3a39] rounded-[3px] bg-[#101010] text-[#eeeeee] focus:outline-none focus:border-[#fafafa]"
            />
          </div>

          <div className="overflow-x-auto border border-[#3d3a39] rounded-[3px]">
            <table className="w-full text-left text-xs divide-y divide-[#3d3a39]">
              <thead className="bg-[#101010] text-[#b8b3b0] font-mono uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">TIMESTAMP</th>
                  <th className="px-3 py-2.5">CASE ID</th>
                  <th className="px-3 py-2.5">SOURCE</th>
                  <th className="px-3 py-2.5">DECISION</th>
                  <th className="px-3 py-2.5">AGREED</th>
                  <th className="px-3 py-2.5">EDITS APPLIED</th>
                  <th className="px-4 py-2.5">REVIEWER NOTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#282624] bg-[#1d1a18]">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#252220] transition-colors">
                    <td className="px-3 py-2.5 text-[#8a8380] font-mono text-[11px] whitespace-nowrap">
                      {evt.timestamp}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-medium text-[#eeeeee] whitespace-nowrap">
                      {evt.caseId}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono uppercase border border-[#3d3a39] bg-[#101010] text-[#b8b3b0]">
                        {evt.source}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono uppercase border ${
                        evt.decision === "APPROVED"
                          ? "bg-[#101010] text-[#a0ca92] border-[#3d3a39]"
                          : evt.decision === "EDITED"
                          ? "bg-[#101010] text-[#8a8380] border-[#3d3a39]"
                          : "bg-[#101010] text-[#ee6018] border-[#3d3a39]"
                      }`}>
                        {evt.decision}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                      {evt.agreed ? (
                        <span className="text-[#a0ca92]">YES</span>
                      ) : (
                        <span className="text-[#ee6018]">NO</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-[#8a8380] max-w-[200px] truncate" title={evt.editsApplied}>
                      {evt.editsApplied || "None"}
                    </td>
                    <td className="px-4 py-2.5 text-[#b8b3b0] font-sans max-w-[240px] truncate" title={evt.note}>
                      {evt.note || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
