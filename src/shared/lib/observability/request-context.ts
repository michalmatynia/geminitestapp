import { AsyncLocalStorage } from 'async_hooks';

export type RequestContext = {
  requestId: string;
  userId?: string | null;
  startTime: number;
};

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

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
