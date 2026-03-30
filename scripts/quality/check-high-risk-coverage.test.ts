import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeHighRiskCoverage } from './lib/check-high-risk-coverage.mjs';

const tempRoots = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'high-risk-coverage-'));
  tempRoots.push(root);
  return root;
};

const writeJson = (root, relativeFile, value) => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

describe('analyzeHighRiskCoverage', () => {
  it('passes when every configured target meets its thresholds', () => {
    const root = createTempRoot();
    const absoluteFile = path.join(root, 'src', 'app', 'api', 'health', 'route.ts');

    writeJson(root, 'coverage/coverage-summary.json', {
      total: {},
      [absoluteFile]: {
        lines: { total: 10, covered: 9, skipped: 0, pct: 90 },
        statements: { total: 10, covered: 9, skipped: 0, pct: 90 },
        functions: { total: 10, covered: 9, skipped: 0, pct: 90 },
        branches: { total: 10, covered: 8, skipped: 0, pct: 80 },
      },
      'src/shared/contracts/auth.ts': {
        lines: { total: 10, covered: 10, skipped: 0, pct: 100 },
        statements: { total: 10, covered: 10, skipped: 0, pct: 100 },
        functions: { total: 10, covered: 10, skipped: 0, pct: 100 },
        branches: { total: 10, covered: 9, skipped: 0, pct: 90 },
      },
      'src/shared/lib/api/handler.ts': {
        lines: { total: 20, covered: 16, skipped: 0, pct: 80 },
        statements: { total: 20, covered: 16, skipped: 0, pct: 80 },
        functions: { total: 20, covered: 16, skipped: 0, pct: 80 },
        branches: { total: 20, covered: 14, skipped: 0, pct: 70 },
      },
      'src/features/kangur/ui/widget.tsx': {
        lines: { total: 10, covered: 8, skipped: 0, pct: 80 },
        statements: { total: 10, covered: 8, skipped: 0, pct: 80 },
        functions: { total: 10, covered: 8, skipped: 0, pct: 80 },
        branches: { total: 10, covered: 7, skipped: 0, pct: 70 },
      },
      'src/features/ai/ai-paths/runtime/engine.ts': {
        lines: { total: 10, covered: 8, skipped: 0, pct: 80 },
        statements: { total: 10, covered: 8, skipped: 0, pct: 80 },
        functions: { total: 10, covered: 8, skipped: 0, pct: 80 },
        branches: { total: 10, covered: 7, skipped: 0, pct: 70 },
      },
    });

    const report = analyzeHighRiskCoverage({
      root,
      coverageSummaryPath: 'coverage/coverage-summary.json',
    });

    expect(report.status).toBe('passed');
    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
    expect(report.summary.passingTargetCount).toBe(5);
  });

  it('errors on threshold misses and warns on unmatched targets', () => {
    const root = createTempRoot();

    writeJson(root, 'coverage/coverage-summary.json', {
      total: {},
      'src/app/api/health/route.ts': {
        lines: { total: 10, covered: 6, skipped: 0, pct: 60 },
        statements: { total: 10, covered: 6, skipped: 0, pct: 60 },
        functions: { total: 10, covered: 6, skipped: 0, pct: 60 },
        branches: { total: 10, covered: 5, skipped: 0, pct: 50 },
      },
    });

    const report = analyzeHighRiskCoverage({
      root,
      coverageSummaryPath: 'coverage/coverage-summary.json',
      targets: [
        {
          id: 'api-routes',
          label: 'API Routes',
          directory: 'src/app/api',
          thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
        },
        {
          id: 'kangur',
          label: 'Kangur',
          directory: 'src/features/kangur',
          thresholds: { lines: 70, statements: 70, functions: 70, branches: 60 },
        },
      ],
    });

    expect(report.status).toBe('failed');
    expect(report.summary.errorCount).toBe(1);
    expect(report.summary.warningCount).toBe(1);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'high-risk-coverage-threshold', severity: 'error' }),
        expect.objectContaining({ ruleId: 'high-risk-coverage-target-unmatched', severity: 'warn' }),
      ])
    );
    expect(report.targets[0]).toEqual(
      expect.objectContaining({
        id: 'api-routes',
        lowestCoverageFiles: [
          expect.objectContaining({
            filePath: 'src/app/api/health/route.ts',
            lines: 60,
            statements: 60,
            functions: 60,
            branches: 50,
          }),
        ],
      })
    );
  });

  it('warns when the coverage summary artifact is missing', () => {
    const root = createTempRoot();

    const report = analyzeHighRiskCoverage({ root });

    expect(report.status).toBe('warn');
    expect(report.summary.targetCount).toBe(5);
    expect(report.summary.warningCount).toBe(1);
    expect(report.issues).toEqual([
      expect.objectContaining({
        ruleId: 'high-risk-coverage-report-missing',
        severity: 'warn',
      }),
    ]);
  });

  it('ignores the generic repo coverage summary when the dedicated high-risk artifact is missing', () => {
    const root = createTempRoot();

    writeJson(root, 'coverage/coverage-summary.json', {
      total: {},
      'src/app/api/health/route.ts': {
        lines: { total: 10, covered: 10, skipped: 0, pct: 100 },
        statements: { total: 10, covered: 10, skipped: 0, pct: 100 },
        functions: { total: 10, covered: 10, skipped: 0, pct: 100 },
        branches: { total: 10, covered: 10, skipped: 0, pct: 100 },
      },
    });

    const report = analyzeHighRiskCoverage({ root });

    expect(report.status).toBe('warn');
    expect(report.coverageSummaryPath).toBe('coverage/high-risk/coverage-summary.json');
    expect(report.issues).toEqual([
      expect.objectContaining({
        ruleId: 'high-risk-coverage-report-missing',
        severity: 'warn',
      }),
    ]);
  });

  it('falls back to merged high-risk domain summaries when the default report is missing', () => {
    const root = createTempRoot();

    writeJson(root, 'coverage/high-risk/api/coverage-summary.json', {
      total: {},
      'src/app/api/health/route.ts': {
        lines: { total: 10, covered: 9, skipped: 0, pct: 90 },
        statements: { total: 10, covered: 9, skipped: 0, pct: 90 },
        functions: { total: 10, covered: 9, skipped: 0, pct: 90 },
        branches: { total: 10, covered: 8, skipped: 0, pct: 80 },
      },
    });
    writeJson(root, 'coverage/high-risk/shared-lib/coverage-summary.json', {
      total: {},
      'src/shared/lib/api/handler.ts': {
        lines: { total: 20, covered: 16, skipped: 0, pct: 80 },
        statements: { total: 20, covered: 16, skipped: 0, pct: 80 },
        functions: { total: 20, covered: 16, skipped: 0, pct: 80 },
        branches: { total: 20, covered: 14, skipped: 0, pct: 70 },
      },
    });

    const report = analyzeHighRiskCoverage({
      root,
      targets: [
        {
          id: 'api-routes',
          label: 'API Routes',
          directory: 'src/app/api',
          thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
        },
        {
          id: 'shared-lib',
          label: 'Shared Lib',
          directory: 'src/shared/lib',
          thresholds: { lines: 75, statements: 75, functions: 75, branches: 65 },
        },
      ],
    });

    expect(report.status).toBe('passed');
    expect(report.coverageSummaryPath).toBe('coverage/high-risk/*/coverage-summary.json (merged)');
    expect(report.summary.warningCount).toBe(0);
    expect(report.summary.matchedTargetCount).toBe(2);
  });

  it('limits the report to explicitly selected target ids', () => {
    const root = createTempRoot();

    writeJson(root, 'coverage/coverage-summary.json', {
      total: {},
      'src/app/api/health/route.ts': {
        lines: { total: 10, covered: 9, skipped: 0, pct: 90 },
        statements: { total: 10, covered: 9, skipped: 0, pct: 90 },
        functions: { total: 10, covered: 9, skipped: 0, pct: 90 },
        branches: { total: 10, covered: 8, skipped: 0, pct: 80 },
      },
      'src/features/ai/ai-paths/runtime/engine.ts': {
        lines: { total: 10, covered: 8, skipped: 0, pct: 80 },
        statements: { total: 10, covered: 8, skipped: 0, pct: 80 },
        functions: { total: 10, covered: 8, skipped: 0, pct: 80 },
        branches: { total: 10, covered: 7, skipped: 0, pct: 70 },
      },
    });

    const report = analyzeHighRiskCoverage({
      root,
      coverageSummaryPath: 'coverage/coverage-summary.json',
      targetIds: ['ai-paths'],
    });

    expect(report.status).toBe('passed');
    expect(report.summary.targetCount).toBe(1);
    expect(report.summary.matchedTargetCount).toBe(1);
    expect(report.targets.map((target) => target.id)).toEqual(['ai-paths']);
  });
});
