import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ModuleSidebar } from './components/ModuleSidebar';
import { TheoryPane } from './components/TheoryPane';
import { LabRegistry } from './components/labs/LabRegistry';
import { IngestionModal } from './components/IngestionModal';
import { HelpCircle, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [student, setStudent] = useState<{ email: string; isAdmin: boolean; zero_trust_enforced: boolean } | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string>('track-pentest');
  const [activeModule, setActiveModule] = useState<any | null>(null);

  // Interactive Lab State
  const [submission, setSubmission] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState<Array<{ cmd: string; out: string }>>([]);
  const [cmdInput, setCmdInput] = useState('');
  const [siemFilter, setSiemFilter] = useState('');
  const [decodedB64, setDecodedB64] = useState('');
  const [showIngestModal, setShowIngestModal] = useState(false);

  // 1. Fetch Curriculum & Student Identity
  const fetchCurriculum = async () => {
    try {
      const res = await fetch('/api/curriculum');
      const data = await res.json();
      setStudent(data.student);
      setTracks(data.tracks || []);
      setModules(data.modules || []);

      if (!activeModule && data.modules && data.modules.length > 0) {
        loadModule(data.modules[0].slug);
      }
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    }
  };

  // 2. Load Single Module
  const loadModule = async (slug: string) => {
    try {
      const res = await fetch(`/api/modules/${slug}`);
      const data = await res.json();
      setActiveModule(data);
      setFeedback(null);
      setSubmission('');
      setShowHint(false);
      setTerminalHistory(data.progress?.saved_lab_state?.terminalHistory || []);
      setSiemFilter('');
      setDecodedB64('');
    } catch (err) {
      console.error('Failed to load module:', err);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, []);

  // 3. 30-Second Progress & Lab State Autosave Heartbeat
  useEffect(() => {
    if (!activeModule) return;

    const timer = setInterval(() => {
      fetch(`/api/modules/${activeModule.id}/autosave`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elapsed_seconds: 30,
          saved_lab_state: { terminalHistory }
        })
      }).catch((e) => console.warn('Autosave heartbeat skipped:', e));
    }, 30000);

    return () => clearInterval(timer);
  }, [activeModule, terminalHistory]);

  // Terminal Command Execution
  const runTerminalCommand = (rawCmd: string) => {
    const clean = rawCmd.trim();
    if (!clean || !activeModule) return;

    if (clean === 'clear') {
      setTerminalHistory([]);
      setCmdInput('');
      return;
    }

    const responses = activeModule.lab_config?.commands || {};
    let out = responses[clean];

    if (!out) {
      if (clean === 'help') {
        const available = Object.keys(responses);
        out = available.length > 0
          ? `Scoped commands available in this lab container:\n • ${available.join('\n • ')}`
          : "Type the target command specified in your lab briefing.";
      } else {
        out = `bash: ${clean}: command outside lab scope or syntax mismatch. Click a Quick-Run chip or type 'help'.`;
      }
    }

    setTerminalHistory((prev) => [...prev, { cmd: clean, out }]);
    setCmdInput('');
  };

  // UTF-16LE Base64 Decoder (for SIEM LotL logs)
  const decodeUtf16 = (b64: string) => {
    try {
      const raw = atob(b64);
      let out = '';
      for (let i = 0; i < raw.length; i++) {
        if (raw.charCodeAt(i) !== 0) out += raw[i];
      }
      setDecodedB64(out);
    } catch {
      setDecodedB64('Failed to decode Base64 payload.');
    }
  };

  // Lab Submission / Flag Verification
  const verifySubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModule || !submission.trim()) return;

    try {
      const res = await fetch(`/api/modules/${activeModule.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission })
      });
      const result = await res.json();
      setFeedback(result);
      if (result.correct) {
        fetchCurriculum();
      }
    } catch (err) {
      setFeedback({ correct: false, message: 'Network error submitting verification.' });
    }
  };

  const trackModules = modules.filter((m) => m.track_id === activeTrackId);
  const completedCount = modules.filter((m) => m.status === 'completed').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfc] text-[#262626] font-sans antialiased">
      {/* Top Navbar with Course Topics Dropdown */}
      <Navbar
        student={student}
        tracks={tracks}
        activeTrackId={activeTrackId}
        onSelectTrack={(tId) => {
          setActiveTrackId(tId);
          const first = modules.find((m) => m.track_id === tId);
          if (first) loadModule(first.slug);
        }}
        completedCount={completedCount}
        totalModules={modules.length}
        onOpenIngest={() => setShowIngestModal(true)}
        appVersion="1.0.1"
      />

      {/* Main 3-Pane Split SecOps Workbench */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Sidebar */}
        <ModuleSidebar
          trackTitle={tracks.find((t) => t.id === activeTrackId)?.title}
          trackSubtitle={tracks.find((t) => t.id === activeTrackId)?.subtitle}
          modules={trackModules}
          activeModuleId={activeModule?.id}
          onSelectModule={loadModule}
        />

        {/* Center Pane: Theory */}
        <TheoryPane module={activeModule} />

        {/* Right Pane: Polymorphic Lab & Verification */}
        <section className="lg:col-span-5 bg-[#fdfdfc] p-6 flex flex-col justify-between overflow-y-auto space-y-4">
          {activeModule ? (
            <div className="space-y-4">
              {/* Lab Briefing Banner */}
              <div className="bg-white border border-[#e5e5e5] rounded-sm p-4 shadow-xs">
                <div className="flex items-center justify-between mb-1.5 pb-2 border-b border-[#f0f0f0]">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#ff5e1f] font-semibold">
                    Interactive Lab // {activeModule.lab_type.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>CONTAINER AT EDGE</span>
                  </span>
                </div>
                <p className="text-xs text-[#525252] leading-relaxed font-sans">
                  {activeModule.lab_briefing}
                </p>
              </div>

              {/* Polymorphic Lab Engine (Terminal, SIEM, Malware Inspector, Quiz) */}
              <LabRegistry
                labType={activeModule.lab_type}
                labConfig={activeModule.lab_config}
                terminalHistory={terminalHistory}
                onRunCommand={runTerminalCommand}
                cmdInput={cmdInput}
                setCmdInput={setCmdInput}
                siemFilter={siemFilter}
                setSiemFilter={setSiemFilter}
                decodedB64={decodedB64}
                onDecodeUtf16={decodeUtf16}
                onPopulateSubmission={(token) => setSubmission(token)}
              />
            </div>
          ) : (
            <div className="text-center text-[#737373] text-xs py-12">
              Select a module from the track menu to load interactive lab telemetry.
            </div>
          )}

          {/* Submission and Flag Verification Footer */}
          {activeModule && (
            <div className="pt-4 border-t border-[#e5e5e5] space-y-3 bg-white p-4 rounded-sm border shadow-xs">
              <form onSubmit={verifySubmission} className="flex gap-2">
                <input
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                  placeholder="Submit extracted flag, IOC, timestamp, or token..."
                  className="flex-1 bg-white border border-[#d4d4d4] rounded-sm px-3.5 py-2 text-xs md:text-sm text-[#262626] font-mono focus:outline-none focus:border-[#ff5e1f]"
                />
                <button
                  type="submit"
                  className="bg-[#ff5e1f] hover:bg-[#ff4800] text-white font-semibold px-4 py-2 rounded-sm text-xs md:text-sm transition shadow-xs"
                >
                  Verify Finding
                </button>
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="px-3 py-2 border border-[#d4d4d4] rounded-sm text-xs text-[#666666] hover:text-[#262626] hover:bg-[#f7f7f6] transition"
                  title="Toggle Hint"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </form>

              {showHint && (
                <div className="text-xs bg-[#fffbeb] border border-[#fde68a] text-[#92400e] p-3 rounded-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Lab Hint:</strong> {activeModule.hint}
                  </div>
                </div>
              )}

              {feedback && (
                <div
                  className={`text-xs p-3 rounded-sm border font-mono flex items-start gap-2 ${
                    feedback.correct
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {feedback.correct ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Course Material Ingestion Modal */}
      <IngestionModal
        isOpen={showIngestModal}
        onClose={() => setShowIngestModal(false)}
        onModuleIngested={fetchCurriculum}
      />
    </div>
  );
}
