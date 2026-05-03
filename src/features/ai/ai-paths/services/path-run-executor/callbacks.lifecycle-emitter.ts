import { toRuntimeNodeResolutionTelemetry } from '@/features/ai/ai-paths/services/path-run-executor.runtime-kernel';
import type { AiNode, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type {
  RuntimeSideEffectDecision,
  RuntimeSideEffectPolicy,
} from '@/shared/contracts/ai-paths-runtime';
import type { RuntimeNodeFinishEvent } from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

export interface LifecycleEmitterDeps {
  run: AiPathRunRecord;
  traceId: string;
  logNodeStartEvents: boolean;
  runtimeKernelExecutionTelemetry: Record<string, unknown>;
}

export interface LifecycleEventInput {
  event:
    | 'node.started'
    | 'node.finished'
    | 'node.blocked'
    | 'node.failed'
    | 'node.reused_seeded';
  level: 'info' | 'warn' | 'error';
  node: AiNode;
  spanId: string;
  iteration: number;
  attempt: number;
  status: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  cached?: boolean;
  cacheDecision?: RuntimeNodeFinishEvent['cacheDecision'] | 'seed' | null;
  sideEffectPolicy?: RuntimeSideEffectPolicy;
  sideEffectDecision?: RuntimeSideEffectDecision;
  activationHash?: string | null;
  idempotencyKey?: string | null;
  effectSourceSpanId?: string | null;
  runtimeStrategy?: unknown;
  runtimeResolutionSource?: unknown;
  runtimeCodeObjectId?: unknown;
  reason?: string | null;
  errorMessage?: string | null;
  waitingOnPorts?: string[] | null;
}

const phaseLabelFor = (event: LifecycleEventInput['event']): string => {
  switch (event) {
    case 'node.started':
      return 'started';
    case 'node.reused_seeded':
      return 'reused seeded outputs';
    case 'node.blocked':
      return 'blocked';
    case 'node.failed':
      return 'failed';
    default:
      return 'finished';
  }
};

export function createLifecycleEmitter(deps: LifecycleEmitterDeps) {
  const { run, traceId, logNodeStartEvents, runtimeKernelExecutionTelemetry } = deps;

  const toRunEventRuntimeKernelMetadata = (input?: {
    runtimeStrategy?: unknown;
    runtimeResolutionSource?: unknown;
    runtimeCodeObjectId?: unknown;
  }): Record<string, unknown> => ({
    ...runtimeKernelExecutionTelemetry,
    ...toRuntimeNodeResolutionTelemetry({
      runtimeStrategy: input?.runtimeStrategy,
      runtimeResolutionSource: input?.runtimeResolutionSource,
      runtimeCodeObjectId: input?.runtimeCodeObjectId,
    }),
  });

  const emit = (input: LifecycleEventInput): void => {
    if (!logNodeStartEvents) return;

    void logSystemEvent({
      level: input.level,
      source: 'ai-paths-executor',
      message: `AI Paths node ${phaseLabelFor(input.event)}: ${run.pathName ?? run.pathId ?? run.id} :: ${input.node.title ?? input.node.id}`,
      context: {
        event: input.event,
        runId: run.id,
        pathId: run.pathId ?? null,
        pathName: run.pathName ?? null,
        traceId,
        spanId: input.spanId,
        nodeId: input.node.id,
        nodeType: input.node.type,
        nodeTitle: input.node.title ?? null,
        iteration: input.iteration,
        attempt: input.attempt,
        status: input.status,
        startedAt: input.startedAt ?? null,
        finishedAt: input.finishedAt ?? null,
        durationMs: input.durationMs ?? null,
        cached: input.cached ?? null,
        cacheDecision: input.cacheDecision ?? null,
        sideEffectPolicy: input.sideEffectPolicy ?? null,
        sideEffectDecision: input.sideEffectDecision ?? null,
        activationHash: input.activationHash ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        effectSourceSpanId: input.effectSourceSpanId ?? null,
        reason: input.reason ?? null,
        errorMessage: input.errorMessage ?? null,
        waitingOnPorts: input.waitingOnPorts ?? null,
        ...toRunEventRuntimeKernelMetadata({
          runtimeStrategy: input.runtimeStrategy,
          runtimeResolutionSource: input.runtimeResolutionSource,
          runtimeCodeObjectId: input.runtimeCodeObjectId,
        }),
      },
    });
  };

  return { emit, toRunEventRuntimeKernelMetadata };
}
