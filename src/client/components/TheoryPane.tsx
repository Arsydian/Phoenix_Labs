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
      <main className="lg:col-span-4 xl:col-span-5 border-b lg:border-b-0 lg:border-r border-[#e5e5e5] bg-white p-8 flex items-center justify-center text-[#737373]">
        <div className="text-center space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-[#d4d4d4]" />
          <p className="text-xs">Select a module from the sidebar to view theoretical mechanics.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="lg:col-span-4 xl:col-span-5 border-b lg:border-b-0 lg:border-r border-[#e5e5e5] bg-white p-6 overflow-y-auto space-y-5">
      {/* Module Meta Header */}
      <div className="space-y-1.5 pb-3 border-b border-[#f0f0f0]">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded-sm bg-[#fff7f2] text-[#ff5e1f] border border-[#ffdcd0] font-semibold text-[11px]">
            {module.difficulty}
          </span>
          <span className="text-[#d4d4d4]">•</span>
          <span className="text-[#737373] text-[11px]">{module.estimated_minutes} Min Module</span>
          <span className="text-[#d4d4d4]">•</span>
          <span className="text-[#737373] text-[11px] uppercase tracking-wide">
            Lab: {module.lab_type.replace('_', ' ')}
          </span>
        </div>

        <h1 className="text-xl font-bold text-[#262626] tracking-tight">
          {module.title}
        </h1>
      </div>

      {/* Structured Technical Theory */}
      <div className="space-y-3.5">
        {(module.theory_sections || []).map((sec, idx) => (
          <div
            key={idx}
            className="bg-[#fdfdfc] border border-[#e5e5e5] rounded-sm p-4 space-y-2 shadow-xs"
          >
            <h3 className="text-sm font-semibold text-[#262626] tracking-tight flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-[#ff5e1f] shrink-0" />
              <span>{sec.heading}</span>
            </h3>
            <div className="text-xs leading-relaxed text-[#525252] whitespace-pre-line font-sans">
              {sec.body}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};
