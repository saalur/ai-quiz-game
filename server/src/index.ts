import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { roomService } from './services/roomService';
import roomsRouter from './routes/rooms';
import gameRouter from './routes/game';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-host-id', 'x-player-id'],
}));

app.use(express.json({ limit: '10kb' }));

// Rate limiting — protect Anthropic quota and Redis from flooding
const roomsLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const gameLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/rooms', roomsLimiter, roomsRouter);
app.use('/api/game', gameLimiter, gameRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);

async function main() {
  try {
    // Connect to Redis
    await roomService.connect();
    console.log('[Server] Redis connected');

    app.listen(config.port, () => {
      console.log(`[Server] Listening on port ${config.port}`);
      console.log(`[Server] CORS origin: ${config.corsOrigin}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

main();
