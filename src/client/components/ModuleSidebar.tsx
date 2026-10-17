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
        return <Terminal className="w-3.5 h-3.5 text-[#27a644]" />;
      case 'siem':
        return <Search className="w-3.5 h-3.5 text-[#02b8cc]" />;
      case 'hex_inspector':
        return <Cpu className="w-3.5 h-3.5 text-[#eb5757]" />;
      case 'quiz':
        return <HelpCircle className="w-3.5 h-3.5 text-[#e4f222]" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-[#8a8f98]" />;
    }
  };

  return (
    <aside className="lg:col-span-3 xl:col-span-2 border-b lg:border-b-0 lg:border-r border-[#23252a] bg-[#08090a] p-4 space-y-4 overflow-y-auto flex flex-col justify-between">
      <div className="space-y-3">
        <div className="pb-2.5 border-b border-[#23252a]/60">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#e4f222] font-normal">
            Domain Curriculum
          </div>
          <h2 className="font-medium text-sm text-[#ffffff] mt-0.5 tracking-tight">{trackTitle || 'Curriculum Modules'}</h2>
          {trackSubtitle && (
            <p className="text-[11px] text-[#8a8f98] mt-0.5 leading-snug tracking-tight">{trackSubtitle}</p>
          )}
        </div>

        <div className="space-y-1.5">
          {modules.map((m) => {
            const isCompleted = m.status === 'completed';
            const isSelected = activeModuleId === m.id;

            return (
              <button
                key={m.id}
                onClick={() => onSelectModule(m.slug)}
                className={`w-full text-left p-3 rounded-[6px] border transition flex items-start justify-between gap-2 ${
                  isSelected
                    ? 'bg-[#161718] border-[#383b3f] text-[#ffffff] shadow-sm'
                    : 'bg-[#0f1011] border-[#23252a]/80 hover:border-[#383b3f] hover:bg-[#161718]/70 text-[#d0d6e0]'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className={`text-xs leading-snug truncate ${isSelected ? 'text-[#ffffff] font-medium' : 'text-[#d0d6e0]'}`}>
                    {m.title}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#8a8f98]">
                    <span className="px-1.5 py-0.2 rounded-[4px] font-mono bg-[rgba(255,255,255,0.04)] text-[#8a8f98] border border-[#23252a]">
                      {m.difficulty}
                    </span>
                    <span className="text-[#62666d]">{m.estimated_minutes}m</span>
                    <span className="flex items-center gap-1 font-mono text-[#8a8f98]">
                      {getLabIcon(m.lab_type)}
                      <span className="capitalize">{m.lab_type.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>

                <span
                  className={`w-4 h-4 rounded-[4px] flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${
                    isCompleted
                      ? 'bg-[#27a644]/15 text-[#27a644] border border-[#27a644]/40 font-bold'
                      : 'border border-[#23252a] text-transparent'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3 text-[#27a644]" /> : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden lg:block pt-3 border-t border-[#23252a]/60 text-[10px] text-[#62666d] font-mono space-y-1">
        <div>RUNTIME: Cloudflare Workerd</div>
        <div>STORAGE: Cloudflare D1 (Edge SQLite)</div>
      </div>
    </aside>
  );
};
