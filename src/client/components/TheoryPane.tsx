import React from 'react';
import { ChevronRight, BookOpen } from 'lucide-react';

interface TheorySection {
  heading: string;
  body: string;
}

interface TheoryPaneProps {
  module: {
    title: string;
    difficulty: string;
    estimated_minutes: number;
    lab_type: string;
    theory_sections: TheorySection[];
  } | null;
}

export const TheoryPane: React.FC<TheoryPaneProps> = ({ module }) => {
  if (!module) {
    return (
      <main className="lg:col-span-4 xl:col-span-5 border-b lg:border-b-0 lg:border-r border-[#23252a] bg-[#08090a] p-8 flex items-center justify-center text-[#62666d]">
        <div className="text-center space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-[#23252a]" />
          <p className="text-xs">Select a curriculum module from the sidebar to inspect operational theory.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="lg:col-span-4 xl:col-span-5 border-b lg:border-b-0 lg:border-r border-[#23252a] bg-[#08090a] p-6 overflow-y-auto space-y-5">
      {/* Module Meta Header */}
      <div className="space-y-2 pb-3 border-b border-[#23252a]/60">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded-[4px] bg-[rgba(255,255,255,0.05)] text-[#d0d6e0] border border-[#23252a] font-normal text-[11px]">
            {module.difficulty}
          </span>
          <span className="text-[#383b3f]">•</span>
          <span className="text-[#8a8f98] text-[11px]">{module.estimated_minutes} Min Module</span>
          <span className="text-[#383b3f]">•</span>
          <span className="text-[#e4f222] text-[11px] uppercase tracking-wide">
            Lab: {module.lab_type.replace('_', ' ')}
          </span>
        </div>

        <h1 className="text-xl font-medium text-[#ffffff] tracking-tight">
          {module.title}
        </h1>
      </div>

      {/* Structured Technical Theory Cards */}
      <div className="space-y-3.5">
        {(module.theory_sections || []).map((sec, idx) => (
          <div
            key={idx}
            className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-4 space-y-2 shadow-sm"
          >
            <h3 className="text-sm font-medium text-[#ffffff] tracking-tight flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-[#e4f222] shrink-0" />
              <span>{sec.heading}</span>
            </h3>
            <div className="text-xs leading-relaxed text-[#d0d6e0] whitespace-pre-line font-sans">
              {sec.body}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};
