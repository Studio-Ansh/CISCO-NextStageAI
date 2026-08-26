import React, { useState } from "react";
import { TestCase } from "../types";
import { Database, Layers, ShieldAlert, Cpu, Download, Search, Eye, Filter } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";

interface DatasetAnalyticsDashboardProps {
  cases: TestCase[];
  onSelectCaseToDiagnose?: (caseId: string) => void;
}

export const DatasetAnalyticsDashboard: React.FC<DatasetAnalyticsDashboardProps> = ({
  cases,
  onSelectCaseToDiagnose
}) => {
  const [selectedConcept, setSelectedConcept] = useState<string>("All");
  const [selectedLayer, setSelectedLayer] = useState<string>("All");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [inspectCase, setInspectCase] = useState<TestCase | null>(null);

  // Concept Distribution
  const conceptCounts: Record<string, number> = {};
  cases.forEach(c => {
    conceptCounts[c.concept_tag] = (conceptCounts[c.concept_tag] || 0) + 1;
  });
  const conceptData = Object.keys(conceptCounts)
    .map(concept => ({
      concept,
      count: conceptCounts[concept]
    }))
    .sort((a, b) => b.count - a.count);

  // Layer Distribution
  const layerCounts: Record<string, number> = {};
  cases.forEach(c => {
    layerCounts[c.osi_layer] = (layerCounts[c.osi_layer] || 0) + 1;
  });
  const layerData = Object.keys(layerCounts).map(layer => ({
    layer,
    count: layerCounts[layer]
  }));

  // Severity Distribution
  const severityCounts: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
  cases.forEach(c => {
    severityCounts[c.severity] = (severityCounts[c.severity] || 0) + 1;
  });
  const severityData = [
    { name: "High Severity", value: severityCounts.High, color: "#ee6018" },
    { name: "Medium Severity", value: severityCounts.Medium, color: "#eab308" },
    { name: "Low Severity", value: severityCounts.Low, color: "#a0ca92" }
  ];

  // Filtering
  const filteredCases = cases.filter(c => {
    const matchesSearch =
      c.case_id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.symptom.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.expected_fault.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.topology_note.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesLayer = selectedLayer === "All" || c.osi_layer === selectedLayer;
    const matchesConcept = selectedConcept === "All" || c.concept_tag === selectedConcept;

    return matchesSearch && matchesLayer && matchesConcept;
  });

  const exportDatasetCsv = () => {
    let csv = "Case ID,OSI Layer,Severity,Concept Tag,Symptom,Expected Fault,Topology Note\n";
    cases.forEach(c => {
      csv += `"${c.case_id}","${c.osi_layer}","${c.severity}","${c.concept_tag}","${c.symptom.replace(/"/g, '""')}","${c.expected_fault.replace(/"/g, '""')}","${c.topology_note.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Cisco_Packet_Tracer_Troubleshooting_Dataset_30_Cases.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDatasetJson = () => {
    const blob = new Blob([JSON.stringify(cases, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cisco_packet_tracer_cases.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Metric Tiles Row: Factory Instrument Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Lab Scenarios */}
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5">
          <div className="eyebrow flex items-center justify-between">
            <span>LAB SCENARIOS DATASET</span>
            <Database className="w-3.5 h-3.5 text-[#b8b3b0]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-sans text-4xl font-normal tracking-[-1.12px] text-[#fafafa]">{cases.length}</span>
            <span className="text-[11px] font-mono text-[#8a8380]">PACKET TRACER CASES</span>
          </div>
          <div className="h-[2px] w-full bg-[#fafafa] mt-3"></div>
          <p className="mt-2 text-[11px] text-[#8a8380] font-sans">
            Standardized CCNA / CCNP network troubleshooting labs
          </p>
        </div>

        {/* OSI Layer Coverage */}
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5">
          <div className="eyebrow flex items-center justify-between">
            <span>OSI LAYER SPREAD</span>
            <Layers className="w-3.5 h-3.5 text-[#b8b3b0]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-sans text-4xl font-normal tracking-[-1.12px] text-[#eeeeee]">
              {Object.keys(layerCounts).length}
            </span>
            <span className="text-[11px] font-mono text-[#8a8380]">STACK LAYERS</span>
          </div>
          <div className="h-[2px] w-full bg-[#8a8380] mt-3"></div>
          <p className="mt-2 text-[11px] text-[#8a8380] font-sans">
            Layer 2 (Switching), Layer 3 (Routing), Layer 4, Layer 7
          </p>
        </div>

        {/* High Severity Critical Faults */}
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5">
          <div className="eyebrow flex items-center justify-between">
            <span>HIGH SEVERITY LABS</span>
            <ShieldAlert className="w-3.5 h-3.5 text-[#ee6018]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-sans text-4xl font-normal tracking-[-1.12px] text-[#ee6018]">{severityCounts.High}</span>
            <span className="text-[11px] font-mono text-[#8a8380]">OUTAGE SCENARIOS</span>
          </div>
          <div className="h-[2px] w-full bg-[#ee6018] mt-3"></div>
          <p className="mt-2 text-[11px] text-[#8a8380] font-sans">
            Total link drops, routing protocol deadlocks &amp; trunk failures
          </p>
        </div>

        {/* Deterministic Rule Coverage */}
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5">
          <div className="eyebrow flex items-center justify-between">
            <span>DETERMINISTIC REGEX RULES</span>
            <Cpu className="w-3.5 h-3.5 text-[#a0ca92]" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="font-sans text-4xl font-normal tracking-[-1.12px] text-[#a0ca92]">30+</span>
            <span className="text-[11px] font-mono text-[#8a8380]">FAULT SIGNATURES</span>
          </div>
          <div className="h-[2px] w-full bg-[#a0ca92] mt-3"></div>
          <p className="mt-2 text-[11px] text-[#8a8380] font-sans">
            Microsecond execution rules with fallback to Gemini 3.7
          </p>
        </div>
      </div>

      {/* Dataset Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OSI Layer Breakdown */}
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-4 space-y-3">
          <div className="eyebrow">SCENARIOS BY OSI LAYER</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={layerData}>
                <XAxis dataKey="layer" tick={{ fontSize: 10, fill: "#b8b3b0", fontFamily: "Geist Mono" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#b8b3b0", fontFamily: "Geist Mono" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#101010", borderColor: "#3d3a39", color: "#eeeeee", fontSize: "11px", fontFamily: "Geist Mono" }}
                />
                <Bar dataKey="count" fill="#fafafa" radius={[2, 2, 0, 0]} name="Cases" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Concept Tags Distribution */}
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-4 space-y-3">
          <div className="eyebrow">TOP PROTOCOL &amp; CONCEPT DOMAINS</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conceptData.slice(0, 5)}>
                <XAxis dataKey="concept" tick={{ fontSize: 10, fill: "#b8b3b0", fontFamily: "Geist Mono" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#b8b3b0", fontFamily: "Geist Mono" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#101010", borderColor: "#3d3a39", color: "#eeeeee", fontSize: "11px", fontFamily: "Geist Mono" }}
                />
                <Bar dataKey="count" fill="#8a8380" radius={[2, 2, 0, 0]} name="Scenarios" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-4 space-y-3">
          <div className="eyebrow">FAULT IMPACT SEVERITY DISTRIBUTION</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={68}
                  innerRadius={38}
                  paddingAngle={3}
                  label={(entry) => `${entry.value}`}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#101010" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#101010", borderColor: "#3d3a39", color: "#eeeeee", fontSize: "11px", fontFamily: "Geist Mono" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dataset Filter & Action Bar */}
      <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3d3a39] pb-3">
          <div>
            <div className="eyebrow">CISCO PACKET TRACER MASTER SCENARIO REPOSITORY</div>
            <p className="text-xs text-[#8a8380] font-sans">
              Comprehensive list of all 30 test scenarios with telemetry outputs and ground truth faults
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportDatasetCsv}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#101010] hover:bg-[#252220] text-[#eeeeee] border border-[#3d3a39] text-xs font-mono uppercase tracking-tight rounded-[3px] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#8a8380]" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportDatasetJson}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#101010] hover:bg-[#252220] text-[#eeeeee] border border-[#3d3a39] text-xs font-mono uppercase tracking-tight rounded-[3px] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#8a8380]" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8a8380]" />
            <input
              type="text"
              placeholder="Search case ID, symptom, fault..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#101010] border border-[#3d3a39] rounded-[3px] focus:outline-none focus:border-[#fafafa] text-[#eeeeee] placeholder-[#8a8380] font-sans"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-[#8a8380] shrink-0" />
            <select
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value)}
              className="w-full text-xs font-mono uppercase bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1.5 text-[#eeeeee] focus:outline-none focus:border-[#fafafa]"
            >
              <option value="All">ALL LAYERS</option>
              {Object.keys(layerCounts).map(l => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedConcept}
              onChange={(e) => setSelectedConcept(e.target.value)}
              className="w-full text-xs font-mono uppercase bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1.5 text-[#eeeeee] focus:outline-none focus:border-[#fafafa]"
            >
              <option value="All">ALL CONCEPTS</option>
              {Object.keys(conceptCounts).map(c => (
                <option key={c} value={c}>{c.toUpperCase()} ({conceptCounts[c]})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dataset Scenarios Table */}
        <div className="overflow-x-auto border border-[#3d3a39] rounded-[3px]">
          <table className="w-full text-left text-xs divide-y divide-[#3d3a39]">
            <thead className="bg-[#101010] text-[#b8b3b0] font-mono uppercase text-[10px]">
              <tr>
                <th className="px-3 py-2.5">CASE ID</th>
                <th className="px-3 py-2.5">LAYER</th>
                <th className="px-3 py-2.5">SEVERITY</th>
                <th className="px-3 py-2.5">CONCEPT</th>
                <th className="px-3 py-2.5">OBSERVED SYMPTOM</th>
                <th className="px-3 py-2.5">GROUND TRUTH FAULT</th>
                <th className="px-3 py-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#282624] bg-[#1d1a18]">
              {filteredCases.map((c) => (
                <tr key={c.case_id} className="hover:bg-[#252220] transition-colors">
                  <td className="px-3 py-2.5 font-mono font-medium text-[#eeeeee] whitespace-nowrap">
                    {c.case_id}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-[2px] bg-[#101010] text-[#b8b3b0] font-mono text-[10px] border border-[#3d3a39]">
                      {c.osi_layer}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono uppercase border border-[#3d3a39] bg-[#101010] ${
                      c.severity === "High" ? "text-[#ee6018]" : "text-[#b8b3b0]"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.severity === "High" ? "bg-[#ee6018]" : "bg-[#8a8380]"}`}></span>
                      {c.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[#b8b3b0] whitespace-nowrap">
                    {c.concept_tag}
                  </td>
                  <td className="px-3 py-2.5 text-[#eeeeee] font-sans max-w-[240px] truncate" title={c.symptom}>
                    {c.symptom}
                  </td>
                  <td className="px-3 py-2.5 text-[#8a8380] font-mono text-[11px] max-w-[220px] truncate" title={c.expected_fault}>
                    {c.expected_fault}
                  </td>
                  <td className="px-3 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => setInspectCase(c)}
                      className="px-2 py-1 bg-[#101010] hover:bg-[#252220] border border-[#3d3a39] text-[#eeeeee] rounded-[3px] text-[11px] font-mono uppercase transition-colors inline-flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3 text-[#8a8380]" />
                      <span>Inspect</span>
                    </button>
                    {onSelectCaseToDiagnose && (
                      <button
                        onClick={() => onSelectCaseToDiagnose(c.case_id)}
                        className="px-2 py-1 bg-[#fafafa] hover:bg-[#eaeaea] text-[#101010] rounded-[3px] text-[11px] font-mono uppercase font-medium transition-colors"
                      >
                        Diagnose
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Telemetry Inspector Modal */}
      {inspectCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#101010] border-b border-[#3d3a39]">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-medium px-2 py-0.5 rounded-[2px] bg-[#1d1a18] border border-[#3d3a39] text-[#eeeeee]">
                  {inspectCase.case_id}
                </span>
                <span className="eyebrow">DETAILED SCENARIO TELEMETRY</span>
              </div>
              <button
                onClick={() => setInspectCase(null)}
                className="text-xs font-mono uppercase text-[#8a8380] hover:text-[#eeeeee]"
              >
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <div className="eyebrow mb-1">SYMPTOM</div>
                <h3 className="text-base font-medium text-[#eeeeee]">{inspectCase.symptom}</h3>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="bg-[#101010] p-2.5 rounded-[3px] border border-[#3d3a39]">
                  <span className="text-[#8a8380] block text-[10px] uppercase">OSI Layer</span>
                  <span className="text-[#eeeeee] font-medium">{inspectCase.osi_layer}</span>
                </div>
                <div className="bg-[#101010] p-2.5 rounded-[3px] border border-[#3d3a39]">
                  <span className="text-[#8a8380] block text-[10px] uppercase">Concept</span>
                  <span className="text-[#eeeeee] font-medium">{inspectCase.concept_tag}</span>
                </div>
                <div className="bg-[#101010] p-2.5 rounded-[3px] border border-[#3d3a39]">
                  <span className="text-[#8a8380] block text-[10px] uppercase">Severity</span>
                  <span className="text-[#ee6018] font-medium">{inspectCase.severity}</span>
                </div>
              </div>

              <div>
                <div className="eyebrow mb-1">TOPOLOGY &amp; LAB CONTEXT</div>
                <div className="bg-[#101010] border border-[#3d3a39] p-3 rounded-[3px] text-xs text-[#b8b3b0]">
                  {inspectCase.topology_note}
                </div>
              </div>

              <div>
                <div className="eyebrow mb-1">RAW CISCO IOS SHOW OUTPUT</div>
                <pre className="bg-[#101010] border border-[#3d3a39] p-3.5 rounded-[3px] text-xs font-mono text-[#eeeeee] overflow-x-auto whitespace-pre leading-relaxed">
                  {inspectCase.show_outputs}
                </pre>
              </div>

              <div>
                <div className="eyebrow mb-1">GROUND TRUTH FAULT</div>
                <div className="bg-[#101010] border border-[#3d3a39] p-3 rounded-[3px] text-xs font-mono text-[#a0ca92]">
                  {inspectCase.expected_fault}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
