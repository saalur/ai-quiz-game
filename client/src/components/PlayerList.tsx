import React from 'react';

interface PlayerListProps {
  names: string[];
  highlightName?: string | null;
}

const AVATAR_COLOURS = [
  'bg-violet-400',
  'bg-fuchsia-400',
  'bg-sky-400',
  'bg-teal-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-indigo-400',
  'bg-emerald-400',
];

export function PlayerList({ names, highlightName }: PlayerListProps) {
  if (names.length === 0) {
    return (
      <p className="text-indigo-300 italic text-center py-4">
        Waiting for players to join...
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
      {names.map((name, i) => {
        const colour = AVATAR_COLOURS[i % AVATAR_COLOURS.length];
        const isMe = name === highlightName;

        return (
          <li
            key={name}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
              isMe
                ? 'bg-yellow-100 border-2 border-yellow-400'
                : 'bg-white border border-indigo-100'
            } shadow-sm`}
          >
            {/* Avatar circle */}
            <span
              className={`${colour} w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0`}
            >
              {name.charAt(0).toUpperCase()}
            </span>
            <span
              className={`font-semibold text-sm truncate ${
                isMe ? 'text-yellow-700' : 'text-gray-700'
              }`}
            >
              {name}
              {isMe && <span className="ml-1 text-yellow-500">(you)</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
