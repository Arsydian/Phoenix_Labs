import React from 'react';
import { TerminalLab } from './TerminalLab';
import { SiemLab } from './SiemLab';
import { MalwareInspector } from './MalwareInspector';
import { QuizLab } from './QuizLab';

export type LabType = 'terminal' | 'siem' | 'hex_inspector' | 'quiz';

interface LabRegistryProps {
  labType: LabType;
  labConfig: any;
  // Terminal Engine Props
  terminalHistory: Array<{ cmd: string; out: string }>;
  onRunCommand: (command: string) => void;
  cmdInput: string;
  setCmdInput: (cmd: string) => void;
  // SIEM Engine Props
  siemFilter: string;
  setSiemFilter: (filter: string) => void;
  decodedB64: string;
  onDecodeUtf16: (b64: string) => void;
  // Quiz Engine Props
  onPopulateSubmission: (token: string) => void;
}

/**
 * Polymorphic Lab Engine Registry (Feature 4)
 * Decouples the lab renderers so new domains (e.g., PCAP, Memory Dumps)
 * can be plugged in without modifying core workbench layout code.
 */
export const LabRegistry: React.FC<LabRegistryProps> = ({
  labType,
  labConfig,
  terminalHistory,
  onRunCommand,
  cmdInput,
  setCmdInput,
  siemFilter,
  setSiemFilter,
  decodedB64,
  onDecodeUtf16,
  onPopulateSubmission
}) => {
  switch (labType) {
    case 'terminal':
      return (
        <TerminalLab
          labConfig={labConfig || {}}
          terminalHistory={terminalHistory}
          onRunCommand={onRunCommand}
          cmdInput={cmdInput}
          setCmdInput={setCmdInput}
          onPopulateSubmission={onPopulateSubmission}
        />
      );

    case 'siem':
      return (
        <SiemLab
          labConfig={labConfig || {}}
          siemFilter={siemFilter}
          setSiemFilter={setSiemFilter}
          decodedB64={decodedB64}
          onDecodeUtf16={onDecodeUtf16}
        />
      );

    case 'hex_inspector':
      return <MalwareInspector labConfig={labConfig || {}} />;

    case 'quiz':
      return (
        <QuizLab
          labConfig={labConfig || {}}
          onPopulateSubmission={onPopulateSubmission}
        />
      );

    default:
      return (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded text-slate-400 text-xs">
          Unrecognized lab environment type: <code className="text-orange-400">{labType}</code>
        </div>
      );
  }
};
