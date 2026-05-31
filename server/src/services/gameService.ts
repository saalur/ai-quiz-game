import { Room, GameState, LeaderboardEntry, QuestionForClient, AnswerOption, Question } from '../types';
import { roomService } from './roomService';
import { claudeService } from './claudeService';

const QUESTION_DURATION_MS = 30000; // 30 seconds

function calculatePoints(correct: AnswerOption, selected: AnswerOption | null, questionStartedAt: number, submittedAt: number): number {
  if (!selected || selected !== correct) return 0;
  const elapsed = submittedAt - questionStartedAt;
  const timeRemaining = Math.max(0, QUESTION_DURATION_MS - elapsed);
  return 100 + Math.floor((timeRemaining / QUESTION_DURATION_MS) * 50);
}

function buildLeaderboard(room: Room): LeaderboardEntry[] {
  const entries = Object.values(room.players).map((player) => {
    const lastAnswer = room.currentQuestionIndex >= 0
      ? player.answers[room.currentQuestionIndex]
      : null;
    return {
      name: player.name,
      score: player.score,
      lastPoints: lastAnswer?.pointsEarned ?? 0,
    };
  });

  entries.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return entries.map((entry, index) => ({
    rank: index + 1,
    name: entry.name,
    score: entry.score,
    lastPoints: entry.lastPoints,
  }));
}

function buildCurrentQuestion(room: Room, revealAnswers: boolean): QuestionForClient | null {
  if (room.currentQuestionIndex < 0 || room.currentQuestionIndex >= room.questions.length) {
    return null;
  }

  const q: Question = room.questions[room.currentQuestionIndex];

  return {
    id: q.id,
    question: q.question,
    options: q.options,
    correct: revealAnswers ? q.correct : null,
    fun_fact: revealAnswers ? q.fun_fact : null,
  };
}

class GameService {
  async startGame(roomCode: string): Promise<Room> {
    const room = await roomService.getRoom(roomCode);
    if (!room) throw Object.assign(new Error('Room not found'), { statusCode: 404, code: 'ROOM_NOT_FOUND' });
    if (room.status !== 'lobby') throw Object.assign(new Error('Game already started'), { statusCode: 400, code: 'GAME_ALREADY_STARTED' });
    if (Object.keys(room.players).length < 2) {
      throw Object.assign(new Error('At least 2 players required to start'), { statusCode: 400, code: 'NOT_ENOUGH_PLAYERS' });
    }

    console.log(`[Game] Generating questions for room ${roomCode}...`);
    const questions = await claudeService.generateQuestions(
      room.config.topic,
      room.config.difficulty,
      room.config.questionCount
    );

    room.questions = questions;
    room.status = 'active';
    room.currentQuestionIndex = 0;
    room.phase = 'answering';
    room.questionStartedAt = Date.now();

    await roomService.updateRoom(room);
    console.log(`[Game] Room ${roomCode} started with ${questions.length} questions`);
    return room;
  }

  async nextQuestion(roomCode: string): Promise<Room> {
    const room = await roomService.getRoom(roomCode);
    if (!room) throw Object.assign(new Error('Room not found'), { statusCode: 404, code: 'ROOM_NOT_FOUND' });
    if (room.status !== 'active') throw Object.assign(new Error('Game is not active'), { statusCode: 400, code: 'GAME_NOT_ACTIVE' });
    if (room.phase !== 'revealed') throw Object.assign(new Error('Current question not yet revealed'), { statusCode: 400, code: 'ANSWER_NOT_REVEALED' });

    const nextIndex = room.currentQuestionIndex + 1;

    if (nextIndex >= room.questions.length) {
      // Game over
      room.status = 'finished';
      room.phase = 'finished';
      room.questionStartedAt = null;
    } else {
      room.currentQuestionIndex = nextIndex;
      room.phase = 'answering';
      room.questionStartedAt = Date.now();
    }

    await roomService.updateRoom(room);
    return room;
  }

  async revealAnswer(roomCode: string): Promise<Room> {
    const room = await roomService.getRoom(roomCode);
    if (!room) throw Object.assign(new Error('Room not found'), { statusCode: 404, code: 'ROOM_NOT_FOUND' });
    if (room.status !== 'active') throw Object.assign(new Error('Game is not active'), { statusCode: 400, code: 'GAME_NOT_ACTIVE' });
    if (room.phase !== 'answering') throw Object.assign(new Error('Phase is not answering'), { statusCode: 400, code: 'WRONG_PHASE' });

    // Mark non-answering players with a null entry so the leaderboard has a record
    for (const player of Object.values(room.players)) {
      if (!player.answers[room.currentQuestionIndex]) {
        player.answers[room.currentQuestionIndex] = {
          selected: null,
          submittedAt: Date.now(),
          pointsEarned: 0,
        };
      }
    }

    room.phase = 'revealed';
    await roomService.updateRoom(room);
    return room;
  }

  async submitAnswer(roomCode: string, playerId: string, answer: AnswerOption): Promise<{ pointsEarned: number; correct: boolean }> {
    const room = await roomService.getRoom(roomCode);
    if (!room) throw Object.assign(new Error('Room not found'), { statusCode: 404, code: 'ROOM_NOT_FOUND' });
    if (room.status !== 'active') throw Object.assign(new Error('Game is not active'), { statusCode: 400, code: 'GAME_NOT_ACTIVE' });
    if (room.phase !== 'answering') throw Object.assign(new Error('Not in answering phase'), { statusCode: 400, code: 'WRONG_PHASE' });

    const player = room.players[playerId];
    if (!player) throw Object.assign(new Error('Player not found'), { statusCode: 404, code: 'PLAYER_NOT_FOUND' });

    const currentQuestion = room.questions[room.currentQuestionIndex];

    // Idempotent — return existing result silently on duplicate submission (SR-04)
    const existing = room.players[playerId].answers[room.currentQuestionIndex];
    if (existing) {
      return { pointsEarned: existing.pointsEarned, correct: existing.selected === currentQuestion.correct };
    }

    const now = Date.now();
    const isCorrect = answer === currentQuestion.correct;
    const pointsEarned = calculatePoints(currentQuestion.correct, answer, room.questionStartedAt!, now);

    room.players[playerId].answers[room.currentQuestionIndex] = { selected: answer, submittedAt: now, pointsEarned };
    room.players[playerId].score += pointsEarned;

    await roomService.updateRoom(room);
    return { pointsEarned, correct: isCorrect };
  }

  async getGameState(roomCode: string, requesterId: string, isHost: boolean): Promise<GameState> {
    const room = await roomService.getRoom(roomCode);
    if (!room) throw Object.assign(new Error('Room not found'), { statusCode: 404, code: 'ROOM_NOT_FOUND' });

    // Answers only revealed after host calls /reveal — host has no legitimate need to see early
    const revealAnswers = room.phase === 'revealed' || room.phase === 'finished';

    const questionDeadline =
      room.phase === 'answering' && room.questionStartedAt
        ? room.questionStartedAt + QUESTION_DURATION_MS
        : null;

    return {
      roomCode: room.code,
      status: room.status,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.config.questionCount,
      phase: room.phase,
      questionDeadline,
      currentQuestion: room.status === 'active' ? buildCurrentQuestion(room, revealAnswers) : null,
      leaderboard: buildLeaderboard(room),
      playerCount: Object.keys(room.players).length,
      playerNames: Object.values(room.players).map((p) => p.name),
    };
  }
}

export const gameService = new GameService();
