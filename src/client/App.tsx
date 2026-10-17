import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ModuleSidebar } from './components/ModuleSidebar';
import { TheoryPane } from './components/TheoryPane';
import { LabRegistry } from './components/labs/LabRegistry';
import { IngestionModal } from './components/IngestionModal';
import { StudentProfile } from './components/StudentProfile';
import { HelpCircle, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [student, setStudent] = useState<{ email: string; isAdmin: boolean; zero_trust_enforced: boolean } | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string>('track-pentest');
  const [activeModule, setActiveModule] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'workbench' | 'profile'>('workbench');

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

    const responses: Record<string, string> = activeModule.lab_config?.commands || {};
    let out = responses[clean];

    // Normalized whitespace / case-insensitive fallback matching
    if (!out) {
      const normalizedClean = clean.replace(/\s+/g, ' ');
      const matchedKey = Object.keys(responses).find(
        (k) => k.trim().replace(/\s+/g, ' ').toLowerCase() === normalizedClean.toLowerCase()
      );
      if (matchedKey) {
        out = responses[matchedKey];
      }
    }

    if (!out) {
      if (clean === 'help') {
        const available = Object.keys(responses);
        out =
          available.length > 0
            ? `Scoped commands available in this lab container:\n • ${available.join('\n • ')}`
            : 'Type the target command specified in your lab briefing.';
      } else if (clean === 'whoami') {
        out = 'operator (kali-pwnbox)';
      } else if (clean === 'id') {
        out = 'uid=1000(operator) gid=1000(operator) groups=1000(operator),27(sudo),142(kaboxer)';
      } else if (clean === 'pwd') {
        out = '/home/operator/engagement-workspace';
      } else if (clean === 'uname -a') {
        out = 'Linux kali-lab 6.11.2-amd64 #1 SMP PREEMPT_DYNAMIC Kali 6.11.2-1kali1 (2026-10-01) x86_64 GNU/Linux';
      } else if (clean === 'ip a' || clean === 'ifconfig') {
        out = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: tun0: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500\n    inet 10.10.14.5/24 scope global tun0\n    Target Scope: ${activeModule.lab_config?.target_ip || '10.10.14.0/24'}`;
      } else {
        out = `bash: ${clean}: command outside lab scope or syntax mismatch. Click a Kill-Chain Step above or type 'help'.`;
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
    <div className="min-h-screen flex flex-col bg-[#08090a] text-[#d0d6e0] font-sans antialiased">
      {/* Top Navbar with Course Topics Dropdown */}
      <Navbar
        student={student}
        tracks={tracks}
        activeTrackId={activeTrackId}
        onSelectTrack={(tId) => {
          setActiveTrackId(tId);
          const first = modules.find((m) => m.track_id === tId);
          if (first) loadModule(first.slug);
          setViewMode('workbench');
        }}
        completedCount={completedCount}
        totalModules={modules.length}
        onOpenIngest={() => setShowIngestModal(true)}
        appVersion="1.2.0"
        viewMode={viewMode}
        onSelectView={setViewMode}
      />

      {viewMode === 'profile' ? (
        <StudentProfile
          onNavigateToModule={(trackId, moduleSlug) => {
            setActiveTrackId(trackId);
            loadModule(moduleSlug);
            setViewMode('workbench');
          }}
          onReturnToWorkbench={() => setViewMode('workbench')}
        />
      ) : (
        /* Main 3-Pane Split SecOps Workbench */
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
        <TheoryPane module={activeModule} onRunCommand={runTerminalCommand} />

        {/* Right Pane: Polymorphic Lab & Verification */}
        <section className="lg:col-span-5 bg-[#08090a] p-6 flex flex-col justify-between overflow-y-auto space-y-4">
          {activeModule ? (
            <div className="space-y-4">
              {/* Lab Briefing Banner */}
              <div className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1.5 pb-2 border-b border-[#23252a]/60">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#e4f222] font-normal">
                    Interactive Lab // {activeModule.lab_type.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-[#27a644] bg-[#27a644]/10 px-2 py-0.5 rounded-[4px] border border-[#27a644]/30 flex items-center gap-1 font-normal">
                    <ShieldCheck className="w-3 h-3 text-[#27a644]" />
                    <span>PRECISION RUNTIME</span>
                  </span>
                </div>
                <p className="text-xs text-[#d0d6e0] leading-relaxed font-sans">
                  {activeModule.lab_briefing}
                </p>
              </div>

              {/* Polymorphic Lab Engine (Terminal, SIEM, Malware Inspector, Quiz) */}
              <LabRegistry
                key={activeModule.id}
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
            <div className="text-center text-[#62666d] text-xs py-12">
              Select a module from the track menu to load interactive lab telemetry.
            </div>
          )}

          {/* Submission and Flag Verification Footer */}
          {activeModule && (
            <div className="pt-4 border-t border-[#23252a] space-y-3 bg-[#0f1011] p-4 rounded-[12px] border border-[#23252a] shadow-sm">
              <form onSubmit={verifySubmission} className="flex gap-2">
                <input
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                  placeholder="Submit extracted flag, IOC, timestamp, or token..."
                  className="flex-1 bg-[#08090a] border border-[#23252a] rounded-[6px] px-3.5 py-2 text-xs md:text-sm text-[#ffffff] font-mono placeholder-[#62666d] focus:outline-none focus:border-[#383b3f]"
                />
                <button
                  type="submit"
                  className="bg-[#e4f222] hover:bg-[#d4e21a] text-[#08090a] font-medium px-4 py-2 rounded-[6px] text-xs md:text-sm transition shadow-sm"
                >
                  Verify Finding
                </button>
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="px-3 py-2 border border-[#23252a] rounded-[6px] text-xs text-[#8a8f98] hover:text-[#ffffff] hover:bg-[#161718] transition"
                  title="Toggle Hint"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </form>

              {showHint && (
                <div className="text-xs bg-[#161718] border border-[#23252a] text-[#d0d6e0] p-3 rounded-[6px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#e4f222] shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-medium text-[#ffffff]">Lab Hint:</strong> {activeModule.hint}
                  </div>
                </div>
              )}

              {feedback && (
                <div
                  className={`text-xs p-3 rounded-[6px] border font-mono flex items-start gap-2 ${
                    feedback.correct
                      ? 'bg-[#27a644]/10 border-[#27a644]/30 text-[#27a644]'
                      : 'bg-[#eb5757]/10 border-[#eb5757]/30 text-[#eb5757]'
                  }`}
                >
                  {feedback.correct ? (
                    <CheckCircle2 className="w-4 h-4 text-[#27a644] shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#eb5757] shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      )}

      {/* Course Material Ingestion Modal */}
      <IngestionModal
        isOpen={showIngestModal}
        onClose={() => setShowIngestModal(false)}
        onModuleIngested={fetchCurriculum}
      />
    </div>
  );
}
