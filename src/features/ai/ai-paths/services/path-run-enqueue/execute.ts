import { type AiPathRunRecord, type EnqueueRunInput, type ParserSampleState, type UpdaterSampleState, type AiNode, type AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { validationError } from '@/shared/errors/app-error';
import { parseRuntimeState } from '@/features/ai/ai-paths/services/path-run-executor.runtime-state';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils';
import { resolvePathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { findExistingPathRun } from './find-existing';
import { assertCanonicalRunGraph } from './validation';
import { toRecord, toSampleStateMap } from '../../utils/record-utils';
import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import {
  findRemovedLegacyTriggerContextModes,
  formatRemovedLegacyTriggerContextModesMessage,
} from '@/shared/lib/ai-paths/core/utils/legacy-trigger-context-mode';
import { normalizeAiPathsValidationConfig } from '@/shared/lib/ai-paths/core/validation-engine';
import {
  evaluateDisabledNodeTypesPolicy,
  formatDisabledNodeTypesPolicyMessage,
} from '@/features/ai/ai-paths/services/path-run-policy';
import {
  recordRuntimeRunFinished,
  recordRuntimeRunQueued,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import {
  getAiPathsRuntimeFingerprint,
} from '@/features/ai/ai-paths/services/runtime-fingerprint';
import { buildAiPathErrorReport } from '@/shared/lib/ai-paths/error-reporting';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { dispatchRun, resolveRunStartedAt, resolveDispatchErrorMessage } from './utils';
import { buildEnqueueMeta } from './meta-builder';

const shouldLogEnqueueTimings = (timings: {
  totalMs: number;
  persistRunMs: number;
  persistNodesMs: number;
  dispatchMs: number;
}): boolean =>
  timings.totalMs >= 200 ||
  timings.persistRunMs >= 100 ||
  timings.persistNodesMs >= 100 ||
  timings.dispatchMs >= 100;

async function persistRunNodes(
  repo: AiPathRunRepository,
  run: AiPathRunRecord,
  nodes: AiNode[],
  runtimeFingerprint: string
): Promise<number> {
  const persistNodesStartedAt = performance.now();
  try {
    await repo.createRunNodes(run.id, nodes);
    return performance.now() - persistNodesStartedAt;
  } catch (setupError) {
    void ErrorSystem.captureException(setupError);
    const finishedAt = new Date();
    const message = `Run setup failed: ${
      setupError instanceof Error ? setupError.message : String(setupError)
    }`;
    const errorReport = buildAiPathErrorReport({
      error: setupError,
      code: 'AI_PATHS_ENQUEUE_SETUP_FAILED',
      category: 'runtime',
      scope: 'enqueue',
      severity: 'error',
      userMessage: message,
      timestamp: finishedAt,
      traceId: run.id,
      runId: run.id,
      retryable: false,
      metadata: {
        pathId: run.pathId,
        runtimeFingerprint,
      },
    });
    await repo.updateRunIfStatus(run.id, ['queued'], {
      status: 'failed',
      errorMessage: message,
      finishedAt: finishedAt.toISOString(),
    });
    await repo.createRunEvent({
      runId: run.id,
      level: 'error',
      message,
      metadata: {
        pathId: run.pathId,
        runStartedAt: resolveRunStartedAt(run),
        runtimeFingerprint,
        traceId: run.id,
        errorCode: errorReport.code,
        errorCategory: errorReport.category,
        errorScope: errorReport.scope,
        errorReport,
      },
    });
    await recordRuntimeRunFinished({
      runId: run.id,
      status: 'failed',
      durationMs: 0,
      timestamp: finishedAt,
    });
    throw new Error(message, { cause: setupError });
  }
}

async function handleDispatch(
  run: AiPathRunRecord,
  repo: AiPathRunRepository,
  runtimeFingerprint: string
): Promise<number> {
  const dispatchStartedAt = performance.now();
  try {
    await dispatchRun(run.id);
    return performance.now() - dispatchStartedAt;
  } catch (dispatchError) {
    void ErrorSystem.captureException(dispatchError);
    const finishedAt = new Date();
    const dispatchMessage = resolveDispatchErrorMessage(dispatchError);
    const message = `Run dispatch failed: ${dispatchMessage}`;
    const errorReport = buildAiPathErrorReport({
      error: dispatchError,
      code: 'AI_PATHS_ENQUEUE_DISPATCH_FAILED',
      category: 'runtime',
      scope: 'enqueue',
      severity: 'error',
      userMessage: message,
      timestamp: finishedAt,
      traceId: run.id,
      runId: run.id,
      retryable: true,
      metadata: {
        pathId: run.pathId,
        runtimeFingerprint,
      },
    });

    await repo.updateRunIfStatus(run.id, ['queued'], {
      status: 'failed',
      errorMessage: message,
      finishedAt: finishedAt.toISOString(),
    });
    try {
      await Promise.all([
        repo.createRunEvent({
          runId: run.id,
          level: 'error',
          message,
          metadata: {
            pathId: run.pathId,
            runStartedAt: resolveRunStartedAt(run),
            runtimeFingerprint,
            traceId: run.id,
            errorCode: errorReport.code,
            errorCategory: errorReport.category,
            errorScope: errorReport.scope,
            retryable: errorReport.retryable,
            errorReport,
          },
        }),
        recordRuntimeRunFinished({
          runId: run.id,
          status: 'failed',
          durationMs: 0,
          timestamp: finishedAt,
        }),
      ]);
    } catch (auxError) {
      void ErrorSystem.captureException(auxError);
      void ErrorSystem.logWarning(`Non-critical dispatch failure logging for run ${run.id}`, {
        service: 'ai-paths-service',
        action: 'dispatchFailureLogging',
        runId: run.id,
        error: auxError,
      });
    }

    throw new Error(message, { cause: dispatchError });
  }
}

export const executeEnqueue = async (
    input: EnqueueRunInput,
    requestId: string | null
): Promise<AiPathRunRecord> => {
    const enqueueStartedAt = performance.now();
    
    const existing = await findExistingPathRun(input, requestId);
    if (existing) {
        return existing;
    }

    const repoSelection = await resolvePathRunRepository();
    const repo = repoSelection.repo;

    const rawNodes = input.nodes;
    const rawEdges = input.edges;
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
    
    const validationConfig = normalizeAiPathsValidationConfig(
      (input.meta as Record<string, unknown> | null)?.['aiPathsValidation'] as
        | Record<string, unknown>
        | undefined
    );
    const strictFlowMode =
      ((input.meta as Record<string, unknown> | null)?.['strictFlowMode'] as
        | boolean
        | undefined) !== false;
    const preflightHints = toRecord(
      (input.meta as Record<string, unknown> | null)?.['preflightRuntimeHints']
    );
    const preflightRuntimeState = preflightHints
      ? parseRuntimeState(preflightHints['runtimeState'])
      : undefined;
    const parserSamples = toSampleStateMap<ParserSampleState>(preflightHints?.['parserSamples']);
    const updaterSamples = toSampleStateMap<UpdaterSampleState>(preflightHints?.['updaterSamples']);
    const runPreflight = evaluateRunPreflight({
      nodes,
      edges,
      aiPathsValidation: validationConfig,
      strictFlowMode,
      triggerNodeId: input.triggerNodeId ?? null,
      ...(preflightRuntimeState ? { runtimeState: preflightRuntimeState } : {}),
      ...(parserSamples ? { parserSamples } : {}),
      ...(updaterSamples ? { updaterSamples } : {}),
      mode: 'full',
    });
    if (runPreflight.shouldBlock === true) {
      throw new Error(runPreflight.blockMessage ?? 'Run blocked by preflight validation checks.');
    }
    const policyReport = evaluateDisabledNodeTypesPolicy(nodes);
    if (policyReport.violations.length > 0) {
      throw new Error(formatDisabledNodeTypesPolicyMessage(policyReport.violations));
    }
    const runtimeFingerprint = getAiPathsRuntimeFingerprint();
    const meta = buildEnqueueMeta({
      input,
      requestId,
      repoSelection,
      policyReport,
      runPreflight,
      strictFlowMode,
    });
    const persistRunStartedAt = performance.now();
    const run = await repo.createRun({
      userId: input.userId ?? null,
      pathId: input.pathId,
      pathName: input.pathName ?? null,
      triggerEvent: input.triggerEvent ?? null,
      triggerNodeId: input.triggerNodeId ?? null,
      triggerContext: input.triggerContext ?? null,
      graph: { nodes, edges },
      entityId: input.entityId ?? null,
      entityType: input.entityType ?? null,
      meta,
      maxAttempts: input.maxAttempts ?? null,
      retryCount: 0,
    });
    const persistRunMs = performance.now() - persistRunStartedAt;

    const persistNodesMs = await persistRunNodes(repo, run, nodes, runtimeFingerprint);

    try {
      await Promise.all([
        repo.createRunEvent({
          runId: run.id,
          level: 'info',
          message: 'Run queued.',
          metadata: {
            pathId: run.pathId,
            runStartedAt: resolveRunStartedAt(run),
            runtimeFingerprint,
            traceId: run.id,
          },
        }),
        recordRuntimeRunQueued({ runId: run.id }),
      ]);
    } catch (parallelError) {
      void ErrorSystem.captureException(parallelError);
      void ErrorSystem.logWarning(`Non-critical setup failure for run ${run.id}`, {
        service: 'ai-paths-service',
        error: parallelError,
        runId: run.id,
      });
    }

    const dispatchMs = await handleDispatch(run, repo, runtimeFingerprint);

    const enqueueTotalMs = performance.now() - enqueueStartedAt;
    if (
      shouldLogEnqueueTimings({
        totalMs: enqueueTotalMs,
        persistRunMs,
        persistNodesMs,
        dispatchMs,
      })
    ) {
      void logSystemEvent({
        source: 'ai.paths.enqueue',
        message: 'Path run enqueue timing',
        level: 'info',
        context: {
          pathId: input.pathId,
          runId: run.id,
          persistRunMs: Math.round(persistRunMs),
          persistNodesMs: Math.round(persistNodesMs),
          dispatchMs: Math.round(dispatchMs),
          enqueueTotalMs: Math.round(enqueueTotalMs),
        },
      });
    }
    return run;
};
