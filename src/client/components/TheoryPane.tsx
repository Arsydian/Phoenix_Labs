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
      <main className="lg:col-span-4 xl:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-800 p-8 flex items-center justify-center text-slate-500">
        <div className="text-center space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-sm">Select a module from the sidebar to begin.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="lg:col-span-4 xl:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-800 p-6 overflow-y-auto space-y-5">
      {/* Module Meta Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
            {module.difficulty}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{module.estimated_minutes} Min Module</span>
          <span className="text-slate-500">•</span>
          <span className="text-amber-300 uppercase tracking-wide">
            Lab: {module.lab_type.replace('_', ' ')}
          </span>
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          {module.title}
        </h1>
      </div>

      {/* Structured Systems Architecture & Threat Theory */}
      <div className="space-y-4">
        {(module.theory_sections || []).map((sec, idx) => (
          <div
            key={idx}
            className="bg-slate-900/50 border border-slate-800/90 rounded-lg p-4 space-y-2"
          >
            <h3 className="text-sm font-semibold text-orange-300 tracking-wide flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>{sec.heading}</span>
            </h3>
            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line font-sans">
              {sec.body}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};
