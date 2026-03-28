const defineSuite = (suite) =>
  Object.freeze({
    supportsSummaryJson: false,
    summaryJsonArgs: [],
    artifacts: [],
    domains: ['repo'],
    owner: 'Platform Team',
    legacyIds: [],
    ...suite,
  });

const defineLane = (lane) =>
  Object.freeze({
    requiresLedgerEntry: false,
    suites: [],
    ...lane,
  });

export const testingSuites = Object.freeze([
  defineSuite({
    id: 'lint',
    label: 'Lint',
    kind: 'static-analysis',
    cadence: ['pr', 'release'],
    cost: 'medium',
    command: ['npm', 'run', 'lint'],
  }),
  defineSuite({
    id: 'lint-domains',
    label: 'Lint Domain Gate',
    kind: 'static-analysis',
    cadence: ['nightly', 'weekly'],
    cost: 'high',
    command: ['node', 'scripts/quality/run-lint-domain-checks.mjs'],
    supportsSummaryJson: true,
    legacyIds: ['lintDomains'],
    artifacts: [
      'docs/metrics/lint-domain-checks-latest.json',
      'docs/metrics/lint-domain-checks-latest.md',
    ],
  }),
  defineSuite({
    id: 'typecheck',
    label: 'Typecheck',
    kind: 'static-analysis',
    cadence: ['local', 'pr', 'release'],
    cost: 'medium',
    command: ['npm', 'run', 'typecheck'],
  }),
  defineSuite({
    id: 'build',
    label: 'Production Build',
    kind: 'build',
    cadence: ['release'],
    cost: 'high',
    command: ['npm', 'run', 'build'],
  }),
  defineSuite({
    id: 'unit',
    label: 'Vitest Unit Project',
    kind: 'unit',
    cadence: ['pr', 'release'],
    cost: 'high',
    command: ['npm', 'run', 'test:unit'],
    legacyIds: ['fullUnit'],
  }),
  defineSuite({
    id: 'unit-domains',
    label: 'Unit Domain Timings',
    kind: 'unit',
    cadence: ['nightly', 'weekly'],
    cost: 'high',
    command: ['npm', 'run', 'test:unit:domains'],
    supportsSummaryJson: true,
    legacyIds: ['unitDomains'],
    artifacts: [
      'docs/metrics/unit-domain-timings-latest.json',
      'docs/metrics/unit-domain-timings-latest.md',
    ],
  }),
  defineSuite({
    id: 'critical-flows',
    label: 'Critical Flow Regression',
    kind: 'regression',
    cadence: ['local', 'pr', 'nightly', 'release'],
    cost: 'medium',
    command: ['npm', 'run', 'test:critical-flows'],
    supportsSummaryJson: true,
    legacyIds: ['criticalFlows'],
    artifacts: [
      'docs/metrics/critical-flow-tests-latest.json',
      'docs/metrics/critical-flow-tests-latest.md',
    ],
  }),
  defineSuite({
    id: 'security-smoke',
    label: 'Security Smoke',
    kind: 'security',
    cadence: ['pr', 'nightly', 'release'],
    cost: 'medium',
    command: ['npm', 'run', 'test:security-smoke'],
    supportsSummaryJson: true,
    legacyIds: ['securitySmoke'],
    artifacts: [
      'docs/metrics/security-smoke-latest.json',
      'docs/metrics/security-smoke-latest.md',
    ],
  }),
  defineSuite({
    id: 'accessibility-smoke',
    label: 'Accessibility Smoke',
    kind: 'accessibility',
    cadence: ['pr', 'nightly', 'release'],
    cost: 'medium',
    command: ['npm', 'run', 'test:accessibility-smoke'],
    supportsSummaryJson: true,
    legacyIds: ['accessibilitySmoke'],
    artifacts: [
      'docs/metrics/accessibility-smoke-latest.json',
      'docs/metrics/accessibility-smoke-latest.md',
    ],
  }),
  defineSuite({
    id: 'accessibility-route-crawl',
    label: 'Accessibility Route Crawl',
    kind: 'accessibility',
    cadence: ['nightly', 'weekly'],
    cost: 'high',
    command: ['npm', 'run', 'test:accessibility:route-crawl'],
    supportsSummaryJson: true,
    artifacts: [
      'docs/metrics/accessibility-route-crawl-latest.json',
      'docs/metrics/accessibility-route-crawl-latest.md',
    ],
  }),
  defineSuite({
    id: 'integration-mongo',
    label: 'Mongo Integration Project',
    kind: 'integration',
    cadence: ['pr', 'release'],
    cost: 'high',
    command: ['npm', 'run', 'test:integration:mongo'],
    legacyIds: ['integrationMongo'],
    domains: ['database', 'products', 'cms', 'integrations', 'kangur', 'ai-paths'],
  }),
  defineSuite({
    id: 'integration-mongo-baseline',
    label: 'Mongo Integration Baseline',
    kind: 'integration',
    cadence: ['nightly', 'weekly'],
    cost: 'high',
    command: ['npm', 'run', 'test:integration:mongo:baseline'],
    supportsSummaryJson: true,
    artifacts: [
      'docs/metrics/integration-mongo-latest.json',
      'docs/metrics/integration-mongo-latest.md',
    ],
    domains: ['database', 'products', 'cms', 'integrations', 'kangur', 'ai-paths'],
  }),
  defineSuite({
    id: 'high-risk-coverage',
    label: 'High-Risk Coverage Baseline',
    kind: 'coverage',
    cadence: ['nightly', 'weekly'],
    cost: 'high',
    command: ['npm', 'run', 'test:coverage:high-risk'],
    supportsSummaryJson: true,
    legacyIds: ['highRiskCoverage'],
    artifacts: [
      'docs/metrics/high-risk-coverage-latest.json',
      'docs/metrics/high-risk-coverage-latest.md',
    ],
  }),
  defineSuite({
    id: 'test-distribution',
    label: 'Test Distribution Scan',
    kind: 'quality',
    cadence: ['weekly'],
    cost: 'low',
    command: ['npm', 'run', 'check:test-distribution'],
    supportsSummaryJson: true,
    legacyIds: ['testDistribution'],
    artifacts: [
      'docs/metrics/test-distribution-latest.json',
      'docs/metrics/test-distribution-latest.md',
    ],
  }),
  defineSuite({
    id: 'test-quality-snapshot',
    label: 'Testing Quality Snapshot',
    kind: 'quality',
    cadence: ['weekly'],
    cost: 'low',
    command: ['npm', 'run', 'metrics:test-quality'],
    supportsSummaryJson: true,
    artifacts: [
      'docs/metrics/testing-quality-snapshot-latest.json',
      'docs/metrics/testing-quality-snapshot-latest.md',
    ],
  }),
  defineSuite({
    id: 'e2e',
    label: 'Playwright End-to-End',
    kind: 'e2e',
    cadence: ['nightly', 'release'],
    cost: 'high',
    command: ['npm', 'run', 'test:e2e'],
    domains: ['repo', 'browser'],
  }),
  defineSuite({
    id: 'weekly-quality-report',
    label: 'Weekly Quality Report',
    kind: 'quality',
    cadence: ['weekly'],
    cost: 'high',
    command: ['npm', 'run', 'quality:weekly-report'],
    supportsSummaryJson: true,
    artifacts: [
      'docs/metrics/weekly-quality-latest.json',
      'docs/metrics/weekly-quality-latest.md',
    ],
  }),
]);

export const testingLanes = Object.freeze([
  defineLane({
    id: 'local-fast',
    label: 'Local Fast Confidence',
    cadence: 'on-demand',
    purpose: 'Fast local confidence before or during implementation.',
    requiresLedgerEntry: false,
    suites: ['typecheck', 'critical-flows'],
  }),
  defineLane({
    id: 'pr-required',
    label: 'Pull Request Required',
    cadence: 'pull-request',
    purpose: 'Minimum blocking suite set for PR confidence and merge protection.',
    requiresLedgerEntry: true,
    suites: [
      'lint',
      'typecheck',
      'unit',
      'critical-flows',
      'security-smoke',
      'accessibility-smoke',
      'integration-mongo',
    ],
  }),
  defineLane({
    id: 'nightly-deep',
    label: 'Nightly Deep Regression',
    cadence: 'nightly',
    purpose: 'Broader regression and audit coverage that is too expensive for every PR.',
    requiresLedgerEntry: true,
    suites: [
      'lint-domains',
      'unit-domains',
      'critical-flows',
      'security-smoke',
      'accessibility-smoke',
      'accessibility-route-crawl',
      'integration-mongo-baseline',
      'high-risk-coverage',
      'e2e',
    ],
  }),
  defineLane({
    id: 'weekly-audit',
    label: 'Weekly Audit And Trend',
    cadence: 'weekly',
    purpose: 'Generated quality reporting, inventory drift detection, and trend snapshots.',
    requiresLedgerEntry: true,
    suites: [
      'weekly-quality-report',
      'integration-mongo-baseline',
      'high-risk-coverage',
      'test-distribution',
      'test-quality-snapshot',
    ],
  }),
  defineLane({
    id: 'release-gate',
    label: 'Release Gate',
    cadence: 'release',
    purpose: 'Highest-confidence lane before shipping or major environment promotion.',
    requiresLedgerEntry: true,
    suites: [
      'build',
      'typecheck',
      'unit',
      'critical-flows',
      'security-smoke',
      'accessibility-smoke',
      'integration-mongo',
      'e2e',
    ],
  }),
]);

export const getTestingSuiteById = (suiteId) =>
  testingSuites.find((suite) => suite.id === suiteId) ?? null;

export const getTestingSuiteByCompatId = (suiteId) =>
  testingSuites.find((suite) => suite.id === suiteId || suite.legacyIds.includes(suiteId)) ?? null;

export const getTestingLaneById = (laneId) =>
  testingLanes.find((lane) => lane.id === laneId) ?? null;

export const getTestingLaneIdsForSuiteId = (suiteId) =>
  testingLanes.filter((lane) => lane.suites.includes(suiteId)).map((lane) => lane.id);

export const getCanonicalTestingSuiteMetadata = (suiteOrAliasId) => {
  const suite = getTestingSuiteByCompatId(suiteOrAliasId);
  if (!suite) {
    return null;
  }

  return {
    canonicalSuiteId: suite.id,
    canonicalSuiteLabel: suite.label,
    canonicalLaneIds: getTestingLaneIdsForSuiteId(suite.id),
  };
};

export const resolveSuitesForTestingLane = (laneId) => {
  const lane = getTestingLaneById(laneId);
  if (!lane) {
    throw new Error(`Unknown testing lane "${laneId}".`);
  }

  return lane.suites.map((suiteId) => {
    const suite = getTestingSuiteById(suiteId);
    if (!suite) {
      throw new Error(`Testing lane "${laneId}" references unknown suite "${suiteId}".`);
    }
    return suite;
  });
};

export const getMajorTestingLaneIds = () =>
  testingLanes.filter((lane) => lane.requiresLedgerEntry).map((lane) => lane.id);
