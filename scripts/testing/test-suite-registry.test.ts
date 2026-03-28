import { describe, expect, it } from 'vitest';

import {
  getCanonicalTestingSuiteMetadata,
  getMajorTestingLaneIds,
  testingLanes,
  testingSuites,
  resolveSuitesForTestingLane,
} from './config/test-suite-registry.mjs';

describe('test suite registry', () => {
  it('keeps suite ids unique and lane references valid', () => {
    const suiteIds = testingSuites.map((suite) => suite.id);
    expect(new Set(suiteIds).size).toBe(suiteIds.length);

    for (const lane of testingLanes) {
      const resolvedSuites = resolveSuitesForTestingLane(lane.id);
      expect(resolvedSuites).toHaveLength(lane.suites.length);
      expect(resolvedSuites.map((suite) => suite.id)).toEqual(lane.suites);
    }
  });

  it('marks all ledger-required lanes as canonical major lanes', () => {
    expect(getMajorTestingLaneIds()).toEqual(
      testingLanes.filter((lane) => lane.requiresLedgerEntry).map((lane) => lane.id)
    );
  });

  it('resolves legacy report ids back to canonical suite metadata', () => {
    expect(getCanonicalTestingSuiteMetadata('lintDomains')).toEqual({
      canonicalSuiteId: 'lint-domains',
      canonicalSuiteLabel: 'Lint Domain Gate',
      canonicalLaneIds: ['nightly-deep'],
    });

    expect(getCanonicalTestingSuiteMetadata('criticalFlows')).toEqual({
      canonicalSuiteId: 'critical-flows',
      canonicalSuiteLabel: 'Critical Flow Regression',
      canonicalLaneIds: ['local-fast', 'pr-required', 'nightly-deep', 'release-gate'],
    });

    expect(getCanonicalTestingSuiteMetadata('fullUnit')).toEqual({
      canonicalSuiteId: 'unit',
      canonicalSuiteLabel: 'Vitest Unit Project',
      canonicalLaneIds: ['pr-required', 'release-gate'],
    });
  });

  it('keeps major lanes and summary-json capable suites available for generated documentation', () => {
    expect(testingSuites.some((suite) => suite.supportsSummaryJson)).toBe(true);
    expect(testingLanes.some((lane) => lane.requiresLedgerEntry)).toBe(true);
    expect(
      testingSuites.every(
        (suite) =>
          Array.isArray(suite.command) &&
          suite.command.length >= 2 &&
          Array.isArray(suite.cadence) &&
          suite.cadence.length > 0
      )
    ).toBe(true);
  });
});
