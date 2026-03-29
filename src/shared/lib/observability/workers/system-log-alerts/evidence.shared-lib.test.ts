import { beforeEach, describe, expect, it, vi } from 'vitest';

const hydrateLogContextMock = vi.hoisted(() => vi.fn());
const listAlertEvidenceLogsMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/observability/log-hydration-registry', () => ({
  hydrateLogContext: hydrateLogContextMock,
}));

vi.mock('@/shared/lib/observability/workers/system-log-alerts/repository', () => ({
  listAlertEvidenceLogs: listAlertEvidenceLogsMock,
}));

import {
  asRecord,
  buildAlertEvidenceContext,
  buildLogSilenceEvidenceContext,
  readContextRegistryEvidence,
  readTrimmedString,
  summarizeLogForAlertEvidence,
} from '@/shared/lib/observability/workers/system-log-alerts/evidence';

describe('system-log-alerts evidence shared-lib coverage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T16:00:00.000Z'));
    hydrateLogContextMock.mockReset();
    listAlertEvidenceLogsMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes object records, strings, and context registry evidence', () => {
    expect(asRecord({ ok: true })).toEqual({ ok: true });
    expect(asRecord(['nope'])).toBeNull();

    expect(readTrimmedString('  hello  ')).toBe('hello');
    expect(readTrimmedString('   ')).toBeNull();
    expect(readTrimmedString(123)).toBeNull();

    expect(readContextRegistryEvidence(null)).toBeNull();
    expect(
      readContextRegistryEvidence({
        refs: [
          { id: ' node-1 ', kind: 'page', providerId: ' provider ', entityType: ' entity ' },
          { id: '', kind: 'page' },
          { id: 'node-2', kind: 'component' },
        ],
        engineVersion: ' v1 ',
      })
    ).toEqual({
      refs: [
        {
          id: 'node-1',
          kind: 'page',
          providerId: 'provider',
          entityType: 'entity',
        },
        {
          id: 'node-2',
          kind: 'component',
        },
      ],
      engineVersion: 'v1',
    });
  });

  it('summarizes log evidence with hydrated runtime context and registry refs', async () => {
    hydrateLogContextMock.mockResolvedValue({
      fingerprint: 'fp-1',
      contextRegistry: {
        refs: [{ id: 'runtime-1', kind: 'runtime_document', providerId: 'provider-1' }],
        engineVersion: 'v2',
      },
    });

    await expect(
      summarizeLogForAlertEvidence({
        id: 'log-1',
        createdAt: '2026-03-25T15:59:00.000Z',
        level: 'error',
        source: 'api',
        message: 'Boom',
        context: { traceId: 'trace-1' },
      } as never)
    ).resolves.toEqual({
      logId: 'log-1',
      createdAt: '2026-03-25T15:59:00.000Z',
      level: 'error',
      source: 'api',
      message: 'Boom',
      fingerprint: 'fp-1',
      contextRegistry: {
        refs: [
          {
            id: 'runtime-1',
            kind: 'runtime_document',
            providerId: 'provider-1',
          },
        ],
        engineVersion: 'v2',
      },
    });
  });

  it('builds alert evidence context from sampled logs', async () => {
    hydrateLogContextMock.mockResolvedValue({});
    listAlertEvidenceLogsMock.mockResolvedValue([
      {
        id: 'log-1',
        createdAt: '2026-03-25T15:58:00.000Z',
        level: 'warn',
        source: 'worker',
        message: 'Slow',
        context: null,
      },
      {
        id: 'log-2',
        createdAt: '2026-03-25T15:59:00.000Z',
        level: 'error',
        source: 'api',
        message: 'Boom',
        context: null,
      },
    ]);

    await expect(
      buildAlertEvidenceContext({
        query: {
          level: 'error',
          sourceContains: 'api',
          limit: 999,
        },
        matchedCount: 12,
        windowStart: new Date('2026-03-25T15:55:00.000Z'),
      })
    ).resolves.toEqual({
      windowStart: '2026-03-25T15:55:00.000Z',
      windowEnd: '2026-03-25T16:00:00.000Z',
      matchedCount: 12,
      sampleSize: 2,
      samples: [
        {
          logId: 'log-1',
          createdAt: '2026-03-25T15:58:00.000Z',
          level: 'warn',
          source: 'worker',
          message: 'Slow',
          fingerprint: null,
          contextRegistry: null,
        },
        {
          logId: 'log-2',
          createdAt: '2026-03-25T15:59:00.000Z',
          level: 'error',
          source: 'api',
          message: 'Boom',
          fingerprint: null,
          contextRegistry: null,
        },
      ],
    });

    expect(listAlertEvidenceLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        sourceContains: 'api',
        limit: 5,
      }),
      5
    );
  });

  it('builds log silence evidence with the latest observed log when present', async () => {
    hydrateLogContextMock.mockResolvedValue({});
    listAlertEvidenceLogsMock.mockResolvedValueOnce([
      {
        id: 'last-log',
        createdAt: '2026-03-25T15:57:00.000Z',
        level: 'info',
        source: 'web',
        message: 'heartbeat',
        context: null,
      },
    ]);

    await expect(buildLogSilenceEvidenceContext()).resolves.toEqual({
      windowStart: null,
      windowEnd: '2026-03-25T16:00:00.000Z',
      matchedCount: 0,
      sampleSize: 0,
      samples: [],
      lastObservedLog: {
        logId: 'last-log',
        createdAt: '2026-03-25T15:57:00.000Z',
        level: 'info',
        source: 'web',
        message: 'heartbeat',
        fingerprint: null,
        contextRegistry: null,
      },
    });

    expect(listAlertEvidenceLogsMock).toHaveBeenCalledWith(
      {
        limit: 1,
      },
      1
    );
  });
});
