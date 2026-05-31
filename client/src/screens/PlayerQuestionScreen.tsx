import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useGameState } from '../hooks/useGameState';
import { submitAnswer } from '../api/client';
import { AnswerButton } from '../components/AnswerButton';
import { CountdownTimer } from '../components/CountdownTimer';
import { FunFact } from '../components/FunFact';
import { Leaderboard } from '../components/Leaderboard';
import type { AnswerOption } from '../types';

const OPTION_LETTERS: AnswerOption[] = ['A', 'B', 'C', 'D'];

export function PlayerQuestionScreen() {
  const navigate = useNavigate();
  const { roomCode, playerName, selectedAnswer, hasAnswered, setAnswer } =
    useGameStore();
  const gameState = useGameState(roomCode);

  // Reset answer state when question changes
  const questionIndex = gameState?.currentQuestionIndex;
  useEffect(() => {
    useGameStore.setState({ selectedAnswer: null, hasAnswered: false });
  }, [questionIndex]);

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

  const {
    currentQuestion,
    phase,
    currentQuestionIndex,
    totalQuestions,
    questionDeadline,
    leaderboard,
  } = gameState;

  const isRevealed = phase === 'revealed';
  const isAnswering = phase === 'answering';

  const handleAnswer = async (option: AnswerOption) => {
    if (hasAnswered || !isAnswering || !roomCode) return;
    setAnswer(option);
    try {
      await submitAnswer(roomCode, option);
    } catch {
      // If submit fails, still show as answered locally
      console.warn('Failed to submit answer');
    }
  };

  // Determine button state for each option
  const getButtonState = (option: AnswerOption) => {
    if (isRevealed) {
      const correct = currentQuestion.correct;
      if (option === correct) return 'correct' as const;
      if (option === selectedAnswer && option !== correct) return 'wrong' as const;
      return 'disabled' as const;
    }
    if (hasAnswered) {
      if (option === selectedAnswer) return 'selected' as const;
      return 'disabled' as const;
    }
    return 'idle' as const;
  };

  // Find current player's leaderboard entry
  const myEntry = leaderboard.find((e) => e.name === playerName);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-lg mx-auto pt-2">
        {/* Progress + timer row */}
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
        <div className="bg-white rounded-3xl shadow-lg p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-black text-gray-800 leading-snug flex-1">
              {currentQuestion.question}
            </h2>
            {isAnswering && (
              <div className="flex-shrink-0">
                <CountdownTimer deadline={questionDeadline} totalSeconds={30} />
              </div>
            )}
          </div>

          {/* Answered badge */}
          {hasAnswered && isAnswering && !isRevealed && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 mb-3 text-center">
              <p className="text-indigo-600 font-bold text-sm">
                ✅ Answer locked in! Waiting for others...
              </p>
            </div>
          )}

          {/* Answer buttons */}
          <div className="flex flex-col gap-3">
            {OPTION_LETTERS.map((letter) => (
              <AnswerButton
                key={letter}
                option={letter}
                text={currentQuestion.options[letter]}
                state={getButtonState(letter)}
                onClick={() => handleAnswer(letter)}
              />
            ))}
          </div>
        </div>

        {/* Reveal section */}
        {isRevealed && (
          <>
            {/* Correct/Wrong feedback banner */}
            {selectedAnswer !== null && (
              <div
                className={`rounded-2xl px-4 py-3 mb-4 text-center font-black text-lg ${
                  selectedAnswer === currentQuestion.correct
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {selectedAnswer === currentQuestion.correct
                  ? '🎉 Correct! Great job!'
                  : `❌ Wrong — correct was ${currentQuestion.correct}`}
              </div>
            )}
            {selectedAnswer === null && (
              <div className="rounded-2xl px-4 py-3 mb-4 text-center font-black text-lg bg-gray-100 text-gray-500">
                ⏰ You didn't answer in time
              </div>
            )}

            {/* Fun fact */}
            {currentQuestion.fun_fact && (
              <div className="mb-4">
                <FunFact text={currentQuestion.fun_fact} />
              </div>
            )}

            {/* Mini leaderboard */}
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                Leaderboard
              </h3>
              <Leaderboard
                entries={leaderboard}
                currentPlayerName={playerName}
                maxRows={5}
              />
              {myEntry && myEntry.rank > 5 && (
                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 flex items-center justify-between">
                  <span className="text-yellow-700 font-bold text-sm">
                    #{myEntry.rank} {myEntry.name} (you)
                  </span>
                  <span className="text-yellow-700 font-black">
                    {myEntry.score.toLocaleString()} pts
                  </span>
                </div>
              )}
            </div>

            {/* Waiting message */}
            <div className="text-center text-indigo-400 font-semibold py-3 flex items-center justify-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-sm">Waiting for host...</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
