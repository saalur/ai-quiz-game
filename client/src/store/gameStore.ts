import { create } from 'zustand';
import type { GameState, AnswerOption } from '../types';

interface GameStore {
  roomCode: string | null;
  playerId: string | null;
  hostId: string | null;
  isHost: boolean;
  playerName: string | null;
  gameState: GameState | null;
  selectedAnswer: AnswerOption | null;
  hasAnswered: boolean;

  setRoom: (roomCode: string) => void;
  setPlayer: (playerId: string, name: string, roomCode: string) => void;
  setHost: (hostId: string, roomCode: string) => void;
  setGameState: (state: GameState) => void;
  setAnswer: (answer: AnswerOption) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  roomCode: null,
  playerId: null,
  hostId: null,
  isHost: false,
  playerName: null,
  gameState: null,
  selectedAnswer: null,
  hasAnswered: false,

  setRoom: (roomCode) => set({ roomCode }),

  setPlayer: (playerId, name, roomCode) =>
    set({ playerId, playerName: name, roomCode, isHost: false }),

  setHost: (hostId, roomCode) =>
    set({ hostId, roomCode, isHost: true }),

  setGameState: (gameState) => set({ gameState }),

  setAnswer: (answer) => set({ selectedAnswer: answer, hasAnswered: true }),

  resetGame: () =>
    set({
      roomCode: null,
      playerId: null,
      hostId: null,
      isHost: false,
      playerName: null,
      gameState: null,
      selectedAnswer: null,
      hasAnswered: false,
    }),
}));
