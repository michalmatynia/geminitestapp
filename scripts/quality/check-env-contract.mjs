import path from 'node:path';

import { analyzeEnvContract } from './lib/check-env-contract.mjs';
import {
  formatDuration,
  parseCommonCheckArgs,
  renderIssueTable,
  renderRuleTable,
  writeCheckArtifacts,
} from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Environment Contract Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push(`- Info: ${payload.summary.infoCount}`);
  lines.push('');
  lines.push('## Environment Snapshot');
  lines.push('');
  lines.push(`- NODE_ENV: ${payload.environment.nodeEnv}`);
  lines.push(`- DATABASE_URL configured: ${payload.environment.hasDatabaseUrl}`);
  lines.push(`- MONGODB_URI configured: ${payload.environment.hasMongoUri}`);
  lines.push(`- APP_DB_PROVIDER: ${payload.environment.appDbProvider ?? 'unset'}`);
  lines.push(`- REDIS_URL configured: ${payload.environment.hasRedisUrl}`);
  lines.push(`- AUTH_SECRET configured: ${payload.environment.hasAuthSecret}`);
  lines.push(`- NEXTAUTH_SECRET configured: ${payload.environment.hasNextAuthSecret}`);
  lines.push(`- FASTCOMET env configured: ${payload.environment.hasFastCometConfig}`);
  lines.push('');
  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('No environment contract issues detected.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This report validates runtime env combinations that are easy to misconfigure in this mixed Prisma/Mongo/Redis setup.');
  lines.push('- Strict mode fails on error findings. Add --fail-on-warnings to promote warnings into a gate.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const root = process.cwd();
  const startedAt = Date.now();
  const { strictMode, failOnWarnings, shouldWriteHistory } = parseCommonCheckArgs();
  const payload = analyzeEnvContract({ env: process.env });
  payload.durationMs = Date.now() - startedAt;
  const markdown = toMarkdown(payload);
  const outputs = await writeCheckArtifacts({
    root,
    slug: 'env-contract',
    payload,
    markdown,
    shouldWriteHistory,
  });

  console.log(
    `[env-contract] status=${payload.status} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`
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
  console.error('[env-contract] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
