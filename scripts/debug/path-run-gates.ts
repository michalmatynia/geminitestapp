import 'dotenv/config';

import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import { compileGraph, sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { inspectPathDependencies } from '@/shared/lib/ai-paths/core/utils/dependency-inspector';
import { listAiPathsSettings } from '@/features/ai/ai-paths/server/settings-store';

const pathId = process.argv[2] ?? 'path_65mv2p';

async function main(): Promise<void> {
  const settings = await listAiPathsSettings();
  const key = `ai_paths_config_${pathId}`;
  const rec = settings.find((item) => item.key === key);
  if (!rec) {
    console.log(JSON.stringify({ error: 'path_not_found', key }, null, 2));
    return;
  }

  const parsed = JSON.parse(rec.value) as Record<string, unknown>;
  const nodes = normalizeNodes(Array.isArray(parsed['nodes']) ? (parsed['nodes'] as never[]) : []);
  const edges = sanitizeEdges(
    nodes,
    Array.isArray(parsed['edges']) ? (parsed['edges'] as never[]) : []
  );
  const compile = compileGraph(nodes, edges);
  const dep = inspectPathDependencies(nodes, edges);

  console.log(
    JSON.stringify(
      {
        pathId,
        name: parsed['name'] ?? null,
        strictFlowMode: parsed['strictFlowMode'],
        executionMode: parsed['executionMode'],
        runMode: parsed['runMode'],
        compile: {
          hasTrigger: compile.triggerNodeId !== null,
          nodeCount: compile.nodes.length,
          edgeCount: compile.edges.length,
          processingNodeCount: compile.processingNodeIds.length,
          terminalNodeCount: compile.terminalNodeIds.length,
        },
        dependency: {
          errors: dep.errors,
          warnings: dep.warnings,
          risks: dep.risks,
        },
      },
      null,
      2
    )
  );
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('path-run-gates failed:', error);
    process.exit(1);
  });
