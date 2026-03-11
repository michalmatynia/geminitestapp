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
  lines.push(`- Features without fast tests: ${payload.summary.featuresWithoutFastTestCount}`);
  lines.push(`- Features without negative-path tests: ${payload.summary.featuresWithoutNegativeTestCount}`);
  lines.push(`- Total test files: ${payload.summary.totalTestFiles}`);
  lines.push(`- .only() occurrences: ${payload.summary.onlyCount}`);
  lines.push(`- .skip() occurrences: ${payload.summary.skipCount}`);
  lines.push(`- .todo() occurrences: ${payload.summary.todoCount}`);
  lines.push('');

  if (payload.featuresWithTests.length > 0) {
    lines.push('## Test Coverage by Feature');
    lines.push('');
    lines.push('| Feature | Test Files | Fast | E2E | Negative |');
    lines.push('| --- | ---: | ---: | ---: | ---: |');
    for (const { feature, testCount, fastTestCount, e2eTestCount, negativePathTestCount } of payload.featuresWithTests) {
      lines.push(`| ${feature} | ${testCount} | ${fastTestCount} | ${e2eTestCount} | ${negativePathTestCount} |`);
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

  if (payload.featuresWithoutFastTests.length > 0) {
    lines.push('## Features Without Fast Tests');
    lines.push('');
    for (const feature of payload.featuresWithoutFastTests) {
      lines.push(`- ${feature}`);
    }
    lines.push('');
  }

  if (payload.featuresWithoutNegativeTests.length > 0) {
    lines.push('## Features Without Negative-Path Test Signals');
    lines.push('');
    for (const feature of payload.featuresWithoutNegativeTests) {
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
  lines.push('- `test-todo-left` (info): Placeholder tests should become executable coverage once behavior is ready.');
  lines.push('- `feature-no-tests` (warn): Every feature should have at least basic test coverage.');
  lines.push('- `feature-no-fast-tests` (warn): Features should have at least one fast, local non-e2e test.');
  lines.push('- `feature-no-negative-tests` (info): Features should add at least one negative-path or failure-mode test.');
  return `${lines.join('\n')}\n`;
};

await runQualityCheckCli({
  id: 'test-distribution',
  analyze: analyzeTestDistribution,
  toMarkdown,
  buildLogLines: ({ payload, formatDuration }) => [
    `[test-distribution] status=${payload.status} features=${payload.summary.featureCount} with-tests=${payload.summary.featuresWithTestCount} without-tests=${payload.summary.featuresWithoutTestCount} no-fast=${payload.summary.featuresWithoutFastTestCount} no-negative=${payload.summary.featuresWithoutNegativeTestCount} test-files=${payload.summary.totalTestFiles} .only=${payload.summary.onlyCount} .skip=${payload.summary.skipCount} .todo=${payload.summary.todoCount} duration=${formatDuration(payload.durationMs)}`,
  ],
});
