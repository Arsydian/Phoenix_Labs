import React from 'react';
import { Shield, Sparkles, PlusCircle } from 'lucide-react';

interface NavbarProps {
  student: { email: string; isAdmin: boolean; zero_trust_enforced: boolean } | null;
  tracks: Array<{ id: string; slug: string; title: string; subtitle: string }>;
  activeTrackId: string;
  onSelectTrack: (trackId: string) => void;
  completedCount: number;
  totalModules: number;
  onOpenIngest: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  student,
  tracks,
  activeTrackId,
  onSelectTrack,
  completedCount,
  totalModules,
  onOpenIngest
}) => {
  const completionPct = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-sm tracking-wider">
          <Shield className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-sm md:text-base text-white">
              PHOENIX LABS // ACADEMY
            </span>
            {student && (
              <span className="text-[11px] font-mono bg-slate-800 text-emerald-300 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                <span>{student.zero_trust_enforced ? '🔒 Zero Trust:' : '💻 Operator:'}</span>
                <span className="font-medium text-slate-200">{student.email}</span>
                {student.isAdmin && (
                  <span className="ml-1 px-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[9px]">
                    ADMIN
                  </span>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Edge-Native Cyber Operations & Incident Triage Platform
          </p>
        </div>
      </div>

      {/* Domain Track Switcher */}
      <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
        {tracks.map((t) => {
          const isActive = activeTrackId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTrack(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                isActive
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>{t.title}</span>
            </button>
          );
        })}
      </div>

      {/* Progress & Admin Action */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Progress:</span>
          <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="font-mono text-emerald-400 font-bold">
            {completedCount}/{totalModules}
          </span>
        </div>

        <button
          onClick={onOpenIngest}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-md transition flex items-center gap-1.5 font-medium"
        >
          <PlusCircle className="w-3.5 h-3.5 text-orange-400" />
          <span>Ingest Material</span>
        </button>
      </div>
    </header>
  );
};
