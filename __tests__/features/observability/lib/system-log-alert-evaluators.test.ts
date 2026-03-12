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
    windowStart: new Date().toISOString(),
    windowEnd: new Date().toISOString(),
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
  evaluatePerServiceErrorSpikes,
  evaluatePerSourceErrorSpikes,
} from '@/shared/lib/observability/workers/system-log-alerts/alert-evaluators';
import { queueState } from '@/shared/lib/observability/workers/system-log-alerts/state';

describe('system-log alert evaluators', () => {
  beforeEach(() => {
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

  it('excludes alert records from the overall error spike query and evidence sample query', async () => {
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
    expect(mocks.logSystemEvent).toHaveBeenCalledTimes(1);
  });

  it('excludes alert records from per-source grouping and evidence queries', async () => {
    mocks.aggregateToArray.mockResolvedValueOnce([
      { _id: 'client-error-reporter', count: 10 },
    ]);

    await evaluatePerSourceErrorSpikes();

    const pipeline = mocks.aggregate.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    expect(pipeline?.[0]).toMatchObject({
      $match: expect.objectContaining({
        level: 'error',
        'context.alertType': { $exists: false },
      }),
    });
    expect(mocks.buildAlertEvidenceContext).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          level: 'error',
          sourceContains: 'client-error-reporter',
          excludeAlertEvents: true,
        }),
      })
    );
    expect(mocks.logSystemEvent).toHaveBeenCalledTimes(1);
  });

  it('excludes alert records from per-service scans and follow-up evidence queries', async () => {
    mocks.listAlertEvidenceLogs.mockResolvedValueOnce([
      {
        id: 'log-1',
        level: 'error',
        message: 'Client exception',
        category: null,
        source: 'client-error-reporter',
        service: 'client-error-reporter',
        context: null,
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
      },
      {
        id: 'log-2',
        level: 'error',
        message: 'Client exception',
        category: null,
        source: 'client-error-reporter',
        service: 'client-error-reporter',
        context: null,
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
      },
      {
        id: 'log-3',
        level: 'error',
        message: 'Client exception',
        category: null,
        source: 'client-error-reporter',
        service: 'client-error-reporter',
        context: null,
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
      },
      {
        id: 'log-4',
        level: 'error',
        message: 'Client exception',
        category: null,
        source: 'client-error-reporter',
        service: 'client-error-reporter',
        context: null,
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
      },
      {
        id: 'log-5',
        level: 'error',
        message: 'Client exception',
        category: null,
        source: 'client-error-reporter',
        service: 'client-error-reporter',
        context: null,
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
      },
      {
        id: 'log-6',
        level: 'error',
        message: 'Client exception',
        category: null,
        source: 'client-error-reporter',
        service: 'client-error-reporter',
        context: null,
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
      },
      {
        id: 'log-7',
        level: 'error',
        message: 'Client exception',
        category: null,
        source: 'client-error-reporter',
        service: 'client-error-reporter',
        context: null,
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
      },
      {
        id: 'log-8',
        level: 'error',
        message: 'Client exception',
        category: null,
        source: 'client-error-reporter',
        service: 'client-error-reporter',
        context: null,
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
      },
      {
        id: 'log-9',
        level: 'error',
        message: 'Client exception',
        category: null,
        source: 'client-error-reporter',
        service: 'client-error-reporter',
        context: null,
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
      },
      {
        id: 'log-10',
        level: 'error',
        message: 'Client exception',
        category: null,
        source: 'client-error-reporter',
        service: 'client-error-reporter',
        context: null,
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
      },
    ]);

    await evaluatePerServiceErrorSpikes();

    expect(mocks.listAlertEvidenceLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        excludeAlertEvents: true,
      }),
      expect.any(Number)
    );
    expect(mocks.buildAlertEvidenceContext).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          level: 'error',
          service: 'client-error-reporter',
          excludeAlertEvents: true,
        }),
      })
    );
    expect(mocks.logSystemEvent).toHaveBeenCalledTimes(1);
  });
});
