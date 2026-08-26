import React, { useState } from "react";
import { TestCase } from "../types";
import { Copy, Check } from "lucide-react";

interface CaseDetailsViewProps {
  testCase: TestCase;
}

export const CaseDetailsView: React.FC<CaseDetailsViewProps> = ({ testCase }) => {
  const [copied, setCopied] = useState(false);

  const copyTelemetry = () => {
    navigator.clipboard.writeText(testCase.show_outputs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHighSev = testCase.severity === "High";

  return (
    <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-5 space-y-4">
      {/* Case Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3d3a39] pb-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-medium bg-[#101010] text-[#eeeeee] px-2 py-0.5 rounded-[2px] border border-[#3d3a39]">
              {testCase.case_id}
            </span>
            <span className="eyebrow">CASE SCENARIO</span>
          </div>
          <h2 className="text-lg sm:text-xl font-medium tracking-[-0.5px] text-[#eeeeee]">{testCase.symptom}</h2>
        </div>

        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-[#101010] text-[#b8b3b0] border border-[#3d3a39]">
            {testCase.osi_layer}
          </span>
          <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-[#101010] text-[#b8b3b0] border border-[#3d3a39]">
            {testCase.concept_tag}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-[#101010] text-[#eeeeee] border border-[#3d3a39]">
            <span className={`w-1.5 h-1.5 rounded-full ${isHighSev ? "bg-[#ee6018]" : "bg-[#8a8380]"}`}></span>
            {testCase.severity}
          </span>
        </div>
      </div>

      {/* Topology Context Box */}
      <div className="bg-[#101010] border border-[#3d3a39] rounded-[3px] p-3 space-y-1 text-xs text-[#eeeeee]">
        <div className="eyebrow">LAB TOPOLOGY &amp; HARDWARE CONTEXT</div>
        <p className="text-[#b8b3b0] font-sans text-xs leading-relaxed">{testCase.topology_note}</p>
      </div>

      {/* Cisco IOS Show Output Terminal Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="eyebrow">RAW CISCO IOS SHOW TELEMETRY</div>

          <button
            id="btn-copy-telemetry"
            onClick={copyTelemetry}
            className="flex items-center space-x-1 text-[11px] font-mono uppercase text-[#b8b3b0] hover:text-[#eeeeee] px-2 py-0.5 rounded-[3px] bg-[#101010] hover:bg-[#252220] border border-[#3d3a39] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#a0ca92]" />
                <span className="text-[#a0ca92]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[#8a8380]" />
                <span>Copy Output</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-[#101010] text-[#eeeeee] font-mono text-xs p-3.5 rounded-[3px] border border-[#3d3a39] overflow-x-auto whitespace-pre leading-relaxed max-h-56 overflow-y-auto">
          {testCase.show_outputs}
        </div>
      </div>
    </div>
  );
};
