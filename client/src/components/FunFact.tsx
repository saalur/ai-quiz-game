import React from 'react';

interface FunFactProps {
  text: string;
}

export function FunFact({ text }: FunFactProps) {
  return (
    <div className="w-full bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0 leading-none">💡</span>
        <div>
          <p className="text-sm font-black text-amber-700 uppercase tracking-wide mb-1">
            Did you know?
          </p>
          <p className="text-gray-700 text-base leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
}
