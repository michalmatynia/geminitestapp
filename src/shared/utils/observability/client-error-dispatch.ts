import type { ClientErrorContext } from './client-error-logger';

export type { ClientErrorContext };

const isBrowserRuntime = (): boolean => typeof window !== 'undefined';

export const logClientErrorIfBrowser = async (
  error: unknown,
  extra?: {
    digest?: string | null | undefined;
    componentStack?: string | null | undefined;
    context?: ClientErrorContext | null | undefined;
  }
): Promise<boolean> => {
  if (!isBrowserRuntime()) return false;
  const { logClientError } = await import('./client-error-logger');
  logClientError(error, extra);
  return true;
};

export const logClientCatchIfBrowser = async (
  error: unknown,
  context: ClientErrorContext,
  extra?: {
    digest?: string | null | undefined;
    componentStack?: string | null | undefined;
  }
): Promise<boolean> => {
  if (!isBrowserRuntime()) return false;
  const { logClientCatch } = await import('./client-error-logger');
  logClientCatch(error, context, extra);
  return true;
};

export const dispatchClientError = (
  error: unknown,
  extra?: {
    digest?: string | null | undefined;
    componentStack?: string | null | undefined;
    context?: ClientErrorContext | null | undefined;
  }
): void => {
  if (!isBrowserRuntime()) return;
  void logClientErrorIfBrowser(error, extra).catch(() => {});
};

export const dispatchClientCatch = (
  error: unknown,
  context: ClientErrorContext,
  extra?: {
    digest?: string | null | undefined;
    componentStack?: string | null | undefined;
  }
): void => {
  if (!isBrowserRuntime()) return;
  void logClientCatchIfBrowser(error, context, extra).catch(() => {});
};
