import { Request, Response, NextFunction } from 'express';
import { roomService } from '../services/roomService';

export async function requireHost(req: Request, res: Response, next: NextFunction): Promise<void> {
  const hostId = req.headers['x-host-id'] as string | undefined;
  const roomCode = req.params.code;

  if (!hostId) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Host ID required' });
    return;
  }

  const room = await roomService.getRoom(roomCode);
  if (!room) {
    res.status(404).json({ error: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return;
  }

  if (room.hostId !== hostId) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid host ID' });
    return;
  }

  next();
}

export async function requirePlayer(req: Request, res: Response, next: NextFunction): Promise<void> {
  const playerId = req.headers['x-player-id'] as string | undefined;
  const roomCode = req.params.code;

  if (!playerId) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Player ID required' });
    return;
  }

  const room = await roomService.getRoom(roomCode);
  if (!room) {
    res.status(404).json({ error: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return;
  }

  if (!room.players[playerId]) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid player ID' });
    return;
  }

  next();
}
