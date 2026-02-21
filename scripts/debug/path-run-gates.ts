import 'dotenv/config';

import { normalizeNodes } from '@/features/ai/ai-paths/lib/core/normalization';
import { compileGraph, sanitizeEdges } from '@/features/ai/ai-paths/lib/core/utils/graph';
import { inspectPathDependencies } from '@/features/ai/ai-paths/lib/core/utils/dependency-inspector';
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
  const edges = sanitizeEdges(nodes, Array.isArray(parsed['edges']) ? (parsed['edges'] as never[]) : []);
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
          ok: compile.ok,
          errors: compile.errors,
          warnings: compile.warnings,
          findings: compile.findings,
        },
        dependency: {
          errors: dep.errors,
          warnings: dep.warnings,
          risks: dep.risks,
        },
      },
      null,
      2,
    ),
  );
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('path-run-gates failed:', error);
    process.exit(1);
  });
