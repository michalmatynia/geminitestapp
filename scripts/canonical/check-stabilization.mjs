import process from 'node:process';

import { runStabilizationGates, buildStabilizationGateSummaryJson } from './lib/stabilization-gate-runner.mjs';

const args = new Set(process.argv.slice(2));
const summaryJson = args.has('--summary-json');

const main = async () => {
  const result = await runStabilizationGates({
    cwd: process.cwd(),
    env: process.env,
    logger: summaryJson ? null : console,
    prefix: 'stabilization:check',
  });

  if (summaryJson) {
    console.log(JSON.stringify(buildStabilizationGateSummaryJson(result), null, 2));
  } else if (result.ok) {
    console.log('[canonical:stabilization:check] passed');
  } else {
    console.error('[canonical:stabilization:check] failed');
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error('[canonical:stabilization:check] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
