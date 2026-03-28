import fs from 'node:fs/promises';
import path from 'node:path';

import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';
import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';
import { testingLanes, testingSuites } from './config/test-suite-registry.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const { strictMode, shouldWriteHistory, noWrite, summaryJson } = parseCommonCheckArgs(argv);

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');

const collectCadenceSummary = () => {
  const cadenceCounts = new Map();

  for (const suite of testingSuites) {
    for (const cadence of suite.cadence) {
      cadenceCounts.set(cadence, (cadenceCounts.get(cadence) ?? 0) + 1);
    }
  }

  return [...cadenceCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([cadence, count]) => ({ cadence, count }));
};

const payload = {
  generatedAt: new Date().toISOString(),
  status: 'ok',
  summary: {
    suiteCount: testingSuites.length,
    laneCount: testingLanes.length,
    documentedLaneCount: testingLanes.filter((lane) => lane.requiresLedgerEntry).length,
    summaryJsonCapableSuiteCount: testingSuites.filter((suite) => suite.supportsSummaryJson).length,
  },
  cadenceSummary: collectCadenceSummary(),
  suites: testingSuites.map((suite) => ({
    id: suite.id,
    label: suite.label,
    kind: suite.kind,
    cadence: suite.cadence,
    cost: suite.cost,
    owner: suite.owner,
    command: suite.command.join(' '),
    artifacts: suite.artifacts,
    supportsSummaryJson: suite.supportsSummaryJson,
    domains: suite.domains,
  })),
  lanes: testingLanes.map((lane) => ({
    id: lane.id,
    label: lane.label,
    cadence: lane.cadence,
    purpose: lane.purpose,
    requiresLedgerEntry: lane.requiresLedgerEntry,
    suites: lane.suites,
  })),
};

const toMarkdown = (report) => {
  const lines = [];
  lines.push('# Testing Suite Inventory');
  lines.push('');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Registered suites: ${report.summary.suiteCount}`);
  lines.push(`- Registered lanes: ${report.summary.laneCount}`);
  lines.push(`- Major lanes requiring ledger updates: ${report.summary.documentedLaneCount}`);
  lines.push(`- Suites with summary-json support: ${report.summary.summaryJsonCapableSuiteCount}`);
  lines.push('');
  lines.push('## Cadence Coverage');
  lines.push('');
  lines.push('| Cadence | Suite count |');
  lines.push('| --- | ---: |');
  for (const cadence of report.cadenceSummary) {
    lines.push(`| ${cadence.cadence} | ${cadence.count} |`);
  }
  lines.push('');
  lines.push('## Lanes');
  lines.push('');
  lines.push('| Lane | Cadence | Ledger | Suites |');
  lines.push('| --- | --- | --- | --- |');
  for (const lane of report.lanes) {
    lines.push(
      `| ${lane.label} (\`${lane.id}\`) | ${lane.cadence} | ${lane.requiresLedgerEntry ? 'required' : 'optional'} | ${lane.suites
        .map((suiteId) => `\`${suiteId}\``)
        .join(', ')} |`
    );
  }
  lines.push('');
  lines.push('## Suites');
  lines.push('');
  lines.push('| Suite | Kind | Cadence | Cost | Summary JSON | Artifacts |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const suite of report.suites) {
    lines.push(
      `| ${suite.label} (\`${suite.id}\`) | ${suite.kind} | ${suite.cadence.join(', ')} | ${suite.cost} | ${
        suite.supportsSummaryJson ? 'yes' : 'no'
      } | ${
        suite.artifacts.length > 0 ? suite.artifacts.map((artifact) => `\`${artifact}\``).join(', ') : '-' 
      } |`
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- The registry in `scripts/testing/config/test-suite-registry.mjs` is the canonical source for lane membership and cadence.');
  lines.push('- Large runs should update `testing-run-ledger-latest.*` either automatically through the lane runner or manually through `npm run testing:record`.');
  return `${lines.join('\n')}\n`;
};

const writeArtifacts = async (report) => {
  await fs.mkdir(outDir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, '-');

  const latestJsonPath = path.join(outDir, 'testing-suite-inventory-latest.json');
  const latestMdPath = path.join(outDir, 'testing-suite-inventory-latest.md');
  const historicalJsonPath = path.join(outDir, `testing-suite-inventory-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `testing-suite-inventory-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeMetricsMarkdownFile({
    root,
    targetPath: latestMdPath,
    content: toMarkdown(report),
  });

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({
      root,
      targetPath: historicalMdPath,
      content: toMarkdown(report),
    });
  }

  return {
    latestJson: path.relative(root, latestJsonPath),
    latestMarkdown: path.relative(root, latestMdPath),
    historicalJson: shouldWriteHistory ? path.relative(root, historicalJsonPath) : null,
    historicalMarkdown: shouldWriteHistory ? path.relative(root, historicalMdPath) : null,
  };
};

const paths = noWrite ? null : await writeArtifacts(payload);

if (summaryJson) {
  writeSummaryJson({
    scannerName: 'testing-suite-inventory',
    generatedAt: payload.generatedAt,
    status: payload.status,
    summary: payload.summary,
    details: {
      cadenceSummary: payload.cadenceSummary,
      lanes: payload.lanes,
      suites: payload.suites,
    },
    paths,
    filters: {
      strictMode,
      historyDisabled: !shouldWriteHistory,
      noWrite,
      ci: args.has('--ci'),
    },
    notes: ['testing suite inventory result'],
  });
} else {
  console.log(
    `[testing-suite-inventory] suites=${payload.summary.suiteCount} lanes=${payload.summary.laneCount} major-lanes=${payload.summary.documentedLaneCount}`
  );
  if (paths) {
    console.log(`Wrote ${paths.latestJson}`);
    console.log(`Wrote ${paths.latestMarkdown}`);
  } else {
    console.log('Skipped writing testing suite inventory artifacts (--no-write).');
  }
}
