import path from 'node:path';

import { analyzeQueueRuntime } from './lib/check-queue-runtime.mjs';
import {
  formatDuration,
  parseCommonCheckArgs,
  renderIssueTable,
  renderRuleTable,
  writeCheckArtifacts,
} from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Queue Runtime Health Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Queues discovered: ${payload.summary.queueCount}`);
  lines.push(`- Queue init modules: ${payload.summary.queueInitModuleCount}`);
  lines.push(`- Explicit start calls: ${payload.summary.explicitStartCallCount}`);
  lines.push(`- Gated queues: ${payload.summary.gatedQueueCount}`);
  lines.push(`- Repeat-managed queues: ${payload.summary.repeatQueueModuleCount}`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push('');
  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Queue Inventory');
  lines.push('');
  lines.push('| Queue | File | Gated | Repeat-managed | Explicitly started | Start exports | Owner modules |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const queue of payload.queues) {
    lines.push(
      `| ${queue.queueName} | ${queue.file} | ${queue.gated ? 'yes' : 'no'} | ${queue.repeatManaged ? 'yes' : 'no'} | ${queue.explicitlyStarted ? 'yes' : 'no'} | ${queue.startExports.join(', ') || '-'} | ${queue.ownerModules.join(', ') || '-'} |`
    );
  }
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('No queue runtime issues detected.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This check validates queue registration and queue-init wiring, not live Redis health.');
  lines.push('- Repeatable and recovery jobs must be started explicitly and must set stable jobId values.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const root = process.cwd();
  const startedAt = Date.now();
  const { strictMode, failOnWarnings, shouldWriteHistory } = parseCommonCheckArgs();
  const payload = analyzeQueueRuntime({ root });
  payload.durationMs = Date.now() - startedAt;
  const markdown = toMarkdown(payload);
  const outputs = await writeCheckArtifacts({
    root,
    slug: 'queue-runtime',
    payload,
    markdown,
    shouldWriteHistory,
  });

  console.log(
    `[queue-runtime] status=${payload.status} queues=${payload.summary.queueCount} initModules=${payload.summary.queueInitModuleCount} errors=${payload.summary.errorCount} warnings=${payload.summary.warningCount} duration=${formatDuration(payload.durationMs)}`
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
  console.error('[queue-runtime] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
