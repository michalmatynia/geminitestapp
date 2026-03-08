import path from 'node:path';

import { analyzeApiInputValidation } from './lib/check-api-input-validation.mjs';
import {
  formatDuration,
  parseCommonCheckArgs,
  renderIssueTable,
  renderRuleTable,
  writeCheckArtifacts,
} from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# API Input Validation Check');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Files scanned: ${payload.summary.fileCount}`);
  lines.push(`- Total handlers: ${payload.summary.totalHandlers}`);
  lines.push(`- Validated handlers: ${payload.summary.validatedHandlers}`);
  lines.push(`- **Coverage: ${payload.summary.coveragePercent}%**`);
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
    lines.push('All API handlers have proper input validation.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- `req-json-no-schema` (error): All request body parsing should use `parseJsonBody()` with a Zod schema.');
  lines.push('- `url-param-unvalidated` (warn): Dynamic route params `[param]` should be validated with Zod.');
  lines.push('- `query-param-unvalidated` (warn): Query string params via `searchParams.get()` should be validated.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const root = process.cwd();
  const startedAt = Date.now();
  const { strictMode, failOnWarnings, shouldWriteHistory } = parseCommonCheckArgs();
  const payload = analyzeApiInputValidation({ root });
  payload.durationMs = Date.now() - startedAt;
  const markdown = toMarkdown(payload);
  const outputs = await writeCheckArtifacts({
    root,
    slug: 'api-input-validation',
    payload,
    markdown,
    shouldWriteHistory,
  });

  console.log(
    `[api-input-validation] status=${payload.status} handlers=${payload.summary.totalHandlers} validated=${payload.summary.validatedHandlers} coverage=${payload.summary.coveragePercent}% errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`
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
  console.error('[api-input-validation] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
