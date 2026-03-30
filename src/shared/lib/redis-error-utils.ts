const TRANSIENT_REDIS_ERROR_CODES = new Set(['EPIPE', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT']);
const TRANSIENT_REDIS_MESSAGE_PATTERNS = [
  'write epipe',
  'read econnreset',
  'econnreset',
  'econnrefused',
  'connection is closed',
  'socket closed unexpectedly',
  'timeout',
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
