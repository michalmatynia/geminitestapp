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

// Mock for client-side or when async_hooks is unavailable
class MockAsyncLocalStorage<T> implements IAsyncLocalStorage<T> {
  getStore(): T | undefined {
    return undefined;
  }
  run<R>(_store: T, callback: () => R): R {
    return callback();
  }
}

let storage: IAsyncLocalStorage<RequestContext>;

if (typeof window === 'undefined' && process?.versions?.node) {
  try {
    // Dynamically require async_hooks only in Node.js environment

    const { AsyncLocalStorage } = require('async_hooks') as {
      AsyncLocalStorage: new <T>() => IAsyncLocalStorage<T>;
    };
    storage = new AsyncLocalStorage<RequestContext>();
  } catch (_error) {
    storage = new MockAsyncLocalStorage<RequestContext>();
  }
} else {
  storage = new MockAsyncLocalStorage<RequestContext>();
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
