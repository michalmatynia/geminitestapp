import { analyzeClientBoundaries } from './lib/client-boundary-audit.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Client Boundary Check');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Files scanned: ${payload.summary.fileCount}`);
  lines.push(`- Server-reachable files: ${payload.summary.serverReachableFileCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Missing client boundaries: ${payload.summary.missingBoundaryFileCount}`);
  lines.push(`- Review candidates for removing \`use client\`: ${payload.summary.removableCandidateCount}`);
  lines.push('');
  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('No missing client boundaries detected.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- Server-by-default is preferred, but client boundaries must stay in files that call client-only hooks or browser APIs.');
  lines.push('- Review candidates are informational only; remove `use client` only after route-level verification.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'client-boundaries',
  analyze: analyzeClientBoundaries,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[client-boundaries] status=${payload.status} files=${payload.summary.fileCount} serverReachable=${payload.summary.serverReachableFileCount} errors=${payload.summary.errorCount} missing=${payload.summary.missingBoundaryFileCount} candidates=${payload.summary.removableCandidateCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
