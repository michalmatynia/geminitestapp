import 'dotenv/config';

import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { listAiPathsSettings } from '@/features/ai/ai-paths/server/settings-store';
import { enqueuePathRun } from '@/features/ai/ai-paths/services/path-run-service';
import { executePathRun } from '@/features/ai/ai-paths/services/path-run-executor';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

type PathConfigRecord = {
  id?: unknown;
  name?: unknown;
  nodes?: unknown;
  edges?: unknown;
};

const requestedPathId = process.argv[2] ?? 'path_72l57d';
const requestedNameNeedle = process.argv[3] ?? 'Description v4 Hybrid human AI Path';

const resolvePathRecord = async (): Promise<{
  pathId: string;
  pathName: string;
  nodes: AiNode[];
  edges: Edge[];
}> => {
  const settings = await listAiPathsSettings();
  const configRecords = settings.filter((entry) => entry.key.startsWith('ai_paths_config_'));

  let selected = configRecords.find((entry) => entry.key === `ai_paths_config_${requestedPathId}`);
  if (!selected) {
    selected = configRecords.find((entry) => {
      try {
        const parsed = JSON.parse(entry.value) as PathConfigRecord;
        return (
          typeof parsed.name === 'string' &&
          parsed.name.toLowerCase().includes(requestedNameNeedle.toLowerCase())
        );
      } catch {
        return false;
      }
    });
  }

  if (!selected) {
    throw new Error(
      `Could not find AI Path config for id "${requestedPathId}" or name containing "${requestedNameNeedle}".`
    );
  }

  const parsed = JSON.parse(selected.value) as PathConfigRecord;
  const pathId =
    typeof parsed.id === 'string' && parsed.id.trim().length > 0
      ? parsed.id
      : selected.key.replace(/^ai_paths_config_/, '');
  const pathName =
    typeof parsed.name === 'string' && parsed.name.trim().length > 0 ? parsed.name : pathId;
  const nodes = normalizeNodes(Array.isArray(parsed.nodes) ? (parsed.nodes as AiNode[]) : []);
  const edges = sanitizeEdges(nodes, Array.isArray(parsed.edges) ? (parsed.edges as Edge[]) : []);

  return {
    pathId,
    pathName,
    nodes,
    edges,
  };
};

async function main(): Promise<void> {
  const path = await resolvePathRecord();
  const triggerNode = path.nodes.find((node) => node.type === 'trigger') ?? path.nodes[0];
  if (!triggerNode) throw new Error('Selected path has no nodes.');

  const run = await enqueuePathRun({
    userId: null,
    pathId: path.pathId,
    pathName: path.pathName,
    nodes: path.nodes,
    edges: path.edges,
    triggerEvent: 'manual_debug',
    triggerNodeId: triggerNode.id,
    triggerContext: {
      source: 'smoke_required_failure',
      entityId: 'debug-entity-id',
      entityType: 'product',
    },
    meta: {
      source: 'smoke_required_failure',
      aiPathsValidation: { enabled: false },
      strictFlowMode: false,
      blockedRunPolicy: 'complete_with_warning',
    },
  });

  let executeError: string | null = null;
  try {
    await executePathRun(run);
  } catch (error) {
    executeError = error instanceof Error ? error.message : String(error);
  }

  const repo = await getPathRunRepository();
  const updatedRun = await repo.findRunById(run.id);
  const nodes = await repo.listRunNodes(run.id);

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId: run.id,
        pathId: path.pathId,
        pathName: path.pathName,
        executeError,
        final: updatedRun
          ? {
              status: updatedRun.status,
              errorMessage: updatedRun.errorMessage ?? null,
              startedAt: updatedRun.startedAt ?? null,
              finishedAt: updatedRun.finishedAt ?? null,
            }
          : null,
        nodeStatuses: nodes.map((node) => ({
          nodeId: node.nodeId,
          nodeTitle: node.nodeTitle ?? null,
          nodeType: node.nodeType,
          status: node.status,
        })),
      },
      null,
      2
    )
  );
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    process.exit(1);
  });
