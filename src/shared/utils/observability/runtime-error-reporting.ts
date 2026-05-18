/**
 * Runtime Error Reporting
 * 
 * Runtime error reporting and dispatch utilities.
 * Provides:
 * - Runtime error context management
 * - Client-side error dispatch
 * - Internal observability fallback
 * - Error reporting coordination
 * - Service and action tracking
 */

import { logClientCatchIfBrowser, type ClientErrorContext } from './client-error-dispatch';
import { reportObservabilityInternalError } from './internal-observability-fallback';

export type RuntimeErrorReportingContext = ClientErrorContext & {
  source: string;
  action: string;
  service?: string;
};

/**
 * Orchestrates runtime error reporting across the platform.
 * 
 * This utility acts as a central dispatcher for uncaught runtime exceptions.
 * It intelligently routes error information to the appropriate collector based on the
 * environment:
 * - Browser: Dispatches via `logClientCatchIfBrowser` to the client-side observability pipeline.
 * - Server: Uses `reportObservabilityInternalError` to capture and log server-side failures.
 * 
 * @param error - The error caught at runtime
 * @param context - Rich diagnostic context, including the source service, action, and environment state
 */
export const reportRuntimeCatch = async (
  error: unknown,
  context: RuntimeErrorReportingContext
): Promise<void> => {
  if (await logClientCatchIfBrowser(error, context)) {
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
