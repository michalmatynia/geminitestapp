import { analyzeTestDistribution } from './lib/check-test-distribution.mjs';
import { renderIssueTable, renderRuleTable, runQualityCheckCli } from './lib/check-runner.mjs';

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Test Distribution Check');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Total features: ${payload.summary.featureCount}`);
  lines.push(`- Features with tests: ${payload.summary.featuresWithTestCount}`);
  lines.push(`- Features without tests: ${payload.summary.featuresWithoutTestCount}`);
  lines.push(`- Total test files: ${payload.summary.totalTestFiles}`);
  lines.push(`- .only() occurrences: ${payload.summary.onlyCount}`);
  lines.push(`- .skip() occurrences: ${payload.summary.skipCount}`);
  lines.push('');

  if (payload.featuresWithTests.length > 0) {
    lines.push('## Test Coverage by Feature');
    lines.push('');
    lines.push('| Feature | Test Files |');
    lines.push('| --- | ---: |');
    for (const { feature, testCount } of payload.featuresWithTests) {
      lines.push(`| ${feature} | ${testCount} |`);
    }
    lines.push('');
  }

  if (payload.featuresWithoutTests.length > 0) {
    lines.push('## Features Without Tests');
    lines.push('');
    for (const feature of payload.featuresWithoutTests) {
      lines.push(`- ${feature}`);
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
    lines.push('All features have tests and no .only()/.skip() issues found.');
  } else {
    lines.push(...renderIssueTable(payload.issues));
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- `test-only-left` (error): .only() causes CI to skip other tests silently.');
  lines.push('- `test-skip-left` (info): Skipped tests should be tracked and eventually resolved.');
  lines.push('- `feature-no-tests` (warn): Every feature should have at least basic test coverage.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'test-distribution',
  analyze: analyzeTestDistribution,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[test-distribution] status=${payload.status} features=${payload.summary.featureCount} with-tests=${payload.summary.featuresWithTestCount} without-tests=${payload.summary.featuresWithoutTestCount} test-files=${payload.summary.totalTestFiles} .only=${payload.summary.onlyCount} .skip=${payload.summary.skipCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
