import { analyzeNextRouteConfigReexports } from './lib/check-next-route-config-reexports.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Next Route Config Re-Export Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Route files scanned: ${payload.summary.routeCount}`);
  lines.push(`- Issues: ${payload.summary.issueCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push('');
  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('No Next route config re-exports detected.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- Next.js route segment config must be declared directly in the route file.');
  lines.push('- Re-exporting fields like `dynamic` or `runtime` from another module can fail production builds.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'next-route-config-reexports',
  analyze: analyzeNextRouteConfigReexports,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[next-route-config-reexports] status=${payload.status} routes=${payload.summary.routeCount} errors=${payload.summary.errorCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
