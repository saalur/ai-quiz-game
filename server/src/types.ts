export type Topic = 'what_is_ai' | 'machine_learning' | 'neural_networks' | 'ai_in_daily_life' | 'ai_ethics';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type QuestionCount = 5 | 10 | 15;
export type AnswerOption = 'A' | 'B' | 'C' | 'D';
export type RoomStatus = 'lobby' | 'active' | 'finished';
export type GamePhase = 'answering' | 'revealed' | 'finished';

export interface GameConfig {
  topic: Topic;
  difficulty: Difficulty;
  questionCount: QuestionCount;
}

export interface PlayerAnswer {
  selected: AnswerOption | null;
  submittedAt: number;
  pointsEarned: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  answers: Record<number, PlayerAnswer>;
  joinedAt: number;
  isHost: boolean;
}

export interface Question {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: AnswerOption;
  fun_fact: string;
}

export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  config: GameConfig;
  players: Record<string, Player>;
  questions: Question[];
  currentQuestionIndex: number;
  phase: GamePhase;
  questionStartedAt: number | null;
  createdAt: number;
  expiresAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  lastPoints: number;
}

export interface QuestionForClient {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: AnswerOption | null;
  fun_fact: string | null;
}

export interface GameState {
  roomCode: string;
  status: RoomStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  phase: GamePhase;
  questionDeadline: number | null;
  currentQuestion: QuestionForClient | null;
  leaderboard: LeaderboardEntry[];
  playerCount: number;
  playerNames: string[];
}
