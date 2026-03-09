import {
  UI_CONSOLIDATION_GUARDRAIL_RULES,
  buildUiConsolidationGuardrailSnapshot,
  collectGuardrailThresholdFailures,
  readGuardrailBaseline,
  resolveGuardrailBaselinePath,
} from './lib/guardrails-baseline.mjs';
import { collectNumericSummaryMetrics } from './lib/scan-summary-metrics.mjs';

const root = process.cwd();
const baselinePath = resolveGuardrailBaselinePath(root);

const run = async () => {
  const [propDrilling, uiConsolidation] = await Promise.all([
    collectNumericSummaryMetrics({
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
        componentsWithForwarding: 'componentsWithForwarding',
        highPriorityChainCount: 'highPriorityChainCount',
      },
    }),
    collectNumericSummaryMetrics({
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
        highPriorityCount: 'highPriorityCount',
        duplicateNameClusterCount: 'duplicateNameClusterCount',
        propSignatureClusterCount: 'propSignatureClusterCount',
        tokenSimilarityClusterCount: 'tokenSimilarityClusterCount',
      },
    }),
  ]);

  const snapshot = buildUiConsolidationGuardrailSnapshot(propDrilling, uiConsolidation);

  console.log('UI consolidation guardrail snapshot');
  console.log(
    [
      `propForwarding=${snapshot['propDrilling.componentsWithForwarding']}`,
      `propDepthGte4Chains=${snapshot['propDrilling.depthGte4Chains']}`,
      `uiOpportunities=${snapshot['uiConsolidation.totalOpportunities']}`,
      `uiHighPriority=${snapshot['uiConsolidation.highPriorityOpportunities']}`,
      `duplicateNameClusters=${snapshot['uiConsolidation.duplicateNameClusters']}`,
      `propSignatureClusters=${snapshot['uiConsolidation.propSignatureClusters']}`,
      `tokenSimilarityClusters=${snapshot['uiConsolidation.tokenSimilarityClusters']}`,
    ].join(' | ')
  );

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

  console.log(`Baseline generated at: ${baseline.generatedAt ?? 'unknown'}`);
  const failures = collectGuardrailThresholdFailures(
    snapshot,
    baseline,
    UI_CONSOLIDATION_GUARDRAIL_RULES
  );

  if (failures.length > 0) {
    console.error('UI consolidation guardrail check failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
    return;
  }

  console.log('UI consolidation guardrail check passed.');
};

run().catch((error) => {
  console.error('[check-ui-consolidation] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
