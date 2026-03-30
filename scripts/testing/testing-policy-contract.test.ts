import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const docsReadme = fs.readFileSync(path.join(repoRoot, 'docs', 'README.md'), 'utf8');
const platformReadme = fs.readFileSync(path.join(repoRoot, 'docs', 'platform', 'README.md'), 'utf8');
const runbooksReadme = fs.readFileSync(path.join(repoRoot, 'docs', 'runbooks', 'README.md'), 'utf8');
const metricsReadme = fs.readFileSync(path.join(repoRoot, 'docs', 'metrics', 'README.md'), 'utf8');
const agentsDoc = fs.readFileSync(path.join(repoRoot, 'docs', 'AGENTS.md'), 'utf8');
const testingPolicy = fs.readFileSync(path.join(repoRoot, 'docs', 'platform', 'testing-policy.md'), 'utf8');
const testingRunbook = fs.readFileSync(path.join(repoRoot, 'docs', 'runbooks', 'testing-operations.md'), 'utf8');

describe('testing policy contract', () => {
  it('keeps lane and ledger scripts in package.json', () => {
    expect(packageJson.scripts).toMatchObject({
      'metrics:test-suite-inventory': 'node scripts/testing/scan-test-suite-inventory.mjs',
      'metrics:test-run-ledger': 'node scripts/testing/record-test-run.mjs --init',
      'test:lane': 'node scripts/testing/run-test-lane.mjs',
      'test:lane:local-fast': 'node scripts/testing/run-test-lane.mjs --lane=local-fast',
      'test:lane:pr-required': 'node scripts/testing/run-test-lane.mjs --lane=pr-required',
      'test:lane:nightly-deep': 'node scripts/testing/run-test-lane.mjs --lane=nightly-deep',
      'test:lane:weekly-audit': 'node scripts/testing/run-test-lane.mjs --lane=weekly-audit',
      'test:lane:release-gate': 'node scripts/testing/run-test-lane.mjs --lane=release-gate',
      'testing:record': 'node scripts/testing/record-test-run.mjs',
    });
  });

  it('keeps testing policy docs linked from the main hubs', () => {
    expect(docsReadme).toContain('[`docs/platform/testing-policy.md`](./platform/testing-policy.md)');
    expect(docsReadme).toContain('[`docs/runbooks/testing-operations.md`](./runbooks/testing-operations.md)');
    expect(platformReadme).toContain('[`testing-policy.md`](./testing-policy.md)');
    expect(runbooksReadme).toContain('[`testing-operations.md`](./testing-operations.md)');
  });

  it('keeps metrics and agent guidance linked to the suite inventory and run ledger', () => {
    expect(metricsReadme).toContain('[`testing-suite-inventory-latest.md`](./testing-suite-inventory-latest.md)');
    expect(metricsReadme).toContain('[`testing-run-ledger-latest.md`](./testing-run-ledger-latest.md)');
    expect(agentsDoc).toContain('docs/metrics/testing-run-ledger-latest.*');
    expect(agentsDoc).toContain('npm run testing:record');
  });

  it('documents canonical lanes and recording expectations', () => {
    expect(testingPolicy).toContain('`local-fast`');
    expect(testingPolicy).toContain('`pr-required`');
    expect(testingPolicy).toContain('`nightly-deep`');
    expect(testingPolicy).toContain('`weekly-audit`');
    expect(testingPolicy).toContain('`release-gate`');
    expect(testingPolicy).toContain('The ledger lives at');
    expect(testingPolicy).toContain('CI should schedule the canonical `nightly-deep` lane directly');
    expect(testingPolicy).toContain('CI should publish a stable `pr-required` ledger artifact');
    expect(testingRunbook).toContain('npm run test:lane:pr-required');
    expect(testingRunbook).toContain('.github/workflows/nightly-deep-tests.yml');
    expect(testingRunbook).toContain('npm run testing:record');
    expect(testingRunbook).toContain('testing-run-ledger-latest.*');
  });
});
