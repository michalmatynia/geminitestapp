import { createHmac } from 'crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  enqueuePortablePathAuditSinkAutoRemediationDeadLetter,
  loadPortablePathAuditSinkAutoRemediationDeadLetters,
  notifyPortablePathAuditSinkAutoRemediation,
  replayPortablePathAuditSinkAutoRemediationDeadLetters,
  savePortablePathAuditSinkAutoRemediationDeadLetters,
} from '../sinks.server';

const asFetch = (value: ReturnType<typeof vi.fn>): typeof fetch => value as typeof fetch;

const createNotificationInput = () => ({
  summary: {
    profile: 'prod' as const,
    policy: 'warn' as const,
    timeoutMs: 1000,
    status: 'degraded' as const,
    checkedAt: '2026-03-05T00:00:00.000Z',
    failedSinkIds: ['sink-a'],
    diagnostics: [
      {
        sinkId: 'sink-a',
        status: 'failed' as const,
        checkedAt: '2026-03-05T00:00:00.000Z',
        durationMs: 5,
        message: 'Health check failed.',
        error: 'permission_denied',
      },
    ],
  },
  strategy: 'unregister_all' as const,
  action: 'unregister_all' as const,
  threshold: 2,
  cooldownSeconds: 120,
  rateLimitWindowSeconds: 900,
  rateLimitMaxActions: 2,
  state: {
    consecutiveFailureCount: 2,
    lastFailureAt: '2026-03-05T00:00:00.000Z',
    lastRecoveredAt: null,
    lastFailedSinkIds: ['sink-a'],
    remediationCount: 1,
    lastRemediatedAt: '2026-03-05T00:00:00.000Z',
    remediationWindowStartedAt: '2026-03-05T00:00:00.000Z',
    remediationWindowActionCount: 1,
    lastRemediationSkippedAt: null,
    lastRemediationSkippedReason: null,
    lastStatus: 'degraded' as const,
  },
});

describe('portable-engine remediation notifications', () => {
  it('signs webhook notifications and records signed delivery receipts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
    });
    const result = await notifyPortablePathAuditSinkAutoRemediation(createNotificationInput(), {
      enabled: true,
      webhookUrl: 'https://example.test/remediation',
      webhookSecret: 'signing-secret',
      webhookSignatureKeyId: 'rotation-v2',
      now: '2026-03-05T00:00:00.000Z',
      fetchImpl: asFetch(fetchMock),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = requestInit.headers as Record<string, string>;
    const body = String(requestInit.body ?? '');
    const expectedSignature = createHmac('sha256', 'signing-secret')
      .update(`2026-03-05T00:00:00.000Z.${body}`)
      .digest('hex');
    expect(headers['x-ai-paths-signature']).toBe(`v1=${expectedSignature}`);
    expect(headers['x-ai-paths-signature-timestamp']).toBe('2026-03-05T00:00:00.000Z');
    expect(headers['x-ai-paths-signature-algorithm']).toBe('hmac_sha256');
    expect(headers['x-ai-paths-signature-key-id']).toBe('rotation-v2');
    expect(result.webhook.delivered).toBe(true);
    expect(result.webhook.signatureApplied).toBe(true);
    expect(result.webhook.statusCode).toBe(202);
    expect(result.webhook.deadLetterQueued).toBe(false);
    expect(result.receipts).toEqual([
      expect.objectContaining({
        channel: 'webhook',
        delivered: true,
        signatureApplied: true,
        deadLetterQueued: false,
      }),
    ]);
  });

  it('queues webhook delivery failures in the remediation dead-letter store', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });
    let rawStore: string | null = null;

    const result = await notifyPortablePathAuditSinkAutoRemediation(createNotificationInput(), {
      enabled: true,
      webhookUrl: 'https://example.test/remediation',
      webhookSecret: 'signing-secret',
      now: '2026-03-05T00:00:00.000Z',
      fetchImpl: asFetch(fetchMock),
      deadLetterReadRaw: async () => rawStore,
      deadLetterWriteRaw: async (raw: string): Promise<boolean> => {
        rawStore = raw;
        return true;
      },
    });

    expect(result.webhook.delivered).toBe(false);
    expect(result.webhook.statusCode).toBe(502);
    expect(result.webhook.error).toBe('notification_http_502');
    expect(result.webhook.deadLetterQueued).toBe(true);
    expect(result.receipts).toEqual([
      expect.objectContaining({
        channel: 'webhook',
        delivered: false,
        deadLetterQueued: true,
      }),
    ]);

    const deadLetters = await loadPortablePathAuditSinkAutoRemediationDeadLetters({
      maxEntries: 10,
      readRaw: async () => rawStore,
    });
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0]).toEqual(
      expect.objectContaining({
        channel: 'webhook',
        endpoint: 'https://example.test/remediation',
        error: 'notification_http_502',
        statusCode: 502,
      })
    );
    expect(deadLetters[0]?.signature).toEqual(
      expect.objectContaining({
        algorithm: 'hmac_sha256',
        keyId: null,
        timestamp: '2026-03-05T00:00:00.000Z',
      })
    );
  });

  it('parses, trims, saves, and appends remediation dead-letter entries', async () => {
    let rawStore: string | null = null;
    const writeRaw = async (raw: string): Promise<boolean> => {
      rawStore = raw;
      return true;
    };
    const readRaw = async (): Promise<string | null> => rawStore;

    const saveOk = await savePortablePathAuditSinkAutoRemediationDeadLetters(
      [
        {
          queuedAt: '2026-03-05T00:00:00.000Z',
          channel: 'webhook',
          endpoint: 'https://example.test/a',
          payload: { event: 'a' },
          error: 'notification_http_500',
          statusCode: 500,
          attemptCount: 1,
          signature: null,
        },
        {
          queuedAt: '2026-03-05T00:01:00.000Z',
          channel: 'email',
          endpoint: 'https://example.test/b',
          payload: { event: 'b' },
          error: 'notification_http_502',
          statusCode: 502,
          attemptCount: 1,
          signature: {
            algorithm: 'hmac_sha256',
            keyId: 'rotation-v2',
            timestamp: '2026-03-05T00:01:00.000Z',
          },
        },
        {
          queuedAt: '2026-03-05T00:02:00.000Z',
          channel: 'webhook',
          endpoint: 'https://example.test/c',
          payload: { event: 'c' },
          error: 'notification_http_503',
          statusCode: 503,
          attemptCount: 1,
          signature: null,
        },
      ],
      {
        maxEntries: 2,
        writeRaw,
      }
    );
    expect(saveOk).toBe(true);

    const loadedAfterSave = await loadPortablePathAuditSinkAutoRemediationDeadLetters({
      maxEntries: 2,
      readRaw,
    });
    expect(loadedAfterSave).toHaveLength(2);
    expect(loadedAfterSave[0]?.queuedAt).toBe('2026-03-05T00:01:00.000Z');
    expect(loadedAfterSave[1]?.queuedAt).toBe('2026-03-05T00:02:00.000Z');

    const enqueueOk = await enqueuePortablePathAuditSinkAutoRemediationDeadLetter(
      {
        queuedAt: '2026-03-05T00:03:00.000Z',
        channel: 'email',
        endpoint: 'https://example.test/d',
        payload: { event: 'd' },
        error: 'notification_http_504',
        statusCode: 504,
        attemptCount: 1,
        signature: null,
      },
      {
        maxEntries: 2,
        readRaw,
        writeRaw,
      }
    );
    expect(enqueueOk).toBe(true);

    const loadedAfterEnqueue = await loadPortablePathAuditSinkAutoRemediationDeadLetters({
      maxEntries: 2,
      readRaw,
    });
    expect(loadedAfterEnqueue).toHaveLength(2);
    expect(loadedAfterEnqueue[0]?.queuedAt).toBe('2026-03-05T00:02:00.000Z');
    expect(loadedAfterEnqueue[1]?.queuedAt).toBe('2026-03-05T00:03:00.000Z');
  });

  it('replays matching dead letters and removes successful deliveries from queue', async () => {
    let rawStore: string | null = null;
    const writeRaw = async (raw: string): Promise<boolean> => {
      rawStore = raw;
      return true;
    };
    const readRaw = async (): Promise<string | null> => rawStore;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });

    await savePortablePathAuditSinkAutoRemediationDeadLetters(
      [
        {
          queuedAt: '2026-03-05T00:00:00.000Z',
          channel: 'webhook',
          endpoint: 'https://example.test/remediation',
          payload: { event: 'portable_audit_sink_auto_remediation' },
          error: 'notification_http_502',
          statusCode: 502,
          attemptCount: 1,
          signature: null,
        },
        {
          queuedAt: '2026-03-05T00:01:00.000Z',
          channel: 'email',
          endpoint: 'https://example.test/email',
          payload: { event: 'portable_audit_sink_auto_remediation_email' },
          error: 'notification_http_500',
          statusCode: 500,
          attemptCount: 1,
          signature: null,
        },
      ],
      {
        maxEntries: 10,
        writeRaw,
      }
    );

    const replayResult = await replayPortablePathAuditSinkAutoRemediationDeadLetters({
      dryRun: false,
      limit: 1,
      channel: 'webhook',
      maxEntries: 10,
      now: '2026-03-05T00:10:00.000Z',
      webhookSecret: 'replay-secret',
      fetchImpl: asFetch(fetchMock),
      writeLog: async () => {},
      readRaw,
      writeRaw,
    });

    expect(replayResult.selectedCount).toBe(1);
    expect(replayResult.attemptedCount).toBe(1);
    expect(replayResult.deliveredCount).toBe(1);
    expect(replayResult.removedCount).toBe(1);
    expect(replayResult.remainingCount).toBe(1);
    expect(replayResult.persisted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const remaining = await loadPortablePathAuditSinkAutoRemediationDeadLetters({
      maxEntries: 10,
      readRaw,
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.channel).toBe('email');
  });

  it('retains failed replay entries and increments attempt counters', async () => {
    let rawStore: string | null = null;
    const writeRaw = async (raw: string): Promise<boolean> => {
      rawStore = raw;
      return true;
    };
    const readRaw = async (): Promise<string | null> => rawStore;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await savePortablePathAuditSinkAutoRemediationDeadLetters(
      [
        {
          queuedAt: '2026-03-05T00:00:00.000Z',
          channel: 'webhook',
          endpoint: 'https://example.test/remediation',
          payload: { event: 'portable_audit_sink_auto_remediation' },
          error: 'notification_http_502',
          statusCode: 502,
          attemptCount: 1,
          signature: null,
        },
      ],
      {
        maxEntries: 10,
        writeRaw,
      }
    );

    const replayResult = await replayPortablePathAuditSinkAutoRemediationDeadLetters({
      dryRun: false,
      limit: 1,
      channel: 'webhook',
      maxEntries: 10,
      now: '2026-03-05T00:20:00.000Z',
      webhookSecret: 'replay-secret',
      fetchImpl: asFetch(fetchMock),
      writeLog: async () => {},
      readRaw,
      writeRaw,
    });

    expect(replayResult.selectedCount).toBe(1);
    expect(replayResult.attemptedCount).toBe(1);
    expect(replayResult.failedCount).toBe(1);
    expect(replayResult.removedCount).toBe(0);
    expect(replayResult.remainingCount).toBe(1);

    const remaining = await loadPortablePathAuditSinkAutoRemediationDeadLetters({
      maxEntries: 10,
      readRaw,
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.attemptCount).toBe(2);
    expect(remaining[0]?.statusCode).toBe(503);
    expect(remaining[0]?.error).toBe('notification_http_503');
    expect(remaining[0]?.signature).toEqual(
      expect.objectContaining({
        algorithm: 'hmac_sha256',
      })
    );
  });

  it('skips entries outside the replay window and keeps them queued', async () => {
    let rawStore: string | null = null;
    const writeRaw = async (raw: string): Promise<boolean> => {
      rawStore = raw;
      return true;
    };
    const readRaw = async (): Promise<string | null> => rawStore;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });

    await savePortablePathAuditSinkAutoRemediationDeadLetters(
      [
        {
          queuedAt: '2026-03-04T20:00:00.000Z',
          channel: 'webhook',
          endpoint: 'https://example.test/remediation',
          payload: { event: 'portable_audit_sink_auto_remediation' },
          error: 'notification_http_502',
          statusCode: 502,
          attemptCount: 1,
          signature: null,
        },
      ],
      {
        maxEntries: 10,
        writeRaw,
      }
    );

    const replayResult = await replayPortablePathAuditSinkAutoRemediationDeadLetters({
      dryRun: false,
      limit: 1,
      channel: 'webhook',
      maxEntries: 10,
      now: '2026-03-05T00:20:00.000Z',
      replayWindowSeconds: 300,
      endpointAllowlist: ['https://example.test/remediation'],
      webhookSecret: 'replay-secret',
      fetchImpl: asFetch(fetchMock),
      writeLog: async () => {},
      readRaw,
      writeRaw,
    });

    expect(replayResult.selectedCount).toBe(1);
    expect(replayResult.attemptedCount).toBe(0);
    expect(replayResult.failedCount).toBe(1);
    expect(replayResult.skippedCount).toBe(1);
    expect(replayResult.removedCount).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();

    const remaining = await loadPortablePathAuditSinkAutoRemediationDeadLetters({
      maxEntries: 10,
      readRaw,
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.attemptCount).toBe(2);
    expect(remaining[0]?.error).toBe('dead_letter_outside_replay_window');
  });

  it('skips entries outside endpoint allowlist and keeps them queued', async () => {
    let rawStore: string | null = null;
    const writeRaw = async (raw: string): Promise<boolean> => {
      rawStore = raw;
      return true;
    };
    const readRaw = async (): Promise<string | null> => rawStore;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });

    await savePortablePathAuditSinkAutoRemediationDeadLetters(
      [
        {
          queuedAt: '2026-03-05T00:00:00.000Z',
          channel: 'webhook',
          endpoint: 'https://example.test/remediation',
          payload: { event: 'portable_audit_sink_auto_remediation' },
          error: 'notification_http_502',
          statusCode: 502,
          attemptCount: 1,
          signature: null,
        },
      ],
      {
        maxEntries: 10,
        writeRaw,
      }
    );

    const replayResult = await replayPortablePathAuditSinkAutoRemediationDeadLetters({
      dryRun: false,
      limit: 1,
      channel: 'webhook',
      maxEntries: 10,
      now: '2026-03-05T00:20:00.000Z',
      endpointAllowlist: ['https://example.test/other'],
      webhookSecret: 'replay-secret',
      fetchImpl: asFetch(fetchMock),
      writeLog: async () => {},
      readRaw,
      writeRaw,
    });

    expect(replayResult.selectedCount).toBe(1);
    expect(replayResult.attemptedCount).toBe(0);
    expect(replayResult.failedCount).toBe(1);
    expect(replayResult.skippedCount).toBe(1);
    expect(replayResult.removedCount).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();

    const remaining = await loadPortablePathAuditSinkAutoRemediationDeadLetters({
      maxEntries: 10,
      readRaw,
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.attemptCount).toBe(2);
    expect(remaining[0]?.error).toBe('dead_letter_endpoint_disallowed');
  });
});
