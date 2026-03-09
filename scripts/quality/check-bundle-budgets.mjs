import { analyzeBundleBudgets, formatBundleBytes } from './lib/check-bundle-budgets.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const renderBudgetValue = (value) => (Number.isFinite(value) ? formatBundleBytes(value) : '-');

const renderByteDelta = (actual, budget) => {
  if (!Number.isFinite(actual) || !Number.isFinite(budget)) return '-';
  const delta = actual - budget;
  return delta > 0 ? `+${formatBundleBytes(delta)}` : `-${formatBundleBytes(Math.abs(delta))}`;
};

const renderCountDelta = (actual, budget) => {
  if (!Number.isFinite(actual) || !Number.isFinite(budget)) return '-';
  const delta = actual - budget;
  return delta > 0 ? `+${delta}` : String(delta);
};

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Bundle Budget Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Page routes discovered: ${payload.summary.discoveredPageRouteCount}`);
  lines.push(`- Configured routes: ${payload.summary.configuredRouteCount}`);
  lines.push(`- Passing routes: ${payload.summary.passingRouteCount}`);
  lines.push(`- Failing routes: ${payload.summary.failingRouteCount}`);
  lines.push(`- Shared base JS: ${formatBundleBytes(payload.summary.baseBytes)} across ${payload.summary.baseChunkCount} chunks`);
  lines.push(`- Errors: ${payload.summary.errorCount}`);
  lines.push(`- Warnings: ${payload.summary.warningCount}`);
  lines.push('');
  lines.push('## Shared Base Budget');
  lines.push('');
  lines.push('| Scope | Status | JS Bytes | Budget | Delta | Chunks | Budget | Delta |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  lines.push(
    `| Shared base runtime | ${payload.base.status.toUpperCase()} | ${formatBundleBytes(payload.base.bytes)} | ${renderBudgetValue(payload.base.maxBytes)} | ${renderByteDelta(payload.base.bytes, payload.base.maxBytes)} | ${payload.base.chunkCount} | ${payload.base.maxChunkCount ?? '-'} | ${renderCountDelta(payload.base.chunkCount, payload.base.maxChunkCount)} |`
  );
  lines.push('');
  lines.push('## Route Budgets');
  lines.push('');
  lines.push(
    '| Route | Status | Total JS | Budget | Delta | Route JS | Budget | Delta | Chunks | Budget | Delta |'
  );
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const route of payload.routes) {
    lines.push(
      `| ${route.route} | ${route.status.toUpperCase()} | ${renderBudgetValue(route.totalBytes)} | ${renderBudgetValue(route.maxTotalBytes)} | ${renderByteDelta(route.totalBytes, route.maxTotalBytes)} | ${renderBudgetValue(route.routeBytes)} | ${renderBudgetValue(route.maxRouteBytes)} | ${renderByteDelta(route.routeBytes, route.maxRouteBytes)} | ${route.chunkCount ?? '-'} | ${route.maxChunkCount ?? '-'} | ${renderCountDelta(route.chunkCount, route.maxChunkCount)} |`
    );
  }
  lines.push('');
  lines.push('## Largest Route Chunks');
  lines.push('');
  for (const route of payload.routes) {
    lines.push(`### ${route.name}`);
    lines.push('');
    if (route.largestRouteChunks.length === 0) {
      lines.push('- No route-specific client chunks recorded.');
    } else {
      for (const chunk of route.largestRouteChunks) {
        lines.push(`- \`${chunk.path}\`: ${formatBundleBytes(chunk.bytes)}`);
      }
    }
    lines.push('');
  }
  lines.push('## Rule Breakdown');
  lines.push('');
  lines.push(...renderRuleTable(payload.rules));
  lines.push('');
  lines.push('## Issues');
  lines.push('');
  if (payload.issues.length === 0) {
    lines.push('No bundle budget issues detected.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This check reads the current `.next` app-router client reference manifests and measures emitted raw JS bytes, not compressed transfer size.');
  lines.push('- Shared base runtime covers `polyfillFiles` plus `rootMainFiles` from `build-manifest.json` and is applied to every configured route.');
  lines.push('- Run `npm run build` before using strict mode if the local `.next` output is missing or stale.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'bundle-budgets',
  analyze: analyzeBundleBudgets,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[bundle-budgets] status=${payload.status} routes=${payload.summary.configuredRouteCount} pass=${payload.summary.passingRouteCount} fail=${payload.summary.failingRouteCount} base=${formatBundleBytes(payload.summary.baseBytes)} duration=${formatDuration(payload.durationMs)}`,
  ],
});
