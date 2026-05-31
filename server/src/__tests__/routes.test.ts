/**
 * HTTP Integration Tests
 * Redis is auto-mocked via ioredis-mock (moduleNameMapper in jest config).
 * claudeService is mocked to return 5 fake questions instantly.
 */
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import roomsRouter from '../routes/rooms';
import gameRouter from '../routes/game';
import { errorHandler } from '../middleware/errorHandler';

// Mock claudeService to avoid real API calls
jest.mock('../services/claudeService', () => ({
  claudeService: {
    generateQuestions: jest.fn().mockResolvedValue([
      { id: 1, question: 'Q1?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correct: 'A', fun_fact: 'fact1' },
      { id: 2, question: 'Q2?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correct: 'B', fun_fact: 'fact2' },
      { id: 3, question: 'Q3?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correct: 'C', fun_fact: 'fact3' },
      { id: 4, question: 'Q4?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correct: 'D', fun_fact: 'fact4' },
      { id: 5, question: 'Q5?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correct: 'A', fun_fact: 'fact5' },
    ]),
  }
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/rooms', roomsRouter);
  app.use('/api/game', gameRouter);
  app.use(errorHandler);
  return app;
}

const app = buildApp();

// ─────────────────────────────────────────────────────────────────────────────
// Helper to create a room and return { roomCode, hostId }
// ─────────────────────────────────────────────────────────────────────────────
async function createRoom() {
  const res = await request(app)
    .post('/api/rooms')
    .send({ topic: 'what_is_ai', difficulty: 'beginner', questionCount: 5 });
  expect(res.status).toBe(201);
  return res.body as { roomCode: string; hostId: string; expiresAt: number };
}

async function joinRoom(roomCode: string, name: string) {
  const res = await request(app)
    .post(`/api/rooms/${roomCode}/join`)
    .send({ name });
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/rooms
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/rooms', () => {
  it('returns 201 with roomCode (6 chars), hostId, expiresAt', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .send({ topic: 'what_is_ai', difficulty: 'beginner', questionCount: 5 });

    expect(res.status).toBe(201);
    expect(res.body.roomCode).toHaveLength(6);
    expect(res.body.roomCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(res.body.hostId).toBeDefined();
    expect(res.body.expiresAt).toBeGreaterThan(Date.now());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/rooms/:code
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/rooms/:code', () => {
  it('returns 404 for unknown room code', async () => {
    const res = await request(app).get('/api/rooms/XXXXXX');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ROOM_NOT_FOUND');
  });

  it('returns 200 for a valid room code', async () => {
    const { roomCode } = await createRoom();
    const res = await request(app).get(`/api/rooms/${roomCode}`);
    expect(res.status).toBe(200);
    expect(res.body.roomCode).toBe(roomCode);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/rooms/:code/join
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/rooms/:code/join', () => {
  it('returns 201 with playerId on valid join', async () => {
    const { roomCode } = await createRoom();
    const res = await joinRoom(roomCode, 'Alice');
    expect(res.status).toBe(201);
    expect(res.body.playerId).toBeDefined();
  });

  it('returns 400 if name is too short (1 char)', async () => {
    const { roomCode } = await createRoom();
    const res = await joinRoom(roomCode, 'A');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 if name is too long (21 chars)', async () => {
    const { roomCode } = await createRoom();
    const res = await joinRoom(roomCode, 'A'.repeat(21));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. POST /api/game/:code/start
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/game/:code/start', () => {
  it('returns 403 without x-host-id', async () => {
    const { roomCode } = await createRoom();
    const res = await request(app).post(`/api/game/${roomCode}/start`);
    expect(res.status).toBe(403);
  });

  it('returns 403 with wrong hostId', async () => {
    const { roomCode } = await createRoom();
    const res = await request(app)
      .post(`/api/game/${roomCode}/start`)
      .set('x-host-id', 'wrong-host-id');
    expect(res.status).toBe(403);
  });

  it('returns 400 with only 1 player (GL-04 fix)', async () => {
    const { roomCode, hostId } = await createRoom();
    // Add only 1 player
    await joinRoom(roomCode, 'Alice');

    const res = await request(app)
      .post(`/api/game/${roomCode}/start`)
      .set('x-host-id', hostId);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('NOT_ENOUGH_PLAYERS');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/game/:code/state — ambiguous auth (SR-01)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/game/:code/state — auth (SR-01)', () => {
  let roomCode: string;
  let hostId: string;
  let playerId: string;

  beforeEach(async () => {
    const room = await createRoom();
    roomCode = room.roomCode;
    hostId = room.hostId;

    const joinRes = await joinRoom(roomCode, 'Alice');
    playerId = joinRes.body.playerId;
  });

  it('returns 403 with no headers', async () => {
    const res = await request(app).get(`/api/game/${roomCode}/state`);
    expect(res.status).toBe(403);
  });

  it('returns 400 AMBIGUOUS_AUTH when both x-host-id AND x-player-id are sent', async () => {
    const res = await request(app)
      .get(`/api/game/${roomCode}/state`)
      .set('x-host-id', hostId)
      .set('x-player-id', playerId);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('AMBIGUOUS_AUTH');
  });

  it('returns 200 with valid x-host-id only', async () => {
    const res = await request(app)
      .get(`/api/game/${roomCode}/state`)
      .set('x-host-id', hostId);
    expect(res.status).toBe(200);
    expect(res.body.roomCode).toBe(roomCode);
  });

  it('returns 200 with valid x-player-id only', async () => {
    const res = await request(app)
      .get(`/api/game/${roomCode}/state`)
      .set('x-player-id', playerId);
    expect(res.status).toBe(200);
    expect(res.body.roomCode).toBe(roomCode);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. POST /api/game/:code/answer — idempotency (SR-04)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/game/:code/answer — idempotency (SR-04)', () => {
  it('first submission → 200; duplicate → 200 (not 400)', async () => {
    const { roomCode, hostId } = await createRoom();

    // Add 2 players so game can start
    const joinRes1 = await joinRoom(roomCode, 'Alice');
    await joinRoom(roomCode, 'Bob');
    const playerId = joinRes1.body.playerId;

    // Start game
    await request(app)
      .post(`/api/game/${roomCode}/start`)
      .set('x-host-id', hostId);

    // First submission
    const first = await request(app)
      .post(`/api/game/${roomCode}/answer`)
      .set('x-player-id', playerId)
      .send({ answer: 'A' });
    expect(first.status).toBe(200);

    // Duplicate submission — should also be 200
    const second = await request(app)
      .post(`/api/game/${roomCode}/answer`)
      .set('x-player-id', playerId)
      .send({ answer: 'A' });
    expect(second.status).toBe(200);
    expect(second.body.pointsEarned).toBe(first.body.pointsEarned);
  });
});
