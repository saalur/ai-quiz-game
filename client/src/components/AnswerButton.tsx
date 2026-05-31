import React from 'react';
import type { AnswerOption } from '../types';

type ButtonState = 'idle' | 'selected' | 'correct' | 'wrong' | 'disabled';

interface AnswerButtonProps {
  option: AnswerOption;
  text: string;
  state: ButtonState;
  onClick?: () => void;
}

const OPTION_COLOURS: Record<AnswerOption, string> = {
  A: 'from-violet-500 to-indigo-600',
  B: 'from-fuchsia-500 to-purple-600',
  C: 'from-sky-500 to-blue-600',
  D: 'from-teal-500 to-emerald-600',
};

const OPTION_BG_IDLE: Record<AnswerOption, string> = {
  A: 'bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500',
  B: 'bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-400 hover:to-purple-500',
  C: 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500',
  D: 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500',
};

export function AnswerButton({ option, text, state, onClick }: AnswerButtonProps) {
  const isClickable = state === 'idle';

  const baseClasses =
    'w-full min-h-[56px] px-4 py-3 rounded-2xl text-white font-bold text-left flex items-center gap-3 transition-all duration-200 select-none';

  let stateClasses = '';
  let ringClasses = '';

  switch (state) {
    case 'idle':
      stateClasses = OPTION_BG_IDLE[option] + ' shadow-md active:scale-95 cursor-pointer';
      break;
    case 'selected':
      stateClasses = `bg-gradient-to-r ${OPTION_COLOURS[option]} shadow-lg ring-4 ring-white ring-offset-2 ring-offset-indigo-100 scale-[1.02]`;
      break;
    case 'correct':
      stateClasses = 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg ring-4 ring-green-300 ring-offset-2 scale-[1.02]';
      ringClasses = 'ring-4 ring-green-300';
      break;
    case 'wrong':
      stateClasses = 'bg-gradient-to-r from-red-400 to-rose-500 shadow-md opacity-90';
      break;
    case 'disabled':
      stateClasses = 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60';
      break;
  }

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`${baseClasses} ${stateClasses} ${ringClasses}`}
      style={{ minHeight: '56px' }}
    >
      {/* Option letter badge */}
      <span
        className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black ${
          state === 'disabled' ? 'bg-gray-400 text-gray-200' : 'bg-white/25 text-white'
        }`}
      >
        {option}
      </span>

      <span className="flex-1 text-base leading-snug">{text}</span>

      {/* Status icon */}
      {state === 'correct' && (
        <span className="flex-shrink-0 text-2xl">✅</span>
      )}
      {state === 'wrong' && (
        <span className="flex-shrink-0 text-2xl">❌</span>
      )}
      {state === 'selected' && (
        <span className="flex-shrink-0 text-2xl">🔵</span>
      )}
    </button>
  );
}
