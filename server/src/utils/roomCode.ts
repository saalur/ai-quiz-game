import { randomInt } from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateRoomCode(): string {
  return Array.from({ length: 6 }, () => CHARS[randomInt(CHARS.length)]).join('');
}
