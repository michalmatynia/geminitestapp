const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /token/i,
  /secret/i,
  /api[-_]?key/i,
  /authorization/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /session/i,
  /jwt/i,
  /private/i,
  /credential/i,
];

export const REDACTED_VALUE = '[REDACTED]';

export const isSensitiveKey = (key: string): boolean =>
  SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));

export const truncateString = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…[truncated]`;
};
