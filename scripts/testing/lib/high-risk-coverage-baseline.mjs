import fs from 'node:fs';
import path from 'node:path';

export const HIGH_RISK_COVERAGE_REPORTS_DIRECTORY = 'coverage/high-risk';
export const HIGH_RISK_COVERAGE_SUMMARY_PATH = `${HIGH_RISK_COVERAGE_REPORTS_DIRECTORY}/coverage-summary.json`;
const highRiskCoverageExcludeGlobs = ['**/*.md', '**/*.markdown'];
const buildCodeCoverageIncludeGlob = (directory) => `${directory}/**/*.{ts,tsx}`;

const METRIC_KEYS = ['lines', 'statements', 'functions', 'branches'];

export const highRiskCoverageDomains = [
  {
    id: 'api-routes',
    label: 'API',
    reportsDirectory: `${HIGH_RISK_COVERAGE_REPORTS_DIRECTORY}/api`,
    coverageIncludeGlobs: [buildCodeCoverageIncludeGlob('src/app/api')],
    testRoots: ['__tests__/api', '__tests__/app/api', 'src/app/api'],
  },
  {
    id: 'shared-contracts',
    label: 'Shared contracts',
    reportsDirectory: `${HIGH_RISK_COVERAGE_REPORTS_DIRECTORY}/shared-contracts`,
    coverageIncludeGlobs: [buildCodeCoverageIncludeGlob('src/shared/contracts')],
    testRoots: ['__tests__/shared/contracts', 'src/shared/contracts'],
  },
  {
    id: 'shared-lib',
    label: 'Shared lib',
    reportsDirectory: `${HIGH_RISK_COVERAGE_REPORTS_DIRECTORY}/shared-lib`,
    coverageIncludeGlobs: [buildCodeCoverageIncludeGlob('src/shared/lib')],
    testRoots: ['__tests__/shared', 'src/shared/lib'],
  },
  {
    id: 'kangur',
    label: 'Kangur',
    reportsDirectory: `${HIGH_RISK_COVERAGE_REPORTS_DIRECTORY}/kangur`,
    coverageIncludeGlobs: [buildCodeCoverageIncludeGlob('src/features/kangur')],
    testRoots: ['__tests__/features/kangur', 'src/features/kangur'],
  },
  {
    id: 'ai-paths',
    label: 'AI Paths',
    reportsDirectory: `${HIGH_RISK_COVERAGE_REPORTS_DIRECTORY}/ai-paths`,
    coverageIncludeGlobs: [buildCodeCoverageIncludeGlob('src/features/ai/ai-paths')],
    testRoots: ['__tests__/api/ai-paths', '__tests__/features/ai/ai-paths', 'src/features/ai/ai-paths'],
  },
];

export const highRiskCoverageTestRoots = [...new Set(highRiskCoverageDomains.flatMap((domain) => domain.testRoots))];

export const highRiskCoverageIncludeGlobs = [
  ...new Set(highRiskCoverageDomains.flatMap((domain) => domain.coverageIncludeGlobs)),
];

const ignoredDirectoryNames = new Set(['.git', '.next', 'coverage', 'node_modules']);
const vitestFilePattern = /\.(?:test|spec)\.(?:ts|tsx)$/;

const normalizePath = (value) => value.split(path.sep).join('/');

const normalizeSelectedIds = (ids) => {
  if (!Array.isArray(ids)) {
    return [];
  }

  return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
};

export const selectHighRiskCoverageDomains = ({
  domains = highRiskCoverageDomains,
  ids = [],
} = {}) => {
  const normalizedIds = normalizeSelectedIds(ids);
  if (normalizedIds.length === 0) {
    return domains;
  }

  const domainById = new Map(domains.map((domain) => [domain.id, domain]));
  const unknownIds = normalizedIds.filter((id) => !domainById.has(id));
  if (unknownIds.length > 0) {
    throw new Error(
      `Unknown high-risk coverage target id(s): ${unknownIds.join(', ')}. Expected one of: ${domains.map((domain) => domain.id).join(', ')}.`
    );
  }

  return normalizedIds.map((id) => domainById.get(id));
};

const collectTestFilesUnderAbsolutePath = ({ absolutePath, files, root }) => {
  if (!fs.existsSync(absolutePath)) {
    return;
  }

  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (ignoredDirectoryNames.has(entry.name)) {
        continue;
      }

      collectTestFilesUnderAbsolutePath({
        absolutePath: path.join(absolutePath, entry.name),
        files,
        root,
      });
      continue;
    }

    if (!entry.isFile() || !vitestFilePattern.test(entry.name)) {
      continue;
    }

    files.add(normalizePath(path.relative(root, path.join(absolutePath, entry.name))));
  }
};

export const collectHighRiskCoverageTestFiles = ({
  root = process.cwd(),
  testRoots = highRiskCoverageTestRoots,
} = {}) => {
  const files = new Set();

  for (const testRoot of testRoots) {
    collectTestFilesUnderAbsolutePath({
      absolutePath: path.join(root, testRoot),
      files,
      root,
    });
  }

  return [...files].sort((left, right) => left.localeCompare(right));
};

const buildTotalMetric = (entries, metricKey) => {
  const aggregate = entries.reduce(
    (totals, entry) => ({
      total: totals.total + Number(entry?.[metricKey]?.total ?? 0),
      covered: totals.covered + Number(entry?.[metricKey]?.covered ?? 0),
      skipped: totals.skipped + Number(entry?.[metricKey]?.skipped ?? 0),
    }),
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

export const mergeHighRiskCoverageSummaries = ({
  root = process.cwd(),
  summaryPaths,
} = {}) => {
  const mergedEntries = {};

  for (const summaryPath of summaryPaths) {
    const absoluteSummaryPath = path.join(root, summaryPath);
    if (!fs.existsSync(absoluteSummaryPath)) {
      throw new Error(`Missing coverage summary: ${summaryPath}`);
    }

    const payload = JSON.parse(fs.readFileSync(absoluteSummaryPath, 'utf8'));
    for (const [filePath, metrics] of Object.entries(payload)) {
      if (filePath === 'total') {
        continue;
      }

      if (mergedEntries[filePath]) {
        throw new Error(`Duplicate merged coverage summary entry: ${filePath}`);
      }

      mergedEntries[filePath] = metrics;
    }
  }

  const metricEntries = Object.values(mergedEntries);
  return {
    total: Object.fromEntries(
      METRIC_KEYS.map((metricKey) => [metricKey, buildTotalMetric(metricEntries, metricKey)])
    ),
    ...mergedEntries,
  };
};

export const buildHighRiskCoverageVitestArgs = ({
  reportsDirectory = HIGH_RISK_COVERAGE_REPORTS_DIRECTORY,
  root = process.cwd(),
  testFiles = collectHighRiskCoverageTestFiles({ root }),
  coverageIncludeGlobs = highRiskCoverageIncludeGlobs,
} = {}) => [
  'vitest',
  'run',
  '--project',
  'unit',
  '--coverage.enabled',
  '--coverage.provider',
  'v8',
  '--coverage.clean',
  '--coverage.reportOnFailure',
  '--coverage.reportsDirectory',
  reportsDirectory,
  '--coverage.reporter',
  'json-summary',
  '--coverage.reporter',
  'text-summary',
  ...coverageIncludeGlobs.flatMap((pattern) => ['--coverage.include', pattern]),
  ...highRiskCoverageExcludeGlobs.flatMap((pattern) => ['--coverage.exclude', pattern]),
  ...testFiles,
];
