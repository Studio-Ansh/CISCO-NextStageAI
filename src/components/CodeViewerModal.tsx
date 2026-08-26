import React, { useState, useEffect } from "react";
import { X, Copy, Check, Download } from "lucide-react";

interface CodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FILES = [
  { name: "checker.py", path: "src/checker.py", desc: "Deterministic Regex Rule Engine (30+ Faults)" },
  { name: "engine.py", path: "src/engine.py", desc: "Dual-Engine Orchestrator (Rules -> Gemini AI)" },
  { name: "app.py", path: "src/app.py", desc: "Streamlit UI Dashboard & HITL Gate" },
  { name: "cases.csv", path: "data/cases.csv", desc: "30 Cisco Packet Tracer Scenarios Dataset" },
  { name: "diagnose_prompt.md", path: "prompts/diagnose_prompt.md", desc: "Gemini System Prompt & JSON Schema" },
  { name: "model_audit_log.md", path: "docs/model_audit_log.md", desc: "Responsible AI Audit Log & Metrics" },
  { name: "system_config.json", path: "data/system_config.json", desc: "Configuration Settings & Metadata" },
  { name: "requirements.txt", path: "requirements.txt", desc: "Python Dependencies" },
];

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(FILES[0]);
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFileContent(selectedFile.name);
    }
  }, [isOpen, selectedFile]);

  const loadFileContent = async (fileName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${fileName}`);
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || "");
      } else {
        setFileContent(`# File ${fileName} could not be loaded directly from server.`);
      }
    } catch {
      setFileContent(`# Error loading file content for ${fileName}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] w-full max-w-5xl flex flex-col h-[640px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#101010] border-b border-[#3d3a39] text-[#eeeeee]">
          <div>
            <div className="eyebrow">SOURCE REPOSITORY &amp; CODEBASE EXPLORER</div>
            <h3 className="font-medium text-sm text-[#eeeeee]">Full Dual-Engine Architecture Files</h3>
          </div>

          <button
            onClick={onClose}
            className="text-[#8a8380] hover:text-[#eeeeee] p-1 rounded-[3px] hover:bg-[#1d1a18]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Sidebar + Editor */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File selector sidebar */}
          <div className="w-full md:w-64 bg-[#101010] border-r border-[#3d3a39] p-2.5 space-y-1 overflow-y-auto">
            <div className="eyebrow px-2 py-1">
              PROJECT FILES
            </div>
            {FILES.map((file) => {
              const isSelected = file.name === selectedFile.name;
              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-2 rounded-[3px] text-xs transition-colors flex flex-col space-y-0.5 ${
                    isSelected
                      ? "bg-[#1d1a18] text-[#eeeeee] border border-[#3d3a39]"
                      : "text-[#b8b3b0] hover:bg-[#1d1a18]/60 hover:text-[#eeeeee]"
                  }`}
                >
                  <span className="font-mono font-medium">{file.path}</span>
                  <span className="text-[10px] text-[#8a8380] truncate">{file.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Main Code View */}
          <div className="flex-1 flex flex-col bg-[#101010] overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#1d1a18] border-b border-[#3d3a39] text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-[#eeeeee] font-medium">{selectedFile.path}</span>
                <span className="text-[#8a8380] font-mono text-[11px]">
                  ({fileContent.split("\n").length} lines)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-[#101010] hover:bg-[#252220] text-[#eeeeee] rounded-[3px] border border-[#3d3a39] text-xs font-mono uppercase tracking-tight transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#a0ca92]" />
                      <span className="text-[#a0ca92]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#8a8380]" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-1 px-3 py-1 bg-[#fafafa] hover:bg-[#eaeaea] text-[#101010] rounded-[3px] text-xs font-mono uppercase tracking-tight font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-[#eeeeee] leading-relaxed bg-[#101010]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-[#8a8380]">
                  <div className="w-6 h-6 border-2 border-[#fafafa] border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="font-mono text-xs">Loading {selectedFile.name}...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{fileContent}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
