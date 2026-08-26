import React, { useState, useRef, useEffect } from "react";
import { X, Play } from "lucide-react";

interface CliSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCommand?: string;
}

export const CliSimulatorModal: React.FC<CliSimulatorModalProps> = ({
  isOpen,
  onClose,
  initialCommand
}) => {
  const [inputCommand, setInputCommand] = useState(initialCommand || "");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [terminalOutput, setTerminalOutput] = useState<Array<{ cmd?: string; text: string }>>([
    { text: "Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.4(3)M2" },
    { text: "NetSage Virtual Cisco Lab Node [Ready]" },
    { text: "Type 'help' or try: 'show ip int brief', 'show interfaces trunk', 'show ip ospf neighbor', 'ping 192.168.30.1', 'show running-config'" },
    { text: "" }
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  if (!isOpen) return null;

  const handleExecute = async (cmdToRun?: string) => {
    const cmd = (cmdToRun || inputCommand).trim();
    if (!cmd) return;

    // Add to history
    setCommandHistory(prev => [cmd, ...prev]);
    setHistoryIndex(-1);
    setInputCommand("");

    // Add user command to terminal
    setTerminalOutput(prev => [...prev, { cmd, text: "" }]);

    const lower = cmd.toLowerCase();

    if (lower === "help" || lower === "?") {
      setTerminalOutput(prev => [
        ...prev,
        {
          text: `Supported Cisco IOS Commands in Simulator:
  show ip int brief        - List interfaces and status
  show interfaces trunk    - List 802.1Q trunking status and allowed VLANs
  show ip ospf neighbor    - Inspect OSPF neighbor states
  show ip nat translations - Show NAT/PAT translation table
  show running-config      - View active router configuration
  ping <ip_address>        - ICMP echo request ping test
  clear                    - Clear terminal screen`
        }
      ]);
      return;
    }

    if (lower === "clear") {
      setTerminalOutput([]);
      return;
    }

    try {
      const res = await fetch("/api/simulate-cli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      setTerminalOutput(prev => [...prev, { text: data.output || "% Command completed." }]);
    } catch {
      setTerminalOutput(prev => [...prev, { text: `% Virtual CLI Execution completed for: ${cmd}` }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleExecute();
    } else if (e.key === "ArrowUp") {
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputCommand(commandHistory[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputCommand(commandHistory[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand("");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#1d1a18] border border-[#3d3a39] rounded-[3px] w-full max-w-3xl flex flex-col h-[560px] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#101010] border-b border-[#3d3a39] text-[#eeeeee]">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a0ca92]"></span>
            <span className="font-mono text-xs font-medium uppercase tracking-tight text-[#eeeeee]">
              CISCO IOS VIRTUAL TERMINAL (PACKET TRACER)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTerminalOutput([])}
              className="text-xs font-mono uppercase text-[#8a8380] hover:text-[#eeeeee] px-2 py-1 bg-[#1d1a18] rounded-[3px] border border-[#3d3a39]"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="text-[#8a8380] hover:text-[#eeeeee] p-1 rounded-[3px] hover:bg-[#1d1a18]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Command Suggestions */}
        <div className="px-4 py-2 bg-[#101010] border-b border-[#3d3a39] flex items-center space-x-1.5 overflow-x-auto text-[11px] font-mono no-scrollbar">
          <span className="text-[#8a8380] uppercase select-none mr-1">QUICK:</span>
          {["show ip int brief", "show interfaces trunk", "show ip ospf neighbor", "ping 192.168.30.1", "show run"].map((q) => (
            <button
              key={q}
              onClick={() => handleExecute(q)}
              className="px-2 py-0.5 bg-[#1d1a18] hover:bg-[#252220] text-[#eeeeee] rounded-[3px] border border-[#3d3a39] whitespace-nowrap text-[11px]"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Terminal Content Screen */}
        <div className="flex-1 p-4 bg-[#101010] text-[#eeeeee] font-mono text-xs overflow-y-auto space-y-2 leading-relaxed">
          {terminalOutput.map((item, idx) => (
            <div key={idx}>
              {item.cmd && (
                <div className="text-[#eeeeee] flex items-center space-x-1">
                  <span className="text-[#8a8380]">Core-Router#</span>
                  <span className="font-medium">{item.cmd}</span>
                </div>
              )}
              {item.text && (
                <div className="text-[#b8b3b0] whitespace-pre-wrap pl-0">
                  {item.text}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Terminal Input Bar */}
        <div className="p-3 bg-[#101010] border-t border-[#3d3a39] flex items-center space-x-2">
          <span className="text-[#eeeeee] font-mono text-xs font-medium select-none">
            Core-Router#
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type Cisco command and press Enter..."
            className="flex-1 bg-transparent text-[#eeeeee] font-mono text-xs focus:outline-none placeholder-[#8a8380]"
          />
          <button
            onClick={() => handleExecute()}
            className="px-3 py-1 bg-[#fafafa] hover:bg-[#eaeaea] text-[#101010] rounded-[3px] text-xs font-mono uppercase tracking-tight font-medium"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
