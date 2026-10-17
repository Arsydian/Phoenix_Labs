import React, { useState } from 'react';
import {
  ChevronRight,
  BookOpen,
  Terminal,
  Copy,
  Check,
  Maximize2,
  X,
  Compass,
  ShieldAlert
} from 'lucide-react';

interface TheorySection {
  heading: string;
  body: string;
}

interface TheoryPaneProps {
  module: {
    id?: string;
    title: string;
    difficulty: string;
    estimated_minutes: number;
    lab_type: string;
    theory_sections: TheorySection[];
  } | null;
  onRunCommand?: (cmd: string) => void;
}

/**
 * Renders inline formatting: **bold** and `inline code`
 */
function renderInlineFormatting(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={idx} className="text-[#ffffff] font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded-[4px] bg-[#161718] border border-[#23252a] text-[#e4f222] font-mono text-[11px]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

export const TheoryPane: React.FC<TheoryPaneProps> = ({ module, onRunCommand }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<{ src: string; alt: string } | null>(null);
  const [showProtocol, setShowProtocol] = useState(false);

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

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  /**
   * Parses rich Markdown blocks within a theory section body:
   * - Fenced code blocks (```lang ... ```)
   * - Markdown tables (| H1 | H2 |)
   * - Markdown images (![alt](url))
   * - Bullet/numbered lists and formatted paragraphs
   */
  const renderRichBody = (body: string) => {
    const blocks = body.split(/(```[\s\S]*?```)/g);

    return blocks.map((block, bIdx) => {
      if (block.startsWith('```') && block.endsWith('```')) {
        const lines = block.slice(3, -3).trim().split('\n');
        const firstLine = lines[0]?.trim() || '';
        const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
        const lang = hasLang ? firstLine : 'shell';
        const codeContent = (hasLang ? lines.slice(1) : lines).join('\n').trim();
        const isSingleCmd =
          module.lab_type === 'terminal' &&
          !codeContent.includes('\n') &&
          codeContent.length < 160 &&
          onRunCommand;

        return (
          <div
            key={bIdx}
            className="my-2.5 rounded-[8px] border border-[#23252a] bg-[#08090a] overflow-hidden shadow-inner"
          >
            <div className="flex items-center justify-between px-3 py-1 bg-[#161718] border-b border-[#23252a] text-[10px] font-mono text-[#8a8f98]">
              <span className="uppercase tracking-wider text-[#02b8cc]">{lang}</span>
              <div className="flex items-center gap-2">
                {isSingleCmd && (
                  <button
                    type="button"
                    onClick={() => onRunCommand(codeContent)}
                    className="flex items-center gap-1 text-[#27a644] hover:text-[#e4f222] transition"
                    title="Execute directly in lab terminal"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Run in Terminal</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy(codeContent)}
                  className="flex items-center gap-1 hover:text-[#ffffff] transition"
                >
                  {copiedCode === codeContent ? (
                    <>
                      <Check className="w-3 h-3 text-[#27a644]" />
                      <span className="text-[#27a644]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre className="p-3 text-[11px] font-mono text-[#d0d6e0] overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {codeContent}
            </pre>
          </div>
        );
      }

      // Process paragraphs, tables, images, and lists in non-code blocks
      const paragraphs = block
        .trim()
        .split(/\n{2,}/)
        .filter(Boolean);

      return (
        <div key={bIdx} className="space-y-2.5">
          {paragraphs.map((para, pIdx) => {
            const trimmed = para.trim();

            // 1. Image syntax: ![alt](src)
            const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
            if (imgMatch) {
              const [, alt, src] = imgMatch;
              return (
                <figure
                  key={pIdx}
                  className="my-3 rounded-[8px] border border-[#23252a] bg-[#08090a] p-2 space-y-1.5"
                >
                  <div className="relative group cursor-pointer" onClick={() => setLightboxImg({ src, alt })}>
                    <img
                      src={src}
                      alt={alt}
                      className="w-full rounded-[6px] border border-[#23252a]/80 object-contain max-h-72 bg-[#ffffff]"
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-[#08090a]/90 text-[#ffffff] border border-[#23252a] px-2 py-1 rounded-[4px] text-[10px] font-mono flex items-center gap-1 opacity-85 group-hover:opacity-100 transition"
                    >
                      <Maximize2 className="w-3 h-3 text-[#e4f222]" />
                      <span>Expand Diagram</span>
                    </button>
                  </div>
                  {alt && (
                    <figcaption className="text-[11px] text-[#8a8f98] font-mono text-center px-2">
                      {alt}
                    </figcaption>
                  )}
                </figure>
              );
            }

            // 2. Markdown Table
            const lines = trimmed.split('\n');
            if (lines.length >= 2 && lines[0].includes('|') && lines[1].includes('-')) {
              const parseRow = (r: string) =>
                r
                  .trim()
                  .replace(/^\||\|$/g, '')
                  .split('|')
                  .map((c) => c.trim());

              const headers = parseRow(lines[0]);
              const dataRows = lines.slice(2).map(parseRow);

              return (
                <div key={pIdx} className="my-2 overflow-x-auto rounded-[8px] border border-[#23252a]">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#161718] border-b border-[#23252a] text-[#ffffff] font-mono">
                        {headers.map((h, hIdx) => (
                          <th key={hIdx} className="py-2 px-2.5 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#23252a]/70 bg-[#08090a]">
                      {dataRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#161718]/50 transition">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-1.5 px-2.5 text-[#d0d6e0] align-top">
                              {renderInlineFormatting(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            // 3. Bullet or Numbered List
            if (lines.every((l) => /^(\s*[-*•]|\s*\d+\.)\s+/.test(l))) {
              return (
                <ul key={pIdx} className="space-y-1.5 pl-1">
                  {lines.map((line, lIdx) => {
                    const cleanLine = line.replace(/^(\s*[-*•]|\s*\d+\.)\s+/, '');
                    const numMatch = line.match(/^\s*(\d+\.)\s+/);
                    return (
                      <li key={lIdx} className="flex items-start gap-2 text-xs text-[#d0d6e0] leading-relaxed">
                        <span className="text-[#e4f222] font-mono text-[11px] shrink-0 mt-0.5">
                          {numMatch ? numMatch[1] : '▸'}
                        </span>
                        <span>{renderInlineFormatting(cleanLine)}</span>
                      </li>
                    );
                  })}
                </ul>
              );
            }

            // 4. Standard Paragraph (with single line breaks preserved)
            return (
              <div key={pIdx} className="text-xs leading-relaxed text-[#d0d6e0] whitespace-pre-line font-sans">
                {renderInlineFormatting(trimmed)}
              </div>
            );
          })}
        </div>
      );
    });
  };

  return (
    <main className="lg:col-span-4 xl:col-span-5 border-b lg:border-b-0 lg:border-r border-[#23252a] bg-[#08090a] p-6 overflow-y-auto space-y-5">
      {/* Module Meta Header */}
      <div className="space-y-2 pb-3 border-b border-[#23252a]/60">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span
            className={`px-2 py-0.5 rounded-[4px] border font-normal text-[11px] ${
              module.difficulty === 'Fundamentals'
                ? 'bg-[#27a644]/10 text-[#27a644] border-[#27a644]/30'
                : module.difficulty === 'Intermediate'
                ? 'bg-[#e4f222]/10 text-[#e4f222] border-[#e4f222]/30'
                : 'bg-[#eb5757]/10 text-[#eb5757] border-[#eb5757]/30'
            }`}
          >
            {module.difficulty}
          </span>
          <span className="text-[#383b3f]">•</span>
          <span className="text-[#8a8f98] text-[11px]">{module.estimated_minutes} Min Module</span>
          <span className="text-[#383b3f]">•</span>
          <span className="text-[#e4f222] text-[11px] uppercase tracking-wide">
            Lab: {module.lab_type.replace('_', ' ')}
          </span>
        </div>

        <h1 className="text-xl font-medium text-[#ffffff] tracking-tight">{module.title}</h1>
      </div>

      {/* Structured Technical Theory Cards */}
      <div className="space-y-3.5">
        {(module.theory_sections || []).map((sec, idx) => (
          <div
            key={idx}
            className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-4 space-y-2.5 shadow-sm"
          >
            <h3 className="text-sm font-medium text-[#ffffff] tracking-tight flex items-center gap-1.5 border-b border-[#23252a]/60 pb-2">
              <ChevronRight className="w-3.5 h-3.5 text-[#e4f222] shrink-0" />
              <span>{sec.heading}</span>
            </h3>
            <div>{renderRichBody(sec.body)}</div>
          </div>
        ))}
      </div>

      {/* Pedagogical Protocol Card (SQ3R & Enumerate-Before-Exploit) */}
      <div className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-3.5 space-y-2">
        <button
          type="button"
          onClick={() => setShowProtocol(!showProtocol)}
          className="w-full flex items-center justify-between text-xs font-mono text-[#8a8f98] hover:text-[#ffffff] transition"
        >
          <span className="flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-[#02b8cc]" />
            <span>OPERATOR METHODOLOGY // SQ3R & NUDGE PROTOCOL</span>
          </span>
          <span className="text-[10px] text-[#e4f222]">{showProtocol ? 'Hide' : 'Inspect'}</span>
        </button>

        {showProtocol && (
          <div className="pt-2 border-t border-[#23252a] text-[11px] text-[#8a8f98] space-y-1.5 leading-relaxed">
            <div>
              <strong className="text-[#ffffff]">1. Enumerate Before Exploit:</strong> Never force a payload against
              the first open port. Map all virtual hosts, non-standard ports, and service banners first.
            </div>
            <div>
              <strong className="text-[#ffffff]">2. SQ3R Active Comprehension:</strong> Survey the architecture,
              formulate a hypothesis, Read protocol specs, Recite in your host-tagged notes, and Review via lab execution.
            </div>
            <div className="flex items-center gap-1.5 text-[#e4f222] pt-1 font-mono text-[10px]">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Parallel Reporting Rule: Log every exact command & flag proof into your notes before advancing.</span>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Diagram Lightbox Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-[#08090a]/90 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div
            className="max-w-5xl w-full bg-[#0f1011] border border-[#23252a] rounded-[12px] p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#23252a]">
              <span className="text-xs font-mono text-[#ffffff]">{lightboxImg.alt || 'Architecture Diagram'}</span>
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                className="p-1 rounded-[6px] text-[#8a8f98] hover:text-[#ffffff] hover:bg-[#161718]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-auto max-h-[80vh] bg-[#ffffff] rounded-[8px] p-2">
              <img src={lightboxImg.src} alt={lightboxImg.alt} className="w-full h-auto object-contain mx-auto" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
