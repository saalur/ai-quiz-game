import React from 'react';
import type { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentPlayerName?: string | null;
  maxRows?: number;
}

const RANK_MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

export function Leaderboard({
  entries,
  currentPlayerName,
  maxRows = 10,
}: LeaderboardProps) {
  const displayed = entries.slice(0, maxRows);

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-md border border-indigo-100">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between text-sm font-bold uppercase tracking-wide">
        <span>Rank &amp; Player</span>
        <span>Score</span>
      </div>

      {/* Rows */}
      <ul className="divide-y divide-indigo-50">
        {displayed.map((entry) => {
          const isCurrentPlayer = entry.name === currentPlayerName;
          const medal = RANK_MEDALS[entry.rank];

          return (
            <li
              key={`${entry.rank}-${entry.name}`}
              className={`flex items-center px-4 py-3 gap-3 transition-colors ${
                isCurrentPlayer
                  ? 'bg-yellow-50 border-l-4 border-yellow-400'
                  : 'bg-white hover:bg-indigo-50'
              }`}
            >
              {/* Rank */}
              <span className="w-8 text-center text-lg font-black text-indigo-400">
                {medal ?? `#${entry.rank}`}
              </span>

              {/* Name */}
              <span
                className={`flex-1 font-semibold truncate ${
                  isCurrentPlayer ? 'text-yellow-700' : 'text-gray-800'
                }`}
              >
                {entry.name}
                {isCurrentPlayer && (
                  <span className="ml-2 text-xs text-yellow-500 font-bold">(you)</span>
                )}
              </span>

              {/* Points gained */}
              {entry.lastPoints > 0 && (
                <span className="text-xs font-bold text-green-500 mr-2">
                  +{entry.lastPoints}
                </span>
              )}

              {/* Score */}
              <span className="font-black text-indigo-700 tabular-nums">
                {entry.score.toLocaleString()}
              </span>
            </li>
          );
        })}

        {entries.length === 0 && (
          <li className="px-4 py-6 text-center text-gray-400 italic">
            No scores yet
          </li>
        )}
      </ul>
    </div>
  );
}
