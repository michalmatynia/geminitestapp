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
} from '@/features/ai/ai-paths/lib';
import {
  enforceAiPathsRunRateLimit,
  requireAiPathsRunAccess,
} from '@/features/ai/ai-paths/server';
import { enqueuePathRun } from '@/features/ai/ai-paths/services/path-run-service';
import { startAiPathRunQueue } from '@/features/jobs/server';
import { parseJsonBody } from '@/features/products/server';
import { 
  aiNodeSchema, 
  edgeSchema, 
} from '@/shared/contracts/ai-paths';
import type { Edge } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

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

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  const access = await requireAiPathsRunAccess();
  await enforceAiPathsRunRateLimit(access);
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
        typeof metaRecord['triggerEventId'] === 'string'
          ? metaRecord['triggerEventId']
          : null;
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

  const migratedGraph = migrateTriggerToFetcherGraph(
    normalizeNodes(nodes),
    edges as Edge[],
  );
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
    { palette },
  );
  const normalizedNodes = normalizeNodes(identityRepair.config.nodes);
  const normalizedEdges = sanitizeEdges(
    normalizedNodes,
    identityRepair.config.edges,
  );
  const metaRecord =
    normalizedMeta && typeof normalizedMeta === 'object'
      ? (normalizedMeta)
      : {};
  const validationConfig = normalizeAiPathsValidationConfig(
    (metaRecord['aiPathsValidation'] as Record<string, unknown> | undefined) ??
      undefined,
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
        : `Validation blocked run: score ${validationReport.score} below threshold ${validationReport.blockThreshold}.`,
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

  const compileReport = nodeValidationEnabled
    ? compileGraph(normalizedNodes, normalizedEdges)
    : compileGraph(normalizedNodes, normalizedEdges, {
      scopeMode: 'reachable_from_roots',
      ...(rest.triggerNodeId
        ? { scopeRootNodeIds: [rest.triggerNodeId] }
        : {}),
    });
  if (nodeValidationEnabled && !compileReport.ok) {
    const primaryError = compileReport.findings.find(
      (finding) => finding.severity === 'error',
    );
    throw badRequestError(
      (primaryError ? `Graph compile failed: ${primaryError.message}` : null) ??
        `Graph compile failed with ${compileReport.errors} blocking issue(s).`,
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

  const run = await enqueuePathRun({
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
    ...(rest.maxAttempts !== undefined
      ? { maxAttempts: rest.maxAttempts }
      : {}),
    ...(rest.backoffMs !== undefined ? { backoffMs: rest.backoffMs } : {}),
    ...(rest.backoffMaxMs !== undefined
      ? { backoffMaxMs: rest.backoffMaxMs }
      : {}),
    ...(rest.requestId ? { requestId: rest.requestId } : {}),
    meta: normalizedMeta,
  });
  startAiPathRunQueue();
  return NextResponse.json({ run });
}
