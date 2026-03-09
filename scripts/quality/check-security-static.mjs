import { analyzeSecurityStatic } from './lib/check-security-static.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Static Security Review');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Files scanned: ${payload.summary.fileCount}`);
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
    lines.push('No static security review issues detected.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This scan focuses on browser isolation, direct cookie access, runtime code execution, and raw HTML sinks.');
  lines.push('- Strict mode fails on error findings. Add --fail-on-warnings to promote review warnings into a gate.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'security-static',
  analyze: analyzeSecurityStatic,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[security-static] status=${payload.status} files=${payload.summary.fileCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
