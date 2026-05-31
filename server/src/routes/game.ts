import { Router, Request, Response, NextFunction } from 'express';
import { gameService } from '../services/gameService';
import { roomService } from '../services/roomService';
import { requireHost, requirePlayer } from '../middleware/authMiddleware';
import { validateAnswerOption } from '../utils/validate';

const router = Router();

// POST /api/game/:code/start — start the game (host only)
router.post('/:code/start', requireHost, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const room = await gameService.startGame(code.toUpperCase());

    res.json({
      roomCode: room.code,
      status: room.status,
      totalQuestions: room.questions.length,
      currentQuestionIndex: room.currentQuestionIndex,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/game/:code/next — advance to next question (host only)
router.post('/:code/next', requireHost, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const room = await gameService.nextQuestion(code.toUpperCase());

    res.json({
      roomCode: room.code,
      status: room.status,
      phase: room.phase,
      currentQuestionIndex: room.currentQuestionIndex,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/game/:code/reveal — reveal answer (host only)
router.post('/:code/reveal', requireHost, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const room = await gameService.revealAnswer(code.toUpperCase());

    res.json({
      roomCode: room.code,
      phase: room.phase,
      currentQuestionIndex: room.currentQuestionIndex,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/game/:code/state — get game state (host or player)
router.get('/:code/state', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const hostId = req.headers['x-host-id'] as string | undefined;
    const playerId = req.headers['x-player-id'] as string | undefined;

    if (!hostId && !playerId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Host ID or Player ID required' });
      return;
    }

    // Reject ambiguous requests — sending both headers could be used to escalate player → host
    if (hostId && playerId) {
      res.status(400).json({ error: 'AMBIGUOUS_AUTH', message: 'Send only one of x-host-id or x-player-id' });
      return;
    }

    const room = await roomService.getRoom(code.toUpperCase());
    if (!room) {
      res.status(404).json({ error: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    let isHost = false;
    let requesterId = '';

    if (hostId) {
      if (room.hostId !== hostId) {
        res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid host ID' });
        return;
      }
      isHost = true;
      requesterId = hostId;
    } else if (playerId) {
      if (!room.players[playerId]) {
        res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid player ID' });
        return;
      }
      requesterId = playerId;
    }

    const state = await gameService.getGameState(code.toUpperCase(), requesterId, isHost);
    res.json(state);
  } catch (err) {
    next(err);
  }
});

// POST /api/game/:code/answer — submit answer (player only)
router.post('/:code/answer', requirePlayer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const playerId = req.headers['x-player-id'] as string;
    const { answer } = req.body as { answer?: string };

    if (!validateAnswerOption(answer)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'answer must be one of: A, B, C, D',
      });
      return;
    }

    const result = await gameService.submitAnswer(code.toUpperCase(), playerId, answer);

    res.json({
      correct: result.correct,
      pointsEarned: result.pointsEarned,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
