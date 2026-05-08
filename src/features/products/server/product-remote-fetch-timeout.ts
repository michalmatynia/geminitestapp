import 'server-only';

const REMOTE_PRODUCT_FETCH_TIMEOUT_MS = 15_000;

type TimeoutAbortScope = {
  dispose: () => void;
  signal: AbortSignal;
};

type TimeoutTask<T> = (signal: AbortSignal) => Promise<T>;

const createTimeoutError = (label: string): Error =>
  new Error(`${label} timed out after ${REMOTE_PRODUCT_FETCH_TIMEOUT_MS}ms.`);

const createRemoteProductFetchAbortScope = (
  label: string,
  parentSignal: AbortSignal | undefined
): TimeoutAbortScope => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(createTimeoutError(label));
  }, REMOTE_PRODUCT_FETCH_TIMEOUT_MS);
  const abortFromParent = (): void => {
    controller.abort(parentSignal?.reason);
  };
  if (parentSignal?.aborted === true) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  }
  return {
    dispose: () => {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener('abort', abortFromParent);
    },
    signal: controller.signal,
  };
};

const resolveAbortReason = (signal: AbortSignal, label: string): Error => {
  const reason = signal.reason as unknown;
  if (reason instanceof Error) return reason;
  return createTimeoutError(label);
};

export const runWithRemoteProductTimeout = async <T>(
  label: string,
  parentSignal: AbortSignal | undefined,
  task: TimeoutTask<T>,
  onAbort?: () => void
): Promise<T> => {
  const scope = createRemoteProductFetchAbortScope(label, parentSignal);
  let rejectAbort: ((error: Error) => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const abortTask = (): void => {
    onAbort?.();
    rejectAbort?.(resolveAbortReason(scope.signal, label));
  };
  if (scope.signal.aborted) {
    abortTask();
  } else {
    scope.signal.addEventListener('abort', abortTask, { once: true });
  }
  try {
    return await Promise.race([task(scope.signal), aborted]);
  } finally {
    scope.signal.removeEventListener('abort', abortTask);
    scope.dispose();
  }
};

export const fetchWithRemoteProductTimeout = async (
  label: string,
  parentSignal: AbortSignal | undefined,
  task: TimeoutTask<Response>
): Promise<Response> => await runWithRemoteProductTimeout(label, parentSignal, task);

const cancelResponseBody = (response: Response): void => {
  void response.body?.cancel().catch(() => undefined);
};

export const readResponseTextWithTimeout = async (
  response: Response,
  signal: AbortSignal | undefined
): Promise<string> =>
  await runWithRemoteProductTimeout(
    'Remote product source page body read',
    signal,
    async () => await response.text(),
    () => cancelResponseBody(response)
  );

export const readResponseBlobWithTimeout = async (
  response: Response,
  signal: AbortSignal | undefined
): Promise<Blob> =>
  await runWithRemoteProductTimeout(
    'Remote product image body read',
    signal,
    async () => await response.blob(),
    () => cancelResponseBody(response)
  );

export const cancelRemoteProductResponseBody = cancelResponseBody;
