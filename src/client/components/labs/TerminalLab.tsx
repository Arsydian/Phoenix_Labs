import React, { useRef, useEffect } from 'react';

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
}

export const TerminalLab: React.FC<TerminalLabProps> = ({
  labConfig,
  terminalHistory,
  onRunCommand,
  cmdInput,
  setCmdInput
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

  return (
    <div className="space-y-3">
      {/* Quick-Run Command Chips */}
      {(labConfig.quick_commands || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-mono mr-1">Quick-Run:</span>
          {labConfig.quick_commands!.map((qcmd, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onRunCommand(qcmd)}
              className="text-[11px] font-mono bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-700 hover:border-slate-600 px-2.5 py-1 rounded transition"
            >
              $ {qcmd}
            </button>
          ))}
        </div>
      )}

      {/* Terminal Viewport */}
      <div className="bg-black border border-slate-800 rounded-lg p-4 font-mono text-xs h-80 flex flex-col justify-between overflow-hidden shadow-inner">
        <div className="space-y-3 overflow-y-auto pr-1">
          <div className="text-slate-500 leading-snug">
            Kali SecOps Target Scope: <span className="text-emerald-400">{labConfig.target_ip || '10.10.14.0/24'}</span>.
            Type <span className="text-slate-300">'help'</span> for scoped commands or click a Quick-Run chip above.
          </div>

          {terminalHistory.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-emerald-400 font-semibold">operator@kali-lab:~$ {item.cmd}</div>
              <pre className="text-slate-300 whitespace-pre-wrap bg-slate-950/80 p-2 rounded border border-slate-900">
                {item.out}
              </pre>
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-slate-900 mt-2">
          <span className="text-emerald-400 font-semibold shrink-0">operator@kali-lab:~$</span>
          <input
            value={cmdInput}
            onChange={(e) => setCmdInput(e.target.value)}
            className="bg-transparent flex-1 focus:outline-none text-white font-mono"
            placeholder="Type command (e.g. nmap, smbclient, curl)..."
            autoFocus
          />
        </form>
      </div>
    </div>
  );
};
