import { type ClientErrorContext, logClientCatch } from './client-error-logger';

export type InternalObservabilityErrorContext = ClientErrorContext & {
  source: string;
  action: string;
};

export const reportObservabilityInternalError = (
  error: unknown,
  context: InternalObservabilityErrorContext
): void => {
  if (typeof window !== 'undefined') {
    logClientCatch(error, context);
    return;
  }

  const prefix = `[${context.source}] ${context.action} failed`;
  try {
    console.error(prefix, {
      error,
      context,
    });
  } catch {
    console.error(prefix, error);
  }
};
