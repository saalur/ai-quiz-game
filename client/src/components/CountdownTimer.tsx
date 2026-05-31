import React from 'react';
import { useCountdown } from '../hooks/useCountdown';

interface CountdownTimerProps {
  deadline: number | null;
  totalSeconds?: number;
}

export function CountdownTimer({
  deadline,
  totalSeconds = 30,
}: CountdownTimerProps) {
  const secondsLeft = useCountdown(deadline);
  const isUrgent = secondsLeft <= 10 && secondsLeft > 0;
  const isDone = secondsLeft === 0;

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const circumference = 2 * Math.PI * 28; // radius 28
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
          {/* Background circle */}
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke="#e0e7ff"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke={isDone ? '#ef4444' : isUrgent ? '#f59e0b' : '#6366f1'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-2xl font-black ${
              isDone
                ? 'text-red-500'
                : isUrgent
                ? 'text-yellow-500 animate-pulse'
                : 'text-indigo-700'
            }`}
          >
            {secondsLeft}
          </span>
        </div>
      </div>
      <span
        className={`text-xs font-semibold uppercase tracking-wide ${
          isUrgent ? 'text-yellow-600' : 'text-indigo-400'
        }`}
      >
        {isDone ? 'Time up!' : 'seconds'}
      </span>
    </div>
  );
}
