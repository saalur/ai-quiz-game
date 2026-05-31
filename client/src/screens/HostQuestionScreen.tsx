import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useGameState } from '../hooks/useGameState';
import { revealAnswer, nextQuestion } from '../api/client';
import { FunFact } from '../components/FunFact';
import { Leaderboard } from '../components/Leaderboard';

type AnswerOption = 'A' | 'B' | 'C' | 'D';

const OPTION_LETTERS: AnswerOption[] = ['A', 'B', 'C', 'D'];

const OPTION_BASE =
  'w-full min-h-[56px] px-4 py-3 rounded-2xl text-white font-bold text-left flex items-center gap-3 text-base transition-all';

function HostAnswerOption({
  letter,
  text,
  isCorrect,
  isRevealed,
}: {
  letter: AnswerOption;
  text: string;
  isCorrect: boolean;
  isRevealed: boolean;
}) {
  const bgClass = isRevealed
    ? isCorrect
      ? 'bg-gradient-to-r from-green-400 to-emerald-500 ring-4 ring-green-300'
      : 'bg-gray-200 text-gray-500'
    : 'bg-gradient-to-r from-indigo-500 to-purple-600';

  const textClass =
    isRevealed && !isCorrect ? 'text-gray-500' : 'text-white';

  return (
    <div className={`${OPTION_BASE} ${bgClass} ${textClass}`}>
      <span
        className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black ${
          isRevealed && !isCorrect ? 'bg-gray-300 text-gray-400' : 'bg-white/25 text-white'
        }`}
      >
        {letter}
      </span>
      <span className="flex-1 leading-snug">{text}</span>
      {isRevealed && isCorrect && (
        <span className="flex-shrink-0 text-2xl">✅</span>
      )}
    </div>
  );
}

export function HostQuestionScreen() {
  const navigate = useNavigate();
  const { roomCode } = useGameStore();
  const gameState = useGameState(roomCode);

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gameState?.status === 'finished' || gameState?.phase === 'finished') {
      navigate('/finished');
    }
  }, [gameState?.status, gameState?.phase, navigate]);

  if (!gameState || !gameState.currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <p className="text-indigo-400 font-semibold text-lg animate-pulse">
          Loading question...
        </p>
      </div>
    );
  }

  const { currentQuestion, phase, currentQuestionIndex, totalQuestions, leaderboard, playerCount } = gameState;
  const isRevealed = phase === 'revealed';
  const isLastQuestion = currentQuestionIndex + 1 >= totalQuestions;

  const answeredCount = leaderboard.filter((e) => e.lastPoints !== undefined).length;

  const handleReveal = async () => {
    if (!roomCode) return;
    setActionLoading(true);
    setError(null);
    try {
      await revealAnswer(roomCode);
    } catch {
      setError('Failed to reveal answer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNext = async () => {
    if (!roomCode) return;
    setActionLoading(true);
    setError(null);
    try {
      await nextQuestion(roomCode);
    } catch {
      setError('Failed to advance to next question.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto pt-2">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 bg-indigo-100 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{
                width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
              }}
            />
          </div>
          <span className="text-sm font-bold text-indigo-600 whitespace-nowrap">
            Q{currentQuestionIndex + 1} / {totalQuestions}
          </span>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="bg-indigo-100 text-indigo-700 font-black text-sm px-3 py-1 rounded-full uppercase tracking-wide">
              Host View
            </span>
            <span className="text-sm text-gray-400 font-semibold">
              👥 {playerCount} players
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-gray-800 leading-snug mb-6">
            {currentQuestion.question}
          </h2>

          {/* Answer options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {OPTION_LETTERS.map((letter) => (
              <HostAnswerOption
                key={letter}
                letter={letter}
                text={currentQuestion.options[letter]}
                isCorrect={currentQuestion.correct === letter}
                isRevealed={isRevealed}
              />
            ))}
          </div>

          {/* Answers tracker */}
          {!isRevealed && (
            <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-4 py-3">
              <span className="text-amber-500 font-bold text-sm">📊</span>
              <span className="text-amber-700 font-semibold text-sm">
                Answers received: monitoring players...
              </span>
            </div>
          )}
        </div>

        {/* Fun fact (revealed) */}
        {isRevealed && currentQuestion.fun_fact && (
          <div className="mb-4">
            <FunFact text={currentQuestion.fun_fact} />
          </div>
        )}

        {/* Leaderboard (revealed) */}
        {isRevealed && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
              Leaderboard
            </h3>
            <Leaderboard entries={leaderboard} maxRows={5} />
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* Action button */}
        {!isRevealed ? (
          <button
            onClick={handleReveal}
            disabled={actionLoading}
            className="w-full min-h-[56px] bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black text-xl rounded-2xl shadow-lg hover:from-amber-300 hover:to-orange-400 active:scale-95 transition-all disabled:opacity-60"
          >
            {actionLoading ? '⏳ Revealing...' : '👁️ Reveal Answer'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={actionLoading}
            className="w-full min-h-[56px] bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black text-xl rounded-2xl shadow-lg hover:from-green-300 hover:to-emerald-400 active:scale-95 transition-all disabled:opacity-60"
          >
            {actionLoading
              ? '⏳ Loading...'
              : isLastQuestion
              ? '🏁 End Game'
              : '➡️ Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}
