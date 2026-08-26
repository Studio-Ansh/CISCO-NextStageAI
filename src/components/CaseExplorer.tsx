import React from "react";
import { TestCase, FilterState } from "../types";
import { Search, ChevronRight } from "lucide-react";

interface CaseExplorerProps {
  cases: TestCase[];
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  diagnosedCaseIds: Set<string>;
}

export const CaseExplorer: React.FC<CaseExplorerProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  filters,
  setFilters,
  diagnosedCaseIds
}) => {
  const uniqueLayers = ["All", "Layer 2", "Layer 3", "Layer 4", "Layer 7", "Layer 3/4", "Layer 2/3"];
  const uniqueSeverities = ["All", "High", "Medium", "Low"];
  const uniqueConcepts = ["All", ...Array.from(new Set<string>(cases.map(c => c.concept_tag))).sort()];

  const filteredCases = cases.filter(c => {
    const matchesSearch =
      c.case_id.toLowerCase().includes(filters.search.toLowerCase()) ||
      c.symptom.toLowerCase().includes(filters.search.toLowerCase()) ||
      c.concept_tag.toLowerCase().includes(filters.search.toLowerCase()) ||
      c.expected_fault.toLowerCase().includes(filters.search.toLowerCase());

    const matchesLayer = filters.layer === "All" || c.osi_layer === filters.layer;
    const matchesSeverity = filters.severity === "All" || c.severity === filters.severity;
    const matchesConcept = filters.conceptTag === "All" || c.concept_tag === filters.conceptTag;

    return matchesSearch && matchesLayer && matchesSeverity && matchesConcept;
  });

  return (
    <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] flex flex-col h-[calc(100vh-140px)] min-h-[620px]">
      {/* Search and Filters Header */}
      <div className="p-3.5 border-b border-[#3d3a39] space-y-3">
        <div className="flex items-center justify-between">
          <div className="eyebrow">SCENARIO DATASET</div>
          <span className="font-mono text-[11px] uppercase text-[#8a8380]">
            {filteredCases.length} / {cases.length} CASES
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8a8380]" />
          <input
            id="case-search-input"
            type="text"
            placeholder="Search symptoms, faults, tags..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#101010] border border-[#3d3a39] rounded-[3px] focus:outline-none focus:border-[#fafafa] text-[#eeeeee] placeholder-[#8a8380] font-sans transition-colors"
          />
        </div>

        {/* Filter Rows */}
        <div className="space-y-2">
          {/* OSI Layer Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
            {uniqueLayers.map(layer => (
              <button
                key={layer}
                onClick={() => setFilters(prev => ({ ...prev, layer }))}
                className={`px-2 py-0.5 rounded-[3px] font-mono text-[11px] uppercase whitespace-nowrap transition-colors ${
                  filters.layer === layer
                    ? "bg-[#fafafa] text-[#101010] font-medium"
                    : "bg-[#101010] text-[#b8b3b0] hover:text-[#eeeeee] border border-[#3d3a39]"
                }`}
              >
                {layer}
              </button>
            ))}
          </div>

          {/* Concept & Severity Selectors */}
          <div className="grid grid-cols-2 gap-1.5">
            <select
              id="concept-filter-select"
              value={filters.conceptTag}
              onChange={(e) => setFilters(prev => ({ ...prev, conceptTag: e.target.value }))}
              className="text-[11px] font-mono uppercase bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1 text-[#eeeeee] focus:outline-none focus:border-[#fafafa]"
            >
              <option value="All">CONCEPTS (ALL)</option>
              {uniqueConcepts.filter(c => c !== "All").map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>

            <select
              id="severity-filter-select"
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
              className="text-[11px] font-mono uppercase bg-[#101010] border border-[#3d3a39] rounded-[3px] px-2 py-1 text-[#eeeeee] focus:outline-none focus:border-[#fafafa]"
            >
              <option value="All">SEVERITY (ALL)</option>
              {uniqueSeverities.filter(s => s !== "All").map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Case List Scrollable Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#282624] p-1">
        {filteredCases.length === 0 ? (
          <div className="p-6 text-center text-[#8a8380] text-xs font-mono uppercase">
            No matching troubleshooting cases found.
          </div>
        ) : (
          filteredCases.map((c) => {
            const isSelected = c.case_id === selectedCaseId;
            const isDiagnosed = diagnosedCaseIds.has(c.case_id);

            const isHighSev = c.severity === "High";

            return (
              <button
                key={c.case_id}
                id={`case-card-${c.case_id}`}
                onClick={() => onSelectCase(c.case_id)}
                className={`w-full text-left p-2.5 rounded-[3px] transition-colors flex items-start justify-between space-x-2 my-0.5 ${
                  isSelected
                    ? "bg-[#282523] border border-[#fafafa]"
                    : "hover:bg-[#252220] border border-transparent"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <span className="font-mono text-xs font-medium text-[#eeeeee]">{c.case_id}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded-[2px] bg-[#101010] text-[#b8b3b0] border border-[#3d3a39]">
                      {c.osi_layer}
                    </span>
                    
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-1.5 py-0.2 rounded-[2px] bg-[#101010] border border-[#3d3a39] text-[#b8b3b0]">
                      <span className={`w-1.5 h-1.5 rounded-full ${isHighSev ? "bg-[#ee6018]" : "bg-[#8a8380]"}`}></span>
                      {c.severity}
                    </span>

                    {isDiagnosed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-1.5 py-0.2 rounded-[2px] bg-[#101010] text-[#a0ca92] border border-[#3d3a39]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]"></span>
                        READY
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#eeeeee] font-sans line-clamp-1">
                    {c.symptom}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8a8380]">
                    <span className="truncate">{c.concept_tag}</span>
                    <span className="text-[10px] text-[#8a8380] truncate max-w-[130px]">
                      {c.expected_fault}
                    </span>
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 mt-1 transition-transform ${isSelected ? "text-[#eeeeee] translate-x-0.5" : "text-[#4d4947]"}`} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
