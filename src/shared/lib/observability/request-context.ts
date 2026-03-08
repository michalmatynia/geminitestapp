import 'server-only';

import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = {
  requestId: string;
  traceId: string;
  correlationId: string;
  userId?: string | null;
  startTime: number;
};

// Interface compatible with AsyncLocalStorage
interface IAsyncLocalStorage<T> {
  getStore(): T | undefined;
  run<R>(store: T, callback: () => R): R;
}

type RequestContextGlobal = typeof globalThis & {
  __geminitestappRequestContextStorage?: IAsyncLocalStorage<RequestContext>;
};

const requestContextGlobal = globalThis as RequestContextGlobal;

const storage =
  requestContextGlobal.__geminitestappRequestContextStorage ??
  new AsyncLocalStorage<RequestContext>();

if (!requestContextGlobal.__geminitestappRequestContextStorage) {
  requestContextGlobal.__geminitestappRequestContextStorage = storage;
}

export const requestContextStorage = storage;

/**
 * Gets the current request context from storage.
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Runs a function within a given request context.
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn);
}
