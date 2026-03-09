import { analyzeStorageAndFiles } from './lib/check-storage-and-files.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Storage And Files Health Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Source files scanned: ${payload.summary.fileCount}`);
  lines.push(`- Code upload roots: ${payload.summary.codeUploadRootCount}`);
  lines.push(`- Runtime upload roots: ${payload.summary.runtimeUploadRootCount}`);
  lines.push(`- Dynamic public-path read risks: ${payload.summary.dynamicReadRiskCount}`);
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
    lines.push('No storage or file-health issues detected.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Upload Root Inventory');
  lines.push('');
  lines.push('| Kind | Root |');
  lines.push('| --- | --- |');
  for (const root of payload.inventory.knownUploadRoots) {
    lines.push(`| code | ${root} |`);
  }
  for (const root of payload.inventory.runtimeUploadRoots) {
    lines.push(`| runtime | ${root} |`);
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This check focuses on dynamic /public path resolution safety and drift in local upload roots.');
  lines.push('- Strict mode fails on storage path-safety errors. Add --fail-on-warnings to also gate missing local uploads roots or unknown runtime upload roots.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'storage-and-files',
  analyze: analyzeStorageAndFiles,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[storage-and-files] status=${payload.status} files=${payload.summary.fileCount} dynamic_read_risks=${payload.summary.dynamicReadRiskCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
