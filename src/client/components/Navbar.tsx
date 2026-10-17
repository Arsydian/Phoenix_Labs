import React, { useState, useRef, useEffect } from 'react';
import { Shield, ChevronDown, Check, PlusCircle, BookOpen, Layers } from 'lucide-react';

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
}

export const Navbar: React.FC<NavbarProps> = ({
  student,
  tracks,
  activeTrackId,
  onSelectTrack,
  completedCount,
  totalModules,
  onOpenIngest,
  appVersion = '1.0.1'
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

  return (
    <header className="border-b border-[#e5e5e5] bg-white px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 select-none">
      {/* Brand & Organization */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm bg-[#ff5e1f] text-white flex items-center justify-center shadow-sm">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-sm text-[#262626]">
              PHOENIX LABS // ACADEMY
            </span>
            <span className="text-[10px] font-mono bg-[#f0f0f0] text-[#666666] px-1.5 py-0.5 rounded-sm border border-[#e5e5e5]">
              v{appVersion}
            </span>
            {student && (
              <span className="text-[11px] font-mono bg-[#fdfdfc] text-[#262626] px-2 py-0.5 rounded-sm border border-[#e5e5e5] hidden sm:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-[#737373]">{student.zero_trust_enforced ? 'Zero Trust:' : 'Operator:'}</span>
                <span className="font-medium">{student.email}</span>
                {student.isAdmin && (
                  <span className="ml-1 px-1 bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/30 rounded-sm text-[9px] font-bold">
                    ADMIN
                  </span>
                )}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#737373] hidden sm:block">
            Edge-Native Cyber Defense & Incident Triage Platform
          </p>
        </div>
      </div>

      {/* Course Topics Dropdown Menu */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-1.5 text-xs text-[#737373] mb-0.5">
          <Layers className="w-3.5 h-3.5 text-[#ff5e1f]" />
          <span>Course Domain:</span>
        </div>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 bg-[#fdfdfc] hover:bg-[#f7f7f6] text-[#262626] border border-[#d4d4d4] hover:border-[#ff5e1f] px-3.5 py-1.5 rounded-sm text-xs font-medium transition min-w-[220px] justify-between shadow-xs"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          <div className="flex items-center gap-2 truncate">
            <BookOpen className="w-3.5 h-3.5 text-[#ff5e1f] shrink-0" />
            <span className="font-semibold truncate">{activeTrack?.title || 'Select Course Topic'}</span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#737373] transition-transform duration-200 shrink-0 ${
              dropdownOpen ? 'rotate-180 text-[#ff5e1f]' : ''
            }`}
          />
        </button>

        {/* Dropdown Popover */}
        {dropdownOpen && (
          <div className="absolute left-0 mt-1 w-80 bg-white border border-[#e5e5e5] rounded-sm shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#737373] border-b border-[#f0f0f0]">
              Available Course Curriculum
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
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
                    className={`w-full text-left px-3.5 py-2.5 text-xs transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#fff7f2] text-[#ff5e1f] font-semibold'
                        : 'text-[#262626] hover:bg-[#f7f7f6]'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-medium text-xs flex items-center gap-1.5">
                        <span className={isSelected ? 'text-[#ff5e1f]' : 'text-[#262626]'}>
                          {t.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#737373] line-clamp-1">{t.subtitle}</div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#ff5e1f] shrink-0 mt-0.5" />
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
          <span className="text-[#737373]">Progress:</span>
          <div className="w-20 h-1.5 bg-[#f0f0f0] rounded-sm overflow-hidden">
            <div
              className="h-full bg-[#ff5e1f] transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="font-mono text-[#262626] font-semibold text-[11px]">
            {completedCount}/{totalModules}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenIngest}
          className="text-xs bg-white hover:bg-[#f7f7f6] text-[#262626] border border-[#d4d4d4] hover:border-[#262626] px-3 py-1.5 rounded-sm transition flex items-center gap-1.5 font-medium shadow-xs"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#ff5e1f]" />
          <span>Ingest Material</span>
        </button>
      </div>
    </header>
  );
};
