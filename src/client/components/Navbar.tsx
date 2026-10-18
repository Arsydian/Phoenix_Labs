import React, { useState, useRef, useEffect } from 'react';
import { Shield, ChevronDown, Check, PlusCircle, BookOpen, Layers, Terminal, User } from 'lucide-react';

interface Track {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description?: string;
}

interface NavbarProps {
  student: { email: string; isAdmin: boolean; zero_trust_enforced: boolean } | null;
  tracks: Track[];
  activeTrackId: string;
  onSelectTrack: (trackId: string) => void;
  completedCount: number;
  totalModules: number;
  onOpenIngest: () => void;
  appVersion?: string;
  viewMode?: 'workbench' | 'profile';
  onSelectView?: (mode: 'workbench' | 'profile') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  student,
  tracks,
  activeTrackId,
  onSelectTrack,
  completedCount,
  totalModules,
  onOpenIngest,
  appVersion = '1.2.1',
  viewMode = 'workbench',
  onSelectView
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTrack = tracks.find((t) => t.id === activeTrackId);
  const completionPct = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const displayVersion = (typeof window !== 'undefined' && (window as any).api?.appVersion) || appVersion;

  return (
    <header className="border-b border-[#23252a] bg-[#08090a]/90 backdrop-blur px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 select-none">
      {/* Brand & Organization */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-[6px] bg-[#0f1011] border border-[#23252a] flex items-center justify-center text-[#e4f222] shadow-sm">
          <Shield className="w-4 h-4 text-[#e4f222]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium tracking-tight text-sm text-[#ffffff]">
            PHOENIX LABS // ACADEMY
          </span>
          <span className="text-[10px] font-mono bg-[#161718] text-[#8a8f98] px-1.5 py-0.5 rounded-[4px] border border-[#23252a]">
            v{displayVersion}
          </span>
          {student && (
            <button
              type="button"
              onClick={() => onSelectView?.('profile')}
              className="text-[11px] font-mono bg-[#0f1011] hover:bg-[#161718] text-[#8a8f98] hover:text-[#ffffff] px-2 py-0.5 rounded-[4px] border border-[#23252a] hover:border-[#383b3f] hidden sm:inline-flex items-center gap-1.5 transition cursor-pointer"
              title="Open Student Profile"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#27a644]" />
              <span className="text-[#62666d]">{student.zero_trust_enforced ? 'Zero Trust' : 'Operator'}:</span>
              <span className="text-[#d0d6e0]">{student.email}</span>
              {student.isAdmin && (
                <span className="ml-1 px-1 bg-[#e4f222]/10 text-[#e4f222] border border-[#e4f222]/30 rounded-[3px] text-[9px] font-medium">
                  ADMIN
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Center Nav: View Switcher (Workbench vs Profile) */}
      <div className="flex items-center bg-[#0f1011] border border-[#23252a] rounded-[6px] p-0.5">
        <button
          type="button"
          onClick={() => onSelectView?.('workbench')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-[4px] transition ${
            viewMode === 'workbench'
              ? 'bg-[#161718] text-[#ffffff] font-medium border border-[#23252a]'
              : 'text-[#8a8f98] hover:text-[#ffffff]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-[#e4f222]" />
          <span>Workbench</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectView?.('profile')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-[4px] transition ${
            viewMode === 'profile'
              ? 'bg-[#161718] text-[#ffffff] font-medium border border-[#23252a]'
              : 'text-[#8a8f98] hover:text-[#ffffff]'
          }`}
        >
          <User className="w-3.5 h-3.5 text-[#02b8cc]" />
          <span>Student Profile</span>
        </button>
      </div>

      {/* Course Topics Dropdown Menu */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-1.5 text-[11px] text-[#8a8f98] mb-0.5">
          <Layers className="w-3 h-3 text-[#e4f222]" />
          <span>Course Domain:</span>
        </div>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 bg-[#0f1011] hover:bg-[#161718] text-[#d0d6e0] hover:text-[#ffffff] border border-[#23252a] hover:border-[#383b3f] px-3 py-1.5 rounded-[6px] text-xs font-normal transition min-w-[230px] justify-between shadow-sm"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <div className="flex items-center gap-2 truncate">
            <BookOpen className="w-3.5 h-3.5 text-[#e4f222] shrink-0" />
            <span className="text-[#ffffff] font-medium truncate">{activeTrack?.title || 'Select Course Domain'}</span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#8a8f98] transition-transform duration-200 shrink-0 ${
              dropdownOpen ? 'rotate-180 text-[#e4f222]' : ''
            }`}
          />
        </button>

        {/* Dropdown Popover */}
        {dropdownOpen && (
          <div className="absolute left-0 mt-1.5 w-84 bg-[#0f1011] border border-[#23252a] rounded-[12px] shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#62666d] border-b border-[#23252a]/60">
              Curriculum Domains
            </div>
            <div className="max-h-72 overflow-y-auto p-1 space-y-0.5">
              {tracks.map((t) => {
                const isSelected = activeTrackId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectTrack(t.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-[6px] transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#161718] text-[#ffffff] font-medium border border-[#23252a]'
                        : 'text-[#d0d6e0] hover:bg-[#161718]/60 hover:text-[#ffffff]'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs flex items-center gap-1.5">
                        <span className={isSelected ? 'text-[#ffffff] font-medium' : 'text-[#d0d6e0]'}>
                          {t.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8a8f98] line-clamp-1">{t.subtitle}</div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#e4f222] shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Progress & Ingestion Actions */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-xs">
          <span className="text-[#8a8f98]">Progress:</span>
          <div className="w-20 h-1.5 bg-[#161718] border border-[#23252a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#e4f222] transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="font-mono text-[#d0d6e0] text-[11px]">
            {completedCount}/{totalModules}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenIngest}
          className="text-xs bg-transparent hover:bg-[#161718] text-[#d0d6e0] hover:text-[#ffffff] border border-[#23252a] hover:border-[#383b3f] px-3 py-1.5 rounded-[6px] transition flex items-center gap-1.5 font-normal shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#e4f222]" />
          <span>Ingest Material</span>
        </button>
      </div>
    </header>
  );
};
