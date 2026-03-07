import path from 'node:path';

import { analyzeApiContractCoverage } from './lib/check-api-contract-coverage.mjs';
import {
  formatDuration,
  parseCommonCheckArgs,
  renderIssueTable,
  renderRuleTable,
  writeCheckArtifacts,
} from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# API Contract Coverage Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Route files scanned: ${payload.summary.routeFileCount}`);
  lines.push(`- Route methods scanned: ${payload.summary.methodCount}`);
  lines.push(`- Methods with adjacent tests: ${payload.summary.methodsWithTests}`);
  lines.push(`- Mutations with body validation: ${payload.summary.mutationValidationCount}`);
  lines.push(`- Query routes with validation: ${payload.summary.queryValidationCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push(`- Info: ${payload.summary.infoCount}`);
  lines.push('');
  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('No API contract coverage gaps detected.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Route Inventory');
  lines.push('');
  lines.push('| Route | Method | Access | Tests | Body Validation | Query Validation |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const route of payload.routes) {
    lines.push(
      `| ${route.route} | ${route.method} | ${route.expectedAccess} | ${route.hasTests ? 'yes' : 'no'} | ${
        route.bodyValidated === null ? '-' : route.bodyValidated ? 'yes' : 'no'
      } | ${route.queryValidated === null ? '-' : route.queryValidated ? 'yes' : 'no'} |`
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This check looks for explicit request validation and nearby handler/route tests for each API method.');
  lines.push('- Strict mode fails on missing body validation errors. Add --fail-on-warnings to also gate missing tests and query validation warnings.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const root = process.cwd();
  const startedAt = Date.now();
  const { strictMode, failOnWarnings, shouldWriteHistory } = parseCommonCheckArgs();
  const payload = analyzeApiContractCoverage({ root });
  payload.durationMs = Date.now() - startedAt;

  const markdown = toMarkdown(payload);
  const outputs = await writeCheckArtifacts({
    root,
    slug: 'api-contract-coverage',
    payload,
    markdown,
    shouldWriteHistory,
  });

  console.log(
    `[api-contract-coverage] status=${payload.status} routes=${payload.summary.routeFileCount} methods=${payload.summary.methodCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`
  );
  console.log(`Wrote ${path.relative(root, outputs.latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, outputs.latestMdPath)}`);
  if (shouldWriteHistory) {
    console.log(`Wrote ${path.relative(root, outputs.historicalJsonPath)}`);
    console.log(`Wrote ${path.relative(root, outputs.historicalMdPath)}`);
  }

  if (strictMode && payload.summary.errorCount > 0) {
    process.exit(1);
  }
  if (strictMode && failOnWarnings && payload.summary.warningCount > 0) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[api-contract-coverage] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
