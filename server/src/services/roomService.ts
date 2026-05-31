import { v4 as uuidv4 } from 'uuid';
import { Room, GameConfig } from '../types';
import { generateRoomCode } from '../utils/roomCode';

const ROOM_TTL_MS = 7200 * 1000; // 2 hours

class RoomService {
  private rooms = new Map<string, Room>();

  // Purge expired rooms periodically to avoid unbounded memory growth
  constructor() {
    // .unref() so this timer doesn't keep the process alive during tests
    setInterval(() => this.purgeExpired(), 60 * 1000).unref();
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.expiresAt <= now) this.rooms.delete(code);
    }
  }

  async connect(): Promise<void> {
    // No-op — kept for interface compatibility
  }

  async getRoom(code: string): Promise<Room | null> {
    const room = this.rooms.get(code) ?? null;
    if (room && room.expiresAt <= Date.now()) {
      this.rooms.delete(code);
      return null;
    }
    return room;
  }

  async saveRoom(room: Room): Promise<void> {
    if (room.expiresAt <= Date.now()) {
      throw Object.assign(new Error('Room has expired'), { statusCode: 410, code: 'ROOM_EXPIRED' });
    }
    this.rooms.set(room.code, room);
  }

  async roomExists(code: string): Promise<boolean> {
    return (await this.getRoom(code)) !== null;
  }

  async createRoom(gameConfig: GameConfig): Promise<Room> {
    let code: string;
    let attempts = 0;
    do {
      code = generateRoomCode();
      if (++attempts > 10) throw new Error('Failed to generate unique room code');
    } while (await this.roomExists(code));

    const now = Date.now();
    const room: Room = {
      code,
      hostId: uuidv4(),
      status: 'lobby',
      config: gameConfig,
      players: {},
      questions: [],
      currentQuestionIndex: -1,
      phase: 'answering',
      questionStartedAt: null,
      createdAt: now,
      expiresAt: now + ROOM_TTL_MS,
    };

    this.rooms.set(code, room);
    return room;
  }

  async addPlayer(code: string, name: string): Promise<{ playerId: string; room: Room } | null> {
    const room = await this.getRoom(code);
    if (!room) return null;

    const playerId = uuidv4();
    room.players[playerId] = {
      id: playerId,
      name: name.trim(),
      score: 0,
      answers: {},
      joinedAt: Date.now(),
      isHost: false,
    };

    return { playerId, room };
  }

  async updateRoom(room: Room): Promise<void> {
    await this.saveRoom(room);
  }
}

export const roomService = new RoomService();
