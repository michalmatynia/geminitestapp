import path from 'node:path';

import { analyzeAccessibilityComponentPolicies } from './lib/check-accessibility-component-policies.mjs';
import {
  formatDuration,
  parseCommonCheckArgs,
  renderIssueTable,
  renderRuleTable,
  writeCheckArtifacts,
} from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Accessibility Component Policy Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Files scanned: ${payload.summary.fileCount}`);
  lines.push(`- Dialogs checked: ${payload.summary.dialogCount}`);
  lines.push(`- Alert dialogs checked: ${payload.summary.alertDialogCount}`);
  lines.push(`- Tablists checked: ${payload.summary.tabsListCount}`);
  lines.push(`- Tooltips checked: ${payload.summary.tooltipCount}`);
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
    lines.push('No accessibility component policy issues detected.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This check validates shared primitive usage contracts before browser-level accessibility smoke tests.');
  lines.push('- Strict mode fails on accessibility policy errors. Use --fail-on-warnings to additionally gate tooltip triggers that stay mouse-only.');
  lines.push('- Unlabeled tablists are reported as informational guidance so the report stays focused on real keyboard and naming regressions.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const root = process.cwd();
  const startedAt = Date.now();
  const { strictMode, failOnWarnings, shouldWriteHistory } = parseCommonCheckArgs();
  const payload = analyzeAccessibilityComponentPolicies({ root });
  payload.durationMs = Date.now() - startedAt;
  const markdown = toMarkdown(payload);
  const outputs = await writeCheckArtifacts({
    root,
    slug: 'accessibility-component-policies',
    payload,
    markdown,
    shouldWriteHistory,
  });

  console.log(
    `[accessibility-component-policies] status=${payload.status} files=${payload.summary.fileCount} dialogs=${payload.summary.dialogCount} tablists=${payload.summary.tabsListCount} tooltips=${payload.summary.tooltipCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`
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
  console.error('[accessibility-component-policies] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
