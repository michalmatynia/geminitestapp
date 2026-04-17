import { type NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';

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
import { compileGraph, sanitizeEdges, stableStringify, validateCanonicalPathNodeIdentities } from '@/shared/lib/ai-paths/core/utils';
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
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

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
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (typeof timeoutId !== 'undefined' && timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
};

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const loadStoredPathConfig = async (pathId: string): Promise<PathConfig> => {
  const configKey = `${PATH_CONFIG_PREFIX}${pathId}`;
  const raw = await getAiPathsSetting(configKey);
  if (typeof raw !== 'string' || raw === '') {
    throw badRequestError(`Stored AI Path config not found for "${pathId}".`);
  }

  try {
    return loadCanonicalStoredPathConfig({
      pathId,
      rawConfig: raw,
    });
  } catch (error) {
    if (error instanceof Error && /non-canonical persisted values/i.test(error.message)) {
      throw badRequestError(
        `Stored AI Path "${pathId}" contains non-canonical persisted values. Repair or restore it explicitly before running it.`
      );
    }
    throw error;
  }
};

type EnqueueContext = {
  timings: Record<string, number>;
  withTiming: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
};

type GraphInputOptions = {
  pathId: string;
  pathName?: string;
  nodes?: AiNode[];
  edges?: Edge[];
};

async function resolveGraphInput(
  options: GraphInputOptions,
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

  const storedConfig = await ctx.withTiming('loadStoredPathMs', () => loadStoredPathConfig(pathId));
  const resolvedName = (typeof storedConfig.name === 'string' && storedConfig.name !== '') ? storedConfig.name : pathId;
  return {
    resolvedPathName: resolvedName,
    resolvedNodes: storedConfig.nodes,
    resolvedEdges: storedConfig.edges,
    graphSource: 'settings',
  };
}

async function checkQueueReadiness(ctx: EnqueueContext): Promise<void> {
  try {
    await ctx.withTiming('queueReadyMs', async () => {
      await withTimeout(
        assertAiPathRunQueueReadyForEnqueue(),
        QUEUE_PREFLIGHT_TIMEOUT_MS,
        `queue_preflight_timeout after ${QUEUE_PREFLIGHT_TIMEOUT_MS}ms`
      );
    });
  } catch (error) {
    await ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('queue_preflight_timeout')) {
      throw serviceUnavailableError(
        'AI Paths queue readiness check timed out (queue_preflight_timeout). Please retry.',
        3_000,
        { code: 'queue_preflight_timeout' }
      );
    }
    throw error;
  }
}

type ContextBundle = ReturnType<typeof buildContextRegistryConsumerEnvelope>;

async function resolveContextRegistry(data: z.infer<typeof aiPathRunEnqueueRequestSchema>, ctx: EnqueueContext): Promise<ContextBundle> {
  const refs = data.contextRegistry?.refs;
  const hasRefs = Array.isArray(refs) && refs.length > 0;
  const resolvedBundle = hasRefs
    ? await ctx.withTiming('contextRegistryMs', () => contextRegistryEngine.resolveRefs({
      refs,
      maxNodes: 24,
      depth: 1,
    }))
    : null;

  return buildContextRegistryConsumerEnvelope({
    refs,
    resolved: mergeContextRegistryResolutionBundles(
      resolvedBundle,
      data.contextRegistry?.resolved ?? null
    ),
  });
}

type GraphValidationOptions = {
  pathId: string;
  pathName: string;
  nodes: AiNode[];
  edges: Edge[];
  triggerEvent?: string;
};

function validateAndCompileGraph(options: GraphValidationOptions): { normalizedNodes: AiNode[]; normalizedEdges: Edge[] } {
  const { pathId, pathName, nodes, edges, triggerEvent } = options;
  const removedModes = findRemovedLegacyTriggerContextModes(nodes);
  if (removedModes.length > 0) {
    throw badRequestError(formatRemovedLegacyTriggerContextModesMessage(removedModes, { surface: 'run graph' }));
  }

  const normalizedNodes = normalizeNodes(nodes);
  const updatedAt = new Date().toISOString();
  const trigger = (typeof triggerEvent === 'string' && triggerEvent !== '') ? triggerEvent : 'manual';
  const identityIssues = validateCanonicalPathNodeIdentities({ id: pathId, version: 1, name: pathName, description: '', trigger, nodes: normalizedNodes, edges, updatedAt }, { palette });
  if (identityIssues.length > 0) throw badRequestError('AI Paths run graph contains unsupported node identities.');

  const normalizedEdges = sanitizeEdges(normalizedNodes, edges);
  if (stableStringify(normalizedEdges) !== stableStringify(edges)) throw badRequestError('AI Paths run graph contains invalid or non-canonical edges.');

  return { normalizedNodes, normalizedEdges };
}

type EnqueueTimingData = {
  timings: Record<string, number>;
  pathId: string;
  nodeCount: number;
  edgeCount: number;
  graphSource: string;
  contextRegistry: ContextBundle;
  req: NextRequest;
  triggerContext: unknown;
};

type TimingContext = {
  pathId: string;
  nodeCount: number;
  edgeCount: number;
  graphSource: string;
  accessMs: number;
  rateLimitMs: number;
  parseBodyMs: number;
  loadStoredPathMs: number;
  compileMs: number;
  contextRegistryMs: number;
  queueReadyMs: number;
  enqueueServiceMs: number;
  contextRegistryRefCount: number;
  contextRegistryDocumentCount: number;
  requestContentLength?: number;
  triggerContextHasEntityJson: boolean;
  triggerContextHasEntity: boolean;
  triggerContextHasProduct: boolean;
};

function buildTimingContext(data: EnqueueTimingData): TimingContext {
  const { timings, pathId, nodeCount, edgeCount, graphSource, contextRegistry, req, triggerContext } = data;
  const contentLengthValue = req.headers.get('content-length');
  const contentLength = typeof contentLengthValue === 'string' ? Number.parseInt(contentLengthValue, 10) : NaN;
  const trContext = (triggerContext !== null && typeof triggerContext === 'object' && !Array.isArray(triggerContext)) ? (triggerContext as Record<string, unknown>) : null;

  return {
    pathId, nodeCount, edgeCount, graphSource,
    accessMs: Math.round(timings['accessMs'] ?? 0),
    rateLimitMs: Math.round(timings['rateLimitMs'] ?? 0),
    parseBodyMs: Math.round(timings['parseBodyMs'] ?? 0),
    loadStoredPathMs: Math.round(timings['loadStoredPathMs'] ?? 0),
    compileMs: Math.round(timings['compileMs'] ?? 0),
    contextRegistryMs: Math.round(timings['contextRegistryMs'] ?? 0),
    queueReadyMs: Math.round(timings['queueReadyMs'] ?? 0),
    enqueueServiceMs: Math.round(timings['enqueueServiceMs'] ?? 0),
    contextRegistryRefCount: contextRegistry.refs?.length ?? 0,
    contextRegistryDocumentCount: contextRegistry.resolved?.documents.length ?? 0,
    ...(Number.isFinite(contentLength) ? { requestContentLength: contentLength } : {}),
    triggerContextHasEntityJson: trContext !== null && hasOwn(trContext, 'entityJson'),
    triggerContextHasEntity: trContext !== null && hasOwn(trContext, 'entity'),
    triggerContextHasProduct: trContext !== null && hasOwn(trContext, 'product'),
  };
}

async function logEnqueueTiming(data: EnqueueTimingData): Promise<void> {
  await logSystemEvent({
    level: 'info',
    source: 'ai-paths.runs.enqueue',
    message: '[ai-paths.runs.enqueue] timing',
    context: buildTimingContext(data),
  });
}

function resolveMetaRecord(meta: unknown): Record<string, unknown> {
  if (meta !== null && typeof meta === 'object' && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

type PathRunPayloadOptions = {
  access: Awaited<ReturnType<typeof requireAiPathsRunAccess>>;
  data: z.infer<typeof aiPathRunEnqueueRequestSchema>;
  nodes: AiNode[];
  edges: Edge[];
  meta: Record<string, unknown>;
  pathName: string;
};

function buildPathRunPayload(options: PathRunPayloadOptions): Parameters<typeof enqueuePathRun>[0] {
  const { access, data, nodes, edges, meta, pathName } = options;
  return {
    userId: access.userId, pathId: data.pathId, pathName, nodes, edges,
    triggerEvent: data.triggerEvent, triggerNodeId: data.triggerNodeId, triggerContext: data.triggerContext ?? null,
    entityId: data.entityId ?? null, entityType: data.entityType ?? null, maxAttempts: data.maxAttempts,
    backoffMs: data.backoffMs, backoffMaxMs: data.backoffMaxMs, requestId: data.requestId,
    meta,
  };
}

type CompileOptions = {
  nodes: AiNode[];
  edges: Edge[];
  triggerNodeId?: string;
  isNodeValidationEnabled: boolean;
};

function runCompileGraphSync(options: CompileOptions): ReturnType<typeof compileGraph> {
  const { nodes, edges, triggerNodeId, isNodeValidationEnabled } = options;
  if (isNodeValidationEnabled) return compileGraph(nodes, edges);
  const triggerId = (typeof triggerNodeId === 'string' && triggerNodeId !== '') ? triggerNodeId : undefined;
  const compileOptions = triggerId ? { scopeRootNodeIds: [triggerId] } : {};
  return compileGraph(nodes, edges, { scopeMode: 'reachable_from_roots', ...compileOptions });
}

export async function postEnqueueHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
  const contextRegistry = await resolveContextRegistry(parsed.data, { timings, withTiming });
  const { resolvedPathName, resolvedNodes, resolvedEdges, graphSource } = await resolveGraphInput({ pathId: rest.pathId, pathName: rest.pathName, nodes, edges }, { timings, withTiming });
  const { normalizedNodes, normalizedEdges } = validateAndCompileGraph({ pathId: rest.pathId, pathName: resolvedPathName, nodes: resolvedNodes, edges: resolvedEdges, triggerEvent: rest.triggerEvent });

  const metaRecord = resolveMetaRecord(rest.meta);
  const validationState = normalizeAiPathsValidationConfig(metaRecord['aiPathsValidation'] as Record<string, unknown> | undefined);
  const validationReport = evaluateAiPathsValidationPreflight({ nodes: normalizedNodes, edges: normalizedEdges, config: validationState });

  if (validationState.enabled !== false && validationReport.blocked) {
    const title = validationReport.findings[0]?.ruleTitle;
    throw badRequestError((typeof title === 'string' && title !== '') ? `Validation blocked run: ${title}.` : `Validation blocked run: score ${validationReport.score} below threshold ${validationReport.blockThreshold}.`);
  }

  const compileReport = await withTiming('compileMs', async () => runCompileGraphSync({ nodes: normalizedNodes, edges: normalizedEdges, triggerNodeId: rest.triggerNodeId, isNodeValidationEnabled: validationState.enabled !== false }));

  if (validationState.enabled !== false && !compileReport.ok) {
    const err = compileReport.findings.find((f) => f.severity === 'error')?.message;
    throw badRequestError((typeof err === 'string' && err !== '') ? `Graph compile failed: ${err}` : `Graph compile failed with ${compileReport.errors} blocking issue(s).`);
  }

  await checkQueueReadiness({ timings, withTiming });

  const normalizedMeta = { ...metaRecord, contextRegistry, aiPathsValidation: validationState, validationPreflight: validationReport, graphCompile: { errors: compileReport.errors, warnings: compileReport.warnings, findings: compileReport.findings, compiledAt: new Date().toISOString() } };
  const run = await withTiming('enqueueServiceMs', () => enqueuePathRun(buildPathRunPayload({ access, data: parsed.data, nodes: normalizedNodes, edges: normalizedEdges, meta: normalizedMeta, pathName: resolvedPathName })));

  const parsedRun = aiPathRunRecordSchema.strict().safeParse(run);
  if (!parsedRun.success) throw internalError('AI Paths enqueue service returned a non-canonical run payload.', { source: 'ai-paths.runs.enqueue', pathId: rest.pathId, issues: parsedRun.error.issues });

  await logEnqueueTiming({ timings, pathId: rest.pathId, nodeCount: normalizedNodes.length, edgeCount: normalizedEdges.length, graphSource, contextRegistry, req, triggerContext: rest.triggerContext });
  const repoSelection = await withTiming('resolveRunRepoMs', resolvePathRunRepository);

  return NextResponse.json({ run: parsedRun.data }, {
    headers: { 'X-Ai-Paths-Run-Provider': repoSelection.provider, 'X-Ai-Paths-Run-Route-Mode': repoSelection.routeMode },
  });
}
