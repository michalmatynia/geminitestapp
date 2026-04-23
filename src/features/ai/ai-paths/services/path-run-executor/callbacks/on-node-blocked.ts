import { type RuntimeNodeBlockedEvent } from '@/shared/contracts/ai-paths-runtime';
import { type CallbackCtx } from '../callbacks';
import { type RuntimePortValues } from '@/shared/contracts/ai-paths';

export const onNodeBlocked = async (
    ctx: CallbackCtx,
    event: RuntimeNodeBlockedEvent
): Promise<void> => {
    const { node, iteration, attempt, spanId: nodeSpanId, reason, message, status, waitingOnPorts, waitingOnDetails, runtimeStrategy, runtimeResolutionSource, runtimeCodeObjectId } = event;
    const { run, repo, traceId, resolveResume, nodeStartedAtBySpanId, resolveDurationMs, resolveRuntimeTraceSpanStatus, upsertRuntimeTraceSpan, syncRuntimeTraceMeta, accOutputs, mergeNodeOutputsForStatus, publishNodeUpdate, setRuntimeNodeStatus, appendRuntimeHistoryEntry, toResumeRunEventMetadata, reportAiPathsError, logClientError } = ctx;

    try {
        const finishedAt = new Date().toISOString();
        const runtimeStatus = status === 'waiting_callback' ? 'waiting_callback' : 'blocked';
        const traceStatus = resolveRuntimeTraceSpanStatus(runtimeStatus);
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
              ? { message }
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
          ...toResumeRunEventMetadata(resolveResume(node.id)),
          durationMs: durationMs ?? 0,
          runtimeStrategy: runtimeStrategy as any,
          runtimeResolutionSource: runtimeResolutionSource as any,
          runtimeCodeObjectId: (runtimeCodeObjectId as string) ?? null,
        });
        
    } catch (error: unknown) {
        logClientError(error);
        reportAiPathsError(error, { nodeId: node.id, action: 'onNodeBlocked' });
    }
};
