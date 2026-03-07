import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = process.cwd();
const baselinePath = path.join(root, 'scripts', 'architecture', 'guardrails-baseline.json');

const parseSummary = (stdout, sourceLabel) => {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${sourceLabel} did not return JSON summary output.`);
  }

  const summary = parsed?.summary;
  if (!summary || typeof summary !== 'object') {
    throw new Error(`${sourceLabel} summary is missing.`);
  }
  return summary;
};

const readBaseline = async () => {
  const raw = await fs.readFile(baselinePath, 'utf8');
  return JSON.parse(raw);
};

const run = async () => {
  const [propResult, uiResult] = await Promise.all([
    execFile(
      'node',
      [
        'scripts/architecture/scan-prop-drilling.mjs',
        '--ci',
        '--no-history',
        '--no-write',
        '--summary-json',
      ],
      { cwd: root }
    ),
    execFile(
      'node',
      [
        'scripts/architecture/scan-ui-consolidation.mjs',
        '--ci',
        '--no-history',
        '--no-write',
        '--summary-json',
      ],
      { cwd: root }
    ),
  ]);

  const propSummary = parseSummary(propResult.stdout, 'scan-prop-drilling');
  const uiSummary = parseSummary(uiResult.stdout, 'scan-ui-consolidation');

  const componentsWithForwarding = Number(propSummary.componentsWithForwarding);
  const highPriorityChainCount = Number(propSummary.highPriorityChainCount);
  const totalOpportunities = Number(uiSummary.totalOpportunities);
  const highPriorityCount = Number(uiSummary.highPriorityCount);
  const duplicateNameClusterCount = Number(uiSummary.duplicateNameClusterCount);
  const propSignatureClusterCount = Number(uiSummary.propSignatureClusterCount);
  const tokenSimilarityClusterCount = Number(uiSummary.tokenSimilarityClusterCount);

  if (
    !Number.isFinite(componentsWithForwarding) ||
    !Number.isFinite(highPriorityChainCount) ||
    !Number.isFinite(totalOpportunities) ||
    !Number.isFinite(highPriorityCount) ||
    !Number.isFinite(duplicateNameClusterCount) ||
    !Number.isFinite(propSignatureClusterCount) ||
    !Number.isFinite(tokenSimilarityClusterCount)
  ) {
    throw new Error('One or more consolidation summary metrics are invalid.');
  }

  console.log('UI consolidation guardrail snapshot');
  console.log(
    [
      `propForwarding=${componentsWithForwarding}`,
      `propDepthGte4Chains=${highPriorityChainCount}`,
      `uiOpportunities=${totalOpportunities}`,
      `uiHighPriority=${highPriorityCount}`,
      `duplicateNameClusters=${duplicateNameClusterCount}`,
      `propSignatureClusters=${propSignatureClusterCount}`,
      `tokenSimilarityClusters=${tokenSimilarityClusterCount}`,
    ].join(' | ')
  );

  let baseline;
  try {
    baseline = await readBaseline();
  } catch {
    console.error(
      'Guardrail baseline is missing. Run: node scripts/architecture/check-guardrails.mjs --update-baseline'
    );
    process.exit(1);
    return;
  }

  const maxByKey = baseline.max ?? {};
  const maxComponentsWithForwarding = Number(maxByKey['propDrilling.componentsWithForwarding'] ?? 0);
  const maxHighPriorityChainCount = Number(maxByKey['propDrilling.depthGte4Chains'] ?? 0);
  const maxTotalOpportunities = Number(maxByKey['uiConsolidation.totalOpportunities'] ?? 0);
  const maxHighPriorityCount = Number(maxByKey['uiConsolidation.highPriorityOpportunities'] ?? 0);
  const maxDuplicateNameClusterCount = Number(maxByKey['uiConsolidation.duplicateNameClusters'] ?? 0);
  const maxPropSignatureClusterCount = Number(maxByKey['uiConsolidation.propSignatureClusters'] ?? 0);
  const maxTokenSimilarityClusterCount = Number(
    maxByKey['uiConsolidation.tokenSimilarityClusters'] ?? 0
  );

  console.log(`Baseline generated at: ${baseline.generatedAt ?? 'unknown'}`);

  const failures = [];
  if (componentsWithForwarding > maxComponentsWithForwarding) {
    failures.push(
      `Expected prop forwarding components <= ${maxComponentsWithForwarding}, got ${componentsWithForwarding}.`
    );
  }
  if (highPriorityChainCount > maxHighPriorityChainCount) {
    failures.push(
      `Expected prop depth>=4 chains <= ${maxHighPriorityChainCount}, got ${highPriorityChainCount}.`
    );
  }
  if (totalOpportunities > maxTotalOpportunities) {
    failures.push(
      `Expected UI consolidation opportunities <= ${maxTotalOpportunities}, got ${totalOpportunities}.`
    );
  }
  if (highPriorityCount > maxHighPriorityCount) {
    failures.push(
      `Expected high-priority UI opportunities <= ${maxHighPriorityCount}, got ${highPriorityCount}.`
    );
  }
  if (duplicateNameClusterCount > maxDuplicateNameClusterCount) {
    failures.push(
      `Expected duplicate-name clusters <= ${maxDuplicateNameClusterCount}, got ${duplicateNameClusterCount}.`
    );
  }
  if (propSignatureClusterCount > maxPropSignatureClusterCount) {
    failures.push(
      `Expected prop-signature clusters <= ${maxPropSignatureClusterCount}, got ${propSignatureClusterCount}.`
    );
  }
  if (tokenSimilarityClusterCount > maxTokenSimilarityClusterCount) {
    failures.push(
      `Expected token-similarity clusters <= ${maxTokenSimilarityClusterCount}, got ${tokenSimilarityClusterCount}.`
    );
  }

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
