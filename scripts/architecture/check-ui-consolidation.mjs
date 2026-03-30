import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  UI_CONSOLIDATION_GUARDRAIL_RULES,
  buildUiConsolidationGuardrailSnapshot,
  collectGuardrailThresholdFailures,
  readGuardrailBaseline,
  resolveGuardrailBaselinePath,
} from './lib/guardrails-baseline.mjs';
import { collectNumericSummaryMetrics } from './lib/scan-summary-metrics.mjs';
import { buildStaticCheckFilters, parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const root = process.cwd();
const baselinePath = resolveGuardrailBaselinePath(root);
const scanPropDrillingScriptPath = fileURLToPath(new URL('./scan-prop-drilling.mjs', import.meta.url));
const scanUiConsolidationScriptPath = fileURLToPath(
  new URL('./scan-ui-consolidation.mjs', import.meta.url)
);
const { noWrite, summaryJson } = parseCommonCheckArgs(argv);

const buildUiConsolidationSummary = (snapshot, failures, { configurationError = false } = {}) => ({
  totalRules: UI_CONSOLIDATION_GUARDRAIL_RULES.length,
  failedRules: configurationError ? 0 : failures.length,
  passedRules: configurationError ? 0 : UI_CONSOLIDATION_GUARDRAIL_RULES.length - failures.length,
  propForwardingCount: snapshot['propDrilling.componentsWithForwarding'] ?? 0,
  propDepthGte4ChainCount: snapshot['propDrilling.depthGte4Chains'] ?? 0,
  totalOpportunityCount: snapshot['uiConsolidation.totalOpportunities'] ?? 0,
  highPriorityOpportunityCount: snapshot['uiConsolidation.highPriorityOpportunities'] ?? 0,
  configurationError,
});

const writeUiConsolidationSummaryJson = ({
  generatedAt = new Date().toISOString(),
  status = 'ok',
  summary,
  snapshot,
  failures,
  baselineGeneratedAt = null,
  error = null,
}) => {
  writeSummaryJson({
    scannerName: 'ui-consolidation-guardrail',
    generatedAt,
    status,
    summary,
    details: {
      snapshot,
      failures,
      baselineGeneratedAt,
      baselinePath: path.relative(root, baselinePath),
      rules: UI_CONSOLIDATION_GUARDRAIL_RULES,
      error,
    },
    filters: {
      ...buildStaticCheckFilters(),
      noWrite,
      ci: args.has('--ci'),
    },
    notes: ['ui consolidation guardrail result'],
  });
};

const buildScannerArgs = (scriptPath) => {
  const commandArgs = [scriptPath, '--ci', '--no-history', '--summary-json'];
  if (noWrite) {
    commandArgs.splice(3, 0, '--no-write');
  }
  return commandArgs;
};

const run = async () => {
  const [propDrilling, uiConsolidation] = await Promise.all([
    collectNumericSummaryMetrics({
      cwd: root,
      commandArgs: buildScannerArgs(scanPropDrillingScriptPath),
      sourceName: 'scan-prop-drilling',
      fields: {
        componentsWithForwarding: 'componentsWithForwarding',
        highPriorityChainCount: 'highPriorityChainCount',
      },
    }),
    collectNumericSummaryMetrics({
      cwd: root,
      commandArgs: buildScannerArgs(scanUiConsolidationScriptPath),
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

  let baseline;
  try {
    baseline = await readGuardrailBaseline({ baselinePath });
  } catch {
    if (summaryJson) {
      writeUiConsolidationSummaryJson({
        generatedAt: new Date().toISOString(),
        status: 'failed',
        summary: buildUiConsolidationSummary(snapshot, [], { configurationError: true }),
        snapshot,
        failures: [],
        baselineGeneratedAt: null,
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

  const failures = collectGuardrailThresholdFailures(
    snapshot,
    baseline,
    UI_CONSOLIDATION_GUARDRAIL_RULES
  );

  if (summaryJson) {
    writeUiConsolidationSummaryJson({
      generatedAt: new Date().toISOString(),
      status: failures.length > 0 ? 'failed' : 'ok',
      summary: buildUiConsolidationSummary(snapshot, failures),
      snapshot,
      failures,
      baselineGeneratedAt: baseline.generatedAt ?? null,
    });

    if (failures.length > 0) {
      process.exit(1);
    }
    return;
  }

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
  console.log(`Baseline generated at: ${baseline.generatedAt ?? 'unknown'}`);

  if (failures.length > 0) {
    console.error('UI consolidation guardrail check failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
    return;
  }

  console.log('UI consolidation guardrail check passed.');
};

run().catch((error) => {
  if (summaryJson) {
    writeUiConsolidationSummaryJson({
      generatedAt: new Date().toISOString(),
      status: 'failed',
      summary: buildUiConsolidationSummary({}, [], { configurationError: true }),
      snapshot: {},
      failures: [],
      baselineGeneratedAt: null,
      error: error instanceof Error ? error.stack ?? error.message : String(error),
    });
    process.exit(1);
    return;
  }

  console.error('[check-ui-consolidation] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
