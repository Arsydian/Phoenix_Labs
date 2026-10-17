import React, { useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Flag, RotateCcw } from 'lucide-react';

interface TerminalLabProps {
  labConfig: {
    target_ip?: string;
    quick_commands?: string[];
    commands?: Record<string, string>;
  };
  terminalHistory: Array<{ cmd: string; out: string }>;
  onRunCommand: (command: string) => void;
  cmdInput: string;
  setCmdInput: (cmd: string) => void;
  onPopulateSubmission?: (token: string) => void;
}

export const TerminalLab: React.FC<TerminalLabProps> = ({
  labConfig,
  terminalHistory,
  onRunCommand,
  cmdInput,
  setCmdInput,
  onPopulateSubmission
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdInput.trim()) return;
    onRunCommand(cmdInput);
  };

  const executedCmds = new Set(terminalHistory.map((h) => h.cmd.trim()));
  const quickCmds = labConfig.quick_commands || [];
  const completedQuickCount = quickCmds.filter((q) => executedCmds.has(q.trim())).length;

  return (
    <div className="space-y-2.5">
      {/* Interactive Kill-Chain Step Tracker & Quick-Run Command Chips */}
      {quickCmds.length > 0 && (
        <div className="bg-[#0f1011] border border-[#23252a] rounded-[10px] p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#8a8f98] uppercase tracking-wider">
              Kill-Chain Execution Steps (Click to Execute):
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#e4f222]">
                {completedQuickCount}/{quickCmds.length} Executed
              </span>
              {terminalHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => onRunCommand('clear')}
                  className="text-[#8a8f98] hover:text-[#ffffff] flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#161718] border border-[#23252a]"
                  title="Clear Terminal"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {quickCmds.map((qcmd, i) => {
              const isDone = executedCmds.has(qcmd.trim());
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onRunCommand(qcmd)}
                  className={`text-left text-[11px] font-mono px-2.5 py-1.5 rounded-[6px] border transition flex items-center justify-between gap-2 ${
                    isDone
                      ? 'bg-[#27a644]/10 border-[#27a644]/40 text-[#d0d6e0]'
                      : 'bg-[#08090a] hover:bg-[#161718] text-[#d0d6e0] hover:text-[#e4f222] border-[#23252a] hover:border-[#383b3f]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#27a644] shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#62666d] shrink-0" />
                    )}
                    <span className="text-[#8a8f98] shrink-0">Step {i + 1}:</span>
                    <span className="truncate">$ {qcmd}</span>
                  </div>
                  <span className="text-[10px] text-[#62666d] shrink-0">
                    {isDone ? 'Re-run' : 'Run →'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Terminal Viewport */}
      <div className="bg-[#08090a] border border-[#23252a] rounded-[12px] p-4 font-mono text-xs h-80 flex flex-col justify-between overflow-hidden shadow-inner">
        <div className="space-y-2.5 overflow-y-auto pr-1">
          <div className="text-[#62666d] leading-snug">
            Kali Pwnbox Connected. Target Scope:{' '}
            <span className="text-[#27a644]">{labConfig.target_ip || '10.10.14.0/24'}</span>. Type{' '}
            <span className="text-[#d0d6e0]">'help'</span> for scoped commands or execute the Kill-Chain steps above.
          </div>

          {terminalHistory.map((item, idx) => {
            const flagMatch = item.out.match(/FLAG\{[^}]+\}/);
            return (
              <div key={idx} className="space-y-1">
                <div className="text-[#27a644] font-medium">operator@kali-lab:~$ {item.cmd}</div>
                <pre className="text-[#d0d6e0] whitespace-pre-wrap bg-[#0f1011] p-2.5 rounded-[6px] border border-[#23252a]">
                  {item.out}
                </pre>
                {flagMatch && onPopulateSubmission && (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => onPopulateSubmission(flagMatch[0])}
                      className="text-[11px] font-mono bg-[#27a644]/15 hover:bg-[#27a644]/25 text-[#27a644] border border-[#27a644]/40 px-2.5 py-1 rounded-[6px] transition inline-flex items-center gap-1.5"
                    >
                      <Flag className="w-3 h-3" />
                      <span>Populate Extracted Flag: {flagMatch[0]}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={terminalEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-[#23252a] mt-2">
          <span className="text-[#27a644] font-medium shrink-0">operator@kali-lab:~$</span>
          <input
            value={cmdInput}
            onChange={(e) => setCmdInput(e.target.value)}
            className="bg-transparent flex-1 focus:outline-none text-[#ffffff] font-mono"
            placeholder="Type command (e.g. nmap, ffuf, ligolo-ng, certipy, help)..."
            autoFocus
          />
        </form>
      </div>
    </div>
  );
};
