import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { collectTestingQualitySnapshot } from './lib/testing-quality-snapshot.mjs';

const tempRoots: string[] = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'testing-quality-snapshot-'));
  tempRoots.push(root);
  return root;
};

const writeJson = (root: string, relativePath: string, value: unknown) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeFile = (root: string, relativePath: string, contents: string) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
};

describe('collectTestingQualitySnapshot', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('aggregates baseline artifacts, repo inventory, and slowest suites', () => {
    const root = createTempRoot();

    writeFile(root, 'src/features/auth/index.ts', 'export const auth = true;\n');
    writeFile(root, 'src/features/products/index.ts', 'export const products = true;\n');
    writeFile(root, 'src/features/notes/index.ts', 'export const notes = true;\n');
    writeFile(
      root,
      'src/features/auth/auth.test.ts',
      [
        'it("auth", async () => {',
        '  await expect(Promise.reject(new Error("missing token"))).rejects.toThrow("missing token");',
        '});',
        'test.todo("covers auth recovery edge cases");',
        '',
      ].join('\n')
    );
    writeFile(root, '__tests__/features/auth/auth-api.test.ts', 'it("api", () => expect(true).toBe(true));\n');
    writeFile(root, 'e2e/features/products/products.spec.ts', 'test("products", async () => {});\n');
    writeFile(root, 'src/features/notes/notes.test.ts', 'it("notes", () => expect(true).toBe(true));\n');
    writeFile(root, 'scripts/runtime/check-runtime.test.ts', 'it("runtime", () => expect(true).toBe(true));\n');

    writeJson(root, 'docs/metrics/unit-domain-timings-latest.json', {
      generatedAt: '2026-03-11T08:00:00.000Z',
      summary: {
        total: 2,
        passed: 2,
        failed: 0,
        totalDurationMs: 1_800,
      },
      results: [
        { id: 'products', name: 'Products', status: 'pass', durationMs: 1_200 },
        { id: 'auth', name: 'Auth', status: 'pass', durationMs: 600 },
      ],
    });
    writeJson(root, 'docs/metrics/critical-flow-tests-latest.json', {
      generatedAt: '2026-03-11T08:15:00.000Z',
      summary: {
        total: 1,
        passed: 1,
        failed: 0,
        totalDurationMs: 900,
      },
      results: [
        { id: 'auth-session', name: 'Authentication + Session Bootstrap', status: 'pass', durationMs: 900 },
      ],
    });
    writeJson(root, 'docs/metrics/security-smoke-latest.json', {
      generatedAt: '2026-03-11T08:30:00.000Z',
      summary: {
        total: 2,
        passed: 1,
        failed: 1,
        totalDurationMs: 700,
      },
      results: [
        { id: 'auth-security', name: 'Auth Security Policy', status: 'pass', durationMs: 300 },
        { id: 'log-redaction', name: 'Observability Log Redaction', status: 'fail', durationMs: 400 },
      ],
    });
    writeJson(root, 'docs/metrics/high-risk-coverage-latest.json', {
      generatedAt: '2026-03-11T08:45:00.000Z',
      status: 'warn',
      summary: {
        total: 5,
        passed: 4,
        failed: 0,
        totalDurationMs: 150,
      },
      results: [
        { id: 'api-routes', name: 'API Routes', status: 'warn', durationMs: 150 },
      ],
    });
    writeJson(root, 'docs/metrics/accessibility-smoke-latest.json', {
      generatedAt: '2026-03-11T09:00:00.000Z',
      summary: {
        total: 1,
        passed: 1,
        failed: 0,
        totalDurationMs: 500,
      },
      results: [
        {
          id: 'app-shell-a11y',
          name: 'App Shell Accessibility',
          status: 'pass',
          durationMs: 500,
          runner: 'vitest',
        },
      ],
    });
    writeJson(root, 'docs/metrics/accessibility-route-crawl-latest.json', {
      generatedAt: '2026-03-07T09:00:00.000Z',
      status: 'failed',
      summary: {
        total: 2,
        passed: 1,
        failed: 1,
        durationMs: 2_700,
      },
      results: [
        { id: 'public-home', name: 'Public Home', route: '/', status: 'fail', durationMs: 2_100 },
        { id: 'public-auth', name: 'Public Auth', route: '/signin', status: 'pass', durationMs: 600 },
      ],
    });

    const snapshot = collectTestingQualitySnapshot({
      root,
      now: new Date('2026-03-11T10:00:00.000Z'),
    });

    expect(snapshot.status).toBe('fail');
    expect(snapshot.summary.repoTestFileCount).toBe(5);
    expect(snapshot.summary.e2eTestFileCount).toBe(1);
    expect(snapshot.summary.scriptTestFileCount).toBe(1);
    expect(snapshot.summary.featuresWithoutTestCount).toBe(0);
    expect(snapshot.summary.featuresWithoutFastTestCount).toBe(1);
    expect(snapshot.summary.featuresWithoutNegativeTestCount).toBe(2);
    expect(snapshot.summary.todoCount).toBe(1);
    expect(snapshot.featureCoverage.withoutTests).toEqual([]);
    expect(snapshot.featureCoverage.withoutFastTests).toContain('products');
    expect(snapshot.featureCoverage.withoutNegativeTests).toEqual(
      expect.arrayContaining(['notes', 'products'])
    );
    expect(snapshot.inventory.hygiene.todoCount).toBe(1);
    expect(snapshot.inventory.featureCoverage.featuresWithoutFastTests).toContain('products');
    expect(snapshot.inventory.featureCoverage.featuresWithoutNegativeTests).toEqual(
      expect.arrayContaining(['notes', 'products'])
    );

    expect(snapshot.baselines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'unitDomains',
          status: 'pass',
          passRate: 100,
        }),
        expect.objectContaining({
          id: 'securitySmoke',
          status: 'fail',
          passRate: 50,
        }),
        expect.objectContaining({
          id: 'highRiskCoverage',
          status: 'warn',
        }),
        expect.objectContaining({
          id: 'integrationPrisma',
          status: 'missing',
        }),
        expect.objectContaining({
          id: 'accessibilityRouteCrawl',
          status: 'fail',
          freshness: 'stale',
        }),
      ])
    );

    expect(snapshot.slowestSuites[0]).toMatchObject({
      baselineId: 'accessibilityRouteCrawl',
      name: 'Public Home',
      durationMs: 2_100,
    });
  });

  it('fails the snapshot status when .only remains in repo tests', () => {
    const root = createTempRoot();

    writeFile(root, 'src/features/auth/index.ts', 'export const auth = true;\n');
    writeFile(root, 'src/features/auth/auth.test.ts', 'it.only("auth", () => expect(true).toBe(true));\n');

    writeJson(root, 'docs/metrics/unit-domain-timings-latest.json', {
      generatedAt: '2026-03-11T08:00:00.000Z',
      summary: { total: 1, passed: 1, failed: 0, totalDurationMs: 100 },
      results: [{ id: 'auth', name: 'Auth', status: 'pass', durationMs: 100 }],
    });
    writeJson(root, 'docs/metrics/critical-flow-tests-latest.json', {
      generatedAt: '2026-03-11T08:00:00.000Z',
      summary: { total: 1, passed: 1, failed: 0, totalDurationMs: 100 },
      results: [{ id: 'auth-session', name: 'Auth Session', status: 'pass', durationMs: 100 }],
    });
    writeJson(root, 'docs/metrics/security-smoke-latest.json', {
      generatedAt: '2026-03-11T08:00:00.000Z',
      summary: { total: 1, passed: 1, failed: 0, totalDurationMs: 100 },
      results: [{ id: 'auth-security', name: 'Auth Security', status: 'pass', durationMs: 100 }],
    });
    writeJson(root, 'docs/metrics/high-risk-coverage-latest.json', {
      generatedAt: '2026-03-11T08:00:00.000Z',
      status: 'pass',
      summary: { total: 1, passed: 1, failed: 0, totalDurationMs: 100 },
      results: [{ id: 'api-routes', name: 'API Routes', status: 'pass', durationMs: 100 }],
    });
    writeJson(root, 'docs/metrics/accessibility-smoke-latest.json', {
      generatedAt: '2026-03-11T08:00:00.000Z',
      summary: { total: 1, passed: 1, failed: 0, totalDurationMs: 100 },
      results: [{ id: 'app-shell-a11y', name: 'App Shell', status: 'pass', durationMs: 100 }],
    });

    const snapshot = collectTestingQualitySnapshot({
      root,
      now: new Date('2026-03-11T10:00:00.000Z'),
    });

    expect(snapshot.summary.onlyCount).toBe(1);
    expect(snapshot.status).toBe('fail');
  });
});
