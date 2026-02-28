import fs from 'node:fs';
import { compileGraph } from '@/features/ai/ai-paths/lib/core/utils/graph';

const cfg = JSON.parse(fs.readFileSync('tmp/codex-check/path_65mv2p_config.json', 'utf8')) as any;
const edges = cfg.edges as any[];

const variants = [
  { name: 'original', edges },
  { name: 'no_sim_to_trigger', edges: edges.filter((e) => e.id !== 'edge-xjm6zb') },
  { name: 'no_trigger_to_sim', edges: edges.filter((e) => e.id !== 'edge-o27z1h') },
  {
    name: 'no_sim_loop',
    edges: edges.filter((e) => e.id !== 'edge-xjm6zb' && e.id !== 'edge-o27z1h'),
  },
];

for (const variant of variants) {
  const report = compileGraph(cfg.nodes, variant.edges);
  console.log(
    JSON.stringify(
      {
        variant: variant.name,
        ok: report.ok,
        errors: report.errors,
        warnings: report.warnings,
        top: report.findings.slice(0, 3),
      },
      null,
      2
    )
  );
}
