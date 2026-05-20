export const LOCAL_DATABASE_SERVER_UNAVAILABLE_MESSAGE =
  'Database connection failed because the local database server is not running. Start the database server and try again.';

const CONNECTION_REFUSED_PATTERN = /\bECONNREFUSED\b|connection refused/i;
const DATABASE_PATTERN = /database|mongo|mongodb|prisma|sql/i;
const LOCAL_HOST_PATTERN = /\b(?:127\.0\.0\.1|localhost|\[::1\]|::1)\b/i;

type ErrorRecord = {
  address?: unknown;
  cause?: unknown;
  code?: unknown;
  host?: unknown;
  hostname?: unknown;
  message?: unknown;
  name?: unknown;
  port?: unknown;
};

const stringifyPart = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

const collectErrorText = (error: unknown, depth = 0): string => {
  if (depth > 2) return '';
  if (error instanceof Error) {
    return [
      error.name,
      error.message,
      collectErrorText(error.cause, depth + 1),
    ].join(' ');
  }
  if (error === null || typeof error !== 'object') {
    return stringifyPart(error);
  }

  const record = error as ErrorRecord;
  return [
    stringifyPart(record.name),
    stringifyPart(record.message),
    stringifyPart(record.code),
    stringifyPart(record.address),
    stringifyPart(record.host),
    stringifyPart(record.hostname),
    stringifyPart(record.port),
    collectErrorText(record.cause, depth + 1),
  ].join(' ');
};

export const isLocalDatabaseConnectionRefused = (error: unknown): boolean => {
  const text = collectErrorText(error);
  return (
    CONNECTION_REFUSED_PATTERN.test(text) &&
    LOCAL_HOST_PATTERN.test(text) &&
    DATABASE_PATTERN.test(text)
  );
};
