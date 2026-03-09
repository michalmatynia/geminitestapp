import { analyzeApiInputValidation } from './lib/check-api-input-validation.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

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

await runQualityCheckCli({
  id: 'api-input-validation',
  analyze: analyzeApiInputValidation,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[api-input-validation] status=${payload.status} handlers=${payload.summary.totalHandlers} validated=${payload.summary.validatedHandlers} coverage=${payload.summary.coveragePercent}% errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
