import { analyzeRoutePolicies } from './lib/check-route-policies.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Route Policy Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Routes scanned: ${payload.summary.routeCount}`);
  lines.push(`- Method exports scanned: ${payload.summary.methodCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push(`- CSRF exemptions: ${payload.summary.csrfExemptionCount}`);
  lines.push('');
  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('No route policy issues detected.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## CSRF Exemption Inventory');
  lines.push('');
  lines.push('| Route | Method | Policy | Reason |');
  lines.push('| --- | --- | --- | --- |');
  for (const exemption of payload.csrfExemptions) {
    lines.push(
      `| ${exemption.routePath} | ${exemption.method} | ${exemption.policy} | ${exemption.reason} |`
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- App API routes should use apiHandler/apiHandlerWithParams consistently.');
  lines.push('- Source naming mismatches and dynamic wrapper mismatches are reported as warnings while legacy route conventions remain in place.');
  lines.push('- Strict mode fails on route policy errors. Add --fail-on-warnings to promote warnings into a gate.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'route-policies',
  analyze: analyzeRoutePolicies,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[route-policies] status=${payload.status} routes=${payload.summary.routeCount} methods=${payload.summary.methodCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
