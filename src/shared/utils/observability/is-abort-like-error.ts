const ABORT_ERROR_NAMES = new Set(['AbortError', 'CanceledError', 'CancelError']);

const hasAbortLikeMessage = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized === 'aborted' ||
    normalized.includes('signal is aborted') ||
    normalized.includes('operation was aborted') ||
    normalized.includes('request aborted')
  );
};

const readName = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = (value as { name?: unknown }).name;
  return typeof candidate === 'string' ? candidate : null;
};

const readMessage = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = (value as { message?: unknown }).message;
  return typeof candidate === 'string' ? candidate : null;
};

export const isAbortLikeError = (error: unknown, signal?: AbortSignal | null): boolean => {
  if (signal?.aborted) return true;

  if (error instanceof DOMException && ABORT_ERROR_NAMES.has(error.name)) {
    return true;
  }

  if (error instanceof Error) {
    if (ABORT_ERROR_NAMES.has(error.name)) {
      return true;
    }
    return hasAbortLikeMessage(error.message);
  }

  if (typeof error === 'string') {
    return hasAbortLikeMessage(error);
  }

  const name = readName(error);
  if (name && ABORT_ERROR_NAMES.has(name)) {
    return true;
  }

  const message = readMessage(error);
  return typeof message === 'string' && hasAbortLikeMessage(message);
};
