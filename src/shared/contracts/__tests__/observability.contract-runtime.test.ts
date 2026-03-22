import { describe, expect, it } from 'vitest';

import {
  mongoDiagnosticsResponseSchema,
  mongoRebuildIndexesResponseSchema,
  systemLogsClearQuerySchema,
  systemLogsCreateRequestSchema,
  systemLogsInsightsListQuerySchema,
  systemLogsListQuerySchema,
  systemLogsMetricsQuerySchema,
} from '@/shared/contracts/observability';

const sampleCollection = {
  name: 'system_logs',
  expected: [{ name: 'createdAt_1', key: { createdAt: 1 } }],
  existing: [{ name: 'createdAt_1', key: { createdAt: 1 } }],
  missing: [],
  extra: [],
};

describe('observability contract runtime', () => {
  it('parses mongo diagnostics responses', () => {
    expect(
      mongoDiagnosticsResponseSchema.parse({
        generatedAt: '2026-03-11T13:00:00.000Z',
        collections: [sampleCollection],
      }).collections
    ).toHaveLength(1);
  });

  it('parses mongo index rebuild responses', () => {
    const parsed = mongoRebuildIndexesResponseSchema.parse({
      generatedAt: '2026-03-11T13:05:00.000Z',
      created: [{ collection: 'system_logs', key: { createdAt: 1 } }],
      collections: [sampleCollection],
    });

    expect(parsed.created[0]?.collection).toBe('system_logs');
    expect(parsed.collections[0]?.name).toBe('system_logs');
  });

  it('parses system logs list and metrics query DTOs', () => {
    expect(
      systemLogsListQuerySchema.parse({
        page: '2',
        pageSize: '25',
        level: 'error',
        source: ' api ',
        from: '2026-03-11T00:00:00.000Z',
      })
    ).toEqual({
      page: 2,
      pageSize: 25,
      level: 'error',
      source: 'api',
      from: '2026-03-11T00:00:00.000Z',
    });

    expect(
      systemLogsMetricsQuerySchema.parse({
        minDurationMs: '150',
        query: ' timeout ',
      })
    ).toEqual({
      minDurationMs: 150,
      query: 'timeout',
    });
  });

  it('parses system logs create, clear, and insights-list DTOs', () => {
    expect(
      systemLogsCreateRequestSchema.parse({
        level: 'warn',
        message: 'Disk pressure',
        source: ' worker ',
      })
    ).toEqual({
      level: 'warn',
      message: 'Disk pressure',
      source: 'worker',
    });

    expect(systemLogsClearQuerySchema.parse({})).toEqual({
      target: 'all_logs',
    });

    expect(
      systemLogsInsightsListQuerySchema.parse({
        limit: '12',
      })
    ).toEqual({
      limit: 12,
    });
  });
});
