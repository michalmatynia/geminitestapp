/**
 * Redis Error Utilities
 * 
 * Utilities for classifying and handling Redis errors.
 * Provides:
 * - Transient error detection
 * - Error code classification
 * - Error message pattern matching
 * - Connection error identification
 * - Retry-eligible error determination
 */

const TRANSIENT_REDIS_ERROR_CODES = new Set(['EPIPE', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT']);
const TRANSIENT_REDIS_MESSAGE_PATTERNS = [
  'write epipe',
  'read econnreset',
  'econnreset',
  'econnrefused',
  'connection is closed',
  'socket closed unexpectedly',
  'timeout',
  // ioredis throws this when a command is sent while disconnected and
  // enableOfflineQueue is false — treat it as transient so callers can fall back
  "stream isn't writeable",
  'enableofflinequeue',
];

const readRedisErrorCode = (error: Error): string | null => {
  const code = (error as NodeJS.ErrnoException).code;
  return typeof code === 'string' ? code.toUpperCase() : null;
};

const hasTransientRedisMessage = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return TRANSIENT_REDIS_MESSAGE_PATTERNS.some((pattern) => message.includes(pattern));
};

export const isTransientRedisTransportError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const code = readRedisErrorCode(error);
  return (code !== null && TRANSIENT_REDIS_ERROR_CODES.has(code)) || hasTransientRedisMessage(error);
};
