import React, { useEffect, useState } from 'react';
import {
  User,
  Shield,
  CheckCircle2,
  Clock,
  CircleDot,
  Terminal,
  Activity,
  FileCode,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  RotateCcw
} from 'lucide-react';
import { apiFetch } from '../api';

interface StudentProfileData {
  student: {
    id: string;
    email: string;
    display_name: string;
    created_at: string;
    last_active_at: string;
    isAdmin: boolean;
    zero_trust_enforced: boolean;
  };
  overview: {
    total_tracks: number;
    completed_tracks: number;
    total_modules: number;
    completed_modules: number;
    in_progress_modules: number;
    not_started_modules: number;
    global_completion_pct: number;
    total_time_spent_seconds: number;
    total_attempts: number;
  };
  tracks: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    order_index: number;
    total_modules: number;
    completed_count: number;
    in_progress_count: number;
    completion_pct: number;
    time_spent_seconds: number;
    modules: Array<{
      id: string;
      track_id: string;
      slug: string;
      title: string;
      difficulty: string;
      order_index: number;
      estimated_minutes: number;
      lab_type: string;
      status: 'not_started' | 'in_progress' | 'completed';
      attempts: number;
      hints_used: number;
      time_spent_seconds: number;
      started_at: string | null;
      last_accessed_at: string | null;
      completed_at: string | null;
    }>;
  }>;
  recent_activity: Array<{
    module_id: string;
    track_id: string;
    status: string;
    attempts: number;
    last_accessed_at: string;
    completed_at: string | null;
    module_title: string;
    module_slug: string;
    lab_type: string;
    track_title: string;
  }>;
}

interface StudentProfileProps {
  onNavigateToModule: (trackId: string, moduleSlug: string) => void;
  onReturnToWorkbench: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({
  onNavigateToModule,
  onReturnToWorkbench
}) => {
  const [data, setData] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/student/profile');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('Failed to load student profile:', err);
      setError('Unable to load student profile telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getLabIcon = (labType: string) => {
    switch (labType) {
      case 'terminal':
        return <Terminal className="w-3.5 h-3.5 text-[#e4f222]" />;
      case 'siem':
        return <Activity className="w-3.5 h-3.5 text-[#02b8cc]" />;
      case 'hex_inspector':
        return <FileCode className="w-3.5 h-3.5 text-[#eb5757]" />;
      case 'quiz':
        return <HelpCircle className="w-3.5 h-3.5 text-[#27a644]" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-[#8a8f98]" />;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#08090a] p-12 text-[#8a8f98] font-mono text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#e4f222] border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing student profile & cross-course telemetry...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#08090a] p-12 text-[#eb5757] font-mono text-sm">
        <div className="p-6 bg-[#0f1011] border border-[#eb5757]/30 rounded-[12px] max-w-md text-center space-y-3">
          <p>{error || 'Profile telemetry unavailable.'}</p>
          <button
            type="button"
            onClick={fetchProfile}
            className="px-3 py-1.5 bg-[#161718] border border-[#23252a] text-[#ffffff] rounded-[6px] text-xs hover:border-[#383b3f]"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { student, overview, tracks, recent_activity } = data;

  return (
    <div className="flex-1 overflow-y-auto bg-[#08090a] p-6 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* 1. Student Identity Header Banner */}
      <div className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#e4f222]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex items-start md:items-center gap-5 z-10">
          <div className="w-16 h-16 rounded-[12px] bg-[#161718] border border-[#23252a] flex items-center justify-center text-[#e4f222] shrink-0 shadow-inner">
            <User className="w-8 h-8 text-[#e4f222]" />
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-medium tracking-tight text-[#ffffff]">
                {student.display_name}
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] border border-[#23252a] bg-[#161718] text-[#8a8f98] flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${student.zero_trust_enforced ? 'bg-[#27a644]' : 'bg-[#02b8cc]'}`} />
                {student.zero_trust_enforced ? 'Cloudflare Zero Trust' : 'Local Operator Access'}
              </span>
              {student.isAdmin && (
                <span className="px-1.5 py-0.5 bg-[#e4f222]/10 text-[#e4f222] border border-[#e4f222]/30 rounded-[3px] text-[10px] font-medium tracking-wide">
                  ADMIN
                </span>
              )}
            </div>

            <p className="text-sm font-mono text-[#8a8f98]">{student.email}</p>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#62666d] pt-1">
              <span>Member Identity: <span className="text-[#8a8f98] font-mono">{student.id}</span></span>
              <span>•</span>
              <span>Last Active: <span className="text-[#8a8f98] font-mono">{new Date(student.last_active_at).toLocaleString()}</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <button
            type="button"
            onClick={fetchProfile}
            title="Refresh Telemetry"
            className="p-2.5 bg-[#161718] hover:bg-[#23252a] text-[#8a8f98] hover:text-[#ffffff] border border-[#23252a] rounded-[6px] transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onReturnToWorkbench}
            className="bg-[#e4f222] hover:bg-[#d8e61f] text-[#08090a] font-medium text-xs px-4 py-2.5 rounded-[6px] transition flex items-center gap-2 shadow-sm"
          >
            <span>Return to Workbench</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Global Progress Analytics Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Global Curriculum Completion */}
        <div className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-5 space-y-3">
          <div className="flex items-center justify-between text-[#8a8f98] text-xs font-mono">
            <span>GLOBAL COMPLETION</span>
            <TrendingUp className="w-4 h-4 text-[#e4f222]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium tracking-tight text-[#ffffff]">
              {overview.global_completion_pct}%
            </span>
            <span className="text-xs text-[#8a8f98]">
              ({overview.completed_modules}/{overview.total_modules} modules)
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#161718] border border-[#23252a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#e4f222] transition-all duration-500"
              style={{ width: `${overview.global_completion_pct}%` }}
            />
          </div>
        </div>

        {/* Card 2: Modules Status Breakdown */}
        <div className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-5 space-y-3">
          <div className="flex items-center justify-between text-[#8a8f98] text-xs font-mono">
            <span>LABS & MODULES</span>
            <Award className="w-4 h-4 text-[#27a644]" />
          </div>
          <div className="flex items-center gap-3 pt-0.5">
            <div className="space-y-0.5">
              <span className="text-2xl font-medium text-[#27a644]">{overview.completed_modules}</span>
              <p className="text-[10px] uppercase font-mono text-[#62666d]">Mastered</p>
            </div>
            <div className="h-8 w-px bg-[#23252a]" />
            <div className="space-y-0.5">
              <span className="text-2xl font-medium text-[#e4f222]">{overview.in_progress_modules}</span>
              <p className="text-[10px] uppercase font-mono text-[#62666d]">In Flight</p>
            </div>
            <div className="h-8 w-px bg-[#23252a]" />
            <div className="space-y-0.5">
              <span className="text-2xl font-medium text-[#8a8f98]">{overview.not_started_modules}</span>
              <p className="text-[10px] uppercase font-mono text-[#62666d]">Unstarted</p>
            </div>
          </div>
        </div>

        {/* Card 3: Domains Mastered */}
        <div className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-5 space-y-3">
          <div className="flex items-center justify-between text-[#8a8f98] text-xs font-mono">
            <span>DOMAINS MASTERED</span>
            <Shield className="w-4 h-4 text-[#02b8cc]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium tracking-tight text-[#ffffff]">
              {overview.completed_tracks}
            </span>
            <span className="text-xs text-[#8a8f98]">
              of {overview.total_tracks} Operational Tracks
            </span>
          </div>
          <p className="text-[11px] text-[#62666d] tracking-tight">
            {overview.completed_tracks === overview.total_tracks
              ? 'All domains fully completed'
              : `${overview.total_tracks - overview.completed_tracks} domain(s) in active progression`}
          </p>
        </div>

        {/* Card 4: Telemetry & Lab Time */}
        <div className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-5 space-y-3">
          <div className="flex items-center justify-between text-[#8a8f98] text-xs font-mono">
            <span>LAB TIME & ATTEMPTS</span>
            <Zap className="w-4 h-4 text-[#e4f222]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium tracking-tight text-[#ffffff]">
              {formatTime(overview.total_time_spent_seconds)}
            </span>
            <span className="text-xs text-[#8a8f98]">
              across {overview.total_attempts} attempts
            </span>
          </div>
          <p className="text-[11px] text-[#62666d] tracking-tight">
            D1 Edge Telemetry Heartbeat Synchronized
          </p>
        </div>
      </div>

      {/* 3. Cross-Course Track Progress Breakdown */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-[#ffffff] tracking-tight">
              Course Domains & Curricula Progression
            </h2>
            <p className="text-xs text-[#8a8f98]">
              Comprehensive tracking across all ingested operational security tracks and modules.
            </p>
          </div>
          <span className="text-xs font-mono text-[#8a8f98] bg-[#0f1011] border border-[#23252a] px-2.5 py-1 rounded-[6px]">
            {tracks.length} Domains Loaded
          </span>
        </div>

        <div className="space-y-4">
          {tracks.map((track) => {
            const isFullyCompleted = track.completion_pct === 100;
            return (
              <div
                key={track.id}
                className="bg-[#0f1011] border border-[#23252a] hover:border-[#383b3f] rounded-[12px] p-6 transition space-y-5"
              >
                {/* Track Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-mono text-[#8a8f98] px-1.5 py-0.5 rounded-[4px] bg-[#161718] border border-[#23252a]">
                        TRACK 0{track.order_index}
                      </span>
                      <h3 className="text-base font-medium text-[#ffffff] tracking-tight">
                        {track.title}
                      </h3>
                    </div>
                    <p className="text-xs text-[#8a8f98]">{track.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm font-medium text-[#ffffff]">
                          {track.completion_pct}%
                        </span>
                        {isFullyCompleted ? (
                          <span className="text-[10px] font-mono uppercase bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/30 px-1.5 py-0.5 rounded-[3px]">
                            Mastered
                          </span>
                        ) : track.completed_count > 0 ? (
                          <span className="text-[10px] font-mono uppercase bg-[#e4f222]/10 text-[#e4f222] border border-[#e4f222]/30 px-1.5 py-0.5 rounded-[3px]">
                            In Progress
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono uppercase bg-[#161718] text-[#8a8f98] border border-[#23252a] px-1.5 py-0.5 rounded-[3px]">
                            Not Started
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-[#62666d]">
                        {track.completed_count} of {track.total_modules} Completed • {formatTime(track.time_spent_seconds)}
                      </span>
                    </div>

                    <div className="w-24 h-2 bg-[#161718] border border-[#23252a] rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFullyCompleted ? 'bg-[#27a644]' : 'bg-[#e4f222]'
                        }`}
                        style={{ width: `${track.completion_pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Modules Grid for this Track */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {track.modules.map((m) => {
                    const isCompleted = m.status === 'completed';
                    const isInProgress = m.status === 'in_progress';

                    return (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-[6px] border transition flex items-center justify-between gap-3 ${
                          isCompleted
                            ? 'bg-[#161718]/40 border-[#23252a]'
                            : isInProgress
                            ? 'bg-[#161718]/80 border-[#383b3f]'
                            : 'bg-[#0f1011] border-[#23252a]/70 opacity-80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-[#27a644]" />
                            ) : isInProgress ? (
                              <CircleDot className="w-4 h-4 text-[#e4f222] animate-pulse" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-[#62666d]" />
                            )}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-xs font-medium text-[#ffffff] truncate">
                                {m.title}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#8a8f98]">
                              <span className="flex items-center gap-1 font-mono uppercase">
                                {getLabIcon(m.lab_type)}
                                <span>{m.lab_type.replace('_', ' ')}</span>
                              </span>
                              <span>•</span>
                              <span className="font-mono text-[#62666d]">
                                ~{m.estimated_minutes}m
                              </span>
                              <span>•</span>
                              <span
                                className={`font-mono ${
                                  m.difficulty === 'Fundamentals'
                                    ? 'text-[#27a644]'
                                    : m.difficulty === 'Intermediate'
                                    ? 'text-[#e4f222]'
                                    : 'text-[#eb5757]'
                                }`}
                              >
                                {m.difficulty}
                              </span>
                              {m.completed_at && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#27a644] font-mono">
                                    Done {new Date(m.completed_at).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onNavigateToModule(track.id, m.slug)}
                          className="shrink-0 px-2.5 py-1 text-xs rounded-[6px] font-medium border border-[#23252a] hover:border-[#383b3f] bg-[#161718] hover:bg-[#23252a] text-[#ffffff] flex items-center gap-1.5 transition"
                        >
                          <span>{isCompleted ? 'Review' : isInProgress ? 'Resume' : 'Launch'}</span>
                          <ArrowRight className="w-3 h-3 text-[#e4f222]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Security Telemetry & Audit Log */}
      {recent_activity && recent_activity.length > 0 && (
        <div className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#e4f222]" />
              <h2 className="text-sm font-medium text-[#ffffff] tracking-tight">
                Recent Security Lab Telemetry
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#62666d]">
              Audited Sessions in Cloudflare D1
            </span>
          </div>

          <div className="space-y-2">
            {recent_activity.map((act, idx) => (
              <div
                key={`${act.module_id}-${idx}`}
                className="flex items-center justify-between p-3 rounded-[6px] bg-[#161718]/50 border border-[#23252a] text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {act.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#27a644] shrink-0" />
                  ) : (
                    <Activity className="w-4 h-4 text-[#e4f222] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[#ffffff] font-medium truncate">
                      {act.module_title}
                    </div>
                    <div className="text-[11px] text-[#8a8f98] truncate">
                      {act.track_title} • {act.attempts} attempt(s)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
                  <span className="text-[#62666d]">
                    {new Date(act.last_accessed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigateToModule(act.track_id, act.module_slug)}
                    className="text-[#e4f222] hover:underline"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
