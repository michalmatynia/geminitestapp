import type { AiPathRunRecord, AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { buildAiPathErrorReport } from '@/shared/lib/ai-paths/error-reporting';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type ErrorReportingCtx = {
  run: AiPathRunRecord;
  repo: AiPathRunRepository;
  traceId: string;
  runtimeFingerprint: string;
  runStartedAt: string;
  runtimeKernelExecutionTelemetry: Record<string, unknown>;
};

export const createErrorReporting = (ctx: ErrorReportingCtx) => {
  const { run, repo, traceId, runtimeFingerprint, runStartedAt, runtimeKernelExecutionTelemetry } =
    ctx;

  const resolveRunEventLevel = (
    severity: 'info' | 'warning' | 'error' | 'fatal'
  ): 'info' | 'warn' | 'error' | 'fatal' => {
    if (severity === 'info') return 'info';
    if (severity === 'warning') return 'warn';
    if (severity === 'fatal') return 'fatal';
    return 'error';
  };

  const reportAiPathsError = async (
    error: unknown,
    meta: Record<string, unknown>,
    summary?: string
  ): Promise<void> => {
    const errorReport = buildAiPathErrorReport({
      error,
      code:
        typeof meta['errorCode'] === 'string'
          ? meta['errorCode']
          : 'AI_PATHS_RUNTIME_UNHANDLED_ERROR',
      category: typeof meta['errorCategory'] === 'string' ? meta['errorCategory'] : 'runtime',
      scope:
        typeof meta['errorScope'] === 'string'
          ? (meta['errorScope'] as
              | 'enqueue'
              | 'run'
              | 'node'
              | 'portable_engine'
              | 'stream'
              | 'api'
              | 'unknown')
          : typeof meta['nodeId'] === 'string'
            ? 'node'
            : 'run',
      severity:
        typeof meta['errorSeverity'] === 'string'
          ? (meta['errorSeverity'] as 'info' | 'warning' | 'error' | 'fatal')
          : 'error',
      userMessage: summary ?? undefined,
      traceId,
      runId: run.id,
      nodeId: typeof meta['nodeId'] === 'string' ? meta['nodeId'] : null,
      nodeType: typeof meta['nodeType'] === 'string' ? meta['nodeType'] : null,
      nodeTitle: typeof meta['nodeTitle'] === 'string' ? meta['nodeTitle'] : null,
      attempt: typeof meta['attempt'] === 'number' ? meta['attempt'] : null,
      iteration: typeof meta['iteration'] === 'number' ? meta['iteration'] : null,
      retryable: typeof meta['retryable'] === 'boolean' ? meta['retryable'] : null,
      retryAfterMs: typeof meta['retryAfterMs'] === 'number' ? meta['retryAfterMs'] : null,
      statusCode: typeof meta['statusCode'] === 'number' ? meta['statusCode'] : null,
      hints: Array.isArray(meta['hints']) ? (meta['hints'] as string[]) : null,
      metadata: {
        runStartedAt,
        runtimeFingerprint,
        traceId,
        ...meta,
      },
    });
    const eventLevel = resolveRunEventLevel(errorReport.severity);

    await ErrorSystem.captureException(error, {
      service: 'ai-paths-runtime',
      pathRunId: run.id,
      summary,
      errorCode: errorReport.code,
      errorCategory: errorReport.category,
      errorScope: errorReport.scope,
      ...meta,
    });

    try {
      await repo.createRunEvent({
        runId: run.id,
        level: eventLevel,
        message: summary ?? errorReport.userMessage,
        metadata: {
          runStartedAt,
          runtimeFingerprint,
          traceId,
          ...runtimeKernelExecutionTelemetry,
          ...meta,
          error: errorReport.message,
          errorCode: errorReport.code,
          errorCategory: errorReport.category,
          errorScope: errorReport.scope,
          retryable: errorReport.retryable,
          ...(typeof errorReport.retryAfterMs === 'number'
            ? { retryAfterMs: errorReport.retryAfterMs }
            : {}),
          ...(typeof errorReport.statusCode === 'number'
            ? { statusCode: errorReport.statusCode }
            : {}),
          errorReport,
        },
      });
    } catch (error) {
      logClientError(error);
    
      // DB write failed — the error was already captured above; suppress to avoid crash.
    }
  };

  return { reportAiPathsError };
};
