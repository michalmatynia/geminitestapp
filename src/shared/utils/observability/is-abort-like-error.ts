const ABORT_ERROR_NAMES = new Set(['AbortError', 'CanceledError', 'CancelError']);

const hasAbortLikeMessage = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return (
    normalized === 'aborted' ||
    normalized.includes('signal is aborted') ||
    normalized.includes('operation was aborted') ||
    normalized.includes('request aborted')
  );
};

const readName = (value: unknown): string | null => {
  if (value === null || value === undefined || typeof value !== 'object') return null;
  const candidate = (value as { name?: unknown }).name;
  return typeof candidate === 'string' ? candidate : null;
};

const readMessage = (value: unknown): string | null => {
  if (value === null || value === undefined || typeof value !== 'object') return null;
  const candidate = (value as { message?: unknown }).message;
  return typeof candidate === 'string' ? candidate : null;
};

const hasAbortLikeName = (name: string | null): boolean => Boolean(name !== null && ABORT_ERROR_NAMES.has(name));

const isAbortLikeObjectError = (error: unknown): boolean => {
  const name = readName(error);
  if (hasAbortLikeName(name)) {
    return true;
  }
  const message = readMessage(error);
  return typeof message === 'string' && hasAbortLikeMessage(message);
};

export const isAbortLikeError = (error: unknown, signal?: AbortSignal | null): boolean => {
  if (signal?.aborted === true) return true;

  if (error instanceof DOMException && hasAbortLikeName(error.name)) {
    return true;
  }

  if (error instanceof Error) {
    if (hasAbortLikeName(error.name)) {
      return true;
    }
    return hasAbortLikeMessage(error.message);
  }

  if (typeof error === 'string') {
    return hasAbortLikeMessage(error);
  }

  return isAbortLikeObjectError(error);
};
