export interface QuestionForClient {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: 'A' | 'B' | 'C' | 'D' | null; // null during answering
  fun_fact: string | null;                  // null during answering
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  lastPoints: number;
}

export type GamePhase = 'answering' | 'revealed' | 'finished';
export type GameStatus = 'lobby' | 'active' | 'finished';
export type AnswerOption = 'A' | 'B' | 'C' | 'D';

export interface GameState {
  roomCode: string;
  status: GameStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  phase: GamePhase;
  questionDeadline: number | null;
  currentQuestion: QuestionForClient | null;
  leaderboard: LeaderboardEntry[];
  playerCount: number;
  playerNames: string[];
}

export interface RoomConfig {
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: 5 | 10 | 15;
}

// API response shapes
export interface CreateRoomResponse {
  roomCode: string;
  hostId: string;
  expiresAt: string;
}

export interface GetRoomResponse {
  roomCode: string;
  status: GameStatus;
  playerCount: number;
  config: RoomConfig;
}

export interface JoinRoomResponse {
  playerId: string;
  roomCode: string;
  playerCount: number;
}

export interface StartGameResponse {
  success: boolean;
}
