import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectMetrics } from './lib-metrics.mjs';
import {
  buildArchitectureGuardrailSnapshot,
  compareGuardrailSnapshotAgainstBaseline,
  formatGuardrailRow,
  readGuardrailBaseline,
  resolveGuardrailBaselinePath,
  writeGuardrailBaseline,
} from './lib/guardrails-baseline.mjs';
import { collectNumericSummaryMetrics } from './lib/scan-summary-metrics.mjs';
import {
  buildStaticCheckFilters,
  parseCommonCheckArgs,
  writeSummaryJson,
} from '../lib/check-cli.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const root = process.cwd();
const baselinePath = resolveGuardrailBaselinePath(root);
const scanPropDrillingScriptPath = fileURLToPath(new URL('./scan-prop-drilling.mjs', import.meta.url));
const scanUiConsolidationScriptPath = fileURLToPath(
  new URL('./scan-ui-consolidation.mjs', import.meta.url)
);
const { summaryJson } = parseCommonCheckArgs(argv);

const collectPropDrillingGuardrail = async () => {
  return collectNumericSummaryMetrics({
    cwd: root,
    commandArgs: [
      scanPropDrillingScriptPath,
      '--guardrails',
      '--ci',
      '--no-history',
      '--no-write',
      '--summary-json',
    ],
    sourceName: 'scan-prop-drilling',
    fields: {
      depthGte4Chains: 'highPriorityChainCount',
      componentsWithForwarding: 'componentsWithForwarding',
    },
  });
};

const collectUiConsolidationGuardrail = async () => {
  return collectNumericSummaryMetrics({
    cwd: root,
    commandArgs: [
      scanUiConsolidationScriptPath,
      '--ci',
      '--no-history',
      '--no-write',
      '--summary-json',
    ],
    sourceName: 'scan-ui-consolidation',
    fields: {
      totalOpportunities: 'totalOpportunities',
      highPriorityOpportunities: 'highPriorityCount',
      duplicateNameClusters: 'duplicateNameClusterCount',
      propSignatureClusters: 'propSignatureClusterCount',
      tokenSimilarityClusters: 'tokenSimilarityClusterCount',
    },
  });
};

const summarizeComparisonRows = (rows) => ({
  totalMetrics: rows.length,
  okMetrics: rows.filter((row) => row.status === 'OK').length,
  failedMetrics: rows.filter((row) => row.status === 'FAIL').length,
  infoMetrics: rows.filter((row) => row.status === 'INFO').length,
  warnMetrics: rows.filter((row) => row.status === 'WARN').length,
  hardLimitFailures: rows.filter((row) => row.label.includes('(hard limit)') && row.status === 'FAIL')
    .length,
});

const writeGuardrailSummaryJson = ({
  generatedAt = new Date().toISOString(),
  status = 'ok',
  summary,
  snapshot,
  baseline,
  rows = [],
  updatedBaseline = false,
  error = null,
}) => {
  writeSummaryJson({
    scannerName: 'architecture-guardrails',
    generatedAt,
    status,
    summary: {
      ...summary,
      updatedBaseline,
    },
    details: {
      snapshot,
      baselineGeneratedAt: baseline?.generatedAt ?? null,
      baselinePath: path.relative(root, baselinePath),
      rows,
      error,
    },
    paths: updatedBaseline
      ? {
          baseline: path.relative(root, baselinePath),
        }
      : null,
    filters: {
      ...buildStaticCheckFilters(),
      updateBaseline: args.has('--update-baseline'),
      ci: args.has('--ci'),
    },
    notes: ['architecture guardrail result'],
  });
};

const run = async () => {
  const metrics = await collectMetrics({ root });
  const [propDrilling, uiConsolidation] = await Promise.all([
    collectPropDrillingGuardrail(),
    collectUiConsolidationGuardrail(),
  ]);
  const snapshot = buildArchitectureGuardrailSnapshot(metrics, propDrilling, uiConsolidation);

  if (args.has('--update-baseline')) {
    const payload = await writeGuardrailBaseline(snapshot, { baselinePath });
    if (summaryJson) {
      writeGuardrailSummaryJson({
        generatedAt: payload.generatedAt,
        status: 'ok',
        summary: {
          totalMetrics: Object.keys(snapshot).length,
          okMetrics: Object.keys(snapshot).length,
          failedMetrics: 0,
          infoMetrics: 0,
          warnMetrics: 0,
          hardLimitFailures: 0,
        },
        snapshot,
        baseline: payload,
        rows: [],
        updatedBaseline: true,
      });
      return;
    }
    console.log(`Updated ${path.relative(root, baselinePath)}`);
    return;
  }

  let baseline;
  try {
    baseline = await readGuardrailBaseline({ baselinePath });
  } catch {
    if (summaryJson) {
      writeGuardrailSummaryJson({
        generatedAt: new Date().toISOString(),
        status: 'failed',
        summary: {
          totalMetrics: 0,
          okMetrics: 0,
          failedMetrics: 0,
          infoMetrics: 0,
          warnMetrics: 0,
          hardLimitFailures: 0,
        },
        snapshot,
        baseline: null,
        rows: [],
        error:
          'Guardrail baseline is missing. Run: node scripts/architecture/check-guardrails.mjs --update-baseline',
      });
      process.exit(1);
      return;
    }
    console.error(
      'Guardrail baseline is missing. Run: node scripts/architecture/check-guardrails.mjs --update-baseline'
    );
    process.exit(1);
    return;
  }

  const comparison = compareGuardrailSnapshotAgainstBaseline(snapshot, baseline);
  const summary = summarizeComparisonRows(comparison.rows);

  if (summaryJson) {
    writeGuardrailSummaryJson({
      generatedAt: new Date().toISOString(),
      status: comparison.failed ? 'failed' : 'ok',
      summary,
      snapshot,
      baseline,
      rows: comparison.rows,
    });

    if (comparison.failed) {
      process.exit(1);
    }
    return;
  }

  console.log('Guardrail comparison against baseline');
  console.log(`Baseline generated at: ${baseline.generatedAt ?? 'unknown'}`);
  for (const row of comparison.rows) {
    console.log(formatGuardrailRow(row.label, row.current, row.max, row.status));
  }

  if (comparison.failed) {
    console.error('Guardrail check failed: one or more metrics exceeded baseline thresholds.');
    process.exit(1);
  }

  console.log('Guardrail check passed.');
};

run().catch((error) => {
  if (summaryJson) {
    writeGuardrailSummaryJson({
      generatedAt: new Date().toISOString(),
      status: 'failed',
      summary: {
        totalMetrics: 0,
        okMetrics: 0,
        failedMetrics: 0,
        infoMetrics: 0,
        warnMetrics: 0,
        hardLimitFailures: 0,
      },
      snapshot: {},
      baseline: null,
      rows: [],
      error: error instanceof Error ? error.stack ?? error.message : String(error),
    });
    process.exit(1);
    return;
  }
  console.error('[guardrails] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
