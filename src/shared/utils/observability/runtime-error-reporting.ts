import { type ClientErrorContext, logClientCatch } from './client-error-logger';
import { reportObservabilityInternalError } from './internal-observability-fallback';

export type RuntimeErrorReportingContext = ClientErrorContext & {
  source: string;
  action: string;
  service?: string;
};

export const reportRuntimeCatch = async (
  error: unknown,
  context: RuntimeErrorReportingContext
): Promise<void> => {
  if (typeof window !== 'undefined') {
    logClientCatch(error, context);
    return;
  }

  const { service, ...errorContext } = context;

  try {
    const { ErrorSystem } = await import('./error-system');
    await ErrorSystem.captureException(error, {
      service: service ?? context.source,
      ...errorContext,
    });
  } catch (reportingError) {
    reportObservabilityInternalError(reportingError, {
      source: 'observability',
      action: 'reportRuntimeCatch',
      message: '[observability] Failed to report runtime catch',
      originalError: error,
      runtimeContext: context,
    });
  }
};
