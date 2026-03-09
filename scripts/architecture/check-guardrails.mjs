import path from 'node:path';

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

const args = new Set(process.argv.slice(2));
const root = process.cwd();
const baselinePath = resolveGuardrailBaselinePath(root);

const collectPropDrillingGuardrail = async () => {
  return collectNumericSummaryMetrics({
    cwd: root,
    commandArgs: [
      'scripts/architecture/scan-prop-drilling.mjs',
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
      'scripts/architecture/scan-ui-consolidation.mjs',
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

const run = async () => {
  const metrics = await collectMetrics({ root });
  const [propDrilling, uiConsolidation] = await Promise.all([
    collectPropDrillingGuardrail(),
    collectUiConsolidationGuardrail(),
  ]);
  const snapshot = buildArchitectureGuardrailSnapshot(metrics, propDrilling, uiConsolidation);

  if (args.has('--update-baseline')) {
    await writeGuardrailBaseline(snapshot, { baselinePath });
    console.log(`Updated ${path.relative(root, baselinePath)}`);
    return;
  }

  let baseline;
  try {
    baseline = await readGuardrailBaseline({ baselinePath });
  } catch {
    console.error(
      'Guardrail baseline is missing. Run: node scripts/architecture/check-guardrails.mjs --update-baseline'
    );
    process.exit(1);
    return;
  }

  console.log('Guardrail comparison against baseline');
  console.log(`Baseline generated at: ${baseline.generatedAt ?? 'unknown'}`);
  const comparison = compareGuardrailSnapshotAgainstBaseline(snapshot, baseline);
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
  console.error('[guardrails] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
