import { type RuntimeNodeStartEvent } from '@/shared/contracts/ai-paths-runtime';
import { type CallbackCtx } from '../callbacks';
import { cloneJsonSafe } from '@/shared/lib/ai-paths/core/utils';
import { type RuntimePortValues } from '@/shared/contracts/ai-paths';
import { hashRuntimeValue } from '@/features/ai/ai-paths/services/path-run-executor.helpers';

export const onNodeStart = async (
    ctx: CallbackCtx,
    event: RuntimeNodeStartEvent
): Promise<void> => {
    const { node, nodeInputs, prevOutputs, iteration, attempt, spanId: nodeSpanId, runtimeStrategy, runtimeResolutionSource, runtimeCodeObjectId } = event;
    const { run, repo, traceId, profiling, upsertRuntimeTraceSpan, syncRuntimeTraceMeta, publishNodeUpdate, accInputs, accOutputs, logNodeStartEvents, resumeByNodeId, setRuntimeNodeStatus, throttledSaveIntermediateState, emitNodeLifecycleSystemEvent, reportAiPathsError, logClientError } = ctx;

    try {
        const nodeStartedAt = new Date().toISOString();
        const resume = resumeByNodeId.get(node.id);
        
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
          cache: { decision: 'miss' },
          resume,
        });
        
        syncRuntimeTraceMeta();
        accInputs[node.id] = safeInputs;
        accOutputs[node.id] = {}; // Simplified for extraction
        
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
          repo.upsertRunNode(run.id, node.id, {
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: 'running',
              attempt,
              inputs: safeInputs,
              outputs: safePrevOutputs,
              startedAt: nodeStartedAt,
              error: null,
            }).catch(() => {}),
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
      } catch (error: unknown) {
        logClientError(error);
        reportAiPathsError(error, { nodeId: node.id, action: 'onNodeStart' });
      }
};
