export const REDACTED_VALUE = '[REDACTED]';

const SENSITIVE_KEY_PATTERNS: RegExp[] = [
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
  /auth/i,
  /bearer/i,
];

const EMAIL_PATTERN =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN =
  /\b(?:\+?\d{1,3}[-.\s()]*)?(?:\d[-.\s()]*){7,14}\b/g;

export const isSensitiveKey = (key: string): boolean =>
  SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));

export const redactSensitiveText = (value: string): string => {
  return value.replace(EMAIL_PATTERN, REDACTED_VALUE).replace(PHONE_PATTERN, REDACTED_VALUE);
};

export const truncateString = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…[truncated]`;
};
