import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  compileGraph,
  evaluateAiPathsValidationPreflight,
  migrateTriggerToFetcherGraph,
  normalizeNodes,
  normalizeAiPathsValidationConfig,
  palette,
  repairPathNodeIdentities,
  sanitizeEdges,
} from '@/shared/lib/ai-paths';
import { enforceAiPathsRunRateLimit, requireAiPathsRunAccess } from '@/features/ai/ai-paths/server';
import { enqueuePathRun } from '@/features/ai/ai-paths/services/path-run-service';
import { assertAiPathRunQueueReadyForEnqueue } from '@/features/jobs/server';
import { parseJsonBody } from '@/features/products/server';
import { aiNodeSchema, edgeSchema } from '@/shared/contracts/ai-paths';
import type { Edge } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, serviceUnavailableError } from '@/shared/errors/app-error';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

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

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const timings: Record<string, number> = {};
  const withTiming = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const startedAt = performance.now();
    const result = await fn();
    timings[label] = performance.now() - startedAt;
    return result;
  };

  const access = await withTiming('accessMs', async () => await requireAiPathsRunAccess());
  await withTiming('rateLimitMs', async () => await enforceAiPathsRunRateLimit(access));
  const parsed = await parseJsonBody(req, enqueueSchema, {
    logPrefix: 'ai-paths.runs.enqueue',
  });
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;
  const { nodes, edges, ...rest } = data;
  let normalizedMeta = rest.meta ?? null;
  if (normalizedMeta && typeof normalizedMeta === 'object') {
    const metaRecord = normalizedMeta;
    const sourceValue = metaRecord['source'];
    if (sourceValue && typeof sourceValue === 'object') {
      const triggerEventId =
        typeof metaRecord['triggerEventId'] === 'string' ? metaRecord['triggerEventId'] : null;
      normalizedMeta = {
        ...metaRecord,
        sourceInfo: sourceValue,
        source: triggerEventId ? 'trigger_button' : 'ai_paths_ui',
      };
    }
  }
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    throw badRequestError('Nodes and edges are required to enqueue a run.');
  }

  const migratedGraph = migrateTriggerToFetcherGraph(normalizeNodes(nodes), edges as Edge[]);
  const identityRepair = repairPathNodeIdentities(
    {
      id: rest.pathId,
      version: 1,
      name: rest.pathName?.trim() || rest.pathId,
      description: '',
      trigger: rest.triggerEvent?.trim() || 'manual',
      nodes: migratedGraph.nodes,
      edges: migratedGraph.edges,
      updatedAt: new Date().toISOString(),
    },
    { palette }
  );
  const normalizedNodes = normalizeNodes(identityRepair.config.nodes);
  const normalizedEdges = sanitizeEdges(normalizedNodes, identityRepair.config.edges);
  const metaRecord = normalizedMeta && typeof normalizedMeta === 'object' ? normalizedMeta : {};
  const validationConfig = normalizeAiPathsValidationConfig(
    (metaRecord['aiPathsValidation'] as Record<string, unknown> | undefined) ?? undefined
  );
  const nodeValidationEnabled = validationConfig.enabled !== false;
  const validationReport = evaluateAiPathsValidationPreflight({
    nodes: normalizedNodes,
    edges: normalizedEdges,
    config: validationConfig,
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
    ...(identityRepair.warnings.length > 0
      ? {
        identityRepair: {
          warnings: identityRepair.warnings,
          repairedAt: new Date().toISOString(),
        },
      }
      : {}),
    aiPathsValidation: validationConfig,
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
      return await withTimeout(
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
      pathName: rest.pathName ?? null,
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
      compileMs: Math.round(timings['compileMs'] ?? 0),
      queueReadyMs: Math.round(timings['queueReadyMs'] ?? 0),
      enqueueServiceMs: Math.round(timings['enqueueServiceMs'] ?? 0),
    },
  });

  return NextResponse.json({ run });
}
