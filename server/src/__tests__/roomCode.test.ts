import { generateRoomCode } from '../utils/roomCode';

describe('generateRoomCode', () => {
  it('returns a 6-character string', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(typeof code).toBe('string');
  });

  it('only contains uppercase alphanumeric characters', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    }
  });

  it('generates unique codes across 1000 calls (probabilistic)', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateRoomCode());
    }
    // With 36^6 possible codes, 1000 calls should have very high uniqueness
    // Allow up to 1% collision rate — this is a probabilistic test
    expect(codes.size).toBeGreaterThan(990);
  });
});
