import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useGameState } from '../hooks/useGameState';

function AnimatedDots() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(iv);
  }, []);
  return <span>{dots}</span>;
}

export function PlayerLobbyScreen() {
  const navigate = useNavigate();
  const { roomCode, playerName, resetGame } = useGameStore();
  const gameState = useGameState(roomCode);

  useEffect(() => {
    if (gameState?.status === 'active') {
      navigate('/player/game');
    }
    if (gameState?.status === 'finished') {
      navigate('/finished');
    }
  }, [gameState?.status, navigate]);

  const playerCount = gameState?.playerCount ?? 0;

  const handleLeave = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Top banner */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-6 text-center">
            <div className="text-5xl mb-2">🙋</div>
            <h1 className="text-2xl font-black text-white">You're in!</h1>
            <p className="text-indigo-200 text-sm mt-1">
              Hi, <span className="font-bold text-white">{playerName}</span>!
            </p>
          </div>

          <div className="px-6 py-8 flex flex-col items-center gap-6">
            {/* Room code */}
            <div className="text-center">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">
                Room Code
              </p>
              <div className="text-4xl font-black text-indigo-700 tracking-widest">
                {roomCode}
              </div>
            </div>

            {/* Players count */}
            <div className="flex items-center gap-3 bg-indigo-50 rounded-2xl px-6 py-3">
              <span className="text-2xl">👥</span>
              <div>
                <p className="text-xs text-indigo-400 font-semibold uppercase">Players</p>
                <p className="text-2xl font-black text-indigo-700">{playerCount}</p>
              </div>
            </div>

            {/* Waiting message */}
            <div className="text-center">
              <p className="text-gray-600 font-semibold text-lg">
                Waiting for host to start
                <AnimatedDots />
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Sit tight — the game will begin soon!
              </p>
            </div>

            {/* Spinner */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Leave link */}
        <button
          onClick={handleLeave}
          className="mt-4 w-full text-white/70 hover:text-white text-sm font-semibold text-center"
        >
          ← Leave Room
        </button>
      </div>
    </div>
  );
}
