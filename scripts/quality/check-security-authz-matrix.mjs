import path from 'node:path';

import { analyzeSecurityAuthzMatrix } from './lib/check-security-authz-matrix.mjs';
import {
  formatDuration,
  parseCommonCheckArgs,
  renderIssueTable,
  renderRuleTable,
  writeCheckArtifacts,
} from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Security Authorization Matrix Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Route files scanned: ${payload.summary.routeFileCount}`);
  lines.push(`- Route methods scanned: ${payload.summary.methodCount}`);
  lines.push(`- Public methods: ${payload.summary.publicRouteCount}`);
  lines.push(`- Protected methods: ${payload.summary.protectedRouteCount}`);
  lines.push(`- Signed ingress methods: ${payload.summary.signedRouteCount}`);
  lines.push(`- Actor-scoped methods: ${payload.summary.actorRouteCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push('');
  lines.push('## Route Classification');
  lines.push('');
  lines.push('| Route | Method | Expected Access | Evidence |');
  lines.push('| --- | --- | --- | --- |');
  for (const route of payload.routes) {
    lines.push(
      `| ${route.route} | ${route.method} | ${route.expectedAccess} | ${route.evidence.length > 0 ? route.evidence.map((part) => `\`${part}\``).join(', ') : '-' } |`
    );
  }
  lines.push('');
  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('No authorization coverage issues detected.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This check validates that non-public API routes show explicit auth, access-helper, actor, or signature evidence in their handlers.');
  lines.push('- Public exemptions are intentionally narrow and method-aware so browser telemetry and health routes do not mask broader auth drift.');
  lines.push('- Strict mode fails on authz coverage errors. Use --fail-on-warnings to also gate privileged routes that rely only on basic session auth.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const root = process.cwd();
  const startedAt = Date.now();
  const { strictMode, failOnWarnings, shouldWriteHistory } = parseCommonCheckArgs();
  const payload = analyzeSecurityAuthzMatrix({ root });
  payload.durationMs = Date.now() - startedAt;

  const markdown = toMarkdown(payload);
  const outputs = await writeCheckArtifacts({
    root,
    slug: 'security-authz-matrix',
    payload,
    markdown,
    shouldWriteHistory,
  });

  console.log(
    `[security-authz-matrix] status=${payload.status} routes=${payload.summary.routeFileCount} methods=${payload.summary.methodCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`
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
  console.error('[security-authz-matrix] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
