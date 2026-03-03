import { beforeEach, describe, expect, it, vi } from 'vitest';

const { activeContextMock, getSpanMock } = vi.hoisted(() => ({
  activeContextMock: vi.fn(),
  getSpanMock: vi.fn(),
}));

vi.mock('@opentelemetry/api', () => ({
  context: {
    active: activeContextMock,
  },
  trace: {
    getSpan: getSpanMock,
  },
}));

import { getActiveOtelContextAttributes } from '@/shared/lib/observability/otel-context';

describe('otel-context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeContextMock.mockReturnValue({});
  });

  it('returns trace and span attributes when an active span exists', () => {
    getSpanMock.mockReturnValue({
      spanContext: () => ({
        traceId: 'otel-trace-1',
        spanId: 'otel-span-1',
        traceFlags: 1,
      }),
    });

    expect(getActiveOtelContextAttributes()).toEqual({
      otelTraceId: 'otel-trace-1',
      otelSpanId: 'otel-span-1',
      otelTraceFlags: '01',
    });
  });

  it('returns empty attributes when there is no active span', () => {
    getSpanMock.mockReturnValue(undefined);
    expect(getActiveOtelContextAttributes()).toEqual({});
  });
});
