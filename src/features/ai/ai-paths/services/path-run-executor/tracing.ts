import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { RuntimeTraceRecord } from '@/shared/contracts/ai-paths-runtime';

export type TracingCtx = {
  run: AiPathRunRecord;
  traceId: string;
  runStartedAt: string;
  runtimeTraceSpans: Map<string, RuntimeTraceRecord['spans'][number]>;
  runtimeTraceSpanOrder: string[];
  runMetaWithRuntimeContext: Record<string, unknown>;
  baseRuntimeTraceRecord: Record<string, unknown>;
};

export type RuntimeTraceSpanPatch = Partial<RuntimeTraceRecord['spans'][number]> &
  Pick<RuntimeTraceRecord['spans'][number], 'nodeId' | 'nodeType' | 'iteration' | 'attempt'>;

export type UpsertRuntimeTraceSpan = (spanId: string, patch: RuntimeTraceSpanPatch) => void;

export const createTracing = (ctx: TracingCtx) => {
  const {
    run,
    traceId,
    runStartedAt,
    runtimeTraceSpans,
    runtimeTraceSpanOrder,
    runMetaWithRuntimeContext,
    baseRuntimeTraceRecord,
  } = ctx;

  const upsertRuntimeTraceSpan: UpsertRuntimeTraceSpan = (spanId, patch): void => {
    const existing = runtimeTraceSpans.get(spanId);
    const next: RuntimeTraceRecord['spans'][number] = {
      spanId,
      parentSpanId: existing?.parentSpanId ?? null,
      runId: run.id,
      traceId,
      nodeId: patch.nodeId,
      nodeType: patch.nodeType,
      nodeTitle: patch.nodeTitle !== undefined ? patch.nodeTitle : (existing?.nodeTitle ?? null),
      iteration: patch.iteration,
      attempt: patch.attempt,
      startedAt: patch.startedAt ?? existing?.startedAt ?? new Date().toISOString(),
      finishedAt:
        patch.finishedAt !== undefined ? patch.finishedAt : (existing?.finishedAt ?? null),
      status: patch.status ?? existing?.status ?? 'running',
      inputHash:
        patch.inputHash !== undefined ? patch.inputHash : (existing?.inputHash ?? undefined),
      activationHash:
        patch.activationHash !== undefined
          ? patch.activationHash
          : (existing?.activationHash ?? undefined),
      correlationIds:
        patch.correlationIds !== undefined
          ? patch.correlationIds
          : (existing?.correlationIds ?? []),
      cache: patch.cache !== undefined ? patch.cache : existing?.cache,
      branch: patch.branch !== undefined ? patch.branch : existing?.branch,
      effect: patch.effect !== undefined ? patch.effect : existing?.effect,
      resume: patch.resume !== undefined ? patch.resume : existing?.resume,
      error: patch.error !== undefined ? patch.error : existing?.error,
    };
    runtimeTraceSpans.set(spanId, next);
    if (!runtimeTraceSpanOrder.includes(spanId)) {
      runtimeTraceSpanOrder.push(spanId);
    }
  };

  const syncRuntimeTraceMeta = (): void => {
    runMetaWithRuntimeContext['runtimeTrace'] = {
      ...baseRuntimeTraceRecord,
      version: 'ai-paths.trace.v1',
      traceId,
      runId: run.id,
      source: 'server',
      startedAt: runStartedAt,
      spans: runtimeTraceSpanOrder
        .map((spanId: string) => runtimeTraceSpans.get(spanId))
        .filter((span): span is RuntimeTraceRecord['spans'][number] => Boolean(span)),
    } satisfies Partial<RuntimeTraceRecord>;
  };

  return { upsertRuntimeTraceSpan, syncRuntimeTraceMeta };
};
