import fs from 'node:fs/promises';
import path from 'node:path';

import { collectMetrics } from '../architecture/lib-metrics.mjs';

const root = process.cwd();
const outPath = path.join(root, 'docs', 'metrics', 'route-hotspots.md');

const run = async () => {
  const metrics = await collectMetrics({ root });

  const lines = [];
  lines.push('# Route Hotspots (Static Heuristic)');
  lines.push('');
  lines.push(`Generated at: ${metrics.generatedAt}`);
  lines.push('');
  lines.push('This report ranks route/page complexity using LOC as a fast heuristic baseline.');
  lines.push('');

  lines.push('## Top API Routes by LOC');
  lines.push('');
  lines.push('| Route | LOC |');
  lines.push('| --- | ---: |');
  for (const route of metrics.api.topRouteHotspots.slice(0, 25)) {
    lines.push(`| \`${route.path}\` | ${route.lines} |`);
  }
  lines.push('');

  lines.push('## Top App Pages by LOC');
  lines.push('');
  lines.push('| Page | LOC |');
  lines.push('| --- | ---: |');
  for (const page of metrics.hotspots.topPagesByLines.slice(0, 25)) {
    lines.push(`| \`${page.path}\` | ${page.lines} |`);
  }
  lines.push('');

  lines.push('## Recommended First Runtime Profiling Targets');
  lines.push('');
  for (const route of metrics.api.topRouteHotspots.slice(0, 10)) {
    lines.push(`- \`${route.path}\``);
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(`Wrote ${path.relative(root, outPath)}`);
};

run().catch((error) => {
  console.error('[hotspots] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
