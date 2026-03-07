import {
  cloneJsonSafe,
  hashRuntimeValue,
} from '@/shared/lib/ai-paths/core/utils/runtime';
import {
  mergeNodeOutputsForStatus,
} from '@/features/ai/ai-paths/services/path-run-executor.logic';
import {
  toRuntimeNodeResolutionTelemetry,
} from '@/features/ai/ai-paths/services/path-run-executor.runtime-kernel';
import type {
  AiNode,
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRunRepository,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type {
  RuntimeTraceRecord,
  RuntimeTraceEffect,
  RuntimeTraceSpanStatus,
} from '@/shared/contracts/ai-paths-runtime';
import {
  recordRuntimeNodeStatus,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { extractDatabaseRuntimeMetadata } from '../../components/ai-paths-settings/runtime/useAiPathsLocalExecution.helpers';

export type CallbackCtx = {
  run: AiPathRunRecord;
  repo: AiPathRunRepository;
  traceId: string;
  profiling: any;
  upsertRuntimeTraceSpan: (spanId: string, patch: any) => void;
  syncRuntimeTraceMeta: () => void;
  publishNodeUpdate: (payload: any) => void;
  throttledSaveIntermediateState: () => Promise<void>;
  reportAiPathsError: (error: unknown, meta: Record<string, unknown>, summary?: string) => void;
  runtimeKernelExecutionTelemetry: Record<string, unknown>;
  accInputs: Record<string, RuntimePortValues>;
  accOutputs: Record<string, RuntimePortValues>;
  logNodeStartEvents: boolean;
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
    sideEffectPolicy?: unknown;
    sideEffectDecision?: unknown;
    effectSourceSpanId?: unknown;
  }): RuntimeTraceEffect | undefined => {
    const policy =
      input.sideEffectPolicy === 'per_run' || input.sideEffectPolicy === 'per_activation'
        ? input.sideEffectPolicy
        : undefined;
    const decision =
      typeof input.sideEffectDecision === 'string' && input.sideEffectDecision.trim().length > 0
        ? input.sideEffectDecision.trim()
        : undefined;
    const sourceSpanId =
      typeof input.effectSourceSpanId === 'string' && input.effectSourceSpanId.trim().length > 0
        ? input.effectSourceSpanId.trim()
        : undefined;

    const isEffectNode = new Set([
      'agent',
      'api_advanced',
      'advanced_api',
      'database',
      'http',
      'learner_agent',
      'model',
      'notification',
      'playwright',
    ]).has(input.nodeType);

    if (!isEffectNode && !policy && !decision && !sourceSpanId) {
      return undefined;
    }

    return {
      ...(policy ? { policy } : {}),
      ...(decision ? { decision } : {}),
      ...(sourceSpanId ? { sourceSpanId } : {}),
    };
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
    }: any) => {
      try {
        const nodeStartedAt = new Date().toISOString();
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
          throttledSaveIntermediateState().catch(() => {}),
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
      } catch (error) {
        void reportAiPathsError(error, { nodeId: node.id, action: 'onNodeStart' });
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
    }: any) => {
      try {
        const finishedAt = new Date().toISOString();
        const rawStatus = (nextOutputs['status'] as any);
        const status = (cached ? 'cached' : rawStatus) ?? 'completed';
        const traceStatus: RuntimeTraceSpanStatus = cached ? 'cached' : 'completed';

        profiling.finalizeRuntimeNodeSpan({
          spanId: nodeSpanId,
          status: status === 'failed' ? 'failed' : 'completed',
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

        await Promise.all([
          repo
            .upsertRunNode(run.id, node.id, {
              status: status,
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
                ...toRunEventRuntimeKernelMetadata({
                  runtimeStrategy,
                  runtimeResolutionSource,
                  runtimeCodeObjectId,
                }),
                ...(metadata ? { nodeMetadata: metadata } : {}),
              },
            })
            .catch(() => {}),
          throttledSaveIntermediateState().catch(() => {}),
        ]);
        void recordRuntimeNodeStatus({ runId: run.id, nodeId: node.id, status }).catch(() => {});
      } catch (error) {
        void reportAiPathsError(error, { nodeId: node.id, action: 'onNodeFinish' });
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
    }: any) => {
      try {
        const finishedAt = new Date().toISOString();
        const runtimeStatus = status === 'waiting_callback' ? 'waiting_callback' : 'blocked';
        const traceStatus: RuntimeTraceSpanStatus =
          runtimeStatus === 'waiting_callback' ? 'waiting_callback' : 'blocked';
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

        await Promise.all([
          repo
            .upsertRunNode(run.id, node.id, {
              status: runtimeStatus,
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
                ...toRunEventRuntimeKernelMetadata({
                  runtimeStrategy,
                  runtimeResolutionSource,
                  runtimeCodeObjectId,
                }),
                ...(waitingOnPorts ? { waitingOnPorts } : {}),
              },
            })
            .catch(() => {}),
          throttledSaveIntermediateState().catch(() => {}),
        ]);
      } catch (error) {
        void reportAiPathsError(error, { nodeId: node.id, action: 'onNodeBlocked' });
      }
    },
  };
};
