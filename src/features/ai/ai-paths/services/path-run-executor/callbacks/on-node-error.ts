import { type RuntimeNodeErrorEvent } from '@/shared/contracts/ai-paths-runtime';
import { type CallbackCtx } from '../callbacks';
import { cloneJsonSafe } from '@/shared/lib/ai-paths/core/utils';
import { type RuntimePortValues } from '@/shared/contracts/ai-paths';
import { hashRuntimeValue } from '@/features/ai/ai-paths/services/path-run-executor.helpers';

export const onNodeError = async (
    ctx: CallbackCtx,
    event: RuntimeNodeErrorEvent
): Promise<void> => {
    const { node, nodeInputs, iteration, attempt, spanId: nodeSpanId, error, runtimeStrategy, runtimeResolutionSource, runtimeCodeObjectId } = event;
    const { run, repo, traceId, profiling, upsertRuntimeTraceSpan, syncRuntimeTraceMeta, publishNodeUpdate, accInputs, accOutputs, nodeStartedAtBySpanId, resumeByNodeId, setRuntimeNodeStatus, throttledSaveIntermediateState, emitNodeLifecycleSystemEvent, reportAiPathsError, logClientError, recordRuntimeNodeStatus, resolveDurationMs, resolveResume, toResumeRunEventMetadata, toRunEventRuntimeKernelMetadata, appendRuntimeHistoryEntry } = ctx;

    try {
        const finishedAt = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error');
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
          error: { message: errorMessage },
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
          ...toResumeRunEventMetadata(resume),
          durationMs: durationMs ?? 0,
          runtimeStrategy: runtimeStrategy as any,
          runtimeResolutionSource: runtimeResolutionSource as any,
          runtimeCodeObjectId: (runtimeCodeObjectId as string) ?? null,
        });

        await Promise.all([
          repo.upsertRunNode(run.id, node.id, {
              status: 'failed',
              attempt,
              outputs: safeOutputs,
              finishedAt,
              nodeType: node.type,
              error: errorMessage,
            }).catch(() => {}),
          repo.createRunEvent({
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
            }).catch(() => {}),
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
        void recordRuntimeNodeStatus({ runId: run.id, nodeId: node.id, status: 'failed' }).catch(() => {});
      } catch (callbackError: unknown) {
        logClientError(callbackError);
        reportAiPathsError(callbackError, { nodeId: node.id, action: 'onNodeError' });
      }
};
