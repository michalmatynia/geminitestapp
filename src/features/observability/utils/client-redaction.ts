// Client-safe redaction utilities
export const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "key",
  "auth",
  "credential",
  "session",
  "cookie",
  "authorization",
  "bearer",
  "api_key",
  "apikey",
  "access_token",
  "refresh_token",
  "private_key",
  "client_secret",
];

export const isSensitiveKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitive: string) => lowerKey.includes(sensitive));
};

export const truncateString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
};