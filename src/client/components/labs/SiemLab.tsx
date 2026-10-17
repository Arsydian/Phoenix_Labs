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
    <div className="bg-[#fdfdfc] border border-[#e5e5e5] rounded-sm p-4 space-y-3 font-mono text-xs shadow-xs">
      {/* Telemetry Query Bar */}
      <div className="flex items-center gap-2 bg-white border border-[#d4d4d4] px-3 py-1.5 rounded-sm">
        <Search className="w-3.5 h-3.5 text-[#ff5e1f] shrink-0" />
        <span className="text-xs font-mono text-[#ff5e1f] font-semibold shrink-0">FILTER:</span>
        <input
          value={siemFilter}
          onChange={(e) => setSiemFilter(e.target.value)}
          placeholder="Filter telemetry (e.g. powershell, WINWORD, EventID, CommandLine)..."
          className="bg-transparent text-xs w-full focus:outline-none text-[#262626] font-mono"
        />
        {siemFilter && (
          <button
            onClick={() => setSiemFilter('')}
            className="text-xs text-[#737373] hover:text-[#262626] font-sans px-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Log Feed */}
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-[#737373] font-sans text-xs">
            No telemetry events match query "{siemFilter}".
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const hasBase64 = log.command_line.includes('-Enc ');
            const b64Match = hasBase64 ? log.command_line.split('-Enc ')[1]?.split(' ')[0] : null;

            return (
              <div
                key={idx}
                className="p-3 bg-white rounded-sm border border-[#e5e5e5] hover:border-[#d4d4d4] space-y-1.5 transition shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[#0284c7] font-semibold">{log.timestamp}</span>
                  <span className="bg-[#f0f0f0] text-[#404040] border border-[#e5e5e5] px-1.5 py-0.5 rounded-sm text-[10px] font-mono">
                    Sysmon EventID={log.event_id}
                  </span>
                  <span className="text-[#737373] text-[11px]">{log.host}</span>
                </div>

                <div className="text-[#525252] text-[11px]">
                  Parent: <span className="text-[#262626] font-medium">{log.parent_image}</span>
                </div>
                <div className="text-[#525252] text-[11px]">
                  Image: <span className="text-emerald-700 font-medium">{log.image}</span>
                </div>
                <div className="text-[#262626] bg-[#f7f7f6] p-2 rounded-sm border border-[#e5e5e5] break-all text-[11px]">
                  {log.command_line}
                </div>

                {b64Match && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onDecodeUtf16(b64Match)}
                      className="text-[11px] bg-[#fff7f2] hover:bg-[#ffede2] text-[#ff5e1f] border border-[#ffdcd0] hover:border-[#ff5e1f] px-2.5 py-1 rounded-sm transition flex items-center gap-1 font-sans font-medium"
                    >
                      <Zap className="w-3 h-3 text-[#ff5e1f]" />
                      <span>Decode UTF-16LE Base64 Payload</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Decoded Base64 Output Drawer */}
      {decodedB64 && (
        <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-sm space-y-1">
          <div className="text-emerald-800 font-semibold flex items-center gap-1 text-[11px] font-sans">
            <Terminal className="w-3.5 h-3.5" />
            <span>Decoded PowerShell Payload Output:</span>
          </div>
          <div className="text-emerald-950 font-mono break-all text-xs bg-white p-2 rounded-sm border border-[#bbf7d0]">
            {decodedB64}
          </div>
        </div>
      )}
    </div>
  );
};
