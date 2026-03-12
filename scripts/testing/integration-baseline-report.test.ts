import { describe, expect, it } from 'vitest';

import {
  buildIntegrationBaselinePayload,
  toIntegrationBaselineMarkdown,
} from './lib/integration-baseline-report.mjs';

describe('integration baseline report helpers', () => {
  it('builds a passing aggregate payload from successful steps', () => {
    const payload = buildIntegrationBaselinePayload({
      generatedAt: '2026-03-11T10:00:00.000Z',
      strictMode: true,
      suiteId: 'integration-mongo',
      suiteName: 'Mongo Integration Project',
      project: 'integration-mongo',
      steps: [
        {
          id: 'mongo-preflight',
          name: 'Mongo preflight',
          command: 'mongosh --quiet --eval db.runCommand({ ping: 1 }).ok',
          status: 'pass',
          exitCode: 0,
          durationMs: 250,
          output: 'ok',
        },
        {
          id: 'vitest',
          name: 'Vitest integration-mongo project',
          command: './node_modules/.bin/vitest run --project integration-mongo',
          status: 'pass',
          exitCode: 0,
          durationMs: 1_250,
          output: 'all green',
        },
      ],
    });

    expect(payload.summary).toEqual({
      total: 1,
      passed: 1,
      failed: 0,
      totalDurationMs: 1_500,
    });
    expect(payload.results[0]).toMatchObject({
      id: 'integration-mongo',
      status: 'pass',
      exitCode: 0,
      durationMs: 1_500,
    });
  });

  it('builds failing markdown when any step fails', () => {
    const payload = buildIntegrationBaselinePayload({
      generatedAt: '2026-03-11T10:00:00.000Z',
      strictMode: false,
      suiteId: 'integration-mongo',
      suiteName: 'Mongo Integration Project',
      project: 'integration-mongo',
      steps: [
        {
          id: 'vitest',
          name: 'Vitest integration-mongo project',
          command: './node_modules/.bin/vitest run --project integration-mongo',
          status: 'fail',
          exitCode: 1,
          durationMs: 800,
          output: 'failed suite',
        },
      ],
    });

    const markdown = toIntegrationBaselineMarkdown(payload, {
      title: 'Mongo Integration Baseline',
      notes: ['fixture note'],
    });

    expect(payload.summary.failed).toBe(1);
    expect(payload.results[0].status).toBe('fail');
    expect(markdown).toContain('# Mongo Integration Baseline');
    expect(markdown).toContain('Vitest integration-mongo project');
    expect(markdown).toContain('FAIL');
    expect(markdown).toContain('fixture note');
  });
});
