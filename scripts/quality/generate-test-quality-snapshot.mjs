import fs from 'node:fs/promises';
import path from 'node:path';

import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';
import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';
import { collectTestingQualitySnapshot } from './lib/testing-quality-snapshot.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const { strictMode, shouldWriteHistory, noWrite, summaryJson } = parseCommonCheckArgs(argv);

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0ms';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  return `${(seconds / 60).toFixed(1)}m`;
};

const formatAge = (hours) => {
  if (!Number.isFinite(hours) || hours < 0) {
    return 'n/a';
  }
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 48) {
    return `${hours.toFixed(1)}h`;
  }
  return `${(hours / 24).toFixed(1)}d`;
};

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Testing Quality Snapshot');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Repo test files: ${payload.summary.repoTestFileCount}`);
  lines.push(`- E2E specs: ${payload.summary.e2eTestFileCount}`);
  lines.push(`- Script/runtime tests: ${payload.summary.scriptTestFileCount}`);
  lines.push(`- Features without tests: ${payload.summary.featuresWithoutTestCount}`);
  lines.push(`- Features without fast tests: ${payload.summary.featuresWithoutFastTestCount}`);
  lines.push(`- Features without negative-path tests: ${payload.summary.featuresWithoutNegativeTestCount}`);
  lines.push(`- .only() occurrences: ${payload.summary.onlyCount}`);
  lines.push(`- .skip() occurrences: ${payload.summary.skipCount}`);
  lines.push(`- .todo() occurrences: ${payload.summary.todoCount}`);
  lines.push(`- Failing baselines: ${payload.summary.failingBaselineCount}`);
  lines.push(`- Missing baselines: ${payload.summary.missingBaselineCount}`);
  lines.push(`- Required failing baselines: ${payload.summary.requiredFailingBaselineCount}`);
  lines.push(`- Required missing baselines: ${payload.summary.requiredMissingBaselineCount}`);
  lines.push(`- Aging baselines: ${payload.summary.agingBaselineCount}`);
  lines.push(`- Stale baselines: ${payload.summary.staleBaselineCount}`);
  lines.push('');
  lines.push('## Baseline Status');
  lines.push('');
  lines.push('| Baseline | Required | Status | Pass rate | Passed / Total | Duration | Age | Source |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | --- |');
  for (const baseline of payload.baselines) {
    lines.push(
      `| ${baseline.label} | ${baseline.required ? 'yes' : 'no'} | ${baseline.status.toUpperCase()} | ${
        baseline.passRate === null ? 'n/a' : `${baseline.passRate}%`
      } | ${
        Number.isFinite(baseline.passedSuites) && Number.isFinite(baseline.totalSuites)
          ? `${baseline.passedSuites} / ${baseline.totalSuites}`
          : 'n/a'
      } | ${baseline.totalDurationMs === null ? 'n/a' : formatDuration(baseline.totalDurationMs)} | ${formatAge(
        baseline.ageHours
      )} | \`${baseline.sourcePath}\` |`
    );
  }
  lines.push('');
  lines.push('## Slowest Tracked Suites');
  lines.push('');
  if (payload.slowestSuites.length === 0) {
    lines.push('- No per-suite timing data available in the current baseline artifacts.');
  } else {
    lines.push('| Baseline | Suite | Status | Duration |');
    lines.push('| --- | --- | --- | ---: |');
    for (const suite of payload.slowestSuites) {
      lines.push(
        `| ${suite.baselineLabel} | ${suite.name} | ${String(suite.status).toUpperCase()} | ${formatDuration(
          suite.durationMs
        )} |`
      );
    }
  }
  lines.push('');
  lines.push('## Coverage Gaps');
  lines.push('');
  const missingBaselines = payload.baselines.filter((baseline) => baseline.status === 'missing');
  if (
    missingBaselines.length === 0 &&
    payload.featureCoverage.withoutTests.length === 0 &&
    payload.featureCoverage.withoutFastTests.length === 0 &&
    payload.featureCoverage.withoutNegativeTests.length === 0
  ) {
    lines.push('- No missing baseline artifacts or feature-level test gaps detected.');
  } else {
    if (missingBaselines.length > 0) {
      lines.push('- Missing baseline artifacts:');
      for (const baseline of missingBaselines) {
        lines.push(`  - ${baseline.label}: ${baseline.note ?? 'missing artifact'}`);
      }
    }
    if (payload.featureCoverage.withoutTests.length > 0) {
      lines.push('- Features without tests:');
      for (const feature of payload.featureCoverage.withoutTests.slice(0, 20)) {
        lines.push(`  - ${feature}`);
      }
      if (payload.featureCoverage.withoutTests.length > 20) {
        lines.push(`  - ...and ${payload.featureCoverage.withoutTests.length - 20} more`);
      }
    }
    if (payload.featureCoverage.withoutFastTests.length > 0) {
      lines.push('- Features without fast tests:');
      for (const feature of payload.featureCoverage.withoutFastTests.slice(0, 20)) {
        lines.push(`  - ${feature}`);
      }
      if (payload.featureCoverage.withoutFastTests.length > 20) {
        lines.push(`  - ...and ${payload.featureCoverage.withoutFastTests.length - 20} more`);
      }
    }
    if (payload.featureCoverage.withoutNegativeTests.length > 0) {
      lines.push('- Features without negative-path tests:');
      for (const feature of payload.featureCoverage.withoutNegativeTests.slice(0, 20)) {
        lines.push(`  - ${feature}`);
      }
      if (payload.featureCoverage.withoutNegativeTests.length > 20) {
        lines.push(`  - ...and ${payload.featureCoverage.withoutNegativeTests.length - 20} more`);
      }
    }
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This snapshot aggregates generated latest metrics instead of rerunning every lane itself.');
  lines.push('- Unit domains, critical flows, and security smoke become fresh when the weekly quality lane runs.');
  lines.push('- Integration baselines stay advisory until dedicated `*-latest.json` artifacts exist for Prisma and Mongo integration lanes.');
  return `${lines.join('\n')}\n`;
};

const writeArtifacts = async (payload) => {
  await fs.mkdir(outDir, { recursive: true });
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');

  const latestJsonPath = path.join(outDir, 'testing-quality-snapshot-latest.json');
  const latestMdPath = path.join(outDir, 'testing-quality-snapshot-latest.md');
  const historicalJsonPath = path.join(outDir, `testing-quality-snapshot-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `testing-quality-snapshot-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeMetricsMarkdownFile({
    root,
    targetPath: latestMdPath,
    content: toMarkdown(payload),
  });

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({
      root,
      targetPath: historicalMdPath,
      content: toMarkdown(payload),
    });
  }

  return {
    latestJson: path.relative(root, latestJsonPath),
    latestMarkdown: path.relative(root, latestMdPath),
    historicalJson: shouldWriteHistory ? path.relative(root, historicalJsonPath) : null,
    historicalMarkdown: shouldWriteHistory ? path.relative(root, historicalMdPath) : null,
  };
};

const buildSummaryJsonSummary = (payload) => ({
  status: payload.status,
  repoTestFileCount: payload.summary.repoTestFileCount,
  e2eTestFileCount: payload.summary.e2eTestFileCount,
  featuresWithoutTestCount: payload.summary.featuresWithoutTestCount,
  featuresWithoutFastTestCount: payload.summary.featuresWithoutFastTestCount,
  featuresWithoutNegativeTestCount: payload.summary.featuresWithoutNegativeTestCount,
  failingBaselineCount: payload.summary.failingBaselineCount,
  missingBaselineCount: payload.summary.missingBaselineCount,
  requiredFailingBaselineCount: payload.summary.requiredFailingBaselineCount,
  requiredMissingBaselineCount: payload.summary.requiredMissingBaselineCount,
  todoCount: payload.summary.todoCount,
});

const shouldFailStrict = (payload) =>
  payload.summary.requiredFailingBaselineCount > 0 ||
  payload.summary.requiredMissingBaselineCount > 0 ||
  payload.summary.onlyCount > 0;

const run = async () => {
  const payload = collectTestingQualitySnapshot({ root });
  const paths = noWrite ? null : await writeArtifacts(payload);

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'testing-quality-snapshot',
      generatedAt: payload.generatedAt,
      status: payload.status === 'fail' ? 'failed' : payload.status,
      summary: buildSummaryJsonSummary(payload),
      details: {
        inventory: payload.inventory,
        baselines: payload.baselines,
        slowestSuites: payload.slowestSuites,
        featureCoverage: payload.featureCoverage,
      },
      paths,
      filters: {
        strictMode,
        historyDisabled: !shouldWriteHistory,
        noWrite,
        ci: args.has('--ci'),
      },
      notes: ['testing quality snapshot result'],
    });

    if (strictMode && shouldFailStrict(payload)) {
      process.exit(1);
    }
    return;
  }

  console.log(
    `[testing-quality] status=${payload.status} repo-tests=${payload.summary.repoTestFileCount} baselines=${payload.summary.availableBaselineCount}/${payload.summary.baselineCount} fail=${payload.summary.failingBaselineCount} missing=${payload.summary.missingBaselineCount} todo=${payload.summary.todoCount}`
  );

  if (paths) {
    console.log(`Wrote ${paths.latestJson}`);
    console.log(`Wrote ${paths.latestMarkdown}`);
    if (paths.historicalJson) {
      console.log(`Wrote ${paths.historicalJson}`);
      console.log(`Wrote ${paths.historicalMarkdown}`);
    }
  } else {
    console.log('Skipped writing testing quality snapshot artifacts (--no-write).');
  }

  if (strictMode && shouldFailStrict(payload)) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[testing-quality] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
