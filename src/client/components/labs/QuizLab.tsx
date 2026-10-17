import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, Award } from 'lucide-react';

interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

interface QuizLabProps {
  labConfig: {
    questions?: QuizQuestion[];
    passing_token?: string;
  };
  onPopulateSubmission?: (token: string) => void;
}

export const QuizLab: React.FC<QuizLabProps> = ({ labConfig, onPopulateSubmission }) => {
  const questions = labConfig.questions || [];
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);

  const handleSelect = (questionId: string, optionIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx
    }));
    setChecked(false);
  };

  const allAnswered = questions.length > 0 && questions.every((q) => selectedAnswers[q.id] !== undefined);
  const correctCount = questions.filter((q) => selectedAnswers[q.id] === q.answerIndex).length;
  const isAllCorrect = checked && correctCount === questions.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4 text-xs font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white text-sm">Comprehension Knowledge Check</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {Object.keys(selectedAnswers).length}/{questions.length} Answered
        </span>
      </div>

      <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const isSelected = selectedAnswers[q.id] !== undefined;
          const userChoice = selectedAnswers[q.id];
          const isCorrect = userChoice === q.answerIndex;

          return (
            <div key={q.id} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <div className="font-semibold text-slate-200 leading-snug">
                {idx + 1}. {q.prompt}
              </div>

              <div className="space-y-1.5 pl-1">
                {q.options.map((opt, optIdx) => {
                  const isThisSelected = userChoice === optIdx;
                  let borderClass = 'border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300';

                  if (checked) {
                    if (optIdx === q.answerIndex) {
                      borderClass = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300 font-medium';
                    } else if (isThisSelected && !isCorrect) {
                      borderClass = 'border-rose-500/50 bg-rose-950/20 text-rose-300';
                    }
                  } else if (isThisSelected) {
                    borderClass = 'border-amber-500/50 bg-amber-500/10 text-amber-200 font-medium';
                  }

                  return (
                    <label
                      key={optIdx}
                      className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition text-[11px] ${borderClass}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={isThisSelected}
                        onChange={() => handleSelect(q.id, optIdx)}
                        className="mt-0.5 text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>

              {checked && (
                <div
                  className={`p-2 rounded text-[11px] leading-relaxed flex items-start gap-1.5 ${
                    isCorrect
                      ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-950/30 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {isCorrect ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <span>{q.explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
        <button
          type="button"
          disabled={!allAnswered}
          onClick={() => setChecked(true)}
          className={`px-4 py-2 rounded text-xs font-semibold transition ${
            allAnswered
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          Check Answers
        </button>

        {checked && (
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-semibold ${
                isAllCorrect ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              Score: {correctCount}/{questions.length} Correct
            </span>

            {isAllCorrect && labConfig.passing_token && (
              <button
                type="button"
                onClick={() => onPopulateSubmission?.(labConfig.passing_token!)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono px-3 py-1.5 rounded text-xs transition flex items-center gap-1 shadow-sm"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Use Validation Token: {labConfig.passing_token}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
