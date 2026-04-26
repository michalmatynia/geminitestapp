import { type EnqueueRunInput, type AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { resolvePathRunRepository } from '../path-run-enqueue-service';
import { ACTIVE_RUN_STATUS_FILTER } from '../path-run-enqueue-service';
import { validationError } from '@/shared/errors/app-error';
import { findRemovedLegacyTriggerContextModes, formatRemovedLegacyTriggerContextModesMessage, normalizeNodes, assertCanonicalRunGraph } from '../path-run-enqueue-service';
import { toRecord } from '../path-run-enqueue-service';
import { parseRuntimeState } from '@/features/ai/ai-paths/services/path-run-executor.runtime-state';
import { evaluateRunPreflight } from '@/features/ai/ai-paths/services/path-run-executor.logic';
import { toSampleStateMap } from '../path-run-enqueue-service';

export const executeEnqueue = async (
    input: EnqueueRunInput,
    requestId: string | null
): Promise<AiPathRunRecord> => {
    const repoSelection = await resolvePathRunRepository();
    const repo = repoSelection.repo;
    
    if (requestId !== null && requestId !== '') {
      const existingByRequestId = await repo.listRuns({
        ...(input.userId !== undefined && input.userId !== null ? { userId: input.userId } : {}),
        pathId: input.pathId,
        statuses: [...ACTIVE_RUN_STATUS_FILTER],
        requestId,
        limit: 1,
        offset: 0,
      });
      if (existingByRequestId.runs[0] !== undefined) {
        return existingByRequestId.runs[0];
      }
    }

    const rawNodes = input.nodes ?? [];
    const rawEdges = input.edges ?? [];
    const removedTriggerContextModes = findRemovedLegacyTriggerContextModes(rawNodes);
    if (removedTriggerContextModes.length > 0) {
      throw validationError(
        formatRemovedLegacyTriggerContextModesMessage(removedTriggerContextModes, {
          surface: 'run graph',
        }),
        {
          source: 'ai_paths.run',
          reason: 'removed_trigger_context_mode',
          pathId: input.pathId,
          removedModes: removedTriggerContextModes,
        }
      );
    }
    const nodes = normalizeNodes(rawNodes);
    const edges = assertCanonicalRunGraph({
      input,
      rawNodes,
      nodes,
      edges: rawEdges,
    });
    
    const meta = (input.meta as Record<string, unknown> | null) ?? {};
    const validationConfig = (meta['aiPathsValidation'] as Record<string, unknown>) ?? {};
    const strictFlowMode = (meta['strictFlowMode'] as boolean | undefined) !== false;
    const preflightHints = toRecord(meta['preflightRuntimeHints']);
    const preflightRuntimeState = preflightHints ? parseRuntimeState(preflightHints['runtimeState']) : undefined;
    
    const parserSamples = toSampleStateMap(preflightHints?.['parserSamples']);
    const updaterSamples = toSampleStateMap(preflightHints?.['updaterSamples']);
    
    const runPreflight = evaluateRunPreflight({
      nodes,
      edges,
      aiPathsValidation: validationConfig,
      runtimeState: preflightRuntimeState,
      parserSamples,
      updaterSamples,
      strictFlowMode,
    });

    const run = await repo.createRun({
        userId: input.userId ?? null,
        pathId: input.pathId,
        pathName: input.pathName ?? null,
        status: 'queued',
        graph: { nodes, edges },
        meta: {
            ...meta,
            preflight: runPreflight,
        },
        entityId: input.entityId ?? null,
        entityType: input.entityType ?? null,
        triggerEvent: input.triggerEvent ?? null,
        triggerNodeId: input.triggerNodeId ?? null,
        triggerContext: input.triggerContext ?? null,
        retryCount: 0,
    });
    
    return run;
};
