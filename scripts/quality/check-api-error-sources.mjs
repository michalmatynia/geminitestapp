import path from 'node:path';

import { analyzeApiErrorSources } from './lib/check-api-error-sources.mjs';
import {
  formatDuration,
  parseCommonCheckArgs,
  renderIssueTable,
  renderRuleTable,
  writeCheckArtifacts,
} from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# API Error Sources Check');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Route files scanned: ${payload.summary.routeFileCount}`);
  lines.push(`- Handler files scanned: ${payload.summary.handlerFileCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push('');
  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('All API error sources are consistent.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- `source-mismatch-handler` / `source-mismatch-error-response` (error): Handler source names must match the route path convention.');
  lines.push('- `api-handler-missing-wrapper` (error): All API routes should use apiHandler/apiHandlerWithParams.');
  lines.push('- `unchecked-req-json` (warn): Use parseJsonBody() with Zod schemas for consistent validation.');
  lines.push('- `raw-new-response` (warn): Use createErrorResponse/createSuccessResponse for consistent error handling.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const root = process.cwd();
  const startedAt = Date.now();
  const { strictMode, failOnWarnings, shouldWriteHistory } = parseCommonCheckArgs();
  const payload = analyzeApiErrorSources({ root });
  payload.durationMs = Date.now() - startedAt;
  const markdown = toMarkdown(payload);
  const outputs = await writeCheckArtifacts({
    root,
    slug: 'api-error-sources',
    payload,
    markdown,
    shouldWriteHistory,
  });

  console.log(
    `[api-error-sources] status=${payload.status} routes=${payload.summary.routeFileCount} handlers=${payload.summary.handlerFileCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`
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
  console.error('[api-error-sources] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
