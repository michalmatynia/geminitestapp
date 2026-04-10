import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { refreshImprovementDocs } from './generate-improvement-docs';
import { listImprovementTracks } from './general-improvement-operations';

const tempRoots: string[] = [];

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'improvement-docs-'));
  tempRoots.push(root);
  return root;
};

const writeJson = (root: string, relativePath: string, value: unknown) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

describe('refreshImprovementDocs', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('writes portfolio and per-track latest artifacts from the improvement reports', async () => {
    const root = createTempRoot();

    writeJson(root, 'artifacts/improvements/plan-report.json', {
      kind: 'general-improvement-report',
      generatedAt: '2026-04-10T11:19:28.902Z',
      phase: 'plan',
      executionMode: 'planned',
      allowWrite: false,
      selectedTrackIds: ['ui-consolidation', 'application-performance', 'repo-quality-baseline'],
      reportPath: 'artifacts/improvements/plan-report.json',
      steps: [
        {
          id: 'ui-consolidation-plan',
          title: 'Review the latest shared UI convergence surface',
          trackId: 'ui-consolidation',
          phase: 'plan',
          mode: 'manual',
          writes: false,
          status: 'manual',
          outputs: [],
          instructions: ['Use docs/ui-consolidation/scan-latest.md as the current shared backlog.'],
        },
        {
          id: 'application-performance-plan',
          title: 'Review the latest performance baseline outputs before optimization work',
          trackId: 'application-performance',
          phase: 'plan',
          mode: 'manual',
          writes: false,
          status: 'manual',
          outputs: [],
          instructions: ['Use docs/metrics/critical-path-performance-latest.md as the default review surface.'],
        },
        {
          id: 'repo-quality-baseline-plan',
          title: 'Review baseline results and decide follow-up validation',
          trackId: 'repo-quality-baseline',
          phase: 'plan',
          mode: 'manual',
          writes: false,
          status: 'manual',
          outputs: [],
          instructions: ['Use the lint and typecheck outputs to decide whether a wider repo quality sweep is needed.'],
        },
      ],
    });

    writeJson(root, 'artifacts/improvements/classify-report.json', {
      kind: 'general-improvement-report',
      generatedAt: '2026-04-02T21:21:20.286Z',
      phase: 'classify',
      executionMode: 'executed',
      allowWrite: false,
      selectedTrackIds: ['products-category-schema-normalization'],
      reportPath: 'artifacts/improvements/classify-report.json',
      steps: [
        {
          id: 'products-category-manual-remediation-report',
          title: 'Report products requiring manual category or schema remediation',
          trackId: 'products-category-schema-normalization',
          phase: 'classify',
          mode: 'automatic',
          writes: false,
          status: 'failed',
          script: 'products:report:parameter-remediation',
          outputs: ['/tmp/product-parameter-manual-remediation-latest.json'],
          instructions: [],
          durationMs: 321,
        },
      ],
    });

    writeJson(root, 'artifacts/improvements/read-only-batch-report.json', {
      kind: 'general-improvement-batch-report',
      generatedAt: '2026-04-02T21:21:20.600Z',
      selectedTrackIds: [
        'products-parameter-integrity',
        'products-category-schema-normalization',
        'repo-quality-baseline',
      ],
      phases: [
        {
          phase: 'audit',
          status: 'passed',
          durationMs: 6024,
          reportPath: 'artifacts/improvements/audit-report.json',
        },
        {
          phase: 'classify',
          status: 'failed',
          durationMs: 383671,
          reportPath: 'artifacts/improvements/classify-report.json',
        },
      ],
    });

    await refreshImprovementDocs(root);

    const portfolioJson = JSON.parse(
      fs.readFileSync(path.join(root, 'docs', 'build', 'improvements', 'scan-latest.json'), 'utf8')
    ) as {
      tracks: Array<{
        trackId: string;
        overallStatus: string;
        latestGeneratedAt: string | null;
      }>;
    };
    const portfolioMarkdown = fs.readFileSync(
      path.join(root, 'docs', 'build', 'improvements', 'scan-latest.md'),
      'utf8'
    );
    const applicationTrackMarkdown = fs.readFileSync(
      path.join(root, 'docs', 'build', 'improvements', 'application-performance', 'scan-latest.md'),
      'utf8'
    );
    const applicationInventory = fs.readFileSync(
      path.join(root, 'docs', 'build', 'improvements', 'application-performance', 'inventory-latest.csv'),
      'utf8'
    );

    expect(portfolioJson.tracks).toHaveLength(listImprovementTracks().length);
    expect(portfolioJson.tracks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trackId: 'application-performance',
          overallStatus: 'attention',
          latestGeneratedAt: '2026-04-10T11:19:28.902Z',
        }),
        expect.objectContaining({
          trackId: 'products-category-schema-normalization',
          overallStatus: 'failed',
          latestGeneratedAt: '2026-04-02T21:21:20.286Z',
        }),
        expect.objectContaining({
          trackId: 'testing-quality-baseline',
          overallStatus: 'no-data',
          latestGeneratedAt: null,
        }),
      ])
    );

    expect(portfolioMarkdown).toContain('# Improvement Operations Portfolio');
    expect(portfolioMarkdown).toContain('`npm run improvements:application`');
    expect(portfolioMarkdown).toContain('[README](./application-performance/README.md)');
    expect(portfolioMarkdown).toContain('| `application-performance` | `performance` | yes | `attention` |');

    expect(applicationTrackMarkdown).toContain("# Application performance Improvement Track");
    expect(applicationTrackMarkdown).toContain('| `plan` | `manual` | 1 | 0 | 1 | 0 | 0 |');
    expect(applicationTrackMarkdown).toContain('[`docs/runbooks/application-performance-operations.md`](../../../runbooks/application-performance-operations.md)');

    expect(applicationInventory).toContain('plan,application-performance-plan,Review the latest performance baseline outputs before optimization work,manual,manual,false');
  });
});
