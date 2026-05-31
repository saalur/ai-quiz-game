import { gameService } from '../services/gameService';
import { Room } from '../types';

// Mock roomService
jest.mock('../services/roomService', () => ({
  roomService: {
    getRoom: jest.fn(),
    updateRoom: jest.fn(),
    createRoom: jest.fn(),
    addPlayer: jest.fn(),
    roomExists: jest.fn(),
    connect: jest.fn(),
    saveRoom: jest.fn(),
  }
}));

// Mock claudeService
jest.mock('../services/claudeService', () => ({
  claudeService: {
    generateQuestions: jest.fn(),
  }
}));

import { roomService } from '../services/roomService';
import { claudeService } from '../services/claudeService';

const mockGetRoom = roomService.getRoom as jest.Mock;
const mockUpdateRoom = roomService.updateRoom as jest.Mock;
const mockGenerateQuestions = (claudeService as any).generateQuestions as jest.Mock;

const FAKE_QUESTIONS = [
  { id: 1, question: 'What is AI?', options: { A: 'Art', B: 'Intelligence', C: 'Algorithm', D: 'Data' }, correct: 'B', fun_fact: 'AI stands for Artificial Intelligence!' },
  { id: 2, question: 'What is ML?', options: { A: 'More Learning', B: 'Machine Language', C: 'Machine Learning', D: 'Model Logic' }, correct: 'C', fun_fact: 'ML is a subset of AI!' },
];

function makeRoom(overrides?: Partial<Room>): Room {
  return {
    code: 'ABC123',
    hostId: 'host-uuid',
    status: 'active',
    config: { topic: 'what_is_ai', difficulty: 'beginner', questionCount: 5 },
    players: {
      'player-1': { id: 'player-1', name: 'Alice', score: 0, answers: {}, joinedAt: Date.now(), isHost: false },
      'player-2': { id: 'player-2', name: 'Bob', score: 0, answers: {}, joinedAt: Date.now(), isHost: false },
    },
    questions: [
      { id: 1, question: 'What is AI?', options: { A: 'Art', B: 'Intelligence', C: 'Algorithm', D: 'Data' }, correct: 'B', fun_fact: 'AI stands for Artificial Intelligence!' },
      { id: 2, question: 'What is ML?', options: { A: 'More Learning', B: 'Machine Language', C: 'Machine Learning', D: 'Model Logic' }, correct: 'C', fun_fact: 'ML is a subset of AI!' },
    ],
    currentQuestionIndex: 0,
    phase: 'answering',
    questionStartedAt: Date.now() - 5000,
    createdAt: Date.now() - 60000,
    expiresAt: Date.now() + 7140000,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateRoom.mockResolvedValue(undefined);
  mockGenerateQuestions.mockResolvedValue(FAKE_QUESTIONS);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. startGame — minimum 2 players (GL-04 fix)
// ─────────────────────────────────────────────────────────────────────────────
describe('startGame — minimum 2 players (GL-04)', () => {
  it('throws NOT_ENOUGH_PLAYERS with 0 players', async () => {
    const room = makeRoom({ status: 'lobby', players: {} });
    mockGetRoom.mockResolvedValue(room);

    await expect(gameService.startGame('ABC123')).rejects.toMatchObject({ code: 'NOT_ENOUGH_PLAYERS' });
  });

  it('throws NOT_ENOUGH_PLAYERS with 1 player (GL-04 fix)', async () => {
    const room = makeRoom({
      status: 'lobby',
      players: {
        'player-1': { id: 'player-1', name: 'Alice', score: 0, answers: {}, joinedAt: Date.now(), isHost: false },
      },
    });
    mockGetRoom.mockResolvedValue(room);

    await expect(gameService.startGame('ABC123')).rejects.toMatchObject({ code: 'NOT_ENOUGH_PLAYERS' });
  });

  it('succeeds with 2 players', async () => {
    const room = makeRoom({ status: 'lobby' });
    mockGetRoom.mockResolvedValue(room);

    const result = await gameService.startGame('ABC123');
    expect(result.status).toBe('active');
    expect(result.phase).toBe('answering');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. submitAnswer — idempotency (SR-04 fix)
// ─────────────────────────────────────────────────────────────────────────────
describe('submitAnswer — idempotency (SR-04)', () => {
  it('returns { correct, pointsEarned } on first submission', async () => {
    const room = makeRoom({ questionStartedAt: Date.now() });
    mockGetRoom.mockResolvedValue(room);

    const result = await gameService.submitAnswer('ABC123', 'player-1', 'B');
    expect(typeof result.correct).toBe('boolean');
    expect(typeof result.pointsEarned).toBe('number');
  });

  it('returns same result silently on duplicate submission (no throw)', async () => {
    const now = Date.now();
    // Pre-populate an answer for player-1
    const room = makeRoom({
      questionStartedAt: now - 5000,
      players: {
        'player-1': {
          id: 'player-1', name: 'Alice', score: 150, answers: {
            0: { selected: 'B', submittedAt: now - 4000, pointsEarned: 150 }
          }, joinedAt: now - 60000, isHost: false
        },
        'player-2': { id: 'player-2', name: 'Bob', score: 0, answers: {}, joinedAt: now - 60000, isHost: false },
      },
    });
    mockGetRoom.mockResolvedValue(room);

    // Should NOT throw
    const result = await gameService.submitAnswer('ABC123', 'player-1', 'B');
    expect(result.pointsEarned).toBe(150);
    expect(result.correct).toBe(true);
  });

  it('score is not double-counted on second submission', async () => {
    const now = Date.now();
    const room = makeRoom({
      questionStartedAt: now - 5000,
      players: {
        'player-1': {
          id: 'player-1', name: 'Alice', score: 150, answers: {
            0: { selected: 'B', submittedAt: now - 4000, pointsEarned: 150 }
          }, joinedAt: now - 60000, isHost: false
        },
        'player-2': { id: 'player-2', name: 'Bob', score: 0, answers: {}, joinedAt: now - 60000, isHost: false },
      },
    });
    mockGetRoom.mockResolvedValue(room);

    await gameService.submitAnswer('ABC123', 'player-1', 'B');

    // updateRoom should NOT have been called (idempotent, no state mutation)
    expect(mockUpdateRoom).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. submitAnswer — points calculation
// ─────────────────────────────────────────────────────────────────────────────
describe('submitAnswer — points calculation', () => {
  it('correct answer immediately → 150 pts (100 + 50 bonus)', async () => {
    const room = makeRoom({ questionStartedAt: Date.now() });
    mockGetRoom.mockResolvedValue(room);

    const result = await gameService.submitAnswer('ABC123', 'player-1', 'B');
    expect(result.correct).toBe(true);
    expect(result.pointsEarned).toBe(150);
  });

  it('correct answer at ~15s elapsed → ~125 pts', async () => {
    const room = makeRoom({ questionStartedAt: Date.now() - 15000 });
    mockGetRoom.mockResolvedValue(room);

    const result = await gameService.submitAnswer('ABC123', 'player-1', 'B');
    expect(result.correct).toBe(true);
    // With 15s elapsed (15000ms), timeRemaining = ~15000ms, bonus = floor(15000/30000 * 50) = 25
    // Points = 100 + 25 = 125, allow ±2 for timing jitter
    expect(result.pointsEarned).toBeGreaterThanOrEqual(123);
    expect(result.pointsEarned).toBeLessThanOrEqual(127);
  });

  it('correct answer at 30s elapsed → 100 pts (no bonus)', async () => {
    const room = makeRoom({ questionStartedAt: Date.now() - 30000 });
    mockGetRoom.mockResolvedValue(room);

    const result = await gameService.submitAnswer('ABC123', 'player-1', 'B');
    expect(result.correct).toBe(true);
    expect(result.pointsEarned).toBe(100);
  });

  it('wrong answer → 0 pts', async () => {
    const room = makeRoom({ questionStartedAt: Date.now() });
    mockGetRoom.mockResolvedValue(room);

    const result = await gameService.submitAnswer('ABC123', 'player-1', 'A'); // A is wrong, B is correct
    expect(result.correct).toBe(false);
    expect(result.pointsEarned).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. getGameState — answer not leaked during answering phase (SR-01)
// ─────────────────────────────────────────────────────────────────────────────
describe('getGameState — answer leak prevention (SR-01)', () => {
  it('phase=answering, isHost=false → currentQuestion.correct is null', async () => {
    const room = makeRoom({ phase: 'answering' });
    mockGetRoom.mockResolvedValue(room);

    const state = await gameService.getGameState('ABC123', 'player-1', false);
    expect(state.currentQuestion).not.toBeNull();
    expect(state.currentQuestion!.correct).toBeNull();
  });

  it('phase=answering, isHost=true → currentQuestion.correct is NOT null', async () => {
    const room = makeRoom({ phase: 'answering' });
    mockGetRoom.mockResolvedValue(room);

    const state = await gameService.getGameState('ABC123', 'host-uuid', true);
    expect(state.currentQuestion).not.toBeNull();
    expect(state.currentQuestion!.correct).not.toBeNull();
  });

  it('phase=revealed, isHost=false → currentQuestion.correct is NOT null', async () => {
    const room = makeRoom({ phase: 'revealed' });
    mockGetRoom.mockResolvedValue(room);

    const state = await gameService.getGameState('ABC123', 'player-1', false);
    expect(state.currentQuestion).not.toBeNull();
    expect(state.currentQuestion!.correct).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. revealAnswer — unanswered players get null entry
// ─────────────────────────────────────────────────────────────────────────────
describe('revealAnswer — unanswered players', () => {
  it('player who did not answer gets { selected: null, pointsEarned: 0 }', async () => {
    const room = makeRoom({ phase: 'answering' });
    // player-2 has NOT answered
    mockGetRoom.mockResolvedValue(room);

    let savedRoom: Room | undefined;
    mockUpdateRoom.mockImplementation((r: Room) => { savedRoom = r; return Promise.resolve(); });

    await gameService.revealAnswer('ABC123');

    expect(savedRoom).toBeDefined();
    expect(savedRoom!.players['player-2'].answers[0]).toBeDefined();
    expect(savedRoom!.players['player-2'].answers[0].selected).toBeNull();
    expect(savedRoom!.players['player-2'].answers[0].pointsEarned).toBe(0);
  });

  it('player who did answer keeps their existing entry', async () => {
    const now = Date.now();
    const room = makeRoom({
      phase: 'answering',
      players: {
        'player-1': {
          id: 'player-1', name: 'Alice', score: 150, answers: {
            0: { selected: 'B', submittedAt: now - 3000, pointsEarned: 150 }
          }, joinedAt: now - 60000, isHost: false
        },
        'player-2': { id: 'player-2', name: 'Bob', score: 0, answers: {}, joinedAt: now - 60000, isHost: false },
      },
    });
    mockGetRoom.mockResolvedValue(room);

    let savedRoom: Room | undefined;
    mockUpdateRoom.mockImplementation((r: Room) => { savedRoom = r; return Promise.resolve(); });

    await gameService.revealAnswer('ABC123');

    expect(savedRoom!.players['player-1'].answers[0].selected).toBe('B');
    expect(savedRoom!.players['player-1'].answers[0].pointsEarned).toBe(150);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. nextQuestion — state transitions (GL-03)
// ─────────────────────────────────────────────────────────────────────────────
describe('nextQuestion — state transitions (GL-03)', () => {
  it('throws ANSWER_NOT_REVEALED when phase=answering', async () => {
    const room = makeRoom({ phase: 'answering' });
    mockGetRoom.mockResolvedValue(room);

    await expect(gameService.nextQuestion('ABC123')).rejects.toMatchObject({ code: 'ANSWER_NOT_REVEALED' });
  });

  it('on last question → sets status=finished, phase=finished', async () => {
    const room = makeRoom({ phase: 'revealed', currentQuestionIndex: 1 }); // index 1 = last of 2 questions
    mockGetRoom.mockResolvedValue(room);

    let savedRoom: Room | undefined;
    mockUpdateRoom.mockImplementation((r: Room) => { savedRoom = r; return Promise.resolve(); });

    await gameService.nextQuestion('ABC123');

    expect(savedRoom!.status).toBe('finished');
    expect(savedRoom!.phase).toBe('finished');
  });

  it('on non-last question → increments currentQuestionIndex', async () => {
    const room = makeRoom({ phase: 'revealed', currentQuestionIndex: 0 }); // index 0, not last
    mockGetRoom.mockResolvedValue(room);

    let savedRoom: Room | undefined;
    mockUpdateRoom.mockImplementation((r: Room) => { savedRoom = r; return Promise.resolve(); });

    await gameService.nextQuestion('ABC123');

    expect(savedRoom!.currentQuestionIndex).toBe(1);
    expect(savedRoom!.phase).toBe('answering');
    expect(savedRoom!.status).toBe('active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. buildLeaderboard — sort order (GL-05)
// ─────────────────────────────────────────────────────────────────────────────
describe('buildLeaderboard — sort order (GL-05)', () => {
  it('higher score ranked first', async () => {
    const now = Date.now();
    const room = makeRoom({
      players: {
        'player-1': { id: 'player-1', name: 'Alice', score: 100, answers: {}, joinedAt: now, isHost: false },
        'player-2': { id: 'player-2', name: 'Bob', score: 200, answers: {}, joinedAt: now, isHost: false },
      },
    });
    mockGetRoom.mockResolvedValue(room);

    const state = await gameService.getGameState('ABC123', 'host-uuid', true);
    expect(state.leaderboard[0].name).toBe('Bob');
    expect(state.leaderboard[0].rank).toBe(1);
    expect(state.leaderboard[1].name).toBe('Alice');
    expect(state.leaderboard[1].rank).toBe(2);
  });

  it('equal scores sorted alphabetically by name', async () => {
    const now = Date.now();
    const room = makeRoom({
      players: {
        'player-1': { id: 'player-1', name: 'Charlie', score: 100, answers: {}, joinedAt: now, isHost: false },
        'player-2': { id: 'player-2', name: 'Alice', score: 100, answers: {}, joinedAt: now, isHost: false },
      },
    });
    mockGetRoom.mockResolvedValue(room);

    const state = await gameService.getGameState('ABC123', 'host-uuid', true);
    expect(state.leaderboard[0].name).toBe('Alice');
    expect(state.leaderboard[1].name).toBe('Charlie');
  });
});
