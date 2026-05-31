import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, joinRoom } from '../api/client';
import { useGameStore } from '../store/gameStore';

type Mode = 'home' | 'join';

export function HomeScreen() {
  const navigate = useNavigate();
  const { setHost, setPlayer, resetGame } = useGameStore();

  const [mode, setMode] = useState<Mode>('home');
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateGame = async () => {
    setLoading(true);
    setError(null);
    try {
      resetGame();
      const { roomCode: code, hostId } = await createRoom();
      setHost(hostId, code);
      navigate('/host/lobby');
    } catch {
      setError('Could not create a game. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    const code = roomCode.trim().toUpperCase();
    const name = playerName.trim();
    if (!code) { setError('Please enter a room code.'); return; }
    if (!name) { setError('Please enter your name.'); return; }

    setLoading(true);
    setError(null);
    try {
      resetGame();
      const { playerId } = await joinRoom(code, name);
      setPlayer(playerId, name, code);
      navigate('/player/lobby');
    } catch {
      setError('Could not join the room. Check the code and try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Hero card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header banner */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              AI Quiz Game 🤖
            </h1>
            <p className="mt-2 text-indigo-200 text-base sm:text-lg font-medium">
              Learn about Artificial Intelligence — play with your class!
            </p>
          </div>

          <div className="px-6 py-8">
            {mode === 'home' && (
              <div className="flex flex-col gap-4">
                <p className="text-center text-gray-500 text-sm mb-2">
                  Are you a teacher or a student?
                </p>

                {/* Create game */}
                <button
                  onClick={handleCreateGame}
                  disabled={loading}
                  className="w-full min-h-[56px] bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xl rounded-2xl shadow-md hover:from-indigo-400 hover:to-purple-500 active:scale-95 transition-all disabled:opacity-60"
                >
                  {loading ? '⏳ Creating...' : '🎓 Create Game'}
                </button>

                <div className="relative flex items-center gap-2 py-1">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-gray-400 text-sm">or</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Join game */}
                <button
                  onClick={() => { setMode('join'); setError(null); }}
                  className="w-full min-h-[56px] bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-black text-xl rounded-2xl shadow-md hover:from-fuchsia-400 hover:to-pink-400 active:scale-95 transition-all"
                >
                  🙋 Join Game
                </button>

                {error && (
                  <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}
              </div>
            )}

            {mode === 'join' && (
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => { setMode('home'); setError(null); }}
                  className="self-start text-indigo-500 font-semibold text-sm flex items-center gap-1 hover:text-indigo-700"
                >
                  ← Back
                </button>

                <h2 className="text-2xl font-black text-gray-800 text-center">
                  Join a Game
                </h2>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 block mb-1">
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                      placeholder="e.g. ABC123"
                      maxLength={8}
                      className="w-full border-2 border-indigo-200 rounded-xl px-4 py-3 text-xl font-black text-center tracking-widest focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600 block mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                      placeholder="e.g. Alex"
                      maxLength={20}
                      className="w-full border-2 border-indigo-200 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={handleJoinGame}
                  disabled={loading}
                  className="w-full min-h-[56px] bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-black text-xl rounded-2xl shadow-md hover:from-fuchsia-400 hover:to-pink-400 active:scale-95 transition-all disabled:opacity-60 mt-2"
                >
                  {loading ? '⏳ Joining...' : "Let's Go! 🚀"}
                </button>

                {error && (
                  <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer tag */}
        <p className="text-center text-white/60 text-xs mt-4">
          Powered by AI • Built for curious minds aged 11–16
        </p>
      </div>
    </div>
  );
}
