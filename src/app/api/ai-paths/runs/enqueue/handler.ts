import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  compileGraph,
  evaluateAiPathsValidationPreflight,
  normalizeNodes,
  normalizeAiPathsValidationConfig,
  PATH_CONFIG_PREFIX,
  palette,
  sanitizeEdges,
  stableStringify,
  validateCanonicalPathNodeIdentities,
} from '@/shared/lib/ai-paths';
import {
  enforceAiPathsRunRateLimit,
  getAiPathsSetting,
  requireAiPathsRunAccess,
} from '@/features/ai/ai-paths/server';
import { enqueuePathRun } from '@/features/ai/ai-paths/services/path-run-service';
import { assertAiPathRunQueueReadyForEnqueue } from '@/features/jobs/server';
import { parseJsonBody } from '@/features/products/server';
import {
  aiNodeSchema,
  aiPathRunEnqueueResponseSchema,
  edgeSchema,
  pathConfigSchema,
  type AiNode,
  type Edge,
  type PathConfig,
} from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, internalError, serviceUnavailableError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { sanitizeTriggerPathConfig } from '@/shared/lib/ai-paths/core/normalization/trigger-normalization';

const enqueueSchema = z.object({
  pathId: z.string().trim().min(1),
  pathName: z.string().trim().optional(),
  nodes: z.array(aiNodeSchema).optional(),
  edges: z.array(edgeSchema).optional(),
  triggerEvent: z.string().trim().optional(),
  triggerNodeId: z.string().trim().optional(),
  triggerContext: z.record(z.string(), z.unknown()).optional().nullable(),
  entityId: z.string().trim().optional().nullable(),
  entityType: z.string().trim().optional().nullable(),
  maxAttempts: z.number().int().min(1).max(50).optional(),
  backoffMs: z.number().int().min(0).max(60_000).optional(),
  backoffMaxMs: z
    .number()
    .int()
    .min(0)
    .max(10 * 60_000)
    .optional(),
  requestId: z.string().trim().min(1).max(200).optional(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

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
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const resolveEnqueueRunId = (run: unknown): string | null => {
  if (typeof run === 'string') {
    const normalized = run.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (!run || typeof run !== 'object' || Array.isArray(run)) return null;
  const record = run as Record<string, unknown>;
  const candidates = [record['id'], record['runId'], record['_id']];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.trim();
    if (normalized.length > 0) return normalized;
  }
  return null;
};

const hasOwn = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const loadStoredPathConfig = async (pathId: string): Promise<PathConfig> => {
  const configKey = `${PATH_CONFIG_PREFIX}${pathId}`;
  const raw = await getAiPathsSetting(configKey);
  if (!raw) {
    throw badRequestError(`Stored AI Path config not found for "${pathId}".`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw badRequestError(`Stored AI Path config for "${pathId}" is invalid JSON.`);
  }

  const validation = pathConfigSchema.safeParse(parsed);
  if (!validation.success) {
    throw badRequestError(`Stored AI Path config for "${pathId}" is invalid.`);
  }
  if (validation.data.id !== pathId) {
    throw badRequestError(`Stored AI Path config id mismatch for "${pathId}".`);
  }
  return sanitizeTriggerPathConfig(validation.data);
};

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const timings: Record<string, number> = {};
  const withTiming = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const startedAt = performance.now();
    const result = await fn();
    timings[label] = performance.now() - startedAt;
    return result;
  };

  const access = await withTiming('accessMs', async () => await requireAiPathsRunAccess());
  ctx.userId = access.userId;
  await withTiming('rateLimitMs', async () => await enforceAiPathsRunRateLimit(access));
  const parsed = await withTiming('parseBodyMs', async () => {
    return await parseJsonBody(req, enqueueSchema, {
      logPrefix: 'ai-paths.runs.enqueue',
    });
  });
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;
  const { nodes, edges, ...rest } = data;
  const triggerContextRecord =
    rest.triggerContext && typeof rest.triggerContext === 'object' && !Array.isArray(rest.triggerContext)
      ? (rest.triggerContext)
      : null;
  const requestContentLength = Number.parseInt(req.headers.get('content-length') ?? '', 10);
  let resolvedPathName = rest.pathName?.trim() || rest.pathId;
  let resolvedNodesInput: AiNode[] | undefined = nodes;
  let resolvedEdgesInput: Edge[] | undefined = edges;
  let graphSource: 'payload' | 'settings' = 'payload';
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    const storedConfig = await withTiming('loadStoredPathMs', async () => {
      return await loadStoredPathConfig(rest.pathId);
    });
    resolvedPathName = storedConfig.name?.trim() || resolvedPathName;
    resolvedNodesInput = storedConfig.nodes;
    resolvedEdgesInput = storedConfig.edges;
    graphSource = 'settings';
  }
  let normalizedMeta = rest.meta ?? null;
  if (normalizedMeta && typeof normalizedMeta === 'object') {
    const sourceValue = normalizedMeta['source'];
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      throw badRequestError('Invalid enqueue metadata: meta.source must be a string.');
    }
  }
  if (!Array.isArray(resolvedNodesInput) || !Array.isArray(resolvedEdgesInput)) {
    throw badRequestError('Nodes and edges are required to enqueue a run.');
  }

  const normalizedNodes = normalizeNodes(resolvedNodesInput);
  const validationConfig: PathConfig = {
    id: rest.pathId,
    version: 1,
    name: resolvedPathName,
    description: '',
    trigger: rest.triggerEvent?.trim() || 'manual',
    nodes: normalizedNodes,
    edges: resolvedEdgesInput,
    updatedAt: new Date().toISOString(),
  };
  const identityIssues = validateCanonicalPathNodeIdentities(validationConfig, {
    palette,
  });
  if (identityIssues.length > 0) {
    throw badRequestError('AI Paths run graph contains unsupported node identities.');
  }
  const normalizedEdges = sanitizeEdges(normalizedNodes, resolvedEdgesInput);
  if (stableStringify(normalizedEdges) !== stableStringify(resolvedEdgesInput)) {
    throw badRequestError('AI Paths run graph contains invalid or non-canonical edges.');
  }
  const metaRecord = normalizedMeta && typeof normalizedMeta === 'object' ? normalizedMeta : {};
  const validationState = normalizeAiPathsValidationConfig(
    (metaRecord['aiPathsValidation'] as Record<string, unknown> | undefined) ?? undefined
  );
  const nodeValidationEnabled = validationState.enabled !== false;
  const validationReport = evaluateAiPathsValidationPreflight({
    nodes: normalizedNodes,
    edges: normalizedEdges,
    config: validationState,
  });
  if (nodeValidationEnabled && validationReport.blocked) {
    const finding = validationReport.findings[0];
    throw badRequestError(
      finding
        ? `Validation blocked run: ${finding.ruleTitle}.`
        : `Validation blocked run: score ${validationReport.score} below threshold ${validationReport.blockThreshold}.`
    );
  }
  normalizedMeta = {
    ...metaRecord,
    aiPathsValidation: validationState,
    validationPreflight: validationReport,
  };

  const compileReport = await withTiming('compileMs', async () => {
    return nodeValidationEnabled
      ? compileGraph(normalizedNodes, normalizedEdges)
      : compileGraph(normalizedNodes, normalizedEdges, {
        scopeMode: 'reachable_from_roots',
        ...(rest.triggerNodeId ? { scopeRootNodeIds: [rest.triggerNodeId] } : {}),
      });
  });
  if (nodeValidationEnabled && !compileReport.ok) {
    const primaryError = compileReport.findings.find((finding) => finding.severity === 'error');
    throw badRequestError(
      (primaryError ? `Graph compile failed: ${primaryError.message}` : null) ??
        `Graph compile failed with ${compileReport.errors} blocking issue(s).`
    );
  }
  normalizedMeta = {
    ...(normalizedMeta ?? {}),
    graphCompile: {
      errors: compileReport.errors,
      warnings: compileReport.warnings,
      findings: compileReport.findings,
      compiledAt: new Date().toISOString(),
    },
  };

  try {
    await withTiming('queueReadyMs', async () => {
      await withTimeout(
        assertAiPathRunQueueReadyForEnqueue(),
        QUEUE_PREFLIGHT_TIMEOUT_MS,
        `queue_preflight_timeout after ${QUEUE_PREFLIGHT_TIMEOUT_MS}ms`
      );
    });
  } catch (error) {
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

  const run = await withTiming('enqueueServiceMs', async () => {
    return await enqueuePathRun({
      userId: access.userId,
      pathId: rest.pathId,
      pathName: resolvedPathName,
      nodes: normalizedNodes,
      edges: normalizedEdges,
      ...(rest.triggerEvent ? { triggerEvent: rest.triggerEvent } : {}),
      ...(rest.triggerNodeId ? { triggerNodeId: rest.triggerNodeId } : {}),
      triggerContext: rest.triggerContext ?? null,
      entityId: rest.entityId ?? null,
      entityType: rest.entityType ?? null,
      ...(rest.maxAttempts !== undefined ? { maxAttempts: rest.maxAttempts } : {}),
      ...(rest.backoffMs !== undefined ? { backoffMs: rest.backoffMs } : {}),
      ...(rest.backoffMaxMs !== undefined ? { backoffMaxMs: rest.backoffMaxMs } : {}),
      ...(rest.requestId ? { requestId: rest.requestId } : {}),
      meta: normalizedMeta,
    });
  });
  const runId = resolveEnqueueRunId(run);
  if (!runId) {
    throw internalError('AI Paths enqueue response missing run identifier.', {
      source: 'ai-paths.runs.enqueue',
      pathId: rest.pathId,
    });
  }
  void logSystemEvent({
    level: 'info',
    source: 'ai-paths.runs.enqueue',
    message: '[ai-paths.runs.enqueue] timing',
    context: {
      pathId: rest.pathId,
      nodeCount: normalizedNodes.length,
      edgeCount: normalizedEdges.length,
      accessMs: Math.round(timings['accessMs'] ?? 0),
      rateLimitMs: Math.round(timings['rateLimitMs'] ?? 0),
      parseBodyMs: Math.round(timings['parseBodyMs'] ?? 0),
      loadStoredPathMs: Math.round(timings['loadStoredPathMs'] ?? 0),
      compileMs: Math.round(timings['compileMs'] ?? 0),
      queueReadyMs: Math.round(timings['queueReadyMs'] ?? 0),
      enqueueServiceMs: Math.round(timings['enqueueServiceMs'] ?? 0),
      graphSource,
      ...(Number.isFinite(requestContentLength) ? { requestContentLength } : {}),
      triggerContextHasEntityJson:
        triggerContextRecord !== null && hasOwn(triggerContextRecord, 'entityJson'),
      triggerContextHasEntity:
        triggerContextRecord !== null && hasOwn(triggerContextRecord, 'entity'),
      triggerContextHasProduct:
        triggerContextRecord !== null && hasOwn(triggerContextRecord, 'product'),
    },
  });

  const responsePayload = { run, runId };
  const responseContract = aiPathRunEnqueueResponseSchema.safeParse(responsePayload);
  if (!responseContract.success) {
    throw internalError('AI Paths enqueue response contract violation.', {
      source: 'ai-paths.runs.enqueue',
      pathId: rest.pathId,
      issues: responseContract.error.issues,
    });
  }

  return NextResponse.json(responseContract.data);
}
