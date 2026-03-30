import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const countDocuments = vi.fn();
  const aggregateToArray = vi.fn();
  const aggregate = vi.fn(() => ({
    toArray: aggregateToArray,
  }));
  const collection = vi.fn(() => ({
    countDocuments,
    aggregate,
  }));
  const getMongoDb = vi.fn(async () => ({
    collection,
  }));
  const buildAlertEvidenceContext = vi.fn(async () => ({
    windowStart: '2026-03-25T16:00:00.000Z',
    windowEnd: '2026-03-25T16:05:00.000Z',
    matchedCount: 0,
    sampleSize: 0,
    samples: [],
  }));
  const listAlertEvidenceLogs = vi.fn(async () => []);
  const logSystemEvent = vi.fn(async () => undefined);
  const getSystemAlerts = vi.fn(async () => []);

  return {
    countDocuments,
    aggregateToArray,
    aggregate,
    collection,
    getMongoDb,
    buildAlertEvidenceContext,
    listAlertEvidenceLogs,
    logSystemEvent,
    getSystemAlerts,
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

vi.mock('@/shared/lib/observability/system-alerts-repository', () => ({
  getSystemAlerts: mocks.getSystemAlerts,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: mocks.logSystemEvent,
}));

vi.mock('@/shared/lib/observability/workers/system-log-alerts/evidence', () => ({
  buildAlertEvidenceContext: mocks.buildAlertEvidenceContext,
  readTrimmedString: (value: unknown): string | null =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null,
}));

vi.mock('@/shared/lib/observability/workers/system-log-alerts/repository', () => ({
  listAlertEvidenceLogs: mocks.listAlertEvidenceLogs,
}));

import {
  evaluateErrorSpike,
  evaluateLogSilence,
  evaluatePerServiceErrorSpikes,
  evaluatePerSourceErrorSpikes,
  evaluateSlowRequestSpikes,
  evaluateUserDefinedAlerts,
  isAlertInCooldown,
  parseAlertCondition,
  readService,
} from '@/shared/lib/observability/workers/system-log-alerts/alert-evaluators';
import { queueState } from '@/shared/lib/observability/workers/system-log-alerts/state';

describe('system-log-alert alert evaluators shared-lib coverage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T16:05:00.000Z'));
    vi.clearAllMocks();
    queueState.lastAlertAt = 0;
    queueState.lastSilenceAlertAt = 0;
    queueState.perSourceLastAlertAt = {};
    queueState.perServiceLastAlertAt = {};
    queueState.perSlowRouteLastAlertAt = {};
    queueState.perServiceTelemetrySilenceLastAlertAt = {};
    queueState.perAlertLastFiredAt = {};
    delete process.env['SYSTEM_LOG_ALERTS_ENABLED'];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads service values, alert cooldowns, and user alert conditions', () => {
    expect(
      readService({
        service: ' api ',
        context: { service: 'worker' },
      } as never)
    ).toBe('api');
    expect(
      readService({
        service: '   ',
        context: { service: ' worker ' },
      } as never)
    ).toBe('worker');
    expect(readService({ context: {} } as never)).toBeNull();

    expect(isAlertInCooldown('alert-1', Date.now(), 60)).toBe(false);
    queueState.perAlertLastFiredAt['alert-1'] = Date.now() - 30_000;
    expect(isAlertInCooldown('alert-1', Date.now(), 60)).toBe(true);

    expect(
      parseAlertCondition({
        condition: {
          level: 'error',
          source: 'edge',
          pathPrefix: '/api',
          statusCodeMin: '500',
          statusCodeMax: 599,
          windowSeconds: '120',
          threshold: '3',
          cooldownSeconds: 45,
        },
      } as never)
    ).toEqual({
      type: 'error_count',
      level: 'error',
      source: 'edge',
      pathPrefix: '/api',
      statusCodeMin: 500,
      statusCodeMax: 599,
      windowSeconds: 120,
      threshold: 3,
      cooldownSeconds: 45,
    });
    expect(parseAlertCondition({ condition: null } as never)).toEqual({
      type: 'error_count',
      level: undefined,
      source: undefined,
      pathPrefix: undefined,
      statusCodeMin: undefined,
      statusCodeMax: undefined,
      windowSeconds: undefined,
      threshold: undefined,
      cooldownSeconds: undefined,
    });
  });

  it('evaluates the global error spike and skips work when alerts are disabled', async () => {
    mocks.countDocuments.mockResolvedValueOnce(20);

    await evaluateErrorSpike();

    expect(mocks.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        'context.alertType': { $exists: false },
      })
    );
    expect(mocks.buildAlertEvidenceContext).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          level: 'error',
          excludeAlertEvents: true,
        }),
      })
    );
    expect(mocks.logSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        source: 'system-log-alerts',
        critical: true,
        context: expect.objectContaining({
          alertType: 'error_volume_spike',
        }),
      })
    );

    vi.clearAllMocks();
    process.env['SYSTEM_LOG_ALERTS_ENABLED'] = 'false';
    await evaluateErrorSpike();
    expect(mocks.countDocuments).not.toHaveBeenCalled();
  });

  it('evaluates per-source and per-service error spikes with alert evidence queries', async () => {
    mocks.aggregateToArray.mockResolvedValueOnce([
      { _id: 'client-error-reporter', count: 10 },
      { _id: '', count: 20 },
    ]);
    mocks.listAlertEvidenceLogs.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, index) => ({
        id: `log-${index}`,
        level: 'error',
        message: 'Client exception',
        category: null,
        source: 'client-error-reporter',
        service: index < 5 ? null : 'client-error-reporter',
        context: index < 5 ? { service: 'client-error-reporter' } : null,
        stack: null,
        path: null,
        method: null,
        statusCode: null,
        requestId: null,
        traceId: null,
        correlationId: null,
        spanId: null,
        parentSpanId: null,
        userId: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      }))
    );

    await evaluatePerSourceErrorSpikes();
    await evaluatePerServiceErrorSpikes();

    expect(mocks.aggregate.mock.calls[0]?.[0]?.[0]).toMatchObject({
      $match: expect.objectContaining({
        level: 'error',
        'context.alertType': { $exists: false },
      }),
    });
    expect(mocks.buildAlertEvidenceContext).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        query: expect.objectContaining({
          sourceContains: 'client-error-reporter',
          excludeAlertEvents: true,
        }),
      })
    );
    expect(mocks.listAlertEvidenceLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        excludeAlertEvents: true,
      }),
      expect.any(Number)
    );
    expect(mocks.buildAlertEvidenceContext).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: expect.objectContaining({
          service: 'client-error-reporter',
          excludeAlertEvents: true,
        }),
      })
    );
    expect(mocks.logSystemEvent).toHaveBeenCalledTimes(2);
  });

  it('evaluates slow request spikes, custom alerts, and telemetry silence', async () => {
    mocks.listAlertEvidenceLogs.mockResolvedValueOnce(
      Array.from({ length: 20 }, (_, index) => ({
        id: `slow-${index}`,
        level: 'info',
        message: 'Slow response',
        source: 'api',
        service: 'catalog',
        context: { durationMs: 900 },
        path: '/api/products',
        statusCode: 200,
        createdAt: new Date().toISOString(),
      }))
    );
    mocks.getSystemAlerts.mockResolvedValueOnce([
      {
        id: 'alert-1',
        name: 'API 5xx burst',
        enabled: true,
        severity: 'critical',
        condition: {
          level: 'error',
          source: 'edge',
          statusCodeMin: '500',
          threshold: '2',
          windowSeconds: '120',
          cooldownSeconds: 60,
        },
      },
    ]);
    mocks.countDocuments.mockResolvedValueOnce(3).mockResolvedValueOnce(0);

    await evaluateSlowRequestSpikes();
    await evaluateUserDefinedAlerts();
    await evaluateLogSilence();

    expect(mocks.buildAlertEvidenceContext).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        query: expect.objectContaining({
          service: 'catalog',
          pathPrefix: '/api/products',
        }),
      })
    );
    expect(mocks.logSystemEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        level: 'warn',
        context: expect.objectContaining({
          alertType: 'slow_request_spike_per_service_endpoint',
        }),
      })
    );
    expect(mocks.buildAlertEvidenceContext).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: expect.objectContaining({
          level: 'error',
          sourceContains: 'edge',
          statusCodeMin: 500,
        }),
      })
    );
    expect(mocks.logSystemEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        level: 'error',
        critical: true,
        context: expect.objectContaining({
          alertType: 'user_defined_alert',
          alertId: 'alert-1',
        }),
      })
    );
    expect(mocks.buildAlertEvidenceContext).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        matchedCount: 0,
      })
    );
    expect(mocks.logSystemEvent).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        level: 'error',
        critical: true,
        context: expect.objectContaining({
          alertType: 'telemetry_silence',
        }),
      })
    );
  });
});
