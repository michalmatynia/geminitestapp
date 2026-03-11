import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildHighRiskCoverageVitestArgs,
  collectHighRiskCoverageTestFiles,
  highRiskCoverageDomains,
  highRiskCoverageTestRoots,
  HIGH_RISK_COVERAGE_REPORTS_DIRECTORY,
  HIGH_RISK_COVERAGE_SUMMARY_PATH,
  mergeHighRiskCoverageSummaries,
} from './lib/high-risk-coverage-baseline.mjs';

describe('high-risk coverage baseline helper', () => {
  it('builds a vitest coverage command with the expected report path and include globs', () => {
    const args = buildHighRiskCoverageVitestArgs({
      coverageIncludeGlobs: ['src/app/api/**'],
      testFiles: ['src/app/api/example/handler.test.ts', 'src/features/kangur/example.test.tsx'],
    });

    expect(args).toEqual(
      expect.arrayContaining([
        'vitest',
        'run',
        '--project',
        'unit',
        '--coverage.enabled',
        '--coverage.provider',
        'v8',
        '--coverage.reportsDirectory',
        HIGH_RISK_COVERAGE_REPORTS_DIRECTORY,
        '--coverage.reporter',
        'json-summary',
        '--coverage.reporter',
        'text-summary',
      ])
    );

    expect(args).toContain('src/app/api/example/handler.test.ts');
    expect(args).toContain('src/features/kangur/example.test.tsx');
    expect(args).toContain('src/app/api/**');
    expect(args).not.toContain('src/features/kangur/**');
    expect(args).not.toContain('src/app/api');
    expect(args).not.toContain('src/shared/lib');
  });

  it('keeps the summary path under the dedicated high-risk coverage directory', () => {
    expect(HIGH_RISK_COVERAGE_SUMMARY_PATH).toBe('coverage/high-risk/coverage-summary.json');
  });

  it('keeps the expected discovery roots for the targeted high-risk areas', () => {
    expect(highRiskCoverageTestRoots).toEqual(
      expect.arrayContaining([
        '__tests__/api',
        '__tests__/app/api',
        '__tests__/features/ai/ai-paths',
        '__tests__/features/kangur',
        '__tests__/shared/contracts',
        'src/app/api',
        'src/features/ai/ai-paths',
        'src/features/kangur',
        'src/shared/contracts',
        'src/shared/lib',
      ])
    );

    expect(highRiskCoverageDomains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'api',
          reportsDirectory: 'coverage/high-risk/api',
          coverageIncludeGlobs: ['src/app/api/**'],
        }),
        expect.objectContaining({
          id: 'shared-lib',
          reportsDirectory: 'coverage/high-risk/shared-lib',
          coverageIncludeGlobs: ['src/shared/lib/**'],
        }),
        expect.objectContaining({
          id: 'kangur',
          reportsDirectory: 'coverage/high-risk/kangur',
          coverageIncludeGlobs: ['src/features/kangur/**'],
        }),
      ])
    );
  });

  it('discovers and deduplicates only real test files under the targeted roots', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'high-risk-coverage-baseline-'));

    fs.mkdirSync(path.join(fixtureRoot, 'src', 'app', 'api', 'example'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, '__tests__', 'api'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'src', 'features', 'kangur'), { recursive: true });

    fs.writeFileSync(
      path.join(fixtureRoot, 'src', 'app', 'api', 'example', 'handler.test.ts'),
      'export {};'
    );
    fs.writeFileSync(path.join(fixtureRoot, 'src', 'app', 'api', 'example', 'helper.ts'), 'export {};');
    fs.writeFileSync(path.join(fixtureRoot, '__tests__', 'api', 'example.test.ts'), 'export {};');
    fs.writeFileSync(path.join(fixtureRoot, 'src', 'features', 'kangur', 'widget.spec.tsx'), 'export {};');

    const discoveredFiles = collectHighRiskCoverageTestFiles({
      root: fixtureRoot,
      testRoots: [
        '__tests__/api',
        '__tests__/missing',
        'src/app/api',
        'src/app/api',
        'src/features/kangur',
      ],
    });

    expect(discoveredFiles).toEqual([
      '__tests__/api/example.test.ts',
      'src/app/api/example/handler.test.ts',
      'src/features/kangur/widget.spec.tsx',
    ]);
  });

  it('merges disjoint per-domain coverage summaries into one combined report', () => {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'high-risk-coverage-summary-'));
    const apiReportsDirectory = path.join(fixtureRoot, 'coverage', 'high-risk', 'api');
    const kangurReportsDirectory = path.join(fixtureRoot, 'coverage', 'high-risk', 'kangur');

    fs.mkdirSync(apiReportsDirectory, { recursive: true });
    fs.mkdirSync(kangurReportsDirectory, { recursive: true });

    fs.writeFileSync(
      path.join(apiReportsDirectory, 'coverage-summary.json'),
      `${JSON.stringify(
        {
          total: {},
          'src/app/api/example/handler.ts': {
            lines: { total: 10, covered: 7, skipped: 0, pct: 70 },
            statements: { total: 10, covered: 7, skipped: 0, pct: 70 },
            functions: { total: 4, covered: 3, skipped: 0, pct: 75 },
            branches: { total: 6, covered: 3, skipped: 0, pct: 50 },
          },
        },
        null,
        2
      )}\n`
    );
    fs.writeFileSync(
      path.join(kangurReportsDirectory, 'coverage-summary.json'),
      `${JSON.stringify(
        {
          total: {},
          'src/features/kangur/example.ts': {
            lines: { total: 20, covered: 15, skipped: 0, pct: 75 },
            statements: { total: 18, covered: 15, skipped: 0, pct: 83.3 },
            functions: { total: 5, covered: 4, skipped: 0, pct: 80 },
            branches: { total: 8, covered: 6, skipped: 0, pct: 75 },
          },
        },
        null,
        2
      )}\n`
    );

    const mergedSummary = mergeHighRiskCoverageSummaries({
      root: fixtureRoot,
      summaryPaths: [
        'coverage/high-risk/api/coverage-summary.json',
        'coverage/high-risk/kangur/coverage-summary.json',
      ],
    });

    expect(mergedSummary.total).toEqual({
      lines: { total: 30, covered: 22, skipped: 0, pct: 73.3 },
      statements: { total: 28, covered: 22, skipped: 0, pct: 78.6 },
      functions: { total: 9, covered: 7, skipped: 0, pct: 77.8 },
      branches: { total: 14, covered: 9, skipped: 0, pct: 64.3 },
    });
    expect(mergedSummary['src/app/api/example/handler.ts']).toBeDefined();
    expect(mergedSummary['src/features/kangur/example.ts']).toBeDefined();
  });
});
