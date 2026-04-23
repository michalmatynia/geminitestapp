import { type CallbackCtx } from '../callbacks';
import { type AiNode, type RuntimePortValues, type RuntimeTraceResume, type RuntimeHistoryEntry } from '@/shared/contracts/ai-paths';
import { cloneJsonSafe } from '@/shared/lib/ai-paths/core/utils';
import { hashRuntimeValue } from '@/features/ai/ai-paths/services/path-run-executor.helpers';

export interface RecordNodeReuseInput {
    node: AiNode;
    spanId: string;
    iteration: number;
    attempt: number;
    nodeInputs: RuntimePortValues;
    nodeOutputs: RuntimePortValues;
    resume: RuntimeTraceResume;
    sourceHistory?: RuntimeHistoryEntry | null;
}

export const recordNodeReuse = async (
    ctx: CallbackCtx,
    input: RecordNodeReuseInput
): Promise<void> => {
    const { node, spanId, iteration, attempt, nodeInputs, nodeOutputs, resume, sourceHistory } = input;
    const { run, repo, traceId, profiling, upsertRuntimeTraceSpan, syncRuntimeTraceMeta, publishNodeUpdate, accInputs, accOutputs, setRuntimeNodeStatus, throttledSaveIntermediateState, emitNodeLifecycleSystemEvent, reportAiPathsError, logClientError, recordRuntimeNodeStatus, buildRuntimeTraceEffect, appendRuntimeHistoryEntry, toResumeRunEventMetadata } = ctx;

    try {
        const startedAt = new Date().toISOString();
        const finishedAt = startedAt;
        const safeInputs = cloneJsonSafe(nodeInputs) as RuntimePortValues;
        const safeOutputs = cloneJsonSafe(nodeOutputs) as RuntimePortValues;
        const effectSourceSpanId = resume.sourceSpanId ?? sourceHistory?.effectSourceSpanId ?? sourceHistory?.spanId ?? null;

        profiling.beginRuntimeNodeSpan({
          spanId,
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          iteration,
          attempt,
          startedAt,
        });
        profiling.finalizeRuntimeNodeSpan({
          spanId,
          status: 'cached',
          finishedAt,
        });

        upsertRuntimeTraceSpan(spanId, {
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          iteration,
          attempt,
          startedAt,
          finishedAt,
          status: 'cached',
          inputHash: hashRuntimeValue(safeInputs ?? nodeInputs),
          activationHash: sourceHistory?.activationHash ?? undefined,
          cache: { decision: 'seed' },
          effect: buildRuntimeTraceEffect({
            nodeType: node.type,
            sideEffectPolicy: sourceHistory?.sideEffectPolicy,
            effectSourceSpanId,
          }),
          resume,
        });

        syncRuntimeTraceMeta();
        accInputs[node.id] = safeInputs;
        accOutputs[node.id] = { ...accOutputs[node.id], ...safeOutputs }; // simplified merge

        setRuntimeNodeStatus?.(node.id, 'cached');
        appendRuntimeHistoryEntry?.(node.id, {
          timestamp: finishedAt,
          pathId: run.pathId ?? null,
          pathName: run.pathName ?? null,
          traceId,
          spanId,
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: 'cached',
          iteration,
          attempt,
          inputs: safeInputs,
          outputs: safeOutputs,
          inputHash: hashRuntimeValue(safeInputs ?? nodeInputs),
          cacheDecision: 'seed',
          sideEffectPolicy: sourceHistory?.sideEffectPolicy,
          sideEffectDecision: sourceHistory?.sideEffectDecision,
          activationHash: sourceHistory?.activationHash ?? null,
          idempotencyKey: sourceHistory?.idempotencyKey ?? null,
          effectSourceSpanId,
          ...toResumeRunEventMetadata(resume),
          durationMs: 0,
          runtimeStrategy: sourceHistory?.runtimeStrategy as any,
          runtimeResolutionSource: sourceHistory?.runtimeResolutionSource as any,
          runtimeCodeObjectId: (sourceHistory?.runtimeCodeObjectId as string) ?? null,
        });

        publishNodeUpdate({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: 'cached',
          attempt,
          traceId,
          spanId,
          iteration,
          inputs: safeInputs,
          outputs: safeOutputs,
          startedAt,
          finishedAt,
          updatedAt: finishedAt,
          errorMessage: null,
        });

        await Promise.all([
          repo.upsertRunNode(run.id, node.id, {
              status: 'cached',
              attempt,
              inputs: safeInputs,
              outputs: safeOutputs,
              startedAt,
              finishedAt,
              nodeType: node.type,
              error: null,
            }).catch(() => {}),
          repo.createRunEvent({
              runId: run.id,
              level: 'info',
              message: `Node ${node.title ?? node.id} reused seeded outputs during ${resume.mode}.`,
              metadata: {
                traceId,
                spanId,
                nodeId: node.id,
                nodeType: node.type,
                iteration,
                attempt,
                cached: true,
                cacheDecision: 'seed',
                sideEffectPolicy: sourceHistory?.sideEffectPolicy ?? null,
                effectSourceSpanId,
                activationHash: sourceHistory?.activationHash ?? null,
                durationMs: 0,
                ...toResumeRunEventMetadata(resume),
              },
            }).catch(() => {}),
        ]);

        emitNodeLifecycleSystemEvent({
          event: 'node.reused_seeded',
          level: 'info',
          node,
          spanId,
          iteration,
          attempt,
          status: 'cached',
          startedAt,
          finishedAt,
          durationMs: 0,
          cached: true,
          cacheDecision: 'seed',
          sideEffectPolicy: sourceHistory?.sideEffectPolicy,
          sideEffectDecision: sourceHistory?.sideEffectDecision,
          activationHash: sourceHistory?.activationHash ?? null,
          idempotencyKey: sourceHistory?.idempotencyKey ?? null,
          effectSourceSpanId,
          resume,
          runtimeStrategy: sourceHistory?.runtimeStrategy,
          runtimeResolutionSource: sourceHistory?.runtimeResolutionSource,
          runtimeCodeObjectId: sourceHistory?.runtimeCodeObjectId ?? null,
        });
            
        void throttledSaveIntermediateState();
        void recordRuntimeNodeStatus({ runId: run.id, nodeId: node.id, status: 'cached' }).catch(() => {});
      } catch (error: unknown) {
        logClientError(error);
        reportAiPathsError(error, { nodeId: node.id, action: 'recordNodeReuse' });
      }
};
