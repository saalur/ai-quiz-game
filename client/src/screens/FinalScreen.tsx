import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/gameStore';
import { Podium } from '../components/Podium';
import { Leaderboard } from '../components/Leaderboard';

export function FinalScreen() {
  const navigate = useNavigate();
  const { gameState, playerName, resetGame } = useGameStore();
  const confettiFired = useRef(false);

  const leaderboard = gameState?.leaderboard ?? [];

  // Fire confetti on mount
  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0.6 },
        ...opts,
        particleCount: Math.floor(200 * particleRatio),
      });
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  const handlePlayAgain = () => {
    resetGame();
    navigate('/');
  };

  // Find current player's entry
  const myEntry = leaderboard.find((e) => e.name === playerName);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-4">
      <div className="max-w-lg mx-auto pt-4 pb-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">🎉</div>
          <h1 className="text-4xl sm:text-5xl font-black text-white">
            Game Over!
          </h1>
          <p className="text-indigo-200 text-lg mt-2 font-medium">
            Here's how everyone did:
          </p>
        </div>

        {/* Podium */}
        {leaderboard.length >= 1 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 mb-6">
            <h2 className="text-white font-black text-xl text-center mb-4 uppercase tracking-wide">
              🏆 Top 3
            </h2>
            <Podium entries={leaderboard} />
          </div>
        )}

        {/* Player's own result */}
        {myEntry && (
          <div className="bg-yellow-400 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-yellow-900 font-bold text-sm">Your result</p>
              <p className="text-yellow-900 font-black text-xl">
                #{myEntry.rank} — {myEntry.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-yellow-700 text-sm font-semibold">Final score</p>
              <p className="text-yellow-900 font-black text-3xl">
                {myEntry.score.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Full leaderboard */}
        <div className="mb-8">
          <h2 className="text-white font-bold text-lg mb-3 uppercase tracking-wide">
            Full Leaderboard
          </h2>
          <Leaderboard
            entries={leaderboard}
            currentPlayerName={playerName}
            maxRows={20}
          />
        </div>

        {/* Play again */}
        <button
          onClick={handlePlayAgain}
          className="w-full min-h-[56px] bg-white text-indigo-700 font-black text-xl rounded-2xl shadow-lg hover:bg-indigo-50 active:scale-95 transition-all"
        >
          🔁 Play Again
        </button>
      </div>
    </div>
  );
}
