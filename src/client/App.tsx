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
  const activeTrack = tracks.find((t) => t.id === activeTrackId);
  const completedCount = modules.filter((m) => m.status === 'completed').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
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
      />

      {/* Main 3-Pane Split SecOps Workbench */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Sidebar */}
        <ModuleSidebar
          trackTitle={activeTrack?.title}
          trackSubtitle={activeTrack?.subtitle}
          modules={trackModules}
          activeModuleId={activeModule?.id}
          onSelectModule={loadModule}
        />

        {/* Center Pane: Theory */}
        <TheoryPane module={activeModule} />

        {/* Right Pane: Polymorphic Lab & Verification */}
        <section className="lg:col-span-5 bg-slate-950 p-6 flex flex-col justify-between overflow-y-auto space-y-4">
          {activeModule ? (
            <div className="space-y-4">
              {/* Lab Briefing Banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
                    Interactive Lab // {activeModule.lab_type.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>ACTIVE CONTAINER</span>
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-sans">
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
            <div className="text-center text-slate-500 text-xs py-12">
              Select a module from the track menu to load interactive lab telemetry.
            </div>
          )}

          {/* Submission and Flag Verification Footer */}
          {activeModule && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <form onSubmit={verifySubmission} className="flex gap-2">
                <input
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                  placeholder="Submit extracted flag, IOC, timestamp, or token..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3.5 py-2 text-xs md:text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-4 py-2 rounded-md text-xs md:text-sm transition shadow-sm"
                >
                  Verify Finding
                </button>
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="px-3 py-2 border border-slate-700 rounded-md text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  title="Toggle Hint"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </form>

              {showHint && (
                <div className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-200 p-3 rounded-md flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Lab Hint:</strong> {activeModule.hint}
                  </div>
                </div>
              )}

              {feedback && (
                <div
                  className={`text-xs p-3 rounded-md border font-mono flex items-start gap-2 ${
                    feedback.correct
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {feedback.correct ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
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
