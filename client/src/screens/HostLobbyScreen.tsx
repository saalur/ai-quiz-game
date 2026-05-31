import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useGameState } from '../hooks/useGameState';
import { startGame } from '../api/client';
import { PlayerList } from '../components/PlayerList';

const TOPICS = [
  'Machine Learning',
  'Neural Networks',
  'Computer Vision',
  'Natural Language Processing',
  'Robotics',
  'AI Ethics',
  'History of AI',
  'Self-Driving Cars',
];

type Difficulty = 'easy' | 'medium' | 'hard';
type QuestionCount = 5 | 10 | 15;

export function HostLobbyScreen() {
  const navigate = useNavigate();
  const { roomCode, hostId, resetGame } = useGameStore();
  const gameState = useGameState(roomCode);

  const [copied, setCopied] = useState(false);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if game starts
  useEffect(() => {
    if (gameState?.status === 'active') {
      navigate('/host/game');
    }
    if (gameState?.status === 'finished') {
      navigate('/finished');
    }
  }, [gameState?.status, navigate]);

  const playerNames = gameState?.playerNames ?? [];
  const playerCount = gameState?.playerCount ?? 0;
  const canStart = playerCount >= 2 && !!hostId;

  const handleCopy = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStart = async () => {
    if (!roomCode) return;
    setStarting(true);
    setError(null);
    try {
      await startGame(roomCode);
      navigate('/host/game');
    } catch {
      setError('Failed to start the game. Please try again.');
      setStarting(false);
    }
  };

  const handleLeave = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-lg mx-auto pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleLeave}
            className="text-indigo-400 hover:text-indigo-600 font-semibold text-sm"
          >
            ← Cancel
          </button>
          <h1 className="text-2xl font-black text-indigo-700">Host Lobby</h1>
          <div className="w-16" /> {/* spacer */}
        </div>

        {/* Room Code Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-4 text-center">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-1">
            Room Code
          </p>
          <div className="text-6xl font-black text-indigo-700 tracking-widest my-2 select-all">
            {roomCode ?? '——'}
          </div>
          <p className="text-gray-400 text-sm mb-3">
            Share this code with your students
          </p>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold px-5 py-2 rounded-xl transition-colors min-h-[44px]"
          >
            {copied ? '✅ Copied!' : '📋 Copy Code'}
          </button>
        </div>

        {/* Player count */}
        <div className="bg-white rounded-2xl shadow p-4 mb-4 flex items-center justify-between">
          <span className="text-gray-600 font-semibold">
            Players joined
          </span>
          <span className="text-3xl font-black text-indigo-600">
            {playerCount}
          </span>
        </div>

        {/* Player list */}
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
            Players
          </h2>
          <PlayerList names={playerNames} />
        </div>

        {/* Config */}
        <div className="bg-white rounded-2xl shadow p-4 mb-4 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
            Game Settings
          </h2>

          {/* Topic */}
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-1">
              Topic
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border-2 border-indigo-200 rounded-xl px-3 py-2 text-gray-700 font-semibold focus:outline-none focus:border-indigo-500"
            >
              {TOPICS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">
              Difficulty
            </label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 min-h-[44px] rounded-xl font-bold capitalize transition-all text-sm ${
                    difficulty === d
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'
                  }`}
                >
                  {d === 'easy' ? '😊 Easy' : d === 'medium' ? '🤔 Medium' : '🔥 Hard'}
                </button>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div>
            <label className="text-sm font-semibold text-gray-600 block mb-2">
              Number of Questions
            </label>
            <div className="flex gap-2">
              {([5, 10, 15] as QuestionCount[]).map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 min-h-[44px] rounded-xl font-black text-lg transition-all ${
                    questionCount === n
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* Status / Start button */}
        {!canStart && (
          <p className="text-center text-indigo-400 font-semibold mb-3 text-sm">
            ⏳ Waiting for players... (need at least 2)
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={!canStart || starting}
          className={`w-full min-h-[56px] rounded-2xl font-black text-xl text-white shadow-lg transition-all ${
            canStart && !starting
              ? 'bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 active:scale-95'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {starting ? '⏳ Starting...' : '🚀 Start Game'}
        </button>

        <p className="text-center text-gray-400 text-xs mt-4 pb-6">
          Players can join until you start the game
        </p>
      </div>
    </div>
  );
}
