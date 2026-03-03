import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const createRequestContext = (): ApiHandlerContext => ({
  requestId: 'request-1',
  traceId: 'trace-request',
  correlationId: 'corr-request',
  startTime: Date.now(),
  getElapsedMs: () => 1,
});

const createEvent = (id: string) => ({
  id,
  timestamp: '2026-03-03T00:00:00.000Z',
  traceId: 'trace-client-1',
  entity: 'query',
  stage: 'error',
  source: 'ui.products.table',
  operation: 'fetch',
  resource: '/api/products',
  key: 'customer=john.doe@example.com&phone=+48 123 456 789&' + 'x'.repeat(220),
  keyHash: 'hash-key-1',
  criticality: 'critical',
  domain: 'products',
  sampled: true,
  attempt: 1,
  durationMs: 840,
  statusCode: 500,
  category: 'http_error',
  errorMessage: 'Request failed',
  context: {
    email: 'john.doe@example.com',
    phone: '+48 123 456 789',
    apiKey: 'secret-value',
    largeText: 'a'.repeat(2_300),
  },
  tags: ['critical'],
});

const loadBlockingHandler = async () => {
  vi.resetModules();
  process.env['QUERY_TELEMETRY_BLOCKING_INGESTION'] = 'true';
  process.env['QUERY_TELEMETRY_STORE_RAW_KEYS'] = 'false';
  const module = await import('./handler');
  const loggerModule = await import('@/shared/lib/observability/system-logger');
  return {
    ...module,
    mockedLogSystemEvent: vi.mocked(loggerModule.logSystemEvent),
  };
};

describe('query telemetry ingestion', () => {
  it('deduplicates events and persists redacted/truncated telemetry metadata', async () => {
    const { POST_handler, queryTelemetryTestUtils, mockedLogSystemEvent } =
      await loadBlockingHandler();
    queryTelemetryTestUtils.resetIngestionState();
    mockedLogSystemEvent.mockReset();
    mockedLogSystemEvent.mockResolvedValue(undefined);

    const event = createEvent('evt-1');
    const request = new NextRequest('http://localhost/api/query-telemetry', { method: 'POST' });
    const response = await POST_handler(request, {
      ...createRequestContext(),
      body: { events: [event, event] },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        accepted: 1,
        dropped: 1,
        truncated: 1,
        queued: false,
        droppedByReason: {
          deduplicated: 1,
          persistError: 0,
        },
      })
    );

    expect(mockedLogSystemEvent).toHaveBeenCalledTimes(1);
    const ingestedLog = mockedLogSystemEvent.mock.calls[0]?.[0];
    expect(ingestedLog).toMatchObject({
      service: 'query.telemetry',
      traceId: 'trace-client-1',
      correlationId: 'evt-1',
    });
    expect(ingestedLog?.context).toMatchObject({
      eventId: 'evt-1',
      keyHash: 'hash-key-1',
      keyPreviewTruncated: true,
      telemetryTruncation: {
        reason: 'string_value_truncation',
        maxLength: 2000,
      },
    });
    expect(String(ingestedLog?.context?.['keyPreview'])).toContain('[REDACTED]');
    expect(String(ingestedLog?.context?.['telemetryContext']?.['email'])).toContain('[REDACTED]');
    expect(ingestedLog?.context).not.toHaveProperty('keyRaw');
  });
});
