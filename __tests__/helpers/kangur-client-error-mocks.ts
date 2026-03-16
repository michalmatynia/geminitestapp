import { vi } from 'vitest';

export type KangurClientErrorHandlingOptions<T> = {
  fallback: T | (() => T);
  onError?: (error: unknown) => void;
  shouldReport?: (error: unknown) => boolean;
  shouldRethrow?: (error: unknown) => boolean;
};

export const createKangurClientErrorMocks = () => {
  const logKangurClientErrorMock = vi.fn();
  const trackKangurClientEventMock = vi.fn();
  const reportKangurClientErrorMock = vi.fn();
  const setKangurClientObservabilityContextMock = vi.fn();
  const clearKangurClientObservabilityContextMock = vi.fn();

  const withKangurClientError = async <T,>(
    _report: unknown,
    task: () => Promise<T>,
    options: KangurClientErrorHandlingOptions<T>
  ): Promise<T> => {
    try {
      return await task();
    } catch (error) {
      options.onError?.(error);
      if (options.shouldRethrow?.(error)) {
        throw error;
      }
      return typeof options.fallback === 'function'
        ? (options.fallback as () => T)()
        : options.fallback;
    }
  };

  const withKangurClientErrorSync = <T,>(
    _report: unknown,
    task: () => T,
    options: KangurClientErrorHandlingOptions<T>
  ): T => {
    try {
      return task();
    } catch (error) {
      options.onError?.(error);
      if (options.shouldRethrow?.(error)) {
        throw error;
      }
      return typeof options.fallback === 'function'
        ? (options.fallback as () => T)()
        : options.fallback;
    }
  };

  return {
    logKangurClientErrorMock,
    trackKangurClientEventMock,
    reportKangurClientErrorMock,
    setKangurClientObservabilityContextMock,
    clearKangurClientObservabilityContextMock,
    withKangurClientError,
    withKangurClientErrorSync,
  };
};
