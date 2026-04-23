import type { AiPathRunRecord, AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { reportAiPathsError } from './error-reporting/report-error';

export type ErrorReportingCtx = {
  run: AiPathRunRecord;
  repo: AiPathRunRepository;
  traceId: string;
  runtimeFingerprint: string;
  runStartedAt: string;
  runtimeKernelExecutionTelemetry: Record<string, unknown>;
};

export const createErrorReporting = (
  ctx: ErrorReportingCtx
): {
  reportAiPathsError: (
    error: unknown,
    meta: Record<string, unknown>,
    summary?: string
  ) => Promise<void>;
} => ({
  reportAiPathsError: (
    error: unknown,
    meta: Record<string, unknown>,
    summary?: string
  ): Promise<void> => reportAiPathsError(ctx, error, meta, summary),
});

export { reportAiPathsError };
