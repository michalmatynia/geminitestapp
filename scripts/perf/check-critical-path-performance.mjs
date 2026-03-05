import fs from 'node:fs/promises';
import path from 'node:path';

import { collectMetrics } from '../architecture/lib-metrics.mjs';

const args = new Set(process.argv.slice(2));
const strictMode = args.has('--strict');
const shouldWriteHistory = !args.has('--ci') && !args.has('--no-history');

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');

const criticalPaths = [
  {
    id: 'auth-session',
    name: 'Authentication + Session Bootstrap',
    maxLines: 220,
    files: ['src/features/auth/pages/public/SignInPage.tsx'],
  },
  {
    id: 'products-core-crud',
    name: 'Products CRUD + Listing Refresh',
    maxLines: 80,
    files: ['src/features/products/pages/AdminProductsPage.tsx'],
  },
  {
    id: 'image-studio-generate',
    name: 'Image Studio Generate + Preview',
    maxLines: 360,
    files: ['src/features/ai/image-studio/pages/AdminImageStudioPage.tsx'],
  },
  {
    id: 'ai-paths-runtime',
    name: 'AI Paths Run Execution',
    maxLines: 120,
    files: ['src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx'],
  },
  {
    id: 'case-resolver-capture',
    name: 'Case Resolver OCR + Capture Mapping',
    maxLines: 60,
    files: ['src/features/case-resolver/pages/AdminCaseResolverPage.tsx'],
  },
];

const countLines = async (absolutePath) => {
  const content = await fs.readFile(absolutePath, 'utf8');
  if (!content) {
    return 0;
  }
  return content.split(/\r?\n/).length;
};

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Critical Path Performance Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Paths checked: ${payload.summary.total}`);
  lines.push(`- Within budget: ${payload.summary.passed}`);
  lines.push(`- Over budget: ${payload.summary.failed}`);
  lines.push('');
  lines.push('## Critical Path Budgets (LOC)');
  lines.push('');
  lines.push('| Path | Status | Total LOC | Budget LOC | Delta |');
  lines.push('| --- | --- | ---: | ---: | ---: |');

  for (const result of payload.results) {
    const delta = result.totalLines - result.maxLines;
    const deltaText = delta > 0 ? `+${delta}` : String(delta);
    lines.push(
      `| ${result.name} | ${result.status.toUpperCase()} | ${result.totalLines} | ${result.maxLines} | ${deltaText} |`
    );
  }

  lines.push('');
  lines.push('## File Breakdown');
  lines.push('');
  for (const result of payload.results) {
    lines.push(`### ${result.name}`);
    lines.push('');
    for (const file of result.files) {
      const suffix = file.exists ? `${file.lines} LOC` : 'missing';
      lines.push(`- \`${file.path}\`: ${suffix}`);
    }
    lines.push('');
  }

  lines.push('## Top Repo Hotspots (Reference)');
  lines.push('');
  lines.push('| File | LOC |');
  lines.push('| --- | ---: |');
  for (const hotspot of payload.metrics.hotspots.topFilesByLines.slice(0, 10)) {
    lines.push(`| \`${hotspot.path}\` | ${hotspot.lines} |`);
  }

  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- LOC is a static complexity heuristic, not runtime latency.');
  lines.push('- Keep critical-path pages below budget before splitting into additional sections/hooks.');

  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const metrics = await collectMetrics({ root });

  const results = [];
  for (const pathBudget of criticalPaths) {
    const files = [];
    let totalLines = 0;

    for (const relPath of pathBudget.files) {
      const absPath = path.join(root, relPath);
      try {
        const lines = await countLines(absPath);
        totalLines += lines;
        files.push({ path: relPath, exists: true, lines });
      } catch {
        files.push({ path: relPath, exists: false, lines: null });
      }
    }

    const hasMissing = files.some((file) => !file.exists);
    const overBudget = totalLines > pathBudget.maxLines;
    const status = hasMissing || overBudget ? 'fail' : 'pass';

    results.push({
      id: pathBudget.id,
      name: pathBudget.name,
      maxLines: pathBudget.maxLines,
      totalLines,
      status,
      files,
    });

    console.log(
      `[critical-paths] ${pathBudget.name.padEnd(44, ' ')} ${status.toUpperCase()} ${totalLines}/${pathBudget.maxLines} LOC`
    );
  }

  const summary = {
    total: results.length,
    passed: results.filter((result) => result.status === 'pass').length,
    failed: results.filter((result) => result.status === 'fail').length,
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    strictMode,
    summary,
    results,
    metrics: {
      generatedAt: metrics.generatedAt,
      hotspots: {
        topFilesByLines: metrics.hotspots.topFilesByLines,
      },
    },
  };

  await fs.mkdir(outDir, { recursive: true });
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');

  const latestJsonPath = path.join(outDir, 'critical-path-performance-latest.json');
  const latestMdPath = path.join(outDir, 'critical-path-performance-latest.md');
  const historicalJsonPath = path.join(outDir, `critical-path-performance-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `critical-path-performance-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(latestMdPath, toMarkdown(payload), 'utf8');

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.writeFile(historicalMdPath, toMarkdown(payload), 'utf8');
  }

  console.log(
    `[critical-paths] summary pass=${summary.passed} fail=${summary.failed} total=${summary.total}`
  );
  console.log(`Wrote ${path.relative(root, latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, latestMdPath)}`);
  if (shouldWriteHistory) {
    console.log(`Wrote ${path.relative(root, historicalJsonPath)}`);
    console.log(`Wrote ${path.relative(root, historicalMdPath)}`);
  }

  if (strictMode && summary.failed > 0) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[critical-paths] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
