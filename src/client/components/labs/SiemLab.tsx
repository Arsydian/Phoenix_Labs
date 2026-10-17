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
    <div className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-4 space-y-3 font-mono text-xs shadow-sm">
      {/* Telemetry Query Bar */}
      <div className="flex items-center gap-2 bg-[#161718] border border-[#23252a] px-3 py-1.5 rounded-[6px]">
        <Search className="w-3.5 h-3.5 text-[#02b8cc] shrink-0" />
        <span className="text-xs font-mono text-[#02b8cc] font-medium shrink-0">FILTER:</span>
        <input
          value={siemFilter}
          onChange={(e) => setSiemFilter(e.target.value)}
          placeholder="Filter telemetry (e.g. powershell, WINWORD, EventID, CommandLine)..."
          className="bg-transparent text-xs w-full focus:outline-none text-[#ffffff] font-mono placeholder-[#62666d]"
        />
        {siemFilter && (
          <button
            onClick={() => setSiemFilter('')}
            className="text-xs text-[#8a8f98] hover:text-[#ffffff] font-sans px-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Log Feed */}
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-[#62666d] font-sans text-xs">
            No telemetry events match query "{siemFilter}".
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const hasBase64 = log.command_line.includes('-Enc ');
            const b64Match = hasBase64 ? log.command_line.split('-Enc ')[1]?.split(' ')[0] : null;

            return (
              <div
                key={idx}
                className="p-3 bg-[#161718] rounded-[6px] border border-[#23252a] hover:border-[#383b3f] space-y-1.5 transition shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[#02b8cc] font-medium">{log.timestamp}</span>
                  <span className="bg-[rgba(255,255,255,0.05)] text-[#d0d6e0] border border-[#23252a] px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono">
                    Sysmon EventID={log.event_id}
                  </span>
                  <span className="text-[#8a8f98] text-[11px]">{log.host}</span>
                </div>

                <div className="text-[#8a8f98] text-[11px]">
                  Parent: <span className="text-[#d0d6e0]">{log.parent_image}</span>
                </div>
                <div className="text-[#8a8f98] text-[11px]">
                  Image: <span className="text-[#27a644] font-medium">{log.image}</span>
                </div>
                <div className="text-[#d0d6e0] bg-[#08090a] p-2 rounded-[6px] border border-[#23252a] break-all text-[11px]">
                  {log.command_line}
                </div>

                {b64Match && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onDecodeUtf16(b64Match)}
                      className="text-[11px] bg-[#0f1011] hover:bg-[#161718] text-[#e4f222] border border-[#e4f222]/30 hover:border-[#e4f222] px-2.5 py-1 rounded-[6px] transition flex items-center gap-1 font-sans font-medium"
                    >
                      <Zap className="w-3 h-3 text-[#e4f222]" />
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
        <div className="p-3 bg-[#161718] border border-[#27a644]/40 rounded-[6px] space-y-1">
          <div className="text-[#27a644] font-medium flex items-center gap-1 text-[11px] font-sans">
            <Terminal className="w-3.5 h-3.5" />
            <span>Decoded PowerShell Payload Output:</span>
          </div>
          <div className="text-[#ffffff] font-mono break-all text-xs bg-[#08090a] p-2 rounded-[6px] border border-[#23252a]">
            {decodedB64}
          </div>
        </div>
      )}
    </div>
  );
};
