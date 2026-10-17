import React from 'react';
import { Terminal, Search, Cpu, HelpCircle, CheckCircle2 } from 'lucide-react';

interface ModuleItem {
  id: string;
  track_id: string;
  slug: string;
  title: string;
  difficulty: string;
  estimated_minutes: number;
  lab_type: 'terminal' | 'siem' | 'hex_inspector' | 'quiz';
  status: string;
}

interface ModuleSidebarProps {
  trackTitle?: string;
  trackSubtitle?: string;
  modules: ModuleItem[];
  activeModuleId?: string;
  onSelectModule: (slug: string) => void;
}

export const ModuleSidebar: React.FC<ModuleSidebarProps> = ({
  trackTitle,
  trackSubtitle,
  modules,
  activeModuleId,
  onSelectModule
}) => {
  const getLabIcon = (type: string) => {
    switch (type) {
      case 'terminal':
        return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
      case 'siem':
        return <Search className="w-3.5 h-3.5 text-sky-400" />;
      case 'hex_inspector':
        return <Cpu className="w-3.5 h-3.5 text-rose-400" />;
      case 'quiz':
        return <HelpCircle className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <aside className="lg:col-span-3 xl:col-span-2 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/40 p-4 space-y-4 overflow-y-auto flex flex-col justify-between">
      <div className="space-y-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-orange-400">
            Active Track
          </div>
          <h2 className="font-bold text-sm text-white mt-0.5">{trackTitle || 'Track Modules'}</h2>
          {trackSubtitle && (
            <p className="text-xs text-slate-400 mt-0.5 leading-snug">{trackSubtitle}</p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          {modules.map((m) => {
            const isCompleted = m.status === 'completed';
            const isSelected = activeModuleId === m.id;

            return (
              <button
                key={m.id}
                onClick={() => onSelectModule(m.slug)}
                className={`w-full text-left p-3 rounded-lg border transition flex items-start justify-between gap-2 ${
                  isSelected
                    ? 'bg-slate-800/90 border-orange-500/50 text-white shadow-sm'
                    : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 text-slate-300'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="text-xs font-semibold leading-snug truncate">{m.title}</div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                        m.difficulty === 'Fundamentals'
                          ? 'bg-sky-500/15 text-sky-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {m.difficulty}
                    </span>
                    <span className="text-slate-500 text-[10px]">{m.estimated_minutes}m</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      {getLabIcon(m.lab_type)}
                      <span className="capitalize">{m.lab_type.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>

                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                      : 'border border-slate-700 text-transparent'
                  }`}
                >
                  {isCompleted ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden lg:block pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono space-y-1">
        <div>RUNTIME: Cloudflare Workerd</div>
        <div>STORAGE: Cloudflare D1 (SQLite)</div>
      </div>
    </aside>
  );
};
