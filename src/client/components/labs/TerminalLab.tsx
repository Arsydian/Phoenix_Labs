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
    <div className="space-y-2.5">
      {/* Quick-Run Command Chips */}
      {(labConfig.quick_commands || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-[#737373] font-mono mr-1">Quick-Run:</span>
          {labConfig.quick_commands!.map((qcmd, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onRunCommand(qcmd)}
              className="text-[11px] font-mono bg-[#fdfdfc] hover:bg-[#fff7f2] text-[#262626] hover:text-[#ff5e1f] border border-[#d4d4d4] hover:border-[#ff5e1f] px-2.5 py-1 rounded-sm transition shadow-xs"
            >
              $ {qcmd}
            </button>
          ))}
        </div>
      )}

      {/* Terminal Viewport */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-sm p-4 font-mono text-xs h-80 flex flex-col justify-between overflow-hidden shadow-xs">
        <div className="space-y-2.5 overflow-y-auto pr-1">
          <div className="text-zinc-500 leading-snug">
            Kali Container Connected. Target Scope: <span className="text-emerald-400">{labConfig.target_ip || '10.10.14.0/24'}</span>.
            Type <span className="text-zinc-300">'help'</span> for scoped commands or click a Quick-Run chip above.
          </div>

          {terminalHistory.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-emerald-400 font-semibold">operator@kali-lab:~$ {item.cmd}</div>
              <pre className="text-zinc-300 whitespace-pre-wrap bg-[#0f0f11] p-2 rounded-sm border border-zinc-800/80">
                {item.out}
              </pre>
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-zinc-800 mt-2">
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
