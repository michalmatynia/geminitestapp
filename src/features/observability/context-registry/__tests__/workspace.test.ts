import { describe, expect, it } from 'vitest';

import { buildSystemLogsWorkspaceContextBundle } from '../workspace';

describe('buildSystemLogsWorkspaceContextBundle', () => {
  it('builds an Observation Post runtime document with filters, metrics, logs, and insights', () => {
    const bundle = buildSystemLogsWorkspaceContextBundle({
      level: 'error',
      query: 'timeout',
      source: 'ai-paths-worker',
      service: 'ai.paths',
      method: 'POST',
      statusCode: '500',
      minDurationMs: '750',
      requestId: 'req-1',
      traceId: 'trace-1',
      correlationId: 'corr-1',
      userId: 'user-1',
      fingerprint: 'fp-1',
      category: 'AI',
      fromDate: '2026-03-01',
      toDate: '2026-03-09',
      page: 2,
      pageSize: 50,
      total: 134,
      totalPages: 3,
      logs: [
        {
          id: 'log-1',
          level: 'error',
          message: 'Path run timed out while waiting for handoff completion',
          source: 'ai-paths-worker',
          service: 'ai.paths',
          category: 'AI',
          path: '/api/ai-paths/runs/enqueue',
          method: 'POST',
          statusCode: 500,
          createdAt: '2026-03-09T10:00:00.000Z',
        },
      ] as never,
      metrics: {
        total: 320,
        levels: {
          error: 42,
          warn: 88,
          info: 190,
        },
        last24Hours: 57,
        last7Days: 320,
        topSources: [{ source: 'ai-paths-worker', count: 18 }],
        topServices: [{ service: 'ai.paths', count: 18 }],
        topPaths: [{ path: '/api/ai-paths/runs/enqueue', count: 12 }],
        generatedAt: '2026-03-09T10:05:00.000Z',
      },
      insights: [
        {
          id: 'insight-1',
          status: 'new',
          source: 'manual',
          summary: 'Repeated AI path handoff timeouts suggest queue pressure.',
          warnings: ['Queue depth is rising.'],
          recommendations: ['Inspect worker concurrency.'],
          createdAt: '2026-03-09T10:06:00.000Z',
        },
      ] as never,
      interpretationCount: 3,
    });

    expect(bundle.refs).toEqual([
      expect.objectContaining({
        id: 'runtime:system-logs:workspace',
        kind: 'runtime_document',
        providerId: 'system-logs-page-local',
        entityType: 'system_logs_workspace_state',
      }),
    ]);
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]).toMatchObject({
      entityType: 'system_logs_workspace_state',
      title: 'Observation Post workspace state',
      facts: expect.objectContaining({
        page: 2,
        total: 134,
        visibleLogCount: 1,
        insightCount: 1,
        interpretationCount: 3,
        activeFilterCount: 15,
        level: 'error',
      }),
    });
    expect(bundle.documents[0].sections.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        'Workspace snapshot',
        'Active filters',
        'Metrics snapshot',
        'Visible logs',
        'Latest AI insights',
      ])
    );
  });
});
