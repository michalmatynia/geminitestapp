import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = process.cwd();

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

  if (
    !Number.isFinite(componentsWithForwarding) ||
    !Number.isFinite(highPriorityChainCount) ||
    !Number.isFinite(totalOpportunities) ||
    !Number.isFinite(highPriorityCount)
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
    ].join(' | ')
  );

  const failures = [];
  if (componentsWithForwarding > 0) {
    failures.push(`Expected prop forwarding components = 0, got ${componentsWithForwarding}.`);
  }
  if (highPriorityChainCount > 0) {
    failures.push(`Expected prop depth>=4 chains = 0, got ${highPriorityChainCount}.`);
  }
  if (totalOpportunities > 0) {
    failures.push(`Expected UI consolidation opportunities = 0, got ${totalOpportunities}.`);
  }
  if (highPriorityCount > 0) {
    failures.push(`Expected high-priority UI opportunities = 0, got ${highPriorityCount}.`);
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
