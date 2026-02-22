import 'dotenv/config';
import { listAiPathsSettings } from '@/features/ai/ai-paths/server/settings-store';

async function main(): Promise<void> {
  const pathId = 'path_65mv2p';
  const rows = await listAiPathsSettings();
  const key = `ai_paths_config_${pathId}`;
  const rec = rows.find((r) => r.key === key);
  if (!rec) {
    console.log('not found');
    return;
  }

  const cfg = JSON.parse(rec.value) as Record<string, unknown>;
  const nodes = Array.isArray(cfg.nodes) ? (cfg.nodes as Array<Record<string, unknown>>) : [];
  const edges = Array.isArray(cfg.edges) ? (cfg.edges as Array<Record<string, unknown>>) : [];
  const ids = ['node-nx558jai', 'node-utsyoiti'];

  const nodeInfo = nodes
    .filter((n) => typeof n.id === 'string' && ids.includes(n.id as string))
    .map((n) => {
      const config = typeof n.config === 'object' && n.config ? (n.config as Record<string, unknown>) : {};
      const runtime =
        typeof config.runtime === 'object' && config.runtime
          ? (config.runtime as Record<string, unknown>)
          : {};
      return {
        id: n.id,
        title: n.title,
        type: n.type,
        waitForInputs: runtime.waitForInputs ?? false,
        cacheMode:
          typeof runtime.cache === 'object' && runtime.cache
            ? (runtime.cache as Record<string, unknown>).mode ?? null
            : null,
        inputContracts: runtime.inputContracts ?? n.inputContracts ?? null,
      };
    });

  const cycleEdges = edges.filter((e) =>
    typeof e.from === 'string' &&
    typeof e.to === 'string' &&
    ids.includes(e.from as string) &&
    ids.includes(e.to as string)
  );

  console.log(JSON.stringify({ nodeInfo, cycleEdges }, null, 2));
}

void main();
