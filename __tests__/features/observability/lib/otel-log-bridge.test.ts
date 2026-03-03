import { SeverityNumber } from '@opentelemetry/api-logs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { emitMock, getLoggerMock, getActiveOtelContextAttributesMock } = vi.hoisted(() => ({
  emitMock: vi.fn(),
  getLoggerMock: vi.fn(),
  getActiveOtelContextAttributesMock: vi.fn(() => ({})),
}));

vi.mock('@opentelemetry/api-logs', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@opentelemetry/api-logs')>();
  return {
    ...actual,
    logs: {
      getLogger: getLoggerMock.mockReturnValue({ emit: emitMock }),
    },
  };
});

vi.mock('@/shared/lib/observability/otel-context', () => ({
  getActiveOtelContextAttributes: getActiveOtelContextAttributesMock,
}));

import { emitOtelLogRecord } from '@/shared/lib/observability/otel-log-bridge';

describe('otel-log-bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLoggerMock.mockReturnValue({ emit: emitMock });
    getActiveOtelContextAttributesMock.mockReturnValue({});
  });

  it('emits structured warn log records with redacted context and otel attributes', () => {
    getActiveOtelContextAttributesMock.mockReturnValue({
      otelTraceId: 'otel-trace-ctx',
      otelSpanId: 'otel-span-ctx',
      otelTraceFlags: '01',
    });

    emitOtelLogRecord({
      level: 'warn',
      message: 'Bridge log event',
      source: 'observability.logs',
      service: 'observability',
      context: {
        password: 'top-secret',
        safeValue: 'ok',
      },
      traceId: 'trace-app',
      correlationId: 'corr-app',
    });

    expect(emitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        severityNumber: SeverityNumber.WARN,
        severityText: 'WARN',
        body: 'Bridge log event',
        attributes: expect.objectContaining({
          source: 'observability.logs',
          service: 'observability',
          traceId: 'trace-app',
          correlationId: 'corr-app',
          otelTraceId: 'otel-trace-ctx',
          otelSpanId: 'otel-span-ctx',
          otelTraceFlags: '01',
          'context.password': '[REDACTED]',
          'context.safeValue': 'ok',
        }),
      })
    );
  });

  it('swallows emitter failures and does not throw', () => {
    emitMock.mockImplementation(() => {
      throw new Error('emit failed');
    });

    expect(() =>
      emitOtelLogRecord({
        level: 'info',
        message: 'should not crash',
      })
    ).not.toThrow();
  });
});

