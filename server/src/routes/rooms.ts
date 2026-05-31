import { Router, Request, Response, NextFunction } from 'express';
import { roomService } from '../services/roomService';
import { validateName } from '../utils/validate';
import { Topic, Difficulty, QuestionCount, GameConfig } from '../types';

const router = Router();

const VALID_TOPICS: Topic[] = ['what_is_ai', 'machine_learning', 'neural_networks', 'ai_in_daily_life', 'ai_ethics'];
const VALID_DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const VALID_QUESTION_COUNTS: QuestionCount[] = [5, 10, 15];

// POST /api/rooms — create a new room
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topic, difficulty, questionCount } = req.body as Partial<GameConfig>;

    if (!topic || !VALID_TOPICS.includes(topic)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `topic must be one of: ${VALID_TOPICS.join(', ')}`,
      });
      return;
    }

    if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`,
      });
      return;
    }

    if (!questionCount || !VALID_QUESTION_COUNTS.includes(questionCount as QuestionCount)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `questionCount must be one of: ${VALID_QUESTION_COUNTS.join(', ')}`,
      });
      return;
    }

    const gameConfig: GameConfig = { topic, difficulty, questionCount: questionCount as QuestionCount };
    const room = await roomService.createRoom(gameConfig);

    res.status(201).json({
      roomCode: room.code,
      hostId: room.hostId,
      expiresAt: room.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:code — check room exists
router.get('/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const room = await roomService.getRoom(code.toUpperCase());

    if (!room) {
      res.status(404).json({ error: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    res.json({
      roomCode: room.code,
      status: room.status,
      playerCount: Object.keys(room.players).length,
      config: room.config,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/rooms/:code/join — join a room
router.post('/:code/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const { name } = req.body as { name?: string };

    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: nameValidation.message });
      return;
    }

    const room = await roomService.getRoom(code.toUpperCase());
    if (!room) {
      res.status(404).json({ error: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    if (room.status !== 'lobby') {
      res.status(400).json({ error: 'GAME_ALREADY_STARTED', message: 'Cannot join a game that has already started' });
      return;
    }

    const result = await roomService.addPlayer(code.toUpperCase(), name as string);
    if (!result) {
      res.status(404).json({ error: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    res.status(201).json({
      playerId: result.playerId,
      roomCode: result.room.code,
      playerCount: Object.keys(result.room.players).length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
