import fs from 'node:fs/promises';
import path from 'node:path';

import { collectMetrics } from '../architecture/lib-metrics.mjs';
import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';

const args = new Set(process.argv.slice(2));
const strictMode = args.has('--strict');
const shouldWriteHistory = args.has('--write-history') && !args.has('--ci') && !args.has('--no-history');

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');

const uiPathBudgets = [
  {
    id: 'auth-session-ui',
    name: 'Authentication + Session Bootstrap (UI)',
    maxLines: 220,
    files: ['src/features/auth/pages/public/SignInPage.tsx'],
  },
  {
    id: 'products-core-crud-ui',
    name: 'Products CRUD + Listing Refresh (UI)',
    maxLines: 80,
    files: ['src/features/products/pages/AdminProductsPage.tsx'],
  },
  {
    id: 'image-studio-generate-ui',
    name: 'Image Studio Generate + Preview (UI)',
    maxLines: 360,
    files: ['src/features/ai/image-studio/pages/AdminImageStudioPage.tsx'],
  },
  {
    id: 'ai-paths-runtime-ui',
    name: 'AI Paths Run Execution (UI)',
    maxLines: 120,
    files: ['src/features/ai/ai-paths/pages/AdminAiPathsPage.tsx'],
  },
  {
    id: 'case-resolver-capture-ui',
    name: 'Case Resolver OCR + Capture Mapping (UI)',
    maxLines: 60,
    files: ['src/features/case-resolver/pages/AdminCaseResolverPage.tsx'],
  },
];

const apiRouteBudgets = [
  {
    id: 'auth-session-api',
    name: 'Authentication + Session Bootstrap (API)',
    maxLines: 240,
    maxBranchPoints: 14,
    files: ['src/app/api/auth/verify-credentials/handler.ts'],
  },
  {
    id: 'products-core-crud-api',
    name: 'Products CRUD + Listing Refresh (API)',
    maxLines: 180,
    maxBranchPoints: 14,
    files: ['src/app/api/v2/products/handler.ts'],
  },
  {
    id: 'image-studio-generate-api',
    name: 'Image Studio Generate + Preview (API)',
    maxLines: 760,
    maxBranchPoints: 95,
    files: ['src/app/api/image-studio/projects/[projectId]/handler.ts'],
  },
  {
    id: 'ai-paths-runtime-api',
    name: 'AI Paths Run Execution (API)',
    maxLines: 260,
    maxBranchPoints: 22,
    files: ['src/app/api/ai-paths/runs/handler.ts'],
  },
  {
    id: 'case-resolver-capture-api',
    name: 'Case Resolver OCR + Capture Mapping (API)',
    maxLines: 120,
    maxBranchPoints: 15,
    files: ['src/app/api/case-resolver/ocr/jobs/handler.ts'],
  },
];

const BRANCH_POINT_PATTERNS = [/\bif\b/g, /\bswitch\b/g, /\bcase\b/g, /\bcatch\b/g, /\bfor\b/g, /\bwhile\b/g];

const countLines = async (absolutePath) => {
  const content = await fs.readFile(absolutePath, 'utf8');
  if (!content) {
    return 0;
  }
  return content.split(/\r?\n/).length;
};

const countBranchPoints = async (absolutePath) => {
  const content = await fs.readFile(absolutePath, 'utf8');
  if (!content) return 0;
  return BRANCH_POINT_PATTERNS.reduce((acc, pattern) => {
    const matches = content.match(pattern);
    return acc + (matches ? matches.length : 0);
  }, 0);
};

const summarizeGroup = (results) => ({
  total: results.length,
  passed: results.filter((result) => result.status === 'pass').length,
  failed: results.filter((result) => result.status === 'fail').length,
});

const evaluateBudgetGroup = async (entries, kind) => {
  const results = [];

  for (const budget of entries) {
    const files = [];
    let totalLines = 0;
    let totalBranchPoints = 0;

    for (const relPath of budget.files) {
      const absPath = path.join(root, relPath);
      try {
        const lines = await countLines(absPath);
        const branchPoints = await countBranchPoints(absPath);
        totalLines += lines;
        totalBranchPoints += branchPoints;
        files.push({ path: relPath, exists: true, lines, branchPoints });
      } catch {
        files.push({ path: relPath, exists: false, lines: null, branchPoints: null });
      }
    }

    const hasMissing = files.some((file) => !file.exists);
    const overBudget = totalLines > budget.maxLines;
    const hasBranchBudget = Number.isFinite(budget.maxBranchPoints);
    const overBranchBudget = hasBranchBudget && totalBranchPoints > budget.maxBranchPoints;
    const status = hasMissing || overBudget || overBranchBudget ? 'fail' : 'pass';

    const result = {
      id: budget.id,
      kind,
      name: budget.name,
      maxLines: budget.maxLines,
      maxBranchPoints: hasBranchBudget ? budget.maxBranchPoints : null,
      totalLines,
      totalBranchPoints,
      status,
      files,
    };

    results.push(result);

    console.log(
      `[critical-paths] ${budget.name.padEnd(44, ' ')} ${status.toUpperCase()} ${totalLines}/${budget.maxLines} LOC${hasBranchBudget ? ` | branch ${totalBranchPoints}/${budget.maxBranchPoints}` : ''}`
    );
  }

  return results;
};

const renderBudgetTable = (lines, title, results) => {
  lines.push(`## ${title}`);
  lines.push('');
  const includesBranch = results.some((result) => Number.isFinite(result.maxBranchPoints));
  if (includesBranch) {
    lines.push(
      '| Path | Status | Total LOC | Budget LOC | LOC Delta | Branch Points | Branch Budget | Branch Delta |'
    );
    lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  } else {
    lines.push('| Path | Status | Total LOC | Budget LOC | Delta |');
    lines.push('| --- | --- | ---: | ---: | ---: |');
  }

  for (const result of results) {
    const locDelta = result.totalLines - result.maxLines;
    const locDeltaText = locDelta > 0 ? `+${locDelta}` : String(locDelta);
    if (includesBranch) {
      const branchBudget = Number.isFinite(result.maxBranchPoints) ? result.maxBranchPoints : null;
      const branchDelta =
        branchBudget === null ? '-' : result.totalBranchPoints - branchBudget;
      const branchDeltaText =
        branchDelta === '-'
          ? '-'
          : branchDelta > 0
            ? `+${branchDelta}`
            : String(branchDelta);
      lines.push(
        `| ${result.name} | ${result.status.toUpperCase()} | ${result.totalLines} | ${result.maxLines} | ${locDeltaText} | ${result.totalBranchPoints} | ${branchBudget ?? '-'} | ${branchDeltaText} |`
      );
    } else {
      lines.push(
        `| ${result.name} | ${result.status.toUpperCase()} | ${result.totalLines} | ${result.maxLines} | ${locDeltaText} |`
      );
    }
  }

  lines.push('');
};

const renderFileBreakdown = (lines, title, results) => {
  lines.push(`## ${title}`);
  lines.push('');
  for (const result of results) {
    lines.push(`### ${result.name}`);
    lines.push('');
    for (const file of result.files) {
      const suffix = file.exists
        ? `${file.lines} LOC${Number.isFinite(file.branchPoints) ? ` | ${file.branchPoints} branch points` : ''}`
        : 'missing';
      lines.push(`- \`${file.path}\`: ${suffix}`);
    }
    lines.push('');
  }
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
  lines.push(`- UI paths checked: ${payload.summary.ui.total} (pass=${payload.summary.ui.passed}, fail=${payload.summary.ui.failed})`);
  lines.push(`- API routes checked: ${payload.summary.api.total} (pass=${payload.summary.api.passed}, fail=${payload.summary.api.failed})`);
  lines.push('');

  renderBudgetTable(lines, 'Critical UI Path Budgets (LOC)', payload.uiResults);
  renderBudgetTable(lines, 'Critical API Route Budgets (LOC)', payload.apiResults);

  renderFileBreakdown(lines, 'UI File Breakdown', payload.uiResults);
  renderFileBreakdown(lines, 'API File Breakdown', payload.apiResults);

  lines.push('## Top Repo Hotspots (Reference)');
  lines.push('');
  lines.push('| File | LOC |');
  lines.push('| --- | ---: |');
  for (const hotspot of payload.metrics.hotspots.topFilesByLines.slice(0, 10)) {
    lines.push(`| \`${hotspot.path}\` | ${hotspot.lines} |`);
  }
  lines.push('');

  lines.push('## Top API Route Hotspots (Reference)');
  lines.push('');
  lines.push('| Route | LOC |');
  lines.push('| --- | ---: |');
  for (const hotspot of payload.metrics.api.topRouteHotspots.slice(0, 10)) {
    lines.push(`| \`${hotspot.path}\` | ${hotspot.lines} |`);
  }
  lines.push('');

  lines.push('## Notes');
  lines.push('');
  lines.push('- LOC is a static complexity heuristic, not runtime latency.');
  lines.push('- Branch points are a coarse static control-flow complexity heuristic (if/switch/case/catch/for/while).');
  lines.push('- Keep critical-path pages/routes below budget before adding more conditional branches.');

  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const metrics = await collectMetrics({ root });

  const [uiResults, apiResults] = await Promise.all([
    evaluateBudgetGroup(uiPathBudgets, 'ui'),
    evaluateBudgetGroup(apiRouteBudgets, 'api'),
  ]);

  const results = [...uiResults, ...apiResults];
  const uiSummary = summarizeGroup(uiResults);
  const apiSummary = summarizeGroup(apiResults);

  const summary = {
    total: results.length,
    passed: uiSummary.passed + apiSummary.passed,
    failed: uiSummary.failed + apiSummary.failed,
    ui: uiSummary,
    api: apiSummary,
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    strictMode,
    summary,
    results,
    uiResults,
    apiResults,
    metrics: {
      generatedAt: metrics.generatedAt,
      hotspots: {
        topFilesByLines: metrics.hotspots.topFilesByLines,
      },
      api: {
        topRouteHotspots: metrics.api.topRouteHotspots,
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
  await writeMetricsMarkdownFile({
    root,
    targetPath: latestMdPath,
    content: toMarkdown(payload),
  });

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({
      root,
      targetPath: historicalMdPath,
      content: toMarkdown(payload),
    });
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
