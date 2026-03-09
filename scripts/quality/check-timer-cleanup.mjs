import { analyzeTimerCleanup } from './lib/check-timer-cleanup.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Timer Cleanup Check');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Files scanned: ${payload.summary.fileCount}`);
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
    lines.push('All timers and event listeners have proper cleanup.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- `setinterval-no-cleanup` (error): setInterval without clearInterval causes memory leaks.');
  lines.push('- `settimeout-no-cleanup` (warn): setTimeout in useEffect without clearTimeout may fire after unmount.');
  lines.push('- `addeventlistener-no-removal` (warn): Event listeners without removeEventListener cause memory leaks.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'timer-cleanup',
  analyze: analyzeTimerCleanup,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[timer-cleanup] status=${payload.status} files=${payload.summary.fileCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
