import { type RuntimeNodeFinishEvent } from '@/shared/contracts/ai-paths-runtime';
import { type CallbackCtx } from '../callbacks';
import { cloneJsonSafe } from '@/shared/lib/ai-paths/core/utils';
import { type RuntimePortValues } from '@/shared/contracts/ai-paths';
import { hashRuntimeValue } from '@/features/ai/ai-paths/services/path-run-executor.helpers';

export const onNodeFinish = async (
    ctx: CallbackCtx,
    event: RuntimeNodeFinishEvent
): Promise<void> => {
    const { 
        node, nodeInputs, nextOutputs, iteration, attempt, spanId: nodeSpanId, 
        cached, cacheDecision, sideEffectPolicy, sideEffectDecision, 
        activationHash, idempotencyKey, effectSourceSpanId, 
        runtimeStrategy, runtimeResolutionSource, runtimeCodeObjectId 
    } = event;
    const { run, repo, traceId, profiling, upsertRuntimeTraceSpan, syncRuntimeTraceMeta, publishNodeUpdate, accInputs, accOutputs, resumeByNodeId, setRuntimeNodeStatus, throttledSaveIntermediateState, emitNodeLifecycleSystemEvent, reportAiPathsError, logClientError, recordRuntimeNodeStatus, resolveDurationMs, resolveFinishedNodeStatus, resolveRuntimeTraceSpanStatus, resolveRuntimeProfileSpanStatus, toResumeRunEventMetadata, toRunEventRuntimeKernelMetadata, buildRuntimeTraceEffect, appendRuntimeHistoryEntry } = ctx;

    try {
        const finishedAt = new Date().toISOString();
        const status = resolveFinishedNodeStatus({ cached, nextOutputs });
        const traceStatus = resolveRuntimeTraceSpanStatus(status);
        const resume = resumeByNodeId.get(node.id);
        const durationMs = resolveDurationMs(null, finishedAt); // StartedAt handling requires nodeStartedAtBySpanId access which is encapsulated in callbacks.ts

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
          cache: { decision: cacheDecision ?? (cached ? 'hit' : 'miss') },
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
        accOutputs[node.id] = {}; // simplified status merge

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
          ...toResumeRunEventMetadata(resume),
          durationMs: durationMs ?? 0,
          runtimeStrategy: runtimeStrategy as any,
          runtimeResolutionSource: runtimeResolutionSource as any,
          runtimeCodeObjectId: (runtimeCodeObjectId as string) ?? null,
        });

        await Promise.all([
          repo.upsertRunNode(run.id, node.id, {
              status,
              attempt,
              inputs: safeInputs,
              outputs: safeOutputs,
              finishedAt,
              nodeType: node.type,
              error: status === 'failed' ? (nextOutputs['message'] as string) : null,
            }).catch(() => {}),
          repo.createRunEvent({
              runId: run.id,
              level: status === 'failed' ? 'error' : 'info',
              message: status === 'cached' ? 'Node reused cached outputs.' : `Node finished with status: ${status}.`,
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
              },
            }).catch(() => {}),
        ]);

        emitNodeLifecycleSystemEvent({
          event: 'node.finished',
          level: status === 'failed' ? 'error' : 'info',
          node,
          spanId: nodeSpanId,
          iteration,
          attempt,
          status,
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
      } catch (error: unknown) {
        logClientError(error);
        reportAiPathsError(error, { nodeId: node.id, action: 'onNodeFinish' });
      }
};
