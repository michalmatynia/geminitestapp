import 'dotenv/config';

import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { listAiPathsSettings } from '@/features/ai/ai-paths/server/settings-store';
import { enqueuePathRun } from '@/features/ai/ai-paths/services/path-run-service';

const pathId = process.argv[2] ?? 'path_65mv2p';

async function main(): Promise<void> {
  const settings = await listAiPathsSettings();
  const rec = settings.find((s) => s.key === `ai_paths_config_${pathId}`);
  if (!rec) {
    console.log(JSON.stringify({ ok: false, error: 'path_not_found', pathId }, null, 2));
    return;
  }

  const parsed = JSON.parse(rec.value) as Record<string, unknown>;
  const nodes = normalizeNodes(Array.isArray(parsed['nodes']) ? (parsed['nodes'] as never[]) : []);
  const edges = sanitizeEdges(
    nodes,
    Array.isArray(parsed['edges']) ? (parsed['edges'] as never[]) : []
  );
  const triggerNode = nodes.find((node) => node.type === 'trigger') ?? nodes[0];
  if (!triggerNode) {
    console.log(JSON.stringify({ ok: false, error: 'no_nodes', pathId }, null, 2));
    return;
  }

  try {
    const run = await enqueuePathRun({
      userId: null,
      pathId,
      pathName: typeof parsed['name'] === 'string' ? parsed['name'] : pathId,
      nodes,
      edges,
      triggerEvent: 'manual_debug',
      triggerNodeId: triggerNode.id,
      triggerContext: {
        source: 'debug_script',
        entityId: 'debug-entity-id',
        entityType: 'product',
      },
      meta: {
        source: 'debug_script',
      },
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          run: {
            id: run.id,
            status: run.status,
            pathId: run.pathId,
            createdAt: run.createdAt,
            startedAt: run.startedAt,
          },
        },
        null,
        2
      )
    );
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
  }
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('enqueue test failed:', error);
    process.exit(1);
  });
