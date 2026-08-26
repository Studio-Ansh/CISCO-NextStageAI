import React from "react";
import { TestCase, DiagnosisResult } from "../types";
import { Zap, Sparkles, Terminal } from "lucide-react";

interface DiagnosisWorkbenchProps {
  testCase: TestCase;
  diagnosis: DiagnosisResult | null;
  loading: boolean;
  onRunDiagnosis: (forceAi?: boolean) => void;
}

export const DiagnosisWorkbench: React.FC<DiagnosisWorkbenchProps> = ({
  testCase,
  diagnosis,
  loading,
  onRunDiagnosis
}) => {
  const isRule = diagnosis?.source === "rule";
  const sourceDot = isRule ? "bg-[#8a8380]" : "bg-[#ee6018]";
  const sourceLabel = isRule ? "RULE-DETECTED (DETERMINISTIC)" : "AI-DETECTED (GEMINI REASONING)";

  return (
    <div className="space-y-4">
      {/* Workbench Controls Header */}
      <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="eyebrow">DUAL-ENGINE TROUBLESHOOTING PIPELINE</div>
          <h3 className="text-base font-medium tracking-[-0.4px] text-[#eeeeee]">
            Deterministic Regex Engine &rarr; Gemini 3.7 Flash
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-run-diagnosis"
            onClick={() => onRunDiagnosis(false)}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-[#fafafa] hover:bg-[#eaeaea] text-[#101010] text-xs font-mono uppercase tracking-tight rounded-[3px] disabled:opacity-50 transition-opacity font-medium cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#101010] border-t-transparent rounded-full animate-spin" />
                <span>Running Scan...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Run NetSage Diagnosis</span>
              </>
            )}
          </button>

          <button
            id="btn-force-ai-diagnosis"
            onClick={() => onRunDiagnosis(true)}
            disabled={loading}
            title="Bypass regex rules and invoke Gemini 3.7 Flash reasoning"
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#1d1a18] hover:bg-[#252220] text-[#eeeeee] border border-[#3d3a39] text-xs font-mono uppercase tracking-tight rounded-[3px] disabled:opacity-50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ee6018]" />
            <span className="hidden sm:inline">Force LLM</span>
          </button>
        </div>
      </div>

      {/* Diagnosis State Display */}
      {!diagnosis && !loading ? (
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-8 text-center space-y-2">
          <div className="eyebrow">AWAITING EXECUTION</div>
          <p className="text-xs text-[#8a8380] max-w-lg mx-auto font-sans leading-relaxed">
            Click <b>RUN NETSAGE DIAGNOSIS</b> to initiate the dual-engine scan. Telemetry is evaluated first against 30+ deterministic regex fault signatures at microsecond latency, falling back to Gemini AI when deeper contextual reasoning is required.
          </p>
        </div>
      ) : loading ? (
        <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] p-8 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-[#fafafa] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="eyebrow">ANALYZING PACKET TRACER TELEMETRY</div>
          <p className="text-xs text-[#8a8380] font-mono">Running regex rule checker &rarr; Gemini 3.7 Flash</p>
        </div>
      ) : (
        /* Signature Light Surface Card (Figure-on-Dark Focal Point) */
        <div className="bg-[#eeeeee] text-[#101010] rounded-[10px] p-6 space-y-4">
          {/* Header & Source Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d8d8d8] pb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#101010] text-[#eeeeee] font-mono text-[11px] uppercase tracking-tight">
              <span className={`w-1.5 h-1.5 rounded-full ${sourceDot}`}></span>
              {sourceLabel}
            </span>

            <span className="font-mono text-[11px] uppercase text-[#4d4947]">
              {diagnosis.engine_note}
            </span>
          </div>

          {/* Root Cause Title */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-tight text-[#4d4947] mb-1">IDENTIFIED ROOT CAUSE</div>
            <h3 className="text-lg sm:text-xl font-medium tracking-[-0.4px] text-[#101010]">
              {diagnosis.root_cause}
            </h3>
          </div>

          {/* Layer and Confidence Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-y border-[#dedede] py-3">
            <div>
              <div className="font-mono text-[11px] uppercase text-[#4d4947]">OSI LAYER</div>
              <div className="text-sm font-medium text-[#101010] mt-0.5">{diagnosis.osi_layer}</div>
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase text-[#4d4947]">CONFIDENCE</div>
              <div className="text-sm font-medium text-[#101010] mt-0.5">{diagnosis.confidence}</div>
            </div>
            {diagnosis.execution_time_ms !== undefined && (
              <div>
                <div className="font-mono text-[11px] uppercase text-[#4d4947]">EXECUTION TIME</div>
                <div className="text-sm font-mono text-[#101010] mt-0.5">{diagnosis.execution_time_ms}ms</div>
              </div>
            )}
          </div>

          {/* Grounded Evidence */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-tight text-[#4d4947] mb-1">GROUNDED TELEMETRY EVIDENCE</div>
            <div className="bg-[#e4e4e4] border border-[#d0d0d0] rounded-[3px] p-3 font-mono text-xs text-[#202020] leading-relaxed">
              "{diagnosis.evidence}"
            </div>
          </div>

          {/* Verification Command */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-tight text-[#4d4947] mb-1">RECOMMENDED VERIFICATION COMMAND</div>
            <div className="bg-[#dedede] border border-[#cecece] rounded-[3px] px-3 py-2 font-mono text-xs text-[#101010] flex items-center justify-between">
              <code>{diagnosis.next_command}</code>
            </div>
          </div>

          {/* Proposed Fix Preview inside Light Card */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-tight text-[#4d4947] mb-1">PROPOSED CISCO IOS FIX STEPS</div>
            <div className="bg-[#101010] text-[#eeeeee] font-mono text-xs p-4 rounded-[4px] border border-[#282828] space-y-1 overflow-x-auto">
              {diagnosis.fix_steps.map((cmd, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-[#8a8380] select-none mr-2">{idx + 1}</span>
                  <span>{cmd}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
