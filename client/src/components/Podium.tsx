import React from 'react';
import type { LeaderboardEntry } from '../types';

interface PodiumProps {
  entries: LeaderboardEntry[];
}

export function Podium({ entries }: PodiumProps) {
  const first = entries.find((e) => e.rank === 1);
  const second = entries.find((e) => e.rank === 2);
  const third = entries.find((e) => e.rank === 3);

  return (
    <div className="flex items-end justify-center gap-3 w-full max-w-sm mx-auto select-none">
      {/* 2nd place */}
      <PodiumColumn
        entry={second}
        height="h-24"
        bgColor="bg-gray-300"
        textColor="text-gray-700"
        medal="🥈"
        rank={2}
      />

      {/* 1st place — tallest */}
      <PodiumColumn
        entry={first}
        height="h-36"
        bgColor="bg-yellow-400"
        textColor="text-yellow-900"
        medal="🥇"
        rank={1}
        tall
      />

      {/* 3rd place */}
      <PodiumColumn
        entry={third}
        height="h-16"
        bgColor="bg-amber-600"
        textColor="text-amber-100"
        medal="🥉"
        rank={3}
      />
    </div>
  );
}

interface PodiumColumnProps {
  entry: LeaderboardEntry | undefined;
  height: string;
  bgColor: string;
  textColor: string;
  medal: string;
  rank: number;
  tall?: boolean;
}

function PodiumColumn({
  entry,
  height,
  bgColor,
  textColor,
  medal,
  rank,
  tall = false,
}: PodiumColumnProps) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      {/* Avatar / Medal */}
      <div className="text-4xl mb-1">{medal}</div>

      {/* Player name */}
      <div
        className={`text-center text-sm font-bold truncate w-full px-1 ${
          tall ? 'text-base' : ''
        } text-gray-800`}
      >
        {entry?.name ?? '—'}
      </div>

      {/* Score */}
      <div className="text-xs font-semibold text-gray-500 mb-1">
        {entry ? entry.score.toLocaleString() + ' pts' : ''}
      </div>

      {/* Podium block */}
      <div
        className={`w-full ${height} ${bgColor} ${textColor} rounded-t-xl flex items-center justify-center text-2xl font-black shadow-md`}
      >
        {rank}
      </div>
    </div>
  );
}
