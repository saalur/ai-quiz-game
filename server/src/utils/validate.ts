import { AnswerOption } from '../types';

export function validateName(name: unknown): { valid: boolean; message?: string } {
  if (typeof name !== 'string') {
    return { valid: false, message: 'Name must be a string' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters' };
  }
  if (trimmed.length > 20) {
    return { valid: false, message: 'Name must be at most 20 characters' };
  }
  // Block control characters, ANSI escapes, and log-injection sequences
  if (!/^[\p{L}\p{N} '_-]+$/u.test(trimmed)) {
    return { valid: false, message: 'Name contains invalid characters. Use letters, numbers, spaces, hyphens or underscores only.' };
  }
  return { valid: true };
}

export function validateAnswerOption(answer: unknown): answer is AnswerOption {
  return answer === 'A' || answer === 'B' || answer === 'C' || answer === 'D';
}
