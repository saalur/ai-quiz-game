import { validateName, validateAnswerOption } from '../utils/validate';

describe('validateName', () => {
  it('accepts a valid name with 2 characters', () => {
    expect(validateName('Al')).toEqual({ valid: true });
  });

  it('accepts a valid name with 20 characters', () => {
    expect(validateName('A'.repeat(20))).toEqual({ valid: true });
  });

  it('rejects a name with 1 character', () => {
    const result = validateName('A');
    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('rejects a name with 21 characters', () => {
    const result = validateName('A'.repeat(21));
    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('rejects an empty string', () => {
    const result = validateName('');
    expect(result.valid).toBe(false);
  });

  it('trims whitespace before validating length', () => {
    // "  A  " trims to "A" (length 1) — should fail
    const result = validateName('  A  ');
    expect(result.valid).toBe(false);
  });

  it('accepts a name that is valid after trimming', () => {
    // "  Al  " trims to "Al" (length 2) — should pass
    const result = validateName('  Al  ');
    expect(result.valid).toBe(true);
  });

  it('rejects a non-string value', () => {
    expect(validateName(123).valid).toBe(false);
    expect(validateName(null).valid).toBe(false);
    expect(validateName(undefined).valid).toBe(false);
  });
});

describe('validateAnswerOption', () => {
  it('accepts A', () => {
    expect(validateAnswerOption('A')).toBe(true);
  });

  it('accepts B', () => {
    expect(validateAnswerOption('B')).toBe(true);
  });

  it('accepts C', () => {
    expect(validateAnswerOption('C')).toBe(true);
  });

  it('accepts D', () => {
    expect(validateAnswerOption('D')).toBe(true);
  });

  it('rejects E', () => {
    expect(validateAnswerOption('E')).toBe(false);
  });

  it('rejects lowercase a', () => {
    expect(validateAnswerOption('a')).toBe(false);
  });

  it('rejects undefined', () => {
    expect(validateAnswerOption(undefined)).toBe(false);
  });

  it('rejects null', () => {
    expect(validateAnswerOption(null)).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateAnswerOption('')).toBe(false);
  });
});
