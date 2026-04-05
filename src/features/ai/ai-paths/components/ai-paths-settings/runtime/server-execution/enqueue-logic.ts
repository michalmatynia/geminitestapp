import { enqueueAiPathRun, resolveAiPathRunFromEnqueueResponseData } from '@/shared/lib/ai-paths';
import type { AiPathRunRecord } from '@/shared/lib/ai-paths';
import { normalizeRuntimeKernelConfigRecord } from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';
import { recoverEnqueuedRunByRequestId } from '@/shared/lib/ai-paths/hooks/trigger-event-recovery';
import {
  createAiPathTriggerRequestId,
  isRecoverableTriggerEnqueueError,
} from '@/shared/lib/ai-paths/hooks/trigger-event-utils';
import { isObjectRecord } from '@/shared/utils/object-utils';

import {
  collectInvalidRunEnqueuePayloadIssues,
  collectInvalidRunEnqueueSerializationIssues,
  collectInvalidRunNodePayloadIssues,
} from '../payload-validation';
import {
  readApiErrorMetadata,
  resolveEntityIdFromContext,
  resolveEntityTypeFromContext,
  SERVER_EXECUTION_ENQUEUE_TIMEOUT_MS,
} from './helpers';

import type { ServerExecutionArgs } from './types';

type EnqueuePayload = Parameters<typeof enqueueAiPathRun>[0];

export const prepareEnqueuePayload = (args: ServerExecutionArgs, triggerNodeId: string, triggerEvent: string, triggerContext: Record<string, unknown>) => {
  const entityId = resolveEntityIdFromContext(triggerContext);
  const entityType = resolveEntityTypeFromContext(triggerContext, entityId);
  const requestIdEntityType =
    entityType === 'product' || entityType === 'note' ? entityType : 'custom';
  
  const requestId = createAiPathTriggerRequestId({
    pathId: args.activePathId!,
    triggerEventId: triggerEvent,
    entityType: requestIdEntityType,
    entityId,
  });

  const nodePayloadIssues = collectInvalidRunNodePayloadIssues(args.normalizedNodes);
  if (nodePayloadIssues.length > 0) {
    return { error: 'node_payload_invalid', issues: nodePayloadIssues };
  }

  const normalizedRuntimeKernelConfig = isObjectRecord(args.runtimeKernelConfig)
    ? normalizeRuntimeKernelConfigRecord(args.runtimeKernelConfig)
    : null;
  const runtimeKernelMeta = normalizedRuntimeKernelConfig && Object.keys(normalizedRuntimeKernelConfig).length > 0
    ? { runtimeKernelConfig: normalizedRuntimeKernelConfig }
    : {};

  const enqueueMeta = {
    source: 'ai_paths_ui',
    requestId,
    triggerLabel: args.activeTrigger ?? null,
    strictFlowMode: args.strictFlowMode !== false,
    blockedRunPolicy: args.blockedRunPolicy ?? 'fail_run',
    preflightRuntimeHints: {
      ...(Object.keys(args.parserSamples ?? {}).length > 0 ? { parserSamples: args.parserSamples } : {}),
      ...(Object.keys(args.updaterSamples ?? {}).length > 0 ? { updaterSamples: args.updaterSamples } : {}),
    },
    ...runtimeKernelMeta,
    ...(args.aiPathsValidation ? { aiPathsValidation: args.aiPathsValidation } : {}),
  };

  const payload = {
    pathId: args.activePathId!,
    pathName: args.pathName,
    nodes: args.normalizedNodes,
    edges: args.sanitizedEdges,
    triggerEvent,
    triggerNodeId,
    triggerContext,
    entityId,
    entityType,
    requestId,
    meta: enqueueMeta,
  };

  const payloadIssues = collectInvalidRunEnqueuePayloadIssues(payload);
  if (payloadIssues.length > 0) {
    return { error: 'enqueue_payload_invalid', issues: payloadIssues };
  }

  const serializationIssues = collectInvalidRunEnqueueSerializationIssues(payload);
  if (serializationIssues.length > 0) {
    return { error: 'serialization_invalid', issues: serializationIssues };
  }

  return { payload, requestId, entityId, entityType };
};

export const performEnqueue = async (
  args: ServerExecutionArgs,
  payload: EnqueuePayload,
  requestId: string
) => {
  const enqueueResult = await enqueueAiPathRun(payload, {
    timeoutMs: SERVER_EXECUTION_ENQUEUE_TIMEOUT_MS,
  });

  let runId: string | null = null;
  let runRecord: AiPathRunRecord | null = null;
  let enqueueRecovered = false;

  if (!enqueueResult.ok && isRecoverableTriggerEnqueueError(enqueueResult.error)) {
    const recoveredRun = await recoverEnqueuedRunByRequestId({
      pathId: args.activePathId!,
      requestId,
    });
    if (recoveredRun) {
      runId = recoveredRun.runId;
      runRecord = recoveredRun.runRecord;
      enqueueRecovered = true;
    }
  }

  if (enqueueResult.ok && !runId) {
    const resolved = resolveAiPathRunFromEnqueueResponseData(enqueueResult.data);
    runId = resolved.runId;
    runRecord = resolved.runRecord;
  }

  if (!enqueueResult.ok && !runId) {
    return {
      error: 'enqueue_failed',
      result: enqueueResult,
      metadata: readApiErrorMetadata(enqueueResult),
    };
  }

  if (!runId) {
    const recoveredRun = await recoverEnqueuedRunByRequestId({
      pathId: args.activePathId!,
      requestId,
    });
    if (recoveredRun) {
      runId = recoveredRun.runId;
      runRecord = recoveredRun.runRecord;
      enqueueRecovered = true;
    }
  }

  return { runId, runRecord, enqueueRecovered };
};
