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
    <div className="bg-[#fdfdfc] border border-[#e5e5e5] rounded-sm p-4 space-y-4 text-xs font-sans shadow-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5]">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#ff5e1f]" />
          <span className="font-semibold text-[#262626] text-sm">Comprehension Knowledge Check</span>
        </div>
        <span className="text-[11px] font-mono text-[#737373]">
          {Object.keys(selectedAnswers).length}/{questions.length} Answered
        </span>
      </div>

      <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const userChoice = selectedAnswers[q.id];
          const isCorrect = userChoice === q.answerIndex;

          return (
            <div key={q.id} className="bg-white p-3.5 rounded-sm border border-[#e5e5e5] space-y-2 shadow-xs">
              <div className="font-medium text-[#262626] leading-snug">
                {idx + 1}. {q.prompt}
              </div>

              <div className="space-y-1.5 pl-1">
                {q.options.map((opt, optIdx) => {
                  const isThisSelected = userChoice === optIdx;
                  let borderClass = 'border-[#e5e5e5] hover:border-[#d4d4d4] bg-white text-[#262626]';

                  if (checked) {
                    if (optIdx === q.answerIndex) {
                      borderClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
                    } else if (isThisSelected && !isCorrect) {
                      borderClass = 'border-rose-400 bg-rose-50 text-rose-900';
                    }
                  } else if (isThisSelected) {
                    borderClass = 'border-[#ff5e1f] bg-[#fff7f2] text-[#ff5e1f] font-medium';
                  }

                  return (
                    <label
                      key={optIdx}
                      className={`flex items-start gap-2 p-2 rounded-sm border cursor-pointer transition text-[11px] ${borderClass}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={isThisSelected}
                        onChange={() => handleSelect(q.id, optIdx)}
                        className="mt-0.5 text-[#ff5e1f] focus:ring-0"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>

              {checked && (
                <div
                  className={`p-2 rounded-sm text-[11px] leading-relaxed flex items-start gap-1.5 ${
                    isCorrect
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {isCorrect ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{q.explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e5e5e5]">
        <button
          type="button"
          disabled={!allAnswered}
          onClick={() => setChecked(true)}
          className={`px-4 py-2 rounded-sm text-xs font-semibold transition ${
            allAnswered
              ? 'bg-[#ff5e1f] hover:bg-[#ff4800] text-white shadow-xs'
              : 'bg-[#f0f0f0] text-[#a3a3a3] cursor-not-allowed border border-[#e5e5e5]'
          }`}
        >
          Check Answers
        </button>

        {checked && (
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-semibold ${
                isAllCorrect ? 'text-emerald-700' : 'text-[#ff5e1f]'
              }`}
            >
              Score: {correctCount}/{questions.length} Correct
            </span>

            {isAllCorrect && labConfig.passing_token && (
              <button
                type="button"
                onClick={() => onPopulateSubmission?.(labConfig.passing_token!)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono px-3 py-1.5 rounded-sm text-xs transition flex items-center gap-1 shadow-xs"
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
