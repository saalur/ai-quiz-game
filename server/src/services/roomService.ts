import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { Room, GameConfig } from '../types';
import { generateRoomCode } from '../utils/roomCode';

const ROOM_TTL = 7200; // 2 hours in seconds
const REDIS_KEY_PREFIX = 'room:';

class RoomService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    this.redis.on('connect', () => {
      console.log('[Redis] Connected');
    });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  private key(code: string): string {
    return `${REDIS_KEY_PREFIX}${code}`;
  }

  async getRoom(code: string): Promise<Room | null> {
    const data = await this.redis.get(this.key(code));
    if (!data) return null;
    try {
      return JSON.parse(data) as Room;
    } catch {
      return null;
    }
  }

  async saveRoom(room: Room): Promise<void> {
    const ttl = Math.max(1, Math.floor((room.expiresAt - Date.now()) / 1000));
    await this.redis.set(this.key(room.code), JSON.stringify(room), 'EX', ttl);
  }

  async roomExists(code: string): Promise<boolean> {
    const count = await this.redis.exists(this.key(code));
    return count > 0;
  }

  async createRoom(gameConfig: GameConfig): Promise<Room> {
    // Generate unique room code
    let code: string;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique room code');
      }
    } while (await this.roomExists(code));

    const hostId = uuidv4();
    const now = Date.now();
    const expiresAt = now + ROOM_TTL * 1000;

    const room: Room = {
      code,
      hostId,
      status: 'lobby',
      config: gameConfig,
      players: {},
      questions: [],
      currentQuestionIndex: -1,
      phase: 'answering',
      questionStartedAt: null,
      createdAt: now,
      expiresAt,
    };

    // Add host as a player entry (host tracks via hostId separately)
    await this.saveRoom(room);
    return room;
  }

  async addPlayer(code: string, name: string): Promise<{ playerId: string; room: Room } | null> {
    const room = await this.getRoom(code);
    if (!room) return null;

    const playerId = uuidv4();
    const now = Date.now();

    room.players[playerId] = {
      id: playerId,
      name: name.trim(),
      score: 0,
      answers: {},
      joinedAt: now,
      isHost: false,
    };

    await this.saveRoom(room);
    return { playerId, room };
  }

  async updateRoom(room: Room): Promise<void> {
    await this.saveRoom(room);
  }
}

export const roomService = new RoomService();
