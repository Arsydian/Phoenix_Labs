import React from 'react';
import { Terminal, Search, Cpu, HelpCircle, Check } from 'lucide-react';

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
        return <Terminal className="w-3.5 h-3.5 text-emerald-600" />;
      case 'siem':
        return <Search className="w-3.5 h-3.5 text-sky-600" />;
      case 'hex_inspector':
        return <Cpu className="w-3.5 h-3.5 text-rose-600" />;
      case 'quiz':
        return <HelpCircle className="w-3.5 h-3.5 text-[#ff5e1f]" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-[#737373]" />;
    }
  };

  return (
    <aside className="lg:col-span-3 xl:col-span-2 border-b lg:border-b-0 lg:border-r border-[#e5e5e5] bg-[#fdfdfc] p-4 space-y-4 overflow-y-auto flex flex-col justify-between">
      <div className="space-y-3">
        <div className="pb-2 border-b border-[#f0f0f0]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#ff5e1f] font-semibold">
            Active Domain Modules
          </div>
          <h2 className="font-semibold text-sm text-[#262626] mt-0.5">{trackTitle || 'Curriculum Modules'}</h2>
          {trackSubtitle && (
            <p className="text-[11px] text-[#737373] mt-0.5 leading-snug">{trackSubtitle}</p>
          )}
        </div>

        <div className="space-y-1">
          {modules.map((m) => {
            const isCompleted = m.status === 'completed';
            const isSelected = activeModuleId === m.id;

            return (
              <button
                key={m.id}
                onClick={() => onSelectModule(m.slug)}
                className={`w-full text-left p-2.5 rounded-sm border transition flex items-start justify-between gap-2 ${
                  isSelected
                    ? 'bg-[#fff7f2] border-[#ff5e1f] text-[#262626] shadow-xs font-medium'
                    : 'bg-white border-[#f0f0f0] hover:border-[#d4d4d4] hover:bg-[#f7f7f6] text-[#262626]'
                }`}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="text-xs font-medium leading-snug truncate">{m.title}</div>
                  <div className="flex items-center gap-2 text-[10px] text-[#737373]">
                    <span className="px-1.5 py-0.2 rounded-sm font-mono bg-[#f0f0f0] text-[#555555] border border-[#e5e5e5]">
                      {m.difficulty}
                    </span>
                    <span>{m.estimated_minutes}m</span>
                    <span className="flex items-center gap-1 font-mono text-[#666666]">
                      {getLabIcon(m.lab_type)}
                      <span className="capitalize">{m.lab_type.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>

                <span
                  className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold'
                      : 'border border-[#d4d4d4] text-transparent'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3 text-emerald-600" /> : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden lg:block pt-3 border-t border-[#f0f0f0] text-[10px] text-[#8c8c8c] font-mono space-y-1">
        <div>RUNTIME: Cloudflare Workerd</div>
        <div>STORAGE: Cloudflare D1 (Edge SQLite)</div>
      </div>
    </aside>
  );
};
