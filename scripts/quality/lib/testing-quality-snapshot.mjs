import fs from 'node:fs';
import path from 'node:path';

import { analyzeTestDistribution } from './check-test-distribution.mjs';

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/;
const MAX_SLOWEST_SUITES = 20;
const STALE_BASELINE_HOURS = 72;
const AGING_BASELINE_HOURS = 24;

const BASELINE_SPECS = Object.freeze([
  {
    id: 'unitDomains',
    label: 'Unit Domain Gate',
    relativePath: 'docs/metrics/unit-domain-timings-latest.json',
    required: true,
  },
  {
    id: 'criticalFlows',
    label: 'Critical Flow Gate',
    relativePath: 'docs/metrics/critical-flow-tests-latest.json',
    required: true,
  },
  {
    id: 'securitySmoke',
    label: 'Security Smoke Gate',
    relativePath: 'docs/metrics/security-smoke-latest.json',
    required: true,
  },
  {
    id: 'highRiskCoverage',
    label: 'High-Risk Coverage Gate',
    relativePath: 'docs/metrics/high-risk-coverage-latest.json',
    required: false,
    note: 'No generated high-risk coverage artifact exists yet.',
  },
  {
    id: 'accessibilitySmoke',
    label: 'Accessibility Smoke Gate',
    relativePath: 'docs/metrics/accessibility-smoke-latest.json',
    required: true,
  },
  {
    id: 'accessibilityRouteCrawl',
    label: 'Accessibility Route Crawl',
    relativePath: 'docs/metrics/accessibility-route-crawl-latest.json',
    required: false,
  },
  {
    id: 'integrationPrisma',
    label: 'Prisma Integration Baseline',
    relativePath: 'docs/metrics/integration-prisma-latest.json',
    required: false,
    note: 'No generated Prisma integration baseline artifact exists yet.',
  },
  {
    id: 'integrationMongo',
    label: 'Mongo Integration Baseline',
    relativePath: 'docs/metrics/integration-mongo-latest.json',
    required: false,
    note: 'No generated Mongo integration baseline artifact exists yet.',
  },
]);

const listAllFiles = (absoluteDir, acc = []) => {
  if (!fs.existsSync(absoluteDir)) {
    return acc;
  }

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') {
      continue;
    }

    const absolutePath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      listAllFiles(absolutePath, acc);
      continue;
    }

    if (entry.isFile()) {
      acc.push(absolutePath);
    }
  }

  return acc;
};

const countTestFiles = (root, relativeDirs) =>
  relativeDirs.reduce((count, relativeDir) => {
    const absoluteDir = path.join(root, relativeDir);
    const files = listAllFiles(absoluteDir);
    return count + files.filter((filePath) => TEST_FILE_PATTERN.test(filePath)).length;
  }, 0);

const readJsonIfExists = (root, relativePath) => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
};

const coerceNumber = (value) => (Number.isFinite(value) ? value : null);

const firstFiniteNumber = (...values) => {
  for (const value of values) {
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return null;
};

const normalizeStatus = (rawStatus, failedCount) => {
  if (typeof rawStatus === 'string') {
    const normalized = rawStatus.trim().toLowerCase();
    if (normalized === 'ok' || normalized === 'pass' || normalized === 'passed') {
      return 'pass';
    }
    if (normalized === 'warn' || normalized === 'warning') {
      return 'warn';
    }
    if (normalized === 'fail' || normalized === 'failed' || normalized === 'timeout') {
      return 'fail';
    }
  }

  return failedCount > 0 ? 'fail' : 'pass';
};

const summarizeMetricPayload = (payload) => {
  const summary = payload?.summary ?? {};
  return {
    totalSuites: firstFiniteNumber(
      summary.total,
      summary.totalSuites,
      summary.totalFlows,
      summary.totalDomains
    ),
    passedSuites: firstFiniteNumber(
      summary.passed,
      summary.passedSuites,
      summary.passedFlows,
      summary.passedDomains
    ),
    failedSuites: firstFiniteNumber(
      summary.failed,
      summary.failedSuites,
      summary.failedFlows,
      summary.failedDomains
    ),
    totalDurationMs: firstFiniteNumber(summary.totalDurationMs, summary.durationMs, payload?.durationMs),
  };
};

const toPassRate = (passedSuites, totalSuites) => {
  if (!Number.isFinite(totalSuites) || totalSuites <= 0 || !Number.isFinite(passedSuites)) {
    return null;
  }

  return Number(((passedSuites / totalSuites) * 100).toFixed(1));
};

const classifyFreshness = (generatedAt, now) => {
  if (typeof generatedAt !== 'string') {
    return {
      ageHours: null,
      freshness: 'unknown',
    };
  }

  const generatedAtMs = Date.parse(generatedAt);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(nowMs)) {
    return {
      ageHours: null,
      freshness: 'unknown',
    };
  }

  const ageHours = Number((((nowMs - generatedAtMs) / (60 * 60 * 1000)) || 0).toFixed(1));
  if (ageHours > STALE_BASELINE_HOURS) {
    return { ageHours, freshness: 'stale' };
  }
  if (ageHours > AGING_BASELINE_HOURS) {
    return { ageHours, freshness: 'aging' };
  }
  return { ageHours, freshness: 'fresh' };
};

const toSlowSuiteEntry = (baseline, result) => ({
  baselineId: baseline.id,
  baselineLabel: baseline.label,
  suiteId: result.id ?? null,
  name: result.name ?? result.title ?? result.route ?? result.id ?? 'Unnamed suite',
  status: typeof result.status === 'string' ? result.status : 'unknown',
  durationMs: coerceNumber(result.durationMs),
  runner: typeof result.runner === 'string' ? result.runner : null,
  command: typeof result.command === 'string' ? result.command : null,
  generatedAt: baseline.generatedAt,
});

const collectBaseline = ({ root, spec, now }) => {
  const payload = readJsonIfExists(root, spec.relativePath);
  if (!payload) {
    return {
      id: spec.id,
      label: spec.label,
      required: spec.required,
      sourcePath: spec.relativePath,
      status: 'missing',
      generatedAt: null,
      ageHours: null,
      freshness: 'missing',
      totalSuites: null,
      passedSuites: null,
      failedSuites: null,
      passRate: null,
      totalDurationMs: null,
      note: spec.note ?? 'Baseline artifact is missing.',
      topSlowSuites: [],
      slowSuites: [],
    };
  }

  const counts = summarizeMetricPayload(payload);
  const status = normalizeStatus(payload?.status, counts.failedSuites ?? 0);
  const freshness = classifyFreshness(payload?.generatedAt, now);
  const slowSuites = Array.isArray(payload?.results)
    ? payload.results
        .map((result) => toSlowSuiteEntry({ id: spec.id, label: spec.label, generatedAt: payload.generatedAt }, result))
        .filter((result) => Number.isFinite(result.durationMs))
        .sort((left, right) => right.durationMs - left.durationMs)
    : [];

  return {
    id: spec.id,
    label: spec.label,
    required: spec.required,
    sourcePath: spec.relativePath,
    status,
    generatedAt: typeof payload?.generatedAt === 'string' ? payload.generatedAt : null,
    ageHours: freshness.ageHours,
    freshness: freshness.freshness,
    totalSuites: counts.totalSuites,
    passedSuites: counts.passedSuites,
    failedSuites: counts.failedSuites,
    passRate: toPassRate(counts.passedSuites, counts.totalSuites),
    totalDurationMs: counts.totalDurationMs,
    note: spec.note ?? null,
    topSlowSuites: slowSuites.slice(0, 5),
    slowSuites,
  };
};

export const collectTestingQualitySnapshot = ({
  root = process.cwd(),
  now = new Date(),
} = {}) => {
  const distribution = analyzeTestDistribution({ root });
  const repoTestFileCount = countTestFiles(root, ['src', '__tests__', 'e2e', 'scripts']);
  const e2eTestFileCount = countTestFiles(root, ['e2e']);
  const scriptTestFileCount = countTestFiles(root, ['scripts']);

  const baselines = BASELINE_SPECS.map((spec) => collectBaseline({ root, spec, now }));
  const slowestSuites = baselines
    .flatMap((baseline) => baseline.slowSuites)
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, MAX_SLOWEST_SUITES);

  const availableBaselines = baselines.filter((baseline) => baseline.status !== 'missing');
  const failingBaselines = baselines.filter((baseline) => baseline.status === 'fail');
  const missingBaselines = baselines.filter((baseline) => baseline.status === 'missing');
  const requiredFailingBaselines = baselines.filter(
    (baseline) => baseline.required && baseline.status === 'fail'
  );
  const requiredMissingBaselines = baselines.filter(
    (baseline) => baseline.required && baseline.status === 'missing'
  );
  const staleBaselines = baselines.filter((baseline) => baseline.freshness === 'stale');
  const agingBaselines = baselines.filter((baseline) => baseline.freshness === 'aging');

  const status =
    requiredFailingBaselines.length > 0 ||
    requiredMissingBaselines.length > 0 ||
    distribution.summary.onlyCount > 0
      ? 'fail'
      : failingBaselines.length > 0 ||
          missingBaselines.length > 0 ||
          distribution.summary.skipCount > 0 ||
          distribution.summary.todoCount > 0 ||
          distribution.summary.featuresWithoutTestCount > 0
        ? 'warn'
        : 'ok';

  return {
    generatedAt: new Date(now).toISOString(),
    status,
    summary: {
      repoTestFileCount,
      e2eTestFileCount,
      scriptTestFileCount,
      featureCount: distribution.summary.featureCount,
      featuresWithTestCount: distribution.summary.featuresWithTestCount,
      featuresWithoutTestCount: distribution.summary.featuresWithoutTestCount,
      featuresWithoutFastTestCount: distribution.summary.featuresWithoutFastTestCount,
      featuresWithoutNegativeTestCount: distribution.summary.featuresWithoutNegativeTestCount,
      onlyCount: distribution.summary.onlyCount,
      skipCount: distribution.summary.skipCount,
      todoCount: distribution.summary.todoCount,
      baselineCount: baselines.length,
      availableBaselineCount: availableBaselines.length,
      failingBaselineCount: failingBaselines.length,
      missingBaselineCount: missingBaselines.length,
      requiredFailingBaselineCount: requiredFailingBaselines.length,
      requiredMissingBaselineCount: requiredMissingBaselines.length,
      staleBaselineCount: staleBaselines.length,
      agingBaselineCount: agingBaselines.length,
      slowestSuiteCount: slowestSuites.length,
    },
    inventory: {
      repoTestFileCount,
      e2eTestFileCount,
      scriptTestFileCount,
      featureCoverage: {
        featureCount: distribution.summary.featureCount,
        featuresWithTestCount: distribution.summary.featuresWithTestCount,
        featuresWithoutTestCount: distribution.summary.featuresWithoutTestCount,
        featuresWithoutTests: distribution.featuresWithoutTests,
        featuresWithoutFastTests: distribution.featuresWithoutFastTests,
        featuresWithoutNegativeTests: distribution.featuresWithoutNegativeTests,
      },
      hygiene: {
        onlyCount: distribution.summary.onlyCount,
        skipCount: distribution.summary.skipCount,
        todoCount: distribution.summary.todoCount,
      },
    },
    baselines,
    slowestSuites,
    featureCoverage: {
      withTests: distribution.featuresWithTests.slice(0, 20),
      withoutTests: distribution.featuresWithoutTests,
      withoutFastTests: distribution.featuresWithoutFastTests,
      withoutNegativeTests: distribution.featuresWithoutNegativeTests,
    },
  };
};
