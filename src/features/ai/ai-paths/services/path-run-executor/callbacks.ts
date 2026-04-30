import { mergeNodeOutputsForStatus } from '@/features/ai/ai-paths/services/path-run-executor.logic';
import { recordRuntimeNodeStatus } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import type {
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRunRepository,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type {
  RuntimeHistoryEntry,
  RuntimeTraceSpanStatus,
} from '@/shared/contracts/ai-paths-runtime';
import type {
  RuntimeNodeBlockedEvent,
  RuntimeNodeErrorEvent,
  RuntimeNodeFinishEvent,
  RuntimeNodeStartEvent,
} from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-types';
import { cloneJsonSafe, hashRuntimeValue } from '@/shared/lib/ai-paths/core/utils/runtime';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { extractDatabaseRuntimeMetadata } from '../../components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers';

import {
  buildRuntimeTraceEffect,
  resolveDurationMs,
  resolveFinishedNodeStatus,
  resolveRuntimeProfileSpanStatus,
  resolveRuntimeTraceSpanStatus,
} from './callbacks.helpers';
import { createLifecycleEmitter } from './callbacks.lifecycle-emitter';
import type { PathRunProfiling } from './profiling';
import type { UpsertRuntimeTraceSpan } from './tracing';


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
  appendRuntimeHistoryEntry?: (nodeId: string, entry: RuntimeHistoryEntry) => void;
  setRuntimeNodeStatus?: (nodeId: string, status: AiPathRunNodeRecord['status']) => void;
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
    appendRuntimeHistoryEntry,
    setRuntimeNodeStatus,
  } = ctx;

  const { emit: emitNodeLifecycleSystemEvent, toRunEventRuntimeKernelMetadata } =
    createLifecycleEmitter({
      run,
      traceId,
      logNodeStartEvents,
      runtimeKernelExecutionTelemetry,
    });

  const nodeStartedAtBySpanId = new Map<string, string>();

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

  };
};
