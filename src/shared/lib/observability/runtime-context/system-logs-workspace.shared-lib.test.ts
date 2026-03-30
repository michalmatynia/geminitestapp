import { describe, expect, it } from 'vitest';

import {
  PAGE_CONTEXT_ENGINE_VERSION,
} from '@/shared/lib/ai-context-registry/page-context-shared';
import {
  buildSystemLogsWorkspaceContextBundle,
  buildSystemLogsWorkspaceRuntimeDocument,
  SYSTEM_LOGS_CONTEXT_ROOT_IDS,
  SYSTEM_LOGS_CONTEXT_RUNTIME_REF,
} from '@/shared/lib/observability/runtime-context/system-logs-workspace';

describe('system-logs-workspace shared-lib coverage', () => {
  it('builds a runtime document with filters, metrics, logs, and insights summaries', () => {
    const document = buildSystemLogsWorkspaceRuntimeDocument({
      level: 'error',
      query: `  ${'A'.repeat(140)}  `,
      source: 'api',
      service: 'web',
      method: 'GET',
      statusCode: '500',
      minDurationMs: '1000',
      requestId: 'req-1',
      traceId: 'trace-1',
      correlationId: 'corr-1',
      userId: 'user-1',
      fingerprint: 'fp-1',
      category: 'SYSTEM',
      fromDate: '2026-03-01',
      toDate: '2026-03-25',
      page: 2,
      pageSize: 25,
      total: 42,
      totalPages: 2,
      logs: Array.from({ length: 10 }, (_, index) => ({
        id: `log-${index}`,
        level: 'error',
        message: ` ${'M'.repeat(260)} `,
        source: 'api',
        service: 'web',
        category: 'SYSTEM',
        path: `/logs/${index}`,
        method: 'GET',
        statusCode: 500,
        createdAt: `2026-03-25T10:0${index}:00.000Z`,
      })) as never,
      metrics: {
        total: 42,
        last24Hours: 10,
        last7Days: 40,
        levels: { error: 5 },
        topSources: ['api', 'worker', 'edge', 'web', 'cron', 'extra'],
        topServices: ['svc-a', 'svc-b', 'svc-c', 'svc-d', 'svc-e', 'svc-f'],
        topPaths: ['/a', '/b', '/c', '/d', '/e', '/f'],
        generatedAt: '2026-03-25T12:00:00.000Z',
      } as never,
      insights: Array.from({ length: 6 }, (_, index) => ({
        id: `insight-${index}`,
        createdAt: `2026-03-25T11:0${index}:00.000Z`,
        status: 'completed',
        source: 'system-logs',
        summary: ` ${'S'.repeat(280)} `,
        warnings: [{ id: 'warn' }],
        recommendations: [{ id: 'rec' }],
      })) as never,
      interpretationCount: 3,
    });

    expect(document.id).toBe(SYSTEM_LOGS_CONTEXT_RUNTIME_REF.id);
    expect(document.relatedNodeIds).toEqual([...SYSTEM_LOGS_CONTEXT_ROOT_IDS]);
    expect(document.facts).toEqual(
      expect.objectContaining({
        page: 2,
        pageSize: 25,
        total: 42,
        totalPages: 2,
        visibleLogCount: 10,
        insightCount: 6,
        interpretationCount: 3,
        activeFilterCount: 15,
        level: 'error',
        hasSearchQuery: true,
        hasSourceFilter: true,
        hasServiceFilter: true,
        hasDateRange: true,
      })
    );
    expect(document.sections.map((section) => section.title)).toEqual([
      'Workspace snapshot',
      'Active filters',
      'Metrics snapshot',
      'Visible logs',
      'Latest AI insights',
    ]);
    expect(document.sections[1]?.items[0]).toEqual(
      expect.objectContaining({
        query: `${'A'.repeat(119)}...`,
      })
    );
    expect(document.sections[2]?.items[0]).toEqual(
      expect.objectContaining({
        topSources: ['api', 'worker', 'edge', 'web', 'cron'],
      })
    );
    expect(document.sections[3]?.items).toHaveLength(8);
    expect(document.sections[4]?.items).toHaveLength(5);
  });

  it('builds a minimal bundle when there are no metrics, logs, or insights', () => {
    const bundle = buildSystemLogsWorkspaceContextBundle({
      level: 'all',
      query: '   ',
      source: '',
      service: '',
      method: '',
      statusCode: '',
      minDurationMs: '',
      requestId: '',
      traceId: '',
      correlationId: '',
      userId: '',
      fingerprint: '',
      category: '',
      fromDate: '',
      toDate: '',
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
      logs: [],
      metrics: null,
      insights: [],
      interpretationCount: 0,
    });

    expect(bundle).toEqual({
      refs: [SYSTEM_LOGS_CONTEXT_RUNTIME_REF],
      nodes: [],
      documents: [
        expect.objectContaining({
          sections: [
            expect.objectContaining({ title: 'Workspace snapshot' }),
            expect.objectContaining({ title: 'Active filters' }),
          ],
          facts: expect.objectContaining({
            activeFilterCount: 0,
            hasSearchQuery: false,
            hasDateRange: false,
          }),
        }),
      ],
      truncated: false,
      engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
    });
  });
});
