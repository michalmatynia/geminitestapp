import type { AiNode } from '@/shared/contracts/ai-paths';

const parseTimeout = (value: string | undefined, fallback: number, min: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
};

const DEFAULT_NODE_TIMEOUT_MS = parseTimeout(
  process.env['AI_PATHS_NODE_TIMEOUT_MS'],
  120_000,
  5_000
);

const DEFAULT_BLOCKING_AI_NODE_TIMEOUT_MS = Math.max(
  DEFAULT_NODE_TIMEOUT_MS,
  parseTimeout(process.env['AI_PATHS_BLOCKING_AI_NODE_TIMEOUT_MS'], 300_000, 30_000)
);

export const DEFAULT_RETRY_BACKOFF_MS = Math.max(
  250,
  Number.parseInt(process.env['AI_PATHS_NODE_RETRY_BACKOFF_MS'] ?? '', 10) || 750
);

export const resolveNodeTimeoutMs = (node: AiNode): number => {
  const configured = node.config?.runtime?.timeoutMs;
  if (typeof configured === 'number' && Number.isFinite(configured) && configured > 0) {
    return Math.max(1_000, Math.floor(configured));
  }
  const isBlockingAiNode =
    (node.type === 'model' && node.config?.model?.waitForResult !== false) ||
    (node.type === 'agent' && node.config?.agent?.waitForResult !== false);
  if (isBlockingAiNode) {
    return DEFAULT_BLOCKING_AI_NODE_TIMEOUT_MS;
  }
  return DEFAULT_NODE_TIMEOUT_MS;
};

export const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve: (value: void | PromiseLike<void>) => void) => setTimeout(resolve, ms));

export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>(
    (_resolve: (value: PromiseLike<never>) => void, reject: (reason?: unknown) => void) => {
      timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
        timeoutMs
      );
    }
  );
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const withRetries = async <T>(
  task: () => Promise<T>,
  attempts: number,
  backoffMs: number,
  label: string,
  signal?: AbortSignal
): Promise<T> => {
  let lastError: unknown = null;
  const maxAttempts = Math.max(1, attempts);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      const abortError = new Error('Operation aborted.');
      (abortError as { name?: string }).name = 'AbortError';
      throw abortError;
    }
    try {
      return await task();
    } catch (error) {
      lastError = error;
      // Bail immediately on non-retryable errors (validation, auth, config)
      if (
        error !== null &&
        typeof error === 'object' &&
        'retryable' in error &&
        (error as { retryable?: boolean }).retryable === false
      ) {
        break;
      }
      if (attempt >= maxAttempts) break;
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`${label} failed after ${maxAttempts} attempt(s)`);
};

export const isAbortError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: string }).name;
  return name === 'AbortError' || name === 'CanceledError' || name === 'AbortSignal';
};
