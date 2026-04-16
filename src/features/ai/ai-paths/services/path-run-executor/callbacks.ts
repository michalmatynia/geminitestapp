import {
  mergeNodeOutputsForStatus,
  toRuntimeNodeStatus,
} from '@/features/ai/ai-paths/services/path-run-executor.logic';
import { toRuntimeNodeResolutionTelemetry } from '@/features/ai/ai-paths/services/path-run-executor.runtime-kernel';
import { recordRuntimeNodeStatus } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import type {
  AiNode,
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRunRepository,
  RuntimeProfileNodeSpanStatus,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type {
  RuntimeHistoryEntry,
  RuntimeSideEffectDecision,
  RuntimeSideEffectPolicy,
  RuntimeTraceEffect,
  RuntimeTraceResume,
  RuntimeTraceSpanStatus,
} from '@/shared/contracts/ai-paths-runtime';
import type {
  RuntimeNodeBlockedEvent,
  RuntimeNodeErrorEvent,
  RuntimeNodeFinishEvent,
  RuntimeNodeStartEvent,
} from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';
import { cloneJsonSafe, hashRuntimeValue } from '@/shared/lib/ai-paths/core/utils/runtime';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import { extractDatabaseRuntimeMetadata } from '../../components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers';

import type { PathRunProfiling } from './profiling';
import type { UpsertRuntimeTraceSpan } from './tracing';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type CallbackCtx = {
  run: AiPathRunRecord;
  repo: AiPathRunRepository;
  traceId: string;
  profiling: PathRunProfiling;
  upsertRuntimeTraceSpan: UpsertRuntimeTraceSpan;
  syncRuntimeTraceMeta: () => void;
  publishNodeUpdate: (
    payload: Partial<AiPathRunNodeRecord> & {
      nodeId: string;
      status: AiPathRunNodeRecord['status'];
    }
  ) => void;
  throttledSaveIntermediateState: () => Promise<void>;
  reportAiPathsError: (error: unknown, meta: Record<string, unknown>, summary?: string) => void;
  runtimeKernelExecutionTelemetry: Record<string, unknown>;
  accInputs: Record<string, RuntimePortValues>;
  accOutputs: Record<string, RuntimePortValues>;
  logNodeStartEvents: boolean;
  resumeByNodeId: Map<string, RuntimeTraceResume>;
  appendRuntimeHistoryEntry?: (nodeId: string, entry: RuntimeHistoryEntry) => void;
  setRuntimeNodeStatus?: (nodeId: string, status: AiPathRunNodeRecord['status']) => void;
};

const EFFECT_NODE_TYPES = new Set([
  'agent',
  'api_advanced',
  'advanced_api',
  'database',
  'http',
  'learner_agent',
  'model',
  'notification',
  'playwright',
]);

const resolveFinishedNodeStatus = (input: {
  cached?: boolean;
  nextOutputs: RuntimePortValues;
}): AiPathRunNodeRecord['status'] => {
  if (input.cached) return 'cached';
  return toRuntimeNodeStatus(input.nextOutputs['status']) ?? 'completed';
};

const resolveRuntimeTraceSpanStatus = (
  status: AiPathRunNodeRecord['status']
): RuntimeTraceSpanStatus => {
  switch (status) {
    case 'cached':
      return 'cached';
    case 'failed':
    case 'timeout':
    case 'canceled':
      return 'failed';
    case 'blocked':
      return 'blocked';
    case 'waiting_callback':
    case 'advance_pending':
      return 'waiting_callback';
    case 'skipped':
      return 'skipped';
    default:
      return 'completed';
  }
};

const resolveRuntimeProfileSpanStatus = (
  status: RuntimeTraceSpanStatus
): RuntimeProfileNodeSpanStatus => {
  switch (status) {
    case 'cached':
      return 'cached';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'blocked':
    case 'waiting_callback':
      return 'blocked';
    default:
      return 'completed';
  }
};

export const createCallbacks = (ctx: CallbackCtx) => {
  const {
    run,
    repo,
    traceId,
    profiling,
    upsertRuntimeTraceSpan,
    syncRuntimeTraceMeta,
    publishNodeUpdate,
    throttledSaveIntermediateState,
    reportAiPathsError,
    runtimeKernelExecutionTelemetry,
    accInputs,
    accOutputs,
    logNodeStartEvents,
    resumeByNodeId,
    appendRuntimeHistoryEntry,
    setRuntimeNodeStatus,
  } = ctx;

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

  const buildRuntimeTraceEffect = (input: {
    nodeType: string;
    sideEffectPolicy?: RuntimeSideEffectPolicy;
    sideEffectDecision?: RuntimeSideEffectDecision;
    effectSourceSpanId?: string | null;
  }): RuntimeTraceEffect | undefined => {
    const policy = input.sideEffectPolicy;
    const decision = input.sideEffectDecision;
    const sourceSpanId =
      typeof input.effectSourceSpanId === 'string' && input.effectSourceSpanId.trim().length > 0
        ? input.effectSourceSpanId.trim()
        : undefined;

    const isEffectNode = EFFECT_NODE_TYPES.has(input.nodeType);
    if (!isEffectNode && !policy && !decision && !sourceSpanId) {
      return undefined;
    }

    return {
      ...(policy ? { policy } : {}),
      ...(decision ? { decision } : {}),
      ...(sourceSpanId ? { sourceSpanId } : {}),
    };
  };

  const resolveResume = (nodeId: string): RuntimeTraceResume | undefined =>
    resumeByNodeId.get(nodeId);

  const toResumeRunEventMetadata = (
    resume: RuntimeTraceResume | undefined
  ): Record<string, unknown> => {
    if (!resume) return {};
    return {
      resumeMode: resume.mode,
      resumeDecision: resume.decision,
      resumeReason: resume.reason,
      resumeSourceTraceId: resume.sourceTraceId ?? null,
      resumeSourceSpanId: resume.sourceSpanId ?? null,
      resumeSourceRunStartedAt: resume.sourceRunStartedAt ?? null,
      resumeSourceStatus: resume.sourceStatus ?? null,
    };
  };

  const nodeStartedAtBySpanId = new Map<string, string>();

  const resolveDurationMs = (
    startedAt: string | null | undefined,
    finishedAt: string | null | undefined
  ): number | null => {
    if (!startedAt || !finishedAt) return null;
    const startedAtMs = Date.parse(startedAt);
    const finishedAtMs = Date.parse(finishedAt);
    if (!Number.isFinite(startedAtMs) || !Number.isFinite(finishedAtMs)) return null;
    return Math.max(0, finishedAtMs - startedAtMs);
  };

  const emitNodeLifecycleSystemEvent = (input: {
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
    resume?: RuntimeTraceResume;
    reason?: string | null;
    errorMessage?: string | null;
    waitingOnPorts?: string[] | null;
  }): void => {
    if (!logNodeStartEvents) return;

    const phaseLabel =
      input.event === 'node.started'
        ? 'started'
        : input.event === 'node.reused_seeded'
          ? 'reused seeded outputs'
          : input.event === 'node.blocked'
            ? 'blocked'
            : input.event === 'node.failed'
              ? 'failed'
              : 'finished';

    void logSystemEvent({
      level: input.level,
      source: 'ai-paths-executor',
      message: `AI Paths node ${phaseLabel}: ${run.pathName ?? run.pathId ?? run.id} :: ${input.node.title ?? input.node.id}`,
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
        ...toResumeRunEventMetadata(input.resume),
        ...toRunEventRuntimeKernelMetadata({
          runtimeStrategy: input.runtimeStrategy,
          runtimeResolutionSource: input.runtimeResolutionSource,
          runtimeCodeObjectId: input.runtimeCodeObjectId,
        }),
      },
    });
  };

  return {
    onNodeStart: async ({
      node,
      nodeInputs,
      prevOutputs,
      iteration,
      attempt,
      spanId: nodeSpanId,
      runtimeStrategy,
      runtimeResolutionSource,
      runtimeCodeObjectId,
    }: RuntimeNodeStartEvent) => {
      try {
        const nodeStartedAt = new Date().toISOString();
        const resume = resolveResume(node.id);
        nodeStartedAtBySpanId.set(nodeSpanId, nodeStartedAt);

        profiling.beginRuntimeNodeSpan({
          spanId: nodeSpanId,
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          iteration,
          attempt,
          startedAt: nodeStartedAt,
        });

        const safeInputs = cloneJsonSafe(nodeInputs) as RuntimePortValues;
        const safePrevOutputs = cloneJsonSafe(prevOutputs ?? {}) as RuntimePortValues;
        upsertRuntimeTraceSpan(nodeSpanId, {
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          iteration,
          attempt,
          startedAt: nodeStartedAt,
          status: 'running',
          inputHash: hashRuntimeValue(safeInputs ?? nodeInputs),
          cache: {
            decision: 'miss',
          },
          resume,
        });
        syncRuntimeTraceMeta();
        accInputs[node.id] = safeInputs;
        accOutputs[node.id] = mergeNodeOutputsForStatus({
          previous: accOutputs[node.id],
          next: {},
          status: 'running',
        });

        publishNodeUpdate({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: 'running',
          traceId,
          spanId: nodeSpanId,
          iteration,
          attempt,
          inputs: safeInputs,
          outputs: safePrevOutputs,
          startedAt: nodeStartedAt,
          errorMessage: null,
          finishedAt: null,
          updatedAt: nodeStartedAt,
        });

        setRuntimeNodeStatus?.(node.id, 'running');

        await Promise.all([
          repo
            .upsertRunNode(run.id, node.id, {
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: 'running',
              attempt,
              inputs: safeInputs,
              outputs: safePrevOutputs,
              startedAt: nodeStartedAt,
              error: null,
            })
            .catch(() => {}),
          ...(logNodeStartEvents
            ? [
              repo
                .createRunEvent({
                  runId: run.id,
                  level: 'info',
                  message: `Node ${node.title ?? node.id} started.`,
                  metadata: {
                    traceId,
                    spanId: nodeSpanId,
                    nodeId: node.id,
                    nodeType: node.type,
                    iteration,
                    attempt,
                    ...toResumeRunEventMetadata(resume),
                    ...toRunEventRuntimeKernelMetadata({
                      runtimeStrategy,
                      runtimeResolutionSource,
                      runtimeCodeObjectId,
                    }),
                  },
                })
                .catch(() => {}),
            ]
            : []),
        ]);

        emitNodeLifecycleSystemEvent({
          event: 'node.started',
          level: 'info',
          node,
          spanId: nodeSpanId,
          iteration,
          attempt,
          status: 'running',
          startedAt: nodeStartedAt,
          resume,
          runtimeStrategy,
          runtimeResolutionSource,
          runtimeCodeObjectId,
        });
            
        void throttledSaveIntermediateState();
      } catch (error) {
        logClientError(error);
        reportAiPathsError(error, { nodeId: node.id, action: 'onNodeStart' });
      }
            
    },

    onNodeFinish: async ({
      node,
      nodeInputs,
      nextOutputs,
      iteration,
      attempt,
      spanId: nodeSpanId,
      cached,
      cacheDecision,
      sideEffectPolicy,
      sideEffectDecision,
      activationHash,
      idempotencyKey,
      effectSourceSpanId,
      runtimeStrategy,
      runtimeResolutionSource,
      runtimeCodeObjectId,
    }: RuntimeNodeFinishEvent) => {
      try {
        const finishedAt = new Date().toISOString();
        const status = resolveFinishedNodeStatus({ cached, nextOutputs });
        const traceStatus = resolveRuntimeTraceSpanStatus(status);
        const resume = resolveResume(node.id);
        const startedAt = nodeStartedAtBySpanId.get(nodeSpanId) ?? null;
        nodeStartedAtBySpanId.delete(nodeSpanId);
        const durationMs = resolveDurationMs(startedAt, finishedAt);

        profiling.finalizeRuntimeNodeSpan({
          spanId: nodeSpanId,
          status: resolveRuntimeProfileSpanStatus(traceStatus),
          finishedAt,
        });

        const safeInputs = cloneJsonSafe(nodeInputs) as RuntimePortValues;
        const safeOutputs = cloneJsonSafe(nextOutputs) as RuntimePortValues;
        upsertRuntimeTraceSpan(nodeSpanId, {
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          iteration,
          attempt,
          finishedAt,
          status: traceStatus,
          inputHash: hashRuntimeValue(safeInputs ?? nodeInputs),
          activationHash: activationHash ?? undefined,
          cache: {
            decision: cacheDecision ?? (cached ? 'hit' : 'miss'),
          },
          effect: buildRuntimeTraceEffect({
            nodeType: node.type,
            sideEffectPolicy,
            sideEffectDecision,
            effectSourceSpanId,
          }),
          resume,
        });
        syncRuntimeTraceMeta();
        accInputs[node.id] = safeInputs;
        accOutputs[node.id] = mergeNodeOutputsForStatus({
          previous: accOutputs[node.id],
          next: safeOutputs,
          status,
        });

        const metadata =
          node.type === 'database' ? extractDatabaseRuntimeMetadata(safeOutputs) : null;

        publishNodeUpdate({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status,
          attempt,
          traceId,
          spanId: nodeSpanId,
          iteration,
          inputs: safeInputs,
          outputs: safeOutputs,
          finishedAt,
          updatedAt: finishedAt,
          errorMessage: status === 'failed' ? (nextOutputs['message'] as string) : null,
        });

        setRuntimeNodeStatus?.(node.id, status);
        appendRuntimeHistoryEntry?.(node.id, {
          timestamp: finishedAt,
          pathId: run.pathId ?? null,
          pathName: run.pathName ?? null,
          traceId,
          spanId: nodeSpanId,
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status,
          iteration,
          attempt,
          inputs: safeInputs,
          outputs: safeOutputs,
          inputsFrom: [],
          outputsTo: [],
          inputHash: hashRuntimeValue(safeInputs ?? nodeInputs),
          cacheDecision: cacheDecision ?? (cached ? 'hit' : 'miss'),
          sideEffectPolicy,
          sideEffectDecision,
          activationHash: activationHash ?? null,
          idempotencyKey: idempotencyKey ?? null,
          effectSourceSpanId: effectSourceSpanId ?? null,
          durationMs: durationMs ?? 0,
          runtimeStrategy: runtimeStrategy as any,
          runtimeResolutionSource: runtimeResolutionSource as any,
          runtimeCodeObjectId: (runtimeCodeObjectId as string) ?? null,
        });

        await Promise.all([
          repo
            .upsertRunNode(run.id, node.id, {
              status,
              attempt,
              inputs: safeInputs,
              outputs: safeOutputs,
              finishedAt,
              nodeType: node.type,
              error: status === 'failed' ? (nextOutputs['message'] as string) : null,
            })
            .catch(() => {}),
          repo
            .createRunEvent({
              runId: run.id,
              level: status === 'failed' ? 'error' : 'info',
              message:
                status === 'cached'
                  ? `Node ${node.title ?? node.id} reused cached outputs.`
                  : `Node ${node.title ?? node.id} finished with status: ${status}.`,
              metadata: {
                traceId,
                spanId: nodeSpanId,
                nodeId: node.id,
                nodeType: node.type,
                iteration,
                attempt,
                cached,
                cacheDecision: cacheDecision ?? (cached ? 'hit' : 'miss'),
                sideEffectPolicy: sideEffectPolicy ?? null,
                sideEffectDecision: sideEffectDecision ?? null,
                activationHash: activationHash ?? null,
                idempotencyKey: idempotencyKey ?? null,
                effectSourceSpanId: effectSourceSpanId ?? null,
                durationMs,
                ...toResumeRunEventMetadata(resume),
                ...toRunEventRuntimeKernelMetadata({
                  runtimeStrategy,
                  runtimeResolutionSource,
                  runtimeCodeObjectId,
                }),
                ...(metadata ? { nodeMetadata: metadata } : {}),
              },
            })
            .catch(() => {}),
        ]);

        emitNodeLifecycleSystemEvent({
          event: 'node.finished',
          level: status === 'failed' ? 'error' : 'info',
          node,
          spanId: nodeSpanId,
          iteration,
          attempt,
          status,
          startedAt,
          finishedAt,
          durationMs,
          cached,
          cacheDecision: cacheDecision ?? (cached ? 'hit' : 'miss'),
          sideEffectPolicy,
          sideEffectDecision,
          activationHash: activationHash ?? null,
          idempotencyKey: idempotencyKey ?? null,
          effectSourceSpanId: effectSourceSpanId ?? null,
          runtimeStrategy,
          runtimeResolutionSource,
          runtimeCodeObjectId,
          resume,
          errorMessage: status === 'failed' ? ((nextOutputs['message'] as string) ?? null) : null,
        });
            
        void throttledSaveIntermediateState();
        void recordRuntimeNodeStatus({ runId: run.id, nodeId: node.id, status }).catch(() => {});
      } catch (error) {
        logClientError(error);
        reportAiPathsError(error, { nodeId: node.id, action: 'onNodeFinish' });
      }
            
    },

    onNodeBlocked: async ({
      node,
      iteration,
      attempt,
      spanId: nodeSpanId,
      reason,
      message,
      status,
      waitingOnPorts,
      waitingOnDetails,
      runtimeStrategy,
      runtimeResolutionSource,
      runtimeCodeObjectId,
    }: RuntimeNodeBlockedEvent) => {
      try {
        const finishedAt = new Date().toISOString();
        const runtimeStatus = status === 'waiting_callback' ? 'waiting_callback' : 'blocked';
        const traceStatus: RuntimeTraceSpanStatus =
          runtimeStatus === 'waiting_callback' ? 'waiting_callback' : 'blocked';
        const resume = resolveResume(node.id);
        const startedAt = nodeStartedAtBySpanId.get(nodeSpanId) ?? null;
        nodeStartedAtBySpanId.delete(nodeSpanId);
        const durationMs = resolveDurationMs(startedAt, finishedAt);
        const safeOutputs: RuntimePortValues = {
          status: runtimeStatus,
          skipReason: reason,
          message,
          blockedReason: reason,
          ...(waitingOnPorts ? { waitingOnPorts } : {}),
          ...(waitingOnDetails ? { waitingOnDetails } : {}),
        };
        upsertRuntimeTraceSpan(nodeSpanId, {
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          iteration,
          attempt,
          finishedAt,
          status: traceStatus,
          resume,
          error:
            typeof message === 'string' && message.trim().length > 0
              ? {
                message,
              }
              : undefined,
        });
        syncRuntimeTraceMeta();
        accOutputs[node.id] = mergeNodeOutputsForStatus({
          previous: accOutputs[node.id],
          next: safeOutputs,
          status: runtimeStatus,
        });

        publishNodeUpdate({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: runtimeStatus,
          attempt,
          traceId,
          spanId: nodeSpanId,
          iteration,
          outputs: safeOutputs,
          finishedAt,
          updatedAt: finishedAt,
          errorMessage: message,
        });

        setRuntimeNodeStatus?.(node.id, runtimeStatus);
        appendRuntimeHistoryEntry?.(node.id, {
          timestamp: finishedAt,
          pathId: run.pathId ?? null,
          pathName: run.pathName ?? null,
          traceId,
          spanId: nodeSpanId,
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: runtimeStatus,
          iteration,
          attempt,
          inputs: (ctx.accInputs[node.id] as RuntimePortValues) ?? {},
          outputs: safeOutputs,
          inputsFrom: [],
          outputsTo: [],
          inputHash: null,
          skipReason: reason,
          waitingOnPorts: waitingOnPorts ?? undefined,
          durationMs: durationMs ?? 0,
          runtimeStrategy: runtimeStrategy as any,
          runtimeResolutionSource: runtimeResolutionSource as any,
          runtimeCodeObjectId: (runtimeCodeObjectId as string) ?? null,
        });

        await Promise.all([
          repo
            .upsertRunNode(run.id, node.id, {
              status: runtimeStatus,
              attempt,
              outputs: safeOutputs,
              finishedAt,
              nodeType: node.type,
              error: message,
            })
            .catch(() => {}),
          repo
            .createRunEvent({
              runId: run.id,
              level: runtimeStatus === 'waiting_callback' ? 'info' : 'warn',
              message:
                runtimeStatus === 'waiting_callback'
                  ? `Node ${node.title ?? node.id} waiting: ${message}`
                  : `Node ${node.title ?? node.id} blocked: ${message}`,
              metadata: {
                traceId,
                spanId: nodeSpanId,
                runId: run.id,
                nodeId: node.id,
                nodeType: node.type,
                iteration,
                attempt,
                reason,
                status: runtimeStatus,
                durationMs,
                ...toResumeRunEventMetadata(resume),
                ...toRunEventRuntimeKernelMetadata({
                  runtimeStrategy,
                  runtimeResolutionSource,
                  runtimeCodeObjectId,
                }),
                ...(waitingOnPorts ? { waitingOnPorts } : {}),
              },
            })
            .catch(() => {}),
        ]);

        emitNodeLifecycleSystemEvent({
          event: 'node.blocked',
          level: runtimeStatus === 'waiting_callback' ? 'info' : 'warn',
          node,
          spanId: nodeSpanId,
          iteration,
          attempt,
          status: runtimeStatus,
          startedAt,
          finishedAt,
          durationMs,
          runtimeStrategy,
          runtimeResolutionSource,
          runtimeCodeObjectId,
          resume,
          reason,
          errorMessage: message,
          waitingOnPorts: waitingOnPorts ?? null,
        });
            
        void throttledSaveIntermediateState();
      } catch (error) {
        logClientError(error);
        reportAiPathsError(error, { nodeId: node.id, action: 'onNodeBlocked' });
      }
            
    },

    onNodeError: async ({
      node,
      nodeInputs,
      iteration,
      attempt,
      spanId: nodeSpanId,
      error,
      runtimeStrategy,
      runtimeResolutionSource,
      runtimeCodeObjectId,
    }: RuntimeNodeErrorEvent) => {
      try {
        const finishedAt = new Date().toISOString();
        const errorMessage =
          error instanceof Error ? error.message : String(error ?? 'Unknown error');
        const resume = resolveResume(node.id);
        const startedAt = nodeStartedAtBySpanId.get(nodeSpanId) ?? null;
        nodeStartedAtBySpanId.delete(nodeSpanId);
        const durationMs = resolveDurationMs(startedAt, finishedAt);
        const safeInputs = cloneJsonSafe(nodeInputs) as RuntimePortValues;
        const safeOutputs: RuntimePortValues = {
          status: 'failed',
          message: errorMessage,
          error: errorMessage,
        };

        profiling.finalizeRuntimeNodeSpan({
          spanId: nodeSpanId,
          status: 'failed',
          finishedAt,
        });

        upsertRuntimeTraceSpan(nodeSpanId, {
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          iteration,
          attempt,
          finishedAt,
          status: 'failed',
          inputHash: hashRuntimeValue(safeInputs ?? nodeInputs),
          resume,
          error: {
            message: errorMessage,
          },
        });
        syncRuntimeTraceMeta();
        accInputs[node.id] = safeInputs;
        accOutputs[node.id] = mergeNodeOutputsForStatus({
          previous: accOutputs[node.id],
          next: safeOutputs,
          status: 'failed',
        });

        publishNodeUpdate({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: 'failed',
          attempt,
          traceId,
          spanId: nodeSpanId,
          iteration,
          inputs: safeInputs,
          outputs: safeOutputs,
          finishedAt,
          updatedAt: finishedAt,
          errorMessage,
        });

        setRuntimeNodeStatus?.(node.id, 'failed');
        appendRuntimeHistoryEntry?.(node.id, {
          timestamp: finishedAt,
          pathId: run.pathId ?? null,
          pathName: run.pathName ?? null,
          traceId,
          spanId: nodeSpanId,
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: 'failed',
          iteration,
          attempt,
          inputs: safeInputs,
          outputs: safeOutputs,
          inputsFrom: [],
          outputsTo: [],
          inputHash: hashRuntimeValue(safeInputs ?? nodeInputs),
          error: errorMessage,
          durationMs: durationMs ?? 0,
          runtimeStrategy: runtimeStrategy as any,
          runtimeResolutionSource: runtimeResolutionSource as any,
          runtimeCodeObjectId: (runtimeCodeObjectId as string) ?? null,
        });

        await Promise.all([
          repo
            .upsertRunNode(run.id, node.id, {
              status: 'failed',
              attempt,
              outputs: safeOutputs,
              finishedAt,
              nodeType: node.type,
              error: errorMessage,
            })
            .catch(() => {}),
          repo
            .createRunEvent({
              runId: run.id,
              level: 'error',
              message: `Node ${node.title ?? node.id} failed: ${errorMessage}`,
              metadata: {
                traceId,
                spanId: nodeSpanId,
                nodeId: node.id,
                nodeType: node.type,
                iteration,
                attempt,
                durationMs,
                ...toResumeRunEventMetadata(resume),
                ...toRunEventRuntimeKernelMetadata({
                  runtimeStrategy,
                  runtimeResolutionSource,
                  runtimeCodeObjectId,
                }),
              },
            })
            .catch(() => {}),
        ]);

        emitNodeLifecycleSystemEvent({
          event: 'node.failed',
          level: 'error',
          node,
          spanId: nodeSpanId,
          iteration,
          attempt,
          status: 'failed',
          startedAt,
          finishedAt,
          durationMs,
          runtimeStrategy,
          runtimeResolutionSource,
          runtimeCodeObjectId,
          resume,
          errorMessage,
        });
            
        void throttledSaveIntermediateState();
        void recordRuntimeNodeStatus({ runId: run.id, nodeId: node.id, status: 'failed' }).catch(
          () => {}
        );
      } catch (callbackError) {
        logClientError(callbackError);
        reportAiPathsError(callbackError, { nodeId: node.id, action: 'onNodeError' });
      }
            
    },

    recordNodeReuse: async (input: {
      node: AiNode;
      spanId: string;
      iteration: number;
      attempt: number;
      nodeInputs: RuntimePortValues;
      nodeOutputs: RuntimePortValues;
      resume: RuntimeTraceResume;
      sourceHistory?: RuntimeHistoryEntry | null;
    }): Promise<void> => {
      try {
        const startedAt = new Date().toISOString();
        const finishedAt = startedAt;
        const safeInputs = cloneJsonSafe(input.nodeInputs) as RuntimePortValues;
        const safeOutputs = cloneJsonSafe(input.nodeOutputs) as RuntimePortValues;
        const effectSourceSpanId =
          input.resume.sourceSpanId ??
          input.sourceHistory?.effectSourceSpanId ??
          input.sourceHistory?.spanId ??
          null;

        profiling.beginRuntimeNodeSpan({
          spanId: input.spanId,
          nodeId: input.node.id,
          nodeType: input.node.type,
          nodeTitle: input.node.title ?? null,
          iteration: input.iteration,
          attempt: input.attempt,
          startedAt,
        });
        profiling.finalizeRuntimeNodeSpan({
          spanId: input.spanId,
          status: 'cached',
          finishedAt,
        });

        upsertRuntimeTraceSpan(input.spanId, {
          nodeId: input.node.id,
          nodeType: input.node.type,
          nodeTitle: input.node.title ?? null,
          iteration: input.iteration,
          attempt: input.attempt,
          startedAt,
          finishedAt,
          status: 'cached',
          inputHash: hashRuntimeValue(safeInputs ?? input.nodeInputs),
          activationHash: input.sourceHistory?.activationHash ?? undefined,
          cache: {
            decision: 'seed',
          },
          effect: buildRuntimeTraceEffect({
            nodeType: input.node.type,
            sideEffectPolicy: input.sourceHistory?.sideEffectPolicy,
            effectSourceSpanId,
          }),
          resume: input.resume,
        });
        syncRuntimeTraceMeta();
        accInputs[input.node.id] = safeInputs;
        accOutputs[input.node.id] = mergeNodeOutputsForStatus({
          previous: accOutputs[input.node.id],
          next: safeOutputs,
          status: 'cached',
        });
        setRuntimeNodeStatus?.(input.node.id, 'cached');
        appendRuntimeHistoryEntry?.(input.node.id, {
          timestamp: finishedAt,
          pathId: run.pathId ?? null,
          pathName: run.pathName ?? null,
          traceId,
          spanId: input.spanId,
          nodeId: input.node.id,
          nodeType: input.node.type,
          nodeTitle: input.node.title ?? null,
          status: 'cached',
          iteration: input.iteration,
          attempt: input.attempt,
          inputs: safeInputs,
          outputs: safeOutputs,
          inputHash: hashRuntimeValue(safeInputs ?? input.nodeInputs),
          cacheDecision: 'seed',
          sideEffectPolicy: input.sourceHistory?.sideEffectPolicy,
          sideEffectDecision: input.sourceHistory?.sideEffectDecision,
          activationHash: input.sourceHistory?.activationHash ?? null,
          idempotencyKey: input.sourceHistory?.idempotencyKey ?? null,
          effectSourceSpanId,
          resumeMode: input.resume.mode,
          resumeDecision: input.resume.decision,
          resumeReason: input.resume.reason,
          resumeSourceTraceId: input.resume.sourceTraceId ?? null,
          resumeSourceSpanId: input.resume.sourceSpanId ?? null,
          resumeSourceRunStartedAt: input.resume.sourceRunStartedAt ?? null,
          resumeSourceStatus: input.resume.sourceStatus ?? null,
          inputsFrom: input.sourceHistory?.inputsFrom ?? [],
          outputsTo: input.sourceHistory?.outputsTo ?? [],
          durationMs: 0,
          runtimeStrategy: input.sourceHistory?.runtimeStrategy,
          runtimeResolutionSource: input.sourceHistory?.runtimeResolutionSource,
          runtimeCodeObjectId: input.sourceHistory?.runtimeCodeObjectId ?? null,
        });

        publishNodeUpdate({
          nodeId: input.node.id,
          nodeType: input.node.type,
          nodeTitle: input.node.title ?? null,
          status: 'cached',
          attempt: input.attempt,
          traceId,
          spanId: input.spanId,
          iteration: input.iteration,
          inputs: safeInputs,
          outputs: safeOutputs,
          startedAt,
          finishedAt,
          updatedAt: finishedAt,
          errorMessage: null,
        });

        await Promise.all([
          repo
            .upsertRunNode(run.id, input.node.id, {
              nodeType: input.node.type,
              nodeTitle: input.node.title ?? null,
              status: 'cached',
              attempt: input.attempt,
              inputs: safeInputs,
              outputs: safeOutputs,
              startedAt,
              finishedAt,
              error: null,
            })
            .catch(() => {}),
          repo
            .createRunEvent({
              runId: run.id,
              level: 'info',
              message: `Node ${input.node.title ?? input.node.id} reused seeded outputs during ${input.resume.mode}.`,
              metadata: {
                traceId,
                spanId: input.spanId,
                nodeId: input.node.id,
                nodeType: input.node.type,
                iteration: input.iteration,
                attempt: input.attempt,
                cached: true,
                cacheDecision: 'seed',
                sideEffectPolicy: input.sourceHistory?.sideEffectPolicy ?? null,
                effectSourceSpanId: effectSourceSpanId ?? null,
                activationHash: input.sourceHistory?.activationHash ?? null,
                durationMs: 0,
                ...toResumeRunEventMetadata(input.resume),
              },
            })
            .catch(() => {}),
        ]);

        emitNodeLifecycleSystemEvent({
          event: 'node.reused_seeded',
          level: 'info',
          node: input.node,
          spanId: input.spanId,
          iteration: input.iteration,
          attempt: input.attempt,
          status: 'cached',
          startedAt,
          finishedAt,
          durationMs: 0,
          cached: true,
          cacheDecision: 'seed',
          sideEffectPolicy: input.sourceHistory?.sideEffectPolicy,
          sideEffectDecision: input.sourceHistory?.sideEffectDecision,
          activationHash: input.sourceHistory?.activationHash ?? null,
          idempotencyKey: input.sourceHistory?.idempotencyKey ?? null,
          effectSourceSpanId: effectSourceSpanId ?? null,
          resume: input.resume,
          runtimeStrategy: input.sourceHistory?.runtimeStrategy,
          runtimeResolutionSource: input.sourceHistory?.runtimeResolutionSource,
          runtimeCodeObjectId: input.sourceHistory?.runtimeCodeObjectId ?? null,
        });
            
        void throttledSaveIntermediateState();
        void recordRuntimeNodeStatus({ runId: run.id, nodeId: input.node.id, status: 'cached' }).catch(
          () => {}
        );
      } catch (error) {
        logClientError(error);
        reportAiPathsError(error, { nodeId: input.node.id, action: 'recordNodeReuse' });
      }
            
    },
  };
};
