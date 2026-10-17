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
    <div className="bg-[#0f1011] border border-[#23252a] rounded-[12px] p-4 space-y-4 text-xs font-sans shadow-sm">
      <div className="flex items-center justify-between pb-2.5 border-b border-[#23252a]">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#e4f222]" />
          <span className="font-medium text-[#ffffff] text-sm">Comprehension Knowledge Check</span>
        </div>
        <span className="text-[11px] font-mono text-[#8a8f98]">
          {Object.keys(selectedAnswers).length}/{questions.length} Answered
        </span>
      </div>

      <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const userChoice = selectedAnswers[q.id];
          const isCorrect = userChoice === q.answerIndex;

          return (
            <div key={q.id} className="bg-[#161718] p-3.5 rounded-[6px] border border-[#23252a] space-y-2 shadow-xs">
              <div className="font-normal text-[#ffffff] leading-snug">
                {idx + 1}. {q.prompt}
              </div>

              <div className="space-y-1.5 pl-1">
                {q.options.map((opt, optIdx) => {
                  const isThisSelected = userChoice === optIdx;
                  let borderClass = 'border-[#23252a] hover:border-[#383b3f] bg-[#0f1011] text-[#d0d6e0]';

                  if (checked) {
                    if (optIdx === q.answerIndex) {
                      borderClass = 'border-[#27a644] bg-[#27a644]/10 text-[#ffffff] font-medium';
                    } else if (isThisSelected && !isCorrect) {
                      borderClass = 'border-[#eb5757] bg-[#eb5757]/10 text-[#eb5757]';
                    }
                  } else if (isThisSelected) {
                    borderClass = 'border-[#e4f222] bg-[#e4f222]/10 text-[#ffffff] font-medium';
                  }

                  return (
                    <label
                      key={optIdx}
                      className={`flex items-start gap-2 p-2 rounded-[4px] border cursor-pointer transition text-[11px] ${borderClass}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={isThisSelected}
                        onChange={() => handleSelect(q.id, optIdx)}
                        className="mt-0.5 text-[#e4f222] focus:ring-0 bg-[#08090a] border-[#23252a]"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>

              {checked && (
                <div
                  className={`p-2 rounded-[4px] text-[11px] leading-relaxed flex items-start gap-1.5 ${
                    isCorrect
                      ? 'bg-[#27a644]/10 text-[#27a644] border border-[#27a644]/30'
                      : 'bg-[#eb5757]/10 text-[#eb5757] border border-[#eb5757]/30'
                  }`}
                >
                  {isCorrect ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#27a644] mt-0.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 shrink-0 text-[#eb5757] mt-0.5" />
                  )}
                  <span>{q.explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#23252a]">
        <button
          type="button"
          disabled={!allAnswered}
          onClick={() => setChecked(true)}
          className={`px-4 py-2 rounded-[6px] text-xs font-medium transition ${
            allAnswered
              ? 'bg-[#e4f222] hover:bg-[#d4e21a] text-[#08090a] shadow-sm'
              : 'bg-[#161718] text-[#62666d] cursor-not-allowed border border-[#23252a]'
          }`}
        >
          Check Answers
        </button>

        {checked && (
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-medium ${
                isAllCorrect ? 'text-[#27a644]' : 'text-[#e4f222]'
              }`}
            >
              Score: {correctCount}/{questions.length} Correct
            </span>

            {isAllCorrect && labConfig.passing_token && (
              <button
                type="button"
                onClick={() => onPopulateSubmission?.(labConfig.passing_token!)}
                className="bg-[#27a644] hover:bg-[#23913b] text-[#ffffff] font-mono px-3 py-1.5 rounded-[6px] text-xs transition flex items-center gap-1 shadow-sm font-medium"
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
