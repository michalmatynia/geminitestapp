import { type ErrorReportingCtx } from '../error-reporting';
import {
  buildAiPathErrorReport,
  type AiPathErrorReport,
  type AiPathErrorScope,
  type AiPathErrorSeverity,
} from '@/shared/lib/ai-paths/error-reporting';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const readString = (meta: Record<string, unknown>, key: string): string | null =>
  typeof meta[key] === 'string' ? meta[key] : null;

const readNumber = (meta: Record<string, unknown>, key: string): number | null =>
  typeof meta[key] === 'number' ? meta[key] : null;

const readBoolean = (meta: Record<string, unknown>, key: string): boolean | null =>
  typeof meta[key] === 'boolean' ? meta[key] : null;

const readHints = (meta: Record<string, unknown>): string[] | null =>
  Array.isArray(meta['hints']) ? (meta['hints'] as string[]) : null;

const AI_PATH_ERROR_SCOPES = new Set<string>([
  'enqueue',
  'run',
  'node',
  'portable_engine',
  'stream',
  'api',
  'unknown',
]);

const resolveErrorScope = (meta: Record<string, unknown>): AiPathErrorScope => {
  const explicitScope = readString(meta, 'errorScope');
  if (explicitScope !== null && AI_PATH_ERROR_SCOPES.has(explicitScope)) {
    return explicitScope;
  }
  return readString(meta, 'nodeId') !== null ? 'node' : 'run';
};

const resolveErrorSeverity = (meta: Record<string, unknown>): AiPathErrorSeverity => {
  const explicitSeverity = readString(meta, 'errorSeverity');
  if (
    explicitSeverity === 'info' ||
    explicitSeverity === 'warning' ||
    explicitSeverity === 'error' ||
    explicitSeverity === 'fatal'
  ) {
    return explicitSeverity;
  }
  return 'error';
};

const resolveRunEventLevel = (
  severity: AiPathErrorSeverity
): 'info' | 'warn' | 'error' | 'fatal' => {
  if (severity === 'info') return 'info';
  if (severity === 'warning') return 'warn';
  if (severity === 'fatal') return 'fatal';
  return 'error';
};

const buildErrorReport = (
  ctx: ErrorReportingCtx,
  error: unknown,
  meta: Record<string, unknown>,
  summary?: string
): AiPathErrorReport =>
  buildAiPathErrorReport({
    error,
    code: readString(meta, 'errorCode') ?? 'AI_PATHS_RUNTIME_UNHANDLED_ERROR',
    category: readString(meta, 'errorCategory') ?? 'runtime',
    scope: resolveErrorScope(meta),
    severity: resolveErrorSeverity(meta),
    userMessage: summary,
    traceId: ctx.traceId,
    runId: ctx.run.id,
    nodeId: readString(meta, 'nodeId'),
    nodeType: readString(meta, 'nodeType'),
    nodeTitle: readString(meta, 'nodeTitle'),
    attempt: readNumber(meta, 'attempt'),
    iteration: readNumber(meta, 'iteration'),
    retryable: readBoolean(meta, 'retryable'),
    retryAfterMs: readNumber(meta, 'retryAfterMs'),
    statusCode: readNumber(meta, 'statusCode'),
    hints: readHints(meta),
    metadata: {
      runStartedAt: ctx.runStartedAt,
      runtimeFingerprint: ctx.runtimeFingerprint,
      traceId: ctx.traceId,
      ...meta,
    },
  });

const buildRunEventMetadata = (
  ctx: ErrorReportingCtx,
  meta: Record<string, unknown>,
  errorReport: AiPathErrorReport
): Record<string, unknown> => ({
  runStartedAt: ctx.runStartedAt,
  runtimeFingerprint: ctx.runtimeFingerprint,
  traceId: ctx.traceId,
  ...ctx.runtimeKernelExecutionTelemetry,
  ...meta,
  error: errorReport.message,
  errorCode: errorReport.code,
  errorCategory: errorReport.category,
  errorScope: errorReport.scope,
  retryable: errorReport.retryable,
  ...(typeof errorReport.retryAfterMs === 'number'
    ? { retryAfterMs: errorReport.retryAfterMs }
    : {}),
  ...(typeof errorReport.statusCode === 'number' ? { statusCode: errorReport.statusCode } : {}),
  errorReport,
});

export const reportAiPathsError = async (
  ctx: ErrorReportingCtx,
  error: unknown,
  meta: Record<string, unknown>,
  summary?: string
): Promise<void> => {
  const { run, repo } = ctx;
  const errorReport = buildErrorReport(ctx, error, meta, summary);

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
      level: resolveRunEventLevel(errorReport.severity),
      message: summary ?? errorReport.userMessage,
      metadata: buildRunEventMetadata(ctx, meta, errorReport),
    });
  } catch (dbError: unknown) {
    logClientError(dbError);
  }
};
