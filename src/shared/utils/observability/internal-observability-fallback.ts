import { dispatchClientCatch, type ClientErrorContext } from './client-error-dispatch';

export type InternalObservabilityErrorContext = ClientErrorContext & {
  source: string;
  action: string;
};

const serializeFallbackPayload = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const reportObservabilityInternalError = (
  error: unknown,
  context: InternalObservabilityErrorContext
): void => {
  if (typeof window !== 'undefined') {
    dispatchClientCatch(error, context);
    return;
  }

  const prefix = `[${context.source}] ${context.action} failed`;
  try {
    process.stderr.write(
      `${prefix} ${serializeFallbackPayload({
        error,
        context,
      })}\n`
    );
  } catch {
    try {
      process.stderr.write(`${prefix} ${serializeFallbackPayload(error)}\n`);
    } catch {
      // No-op fallback.
    }
  }
};
