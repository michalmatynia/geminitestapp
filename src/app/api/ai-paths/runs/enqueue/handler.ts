import { type NextRequest, NextResponse } from 'next/server';

import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryResolutionBundles,
} from '@/features/ai/ai-context-registry/context/page-context-shared';
import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import {
  enforceAiPathsRunRateLimit,
  enqueuePathRun,
  getAiPathsSetting,
  requireAiPathsRunAccess,
} from '@/features/ai/ai-paths/server';
import { ensureCanonicalStarterWorkflowSettingsForPathIds } from '@/features/ai/ai-paths/server/settings-store';
import { assertAiPathRunQueueReadyForEnqueue } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import {
  aiPathRunEnqueueRequestSchema,
  aiPathRunRecordSchema,
  type AiNode,
  type Edge,
  type PathConfig,
} from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, internalError, serviceUnavailableError } from '@/shared/errors/app-error';
import { sanitizeEdges, stableStringify, validateCanonicalPathNodeIdentities } from '@/shared/lib/ai-paths/core/utils';
import { evaluateAiPathsValidationPreflight, normalizeAiPathsValidationConfig } from '@/shared/lib/ai-paths/core/validation-engine';
import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import { PATH_CONFIG_PREFIX } from '@/shared/lib/ai-paths/core/constants';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import { loadCanonicalStoredPathConfig } from '@/shared/lib/ai-paths/core/utils/stored-path-config';
import {
  findRemovedLegacyTriggerContextModes,
  formatRemovedLegacyTriggerContextModesMessage,
} from '@/shared/lib/ai-paths/core/utils/legacy-trigger-context-mode';
import { resolvePathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { buildPathRunPayload, logEnqueueTiming, resolveMetaRecord, runCompileGraphSync, type ContextBundle } from './handler.helpers';

const QUEUE_PREFLIGHT_TIMEOUT_MS = Number.parseInt(
  process.env['AI_PATHS_ENQUEUE_QUEUE_PREFLIGHT_TIMEOUT_MS'] ?? '10000',
  10
);

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  let tId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_resolve, reject) => {
        tId = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (tId) {
      clearTimeout(tId);
    }
  }
};

const loadStoredPathConfig = async (pathId: string): Promise<PathConfig> => {
  await ensureCanonicalStarterWorkflowSettingsForPathIds([pathId]);
  const raw = await getAiPathsSetting(`${PATH_CONFIG_PREFIX}${pathId}`);
  if (typeof raw !== 'string' || raw === '') throw badRequestError(`Stored AI Path config not found for "${pathId}".`);

  try {
    return loadCanonicalStoredPathConfig({ pathId, rawConfig: raw });
  } catch (error) {
    if (error instanceof Error && /non-canonical persisted values/i.test(error.message)) {
      throw badRequestError(`Stored AI Path "${pathId}" contains non-canonical persisted values. Repair or restore it explicitly before running it.`);
    }
    throw error;
  }
};

type EnqueueContext = {
  timings: Record<string, number>;
  withTiming: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
};

async function resolveGraphInput(
  options: { pathId: string; pathName?: string; nodes?: AiNode[]; edges?: Edge[] },
  ctx: EnqueueContext
): Promise<{ resolvedPathName: string; resolvedNodes: AiNode[]; resolvedEdges: Edge[]; graphSource: 'payload' | 'settings' }> {
  const { pathId, pathName, nodes, edges } = options;
  if (Array.isArray(nodes) && Array.isArray(edges)) {
    return {
      resolvedPathName: (typeof pathName === 'string' && pathName !== '') ? pathName : pathId,
      resolvedNodes: nodes,
      resolvedEdges: edges,
      graphSource: 'payload',
    };
  }

  const cfg = await ctx.withTiming('loadStoredPathMs', () => loadStoredPathConfig(pathId));
  return {
    resolvedPathName: (typeof cfg.name === 'string' && cfg.name !== '') ? cfg.name : pathId,
    resolvedNodes: cfg.nodes,
    resolvedEdges: cfg.edges,
    graphSource: 'settings',
  };
}

async function checkQueueReadiness(ctx: EnqueueContext): Promise<void> {
  try {
    await ctx.withTiming('queueReadyMs', async () => {
      await withTimeout(assertAiPathRunQueueReadyForEnqueue(), QUEUE_PREFLIGHT_TIMEOUT_MS, `queue_preflight_timeout after ${QUEUE_PREFLIGHT_TIMEOUT_MS}ms`);
    });
  } catch (error) {
    await ErrorSystem.captureException(error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('queue_preflight_timeout')) {
      throw serviceUnavailableError('AI Paths queue readiness check timed out (queue_preflight_timeout). Please retry.', 3_000, { code: 'queue_preflight_timeout' });
    }
    throw error;
  }
}

async function resolveContextRegistry(data: any, ctx: EnqueueContext): Promise<ContextBundle> {
  const refs = data.contextRegistry?.refs;
  const hasRefs = Array.isArray(refs) && refs.length > 0;
  const bundle = hasRefs
    ? await ctx.withTiming('contextRegistryMs', () => contextRegistryEngine.resolveRefs({ refs, maxNodes: 24, depth: 1 }))
    : null;

  return buildContextRegistryConsumerEnvelope({
    refs,
    resolved: mergeContextRegistryResolutionBundles(bundle, data.contextRegistry?.resolved ?? null),
  }) as ContextBundle;
}

function validateGraph(options: { pathId: string; pathName: string; nodes: AiNode[]; edges: Edge[]; triggerEvent?: string }): { normalizedNodes: AiNode[]; normalizedEdges: Edge[] } {
  const { pathId, pathName, nodes, edges, triggerEvent } = options;
  const removedModes = findRemovedLegacyTriggerContextModes(nodes);
  if (removedModes.length > 0) throw badRequestError(formatRemovedLegacyTriggerContextModesMessage(removedModes, { surface: 'run graph' }));

  const normalizedNodes = normalizeNodes(nodes);
  const trigger = (typeof triggerEvent === 'string' && triggerEvent !== '') ? triggerEvent : 'manual';
  const identityIssues = validateCanonicalPathNodeIdentities({ id: pathId, version: 1, name: pathName, description: '', trigger, nodes: normalizedNodes, edges, updatedAt: new Date().toISOString() }, { palette });
  if (identityIssues.length > 0) throw badRequestError('AI Paths run graph contains unsupported node identities.');

  const normalizedEdges = sanitizeEdges(normalizedNodes, edges);
  if (stableStringify(normalizedEdges) !== stableStringify(edges)) throw badRequestError('AI Paths run graph contains invalid or non-canonical edges.');

  return { normalizedNodes, normalizedEdges };
}

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const timings: Record<string, number> = {};
  const withTiming = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    const res = await fn();
    timings[label] = performance.now() - start;
    return res;
  };

  const access = await withTiming('accessMs', requireAiPathsRunAccess);
  await withTiming('rateLimitMs', () => enforceAiPathsRunRateLimit(access));
  const parsed = await withTiming('parseBodyMs', () => parseJsonBody(req, aiPathRunEnqueueRequestSchema, { logPrefix: 'ai-paths.runs.enqueue' }));
  if (!parsed.ok) return parsed.response;

  const { nodes, edges, ...rest } = parsed.data;
  const metaRecord = resolveMetaRecord(rest.meta);
  if (Object.prototype.hasOwnProperty.call(metaRecord, 'source') && typeof metaRecord['source'] !== 'string') {
    throw badRequestError('meta.source must be a string');
  }

  const contextRegistry = await resolveContextRegistry(parsed.data, { timings, withTiming });
  const { resolvedPathName, resolvedNodes, resolvedEdges, graphSource } = await resolveGraphInput({ pathId: rest.pathId, pathName: rest.pathName, nodes, edges }, { timings, withTiming });
  const { normalizedNodes, normalizedEdges } = validateGraph({ pathId: rest.pathId, pathName: resolvedPathName, nodes: resolvedNodes, edges: resolvedEdges, triggerEvent: rest.triggerEvent });

  const validationState = normalizeAiPathsValidationConfig(metaRecord['aiPathsValidation'] as Record<string, unknown> | undefined);
  const report = evaluateAiPathsValidationPreflight({ nodes: normalizedNodes, edges: normalizedEdges, config: validationState });

  if (validationState.enabled !== false && report.blocked) {
    const finding = report.findings[0];
    const detail = (typeof finding?.message === 'string' && finding.message.trim() !== '')
      ? finding.message.trim()
      : (typeof finding?.ruleTitle === 'string' && finding.ruleTitle.trim() !== '')
        ? finding.ruleTitle.trim()
        : null;
    throw badRequestError(detail !== null ? `Validation blocked run: ${detail}` : `Validation blocked run: score ${report.score} below threshold ${report.blockThreshold}.`);
  }

  const compileReport = runCompileGraphSync({ nodes: normalizedNodes, edges: normalizedEdges, triggerNodeId: rest.triggerNodeId, isNodeValidationEnabled: validationState.enabled !== false });
  if (validationState.enabled !== false && !compileReport.ok) {
    const err = compileReport.findings.find((f) => f.severity === 'error')?.message;
    throw badRequestError(typeof err === 'string' && err !== '' ? `Graph compile failed: ${err}` : `Graph compile failed with ${compileReport.errors} blocking issue(s).`);
  }

  await checkQueueReadiness({ timings, withTiming });

  const normalizedMeta = { ...metaRecord, contextRegistry, aiPathsValidation: validationState, validationPreflight: report, graphCompile: { errors: compileReport.errors, warnings: compileReport.warnings, findings: compileReport.findings, compiledAt: new Date().toISOString() } };
  const run = await withTiming('enqueueServiceMs', () => enqueuePathRun(buildPathRunPayload({ access, data: parsed.data, nodes: normalizedNodes, edges: normalizedEdges, meta: normalizedMeta, pathName: resolvedPathName })));

  const parsedRun = aiPathRunRecordSchema.strict().safeParse(run);
  if (!parsedRun.success) throw internalError('AI Paths enqueue service returned a non-canonical run payload.', { source: 'ai-paths.runs.enqueue', pathId: rest.pathId, issues: parsedRun.error.issues });

  await logEnqueueTiming({ timings, pathId: rest.pathId, nodeCount: normalizedNodes.length, edgeCount: normalizedEdges.length, graphSource, contextRegistry, req, triggerContext: rest.triggerContext });
  const repoSelection = await withTiming('resolveRunRepoMs', resolvePathRunRepository);

  return NextResponse.json({ run: parsedRun.data }, {
    headers: { 'X-Ai-Paths-Run-Provider': repoSelection.provider, 'X-Ai-Paths-Run-Route-Mode': repoSelection.routeMode },
  });
}
