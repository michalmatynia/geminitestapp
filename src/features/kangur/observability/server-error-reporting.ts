import 'server-only';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

type KangurServerErrorReport = {
  source: string;
  action: string;
  description: string;
  service?: string;
  context?: Record<string, unknown>;
};

type KangurServerErrorHandlingOptions<T> = {
  fallback: T | (() => T);
  onError?: (error: unknown) => void;
  shouldReport?: (error: unknown) => boolean;
  shouldRethrow?: (error: unknown) => boolean;
};

export const reportKangurServerError = (
  error: unknown,
  report: KangurServerErrorReport
): void => {
  void ErrorSystem.captureException(error, {
    service: report.service ?? report.source,
    source: report.source,
    action: report.action,
    description: report.description,
    ...(report.context ?? {}),
  });
};

export const withKangurServerError = async <T>(
  report: KangurServerErrorReport | ((error: unknown) => KangurServerErrorReport),
  task: () => Promise<T>,
  options: KangurServerErrorHandlingOptions<T>
): Promise<T> => {
  try {
    return await task();
  } catch (error) {
    const resolvedReport = typeof report === 'function' ? report(error) : report;
    const shouldReport = options.shouldReport?.(error) ?? true;
    if (shouldReport) {
      reportKangurServerError(error, resolvedReport);
    }
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};

export const withKangurServerErrorSync = <T>(
  report: KangurServerErrorReport | ((error: unknown) => KangurServerErrorReport),
  task: () => T,
  options: KangurServerErrorHandlingOptions<T>
): T => {
  try {
    return task();
  } catch (error) {
    const resolvedReport = typeof report === 'function' ? report(error) : report;
    const shouldReport = options.shouldReport?.(error) ?? true;
    if (shouldReport) {
      reportKangurServerError(error, resolvedReport);
    }
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};
