import fs from 'node:fs';
import path from 'node:path';

import { highRiskCoverageTargets } from '../config/high-risk-coverage.config.mjs';
import { createIssue, sortIssues, summarizeIssues, summarizeRules } from './check-runner.mjs';

const METRIC_KEYS = ['lines', 'statements', 'functions', 'branches'];
const DEFAULT_COVERAGE_SUMMARY_PATH = 'coverage/coverage-summary.json';

const toRepoRelativeCoverageKey = (root, filePath) => {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    return null;
  }

  if (path.isAbsolute(filePath)) {
    return path.relative(root, filePath).replace(/\\/g, '/');
  }

  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
};

const readCoverageSummary = (root, relativeCoveragePath) => {
  const absolutePath = path.join(root, relativeCoveragePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return {
    absolutePath,
    relativePath: relativeCoveragePath,
    payload: JSON.parse(fs.readFileSync(absolutePath, 'utf8')),
  };
};

const summarizeMetric = (entries, metricKey) => {
  const aggregate = entries.reduce(
    (acc, entry) => {
      const metric = entry?.[metricKey];
      return {
        total: acc.total + Number(metric?.total ?? 0),
        covered: acc.covered + Number(metric?.covered ?? 0),
        skipped: acc.skipped + Number(metric?.skipped ?? 0),
      };
    },
    { total: 0, covered: 0, skipped: 0 }
  );

  return {
    ...aggregate,
    pct:
      aggregate.total <= 0
        ? 100
        : Number(((aggregate.covered / aggregate.total) * 100).toFixed(1)),
  };
};

const summarizeTarget = ({ target, entries }) => {
  const metrics = Object.fromEntries(
    METRIC_KEYS.map((metricKey) => [metricKey, summarizeMetric(entries, metricKey)])
  );

  const failingMetrics = METRIC_KEYS.filter(
    (metricKey) => metrics[metricKey].pct < Number(target.thresholds[metricKey] ?? 0)
  ).map((metricKey) => ({
    metric: metricKey,
    pct: metrics[metricKey].pct,
    threshold: Number(target.thresholds[metricKey] ?? 0),
  }));

  return {
    id: target.id,
    label: target.label,
    directory: target.directory,
    thresholds: target.thresholds,
    fileCount: entries.length,
    metrics,
    status: failingMetrics.length > 0 ? 'fail' : 'pass',
    failingMetrics,
  };
};

export const analyzeHighRiskCoverage = ({
  root = process.cwd(),
  coverageSummaryPath = process.env.COVERAGE_SUMMARY_PATH ?? DEFAULT_COVERAGE_SUMMARY_PATH,
  targets = highRiskCoverageTargets,
} = {}) => {
  const issues = [];
  const coverageSummary = readCoverageSummary(root, coverageSummaryPath);

  if (!coverageSummary) {
    issues.push(
      createIssue({
        severity: 'warn',
        ruleId: 'high-risk-coverage-report-missing',
        context: coverageSummaryPath,
        message:
          'Coverage summary artifact is missing. Run `npm run test:coverage` or point COVERAGE_SUMMARY_PATH at a coverage-summary.json file.',
      })
    );

    const sortedIssues = sortIssues(issues);
    const summary = summarizeIssues(sortedIssues);

    return {
      generatedAt: new Date().toISOString(),
      status: summary.status,
      summary: {
        ...summary,
        targetCount: targets.length,
        matchedTargetCount: 0,
        passingTargetCount: 0,
        failingTargetCount: 0,
        uncoveredTargetCount: targets.length,
      },
      coverageSummaryPath,
      targets: targets.map((target) => ({
        id: target.id,
        label: target.label,
        directory: target.directory,
        thresholds: target.thresholds,
        fileCount: 0,
        metrics: null,
        status: 'missing',
        failingMetrics: [],
      })),
      issues: sortedIssues,
      rules: summarizeRules(sortedIssues),
    };
  }

  const fileEntries = Object.entries(coverageSummary.payload)
    .filter(([filePath, value]) => filePath !== 'total' && value && typeof value === 'object')
    .map(([filePath, value]) => ({
      filePath: toRepoRelativeCoverageKey(root, filePath),
      metrics: value,
    }))
    .filter((entry) => typeof entry.filePath === 'string' && entry.filePath.length > 0);

  const targetSummaries = targets.map((target) => {
    const prefix = `${target.directory.replace(/\\/g, '/')}/`;
    const matchingEntries = fileEntries
      .filter((entry) => entry.filePath.startsWith(prefix))
      .map((entry) => entry.metrics);

    if (matchingEntries.length === 0) {
      issues.push(
        createIssue({
          severity: 'warn',
          ruleId: 'high-risk-coverage-target-unmatched',
          context: target.directory,
          message: `Coverage summary has no file entries under ${target.directory}.`,
        })
      );

      return {
        id: target.id,
        label: target.label,
        directory: target.directory,
        thresholds: target.thresholds,
        fileCount: 0,
        metrics: null,
        status: 'missing',
        failingMetrics: [],
      };
    }

    const summary = summarizeTarget({ target, entries: matchingEntries });
    if (summary.failingMetrics.length > 0) {
      const failingMetricSummary = summary.failingMetrics
        .map(({ metric, pct, threshold }) => `${metric} ${pct}% < ${threshold}%`)
        .join(', ');

      issues.push(
        createIssue({
          severity: 'error',
          ruleId: 'high-risk-coverage-threshold',
          context: target.directory,
          message: `${target.label} coverage is below threshold: ${failingMetricSummary}.`,
        })
      );
    }

    return summary;
  });

  const sortedIssues = sortIssues(issues);
  const summary = summarizeIssues(sortedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status: summary.status,
    summary: {
      ...summary,
      targetCount: targetSummaries.length,
      matchedTargetCount: targetSummaries.filter((target) => target.fileCount > 0).length,
      passingTargetCount: targetSummaries.filter((target) => target.status === 'pass').length,
      failingTargetCount: targetSummaries.filter((target) => target.status === 'fail').length,
      uncoveredTargetCount: targetSummaries.filter((target) => target.status === 'missing').length,
    },
    coverageSummaryPath: coverageSummary.relativePath,
    targets: targetSummaries,
    issues: sortedIssues,
    rules: summarizeRules(sortedIssues),
  };
};
