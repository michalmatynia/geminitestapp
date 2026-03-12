import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const weeklyWorkflow = fs.readFileSync(
  path.join(repoRoot, '.github', 'workflows', 'weekly-quality-report.yml'),
  'utf8'
);
const testMatrixWorkflow = fs.readFileSync(
  path.join(repoRoot, '.github', 'workflows', 'test-matrix.yml'),
  'utf8'
);
const bazelDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'build', 'bazel.md'), 'utf8');
const metricsDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'metrics', 'README.md'), 'utf8');

describe('testing quality contract', () => {
  it('keeps the testing quality and integration baseline scripts in package.json', () => {
    expect(packageJson.scripts).toMatchObject({
      'metrics:test-quality': 'node scripts/quality/generate-test-quality-snapshot.mjs',
      'check:test-quality':
        'node scripts/quality/generate-test-quality-snapshot.mjs --summary-json --no-write',
      'check:test-distribution': 'node scripts/quality/check-test-distribution.mjs',
      'check:test-distribution:strict':
        'node scripts/quality/check-test-distribution.mjs --strict --fail-on-warnings',
      'check:coverage:high-risk': 'node scripts/quality/check-high-risk-coverage.mjs',
      'check:coverage:high-risk:strict': 'node scripts/quality/check-high-risk-coverage.mjs --strict',
      'test:coverage:high-risk': 'node scripts/testing/run-high-risk-coverage-baseline.mjs',
      'test:coverage:high-risk:strict': 'node scripts/testing/run-high-risk-coverage-baseline.mjs --strict',
      'test:integration:mongo:baseline':
        'node scripts/testing/run-integration-mongo-baseline.mjs',
      'test:integration:mongo:baseline:strict':
        'node scripts/testing/run-integration-mongo-baseline.mjs --strict',
    });

    expect(packageJson.scripts?.['check:quality:extended']).toContain('npm run check:coverage:high-risk');
    expect(packageJson.scripts?.['check:quality:extended:strict']).toContain(
      'npm run check:coverage:high-risk:strict'
    );
  });

  it('keeps weekly quality reporting wired to integration baselines and the testing snapshot', () => {
    expect(weeklyWorkflow).toContain('Run Mongo integration baseline');
    expect(weeklyWorkflow).toContain('npm run test:integration:mongo:baseline');
    expect(weeklyWorkflow).toContain('Run high-risk coverage baseline');
    expect(weeklyWorkflow).toContain('HIGH_RISK_COVERAGE_CONCURRENCY: \'2\'');
    expect(weeklyWorkflow).toContain('npm run test:coverage:high-risk');
    expect(weeklyWorkflow).toContain('Run test distribution quality scan');
    expect(weeklyWorkflow).toContain('npm run check:test-distribution');
    expect(weeklyWorkflow).toContain('Generate testing quality snapshot');
    expect(weeklyWorkflow).toContain('npm run metrics:test-quality');
    expect(weeklyWorkflow).toContain('docs/metrics/testing-quality-snapshot-latest.json');
    expect(weeklyWorkflow).toContain('docs/metrics/test-distribution-latest.json');
    expect(weeklyWorkflow).toContain('docs/metrics/high-risk-coverage-latest.json');
    expect(weeklyWorkflow).toContain('docs/metrics/integration-mongo-latest.json');
  });

  it('keeps the main test matrix publishing integration baseline artifacts and docs references', () => {
    expect(testMatrixWorkflow).toContain('Upload Mongo integration report');
    expect(testMatrixWorkflow).toContain('docs/metrics/integration-mongo-latest.json');

    expect(bazelDocs).toContain(
      '`//:integration_mongo` -> direct Mongo integration baseline runner with metrics artifact output'
    );
    expect(metricsDocs).toContain('[`test-distribution-latest.md`](./test-distribution-latest.md)');
    expect(metricsDocs).toContain('[`high-risk-coverage-latest.md`](./high-risk-coverage-latest.md)');
    expect(metricsDocs).toContain('[`integration-mongo-latest.md`](./integration-mongo-latest.md)');
  });
});
