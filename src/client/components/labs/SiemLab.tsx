import React from 'react';
import { Search, Terminal, Zap } from 'lucide-react';

interface SiemLog {
  timestamp: string;
  host: string;
  event_id: number;
  parent_image: string;
  image: string;
  command_line: string;
}

interface SiemLabProps {
  labConfig: {
    logs?: SiemLog[];
  };
  siemFilter: string;
  setSiemFilter: (filter: string) => void;
  decodedB64: string;
  onDecodeUtf16: (b64: string) => void;
}

export const SiemLab: React.FC<SiemLabProps> = ({
  labConfig,
  siemFilter,
  setSiemFilter,
  decodedB64,
  onDecodeUtf16
}) => {
  const logs = labConfig.logs || [];
  const filteredLogs = logs.filter((l) =>
    JSON.stringify(l).toLowerCase().includes(siemFilter.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 font-mono text-xs">
      {/* Telemetry Query Bar */}
      <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 px-3 py-2 rounded">
        <Search className="w-4 h-4 text-sky-400 shrink-0" />
        <span className="text-xs font-mono text-sky-400 shrink-0">QUERY:</span>
        <input
          value={siemFilter}
          onChange={(e) => setSiemFilter(e.target.value)}
          placeholder="Filter telemetry (e.g. powershell, WINWORD, EventID, CommandLine)..."
          className="bg-transparent text-xs w-full focus:outline-none text-white font-mono"
        />
        {siemFilter && (
          <button
            onClick={() => setSiemFilter('')}
            className="text-xs text-slate-500 hover:text-slate-300 font-sans px-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Log Feed */}
      <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
        {filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-slate-500 font-sans text-xs">
            No telemetry events match query "{siemFilter}".
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const hasBase64 = log.command_line.includes('-Enc ');
            const b64Match = hasBase64 ? log.command_line.split('-Enc ')[1]?.split(' ')[0] : null;

            return (
              <div
                key={idx}
                className="p-3 bg-slate-950 rounded border border-slate-800 hover:border-slate-700 space-y-1.5 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sky-400 font-semibold">{log.timestamp}</span>
                  <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded text-[10px]">
                    Sysmon EventID={log.event_id}
                  </span>
                  <span className="text-slate-400">{log.host}</span>
                </div>

                <div className="text-slate-400 text-[11px]">
                  Parent: <span className="text-slate-200">{log.parent_image}</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Image: <span className="text-emerald-300">{log.image}</span>
                </div>
                <div className="text-slate-300 bg-slate-900 p-2 rounded border border-slate-800/80 break-all text-[11px]">
                  {log.command_line}
                </div>

                {b64Match && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onDecodeUtf16(b64Match)}
                      className="text-[11px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 px-2.5 py-1 rounded transition flex items-center gap-1 font-sans"
                    >
                      <Zap className="w-3 h-3 text-sky-400" />
                      <span>Decode UTF-16LE Base64 Payload</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Decoded Base64 Drawer */}
      {decodedB64 && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded space-y-1">
          <div className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
            <Terminal className="w-3.5 h-3.5" />
            <span>Decoded PowerShell Payload Output:</span>
          </div>
          <div className="text-white break-all text-xs bg-slate-950 p-2 rounded border border-slate-800">
            {decodedB64}
          </div>
        </div>
      )}
    </div>
  );
};
