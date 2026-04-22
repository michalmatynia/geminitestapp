import { NextRequest } from 'next/server';
import { gunzipSync } from 'zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAiPathsAccessMock } = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
}));

const { listSystemLogsMock } = vi.hoisted(() => ({
  listSystemLogsMock: vi.fn(),
}));

const {
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionModeFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironmentMock,
} = vi.hoisted(() => ({
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironmentMock:
    vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionModeFromEnvironmentMock:
    vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironmentMock:
    vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
}));

vi.mock('@/shared/lib/observability/system-log-repository', () => ({
  listSystemLogs: listSystemLogsMock,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine/server', () => ({
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ALERT_TYPE:
    'portable_audit_sink_auto_remediation_dead_letter_replay',
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE:
    'ai-paths.portable-engine.envelope-verification.sink-bootstrap',
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY:
    'ai_path_portable_envelope_verification_audit_sink_health',
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionModeFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionModeFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironmentMock,
}));

import { getHandler } from './handler';

const readPotentiallyGzippedResponseText = async (response: Response): Promise<string> => {
  const bytes = Buffer.from(await response.arrayBuffer());
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  return isGzip ? gunzipSync(bytes).toString('utf8') : bytes.toString('utf8');
};

describe('ai-paths portable-engine remediation dead-letter replay history handler', () => {
  beforeEach(() => {
    requireAiPathsAccessMock.mockReset().mockResolvedValue(undefined);
    listSystemLogsMock.mockReset().mockResolvedValue({
      logs: [
        {
          id: 'log-replay-1',
          level: 'warn',
          createdAt: '2026-03-05T01:00:00.000Z',
          context: {
            alertType: 'portable_audit_sink_auto_remediation_dead_letter_replay',
            dryRun: false,
            selectedCount: 2,
            attemptedCount: 1,
            deliveredCount: 1,
            failedCount: 1,
            skippedCount: 0,
            removedCount: 1,
            retainedCount: 1,
            persisted: true,
            filters: {
              channel: 'webhook',
              endpoint: 'https://example.test/remediation',
              limit: 2,
            },
            replayPolicy: {
              replayWindowSeconds: 3600,
              minimumQueuedAt: '2026-03-05T00:00:00.000Z',
              endpointAllowlistCount: 2,
            },
            attempts: [
              {
                replayedAt: '2026-03-05T01:00:00.000Z',
                queuedAt: '2026-03-05T00:55:00.000Z',
                channel: 'webhook',
                endpoint: 'https://example.test/remediation',
                attempted: true,
                delivered: true,
                statusCode: 204,
                error: null,
                signatureApplied: true,
                attemptCountBefore: 1,
                attemptCountAfter: 1,
              },
            ],
          },
        },
        {
          id: 'log-other-1',
          level: 'info',
          createdAt: '2026-03-05T00:59:00.000Z',
          context: {
            alertType: 'portable_audit_sink_auto_remediation_other',
          },
        },
      ],
      total: 2,
      page: 1,
      pageSize: 200,
    });
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironmentMock
      .mockReset()
      .mockReturnValue('history-export-secret');
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironmentMock
      .mockReset()
      .mockReturnValue('history-export-key-v1');
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionModeFromEnvironmentMock
      .mockReset()
      .mockReturnValue(null);
  });

  it('returns replay history records and signs export payload when configured', async () => {
    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?limit=10'
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(requireAiPathsAccessMock).toHaveBeenCalledTimes(1);
    expect(listSystemLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 200,
        source: 'ai-paths.portable-engine.envelope-verification.sink-bootstrap',
        category: 'ai_path_portable_envelope_verification_audit_sink_health',
      })
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['kind']).toBe(
      'portable_audit_sink_auto_remediation_dead_letter_replay_history_export'
    );
    expect(payload['summary']).toEqual(
      expect.objectContaining({
        scannedLogCount: 2,
        matchedReplayCount: 1,
        returnedCount: 1,
      })
    );
    expect(payload['pagination']).toEqual(
      expect.objectContaining({
        hasMore: false,
        nextCursor: null,
        scanTruncated: false,
      })
    );
    expect(payload['redaction']).toEqual(
      expect.objectContaining({
        mode: 'off',
        applied: false,
      })
    );
    const entries = payload['entries'] as Array<Record<string, unknown>>;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        dryRun: false,
        selectedCount: 2,
        attemptedCount: 1,
        deliveredCount: 1,
        failedCount: 1,
        attempts: null,
      })
    );
    expect((entries[0]?.['replayPolicy'] as Record<string, unknown> | undefined) ?? {}).toEqual(
      expect.objectContaining({
        replayWindowSeconds: 3600,
        endpointAllowlistCount: 2,
      })
    );
    expect(payload['signature']).toEqual(
      expect.objectContaining({
        algorithm: 'hmac_sha256',
        keyId: 'history-export-key-v1',
      })
    );
    expect(String((payload['signature'] as Record<string, unknown>)['value'])).toMatch(
      /^v1=[a-f0-9]{64}$/
    );
    expect(response.headers.get('x-ai-paths-export-redaction-mode')).toBe('off');
  });

  it('includes attempts when includeAttempts=true and supports unsigned export', async () => {
    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?includeAttempts=true&signed=false'
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    const entries = payload['entries'] as Array<Record<string, unknown>>;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.['attempts']).toEqual([
      expect.objectContaining({
        channel: 'webhook',
        attempted: true,
        delivered: true,
      }),
    ]);
    expect(payload['signature']).toBeNull();
  });

  it('applies sensitive redaction mode for lower-trust replay-history exports', async () => {
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionModeFromEnvironmentMock.mockReturnValueOnce(
      'sensitive'
    );
    listSystemLogsMock.mockResolvedValueOnce({
      logs: [
        {
          id: 'log-replay-redacted',
          level: 'warn',
          createdAt: '2026-03-05T01:00:00.000Z',
          context: {
            alertType: 'portable_audit_sink_auto_remediation_dead_letter_replay',
            dryRun: false,
            selectedCount: 1,
            attemptedCount: 1,
            deliveredCount: 0,
            failedCount: 1,
            skippedCount: 0,
            removedCount: 0,
            retainedCount: 1,
            persisted: true,
            filters: {
              channel: 'webhook',
              endpoint: 'https://example.test/private-endpoint',
              limit: 1,
            },
            replayPolicy: {
              replayWindowSeconds: 3600,
              minimumQueuedAt: '2026-03-05T00:00:00.000Z',
              endpointAllowlistCount: 1,
            },
            attempts: [
              {
                replayedAt: '2026-03-05T01:00:00.000Z',
                queuedAt: '2026-03-05T00:59:00.000Z',
                channel: 'webhook',
                endpoint: 'https://example.test/private-endpoint',
                attempted: true,
                delivered: false,
                statusCode: 500,
                error: 'token=abcd timeout',
                signatureApplied: true,
                attemptCountBefore: 1,
                attemptCountAfter: 2,
              },
            ],
          },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 200,
    });

    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?includeAttempts=true'
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('x-ai-paths-export-redaction-mode')).toBe('sensitive');
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['redaction']).toEqual(
      expect.objectContaining({
        mode: 'sensitive',
        applied: true,
      })
    );
    const entry = (payload['entries'] as Array<Record<string, unknown>>)[0];
    expect((entry?.['filters'] as Record<string, unknown>)['endpoint']).toBeNull();
    const attempts = entry?.['attempts'] as Array<Record<string, unknown>>;
    expect(attempts[0]?.['endpoint']).toBeNull();
    expect(attempts[0]?.['error']).toBe('[redacted]');
  });

  it('supports ndjson export format with signature headers', async () => {
    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?includeAttempts=true&format=ndjson'
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/x-ndjson');
    expect(response.headers.get('x-ai-paths-export-signature')).toMatch(/^v1=[a-f0-9]{64}$/);
    expect(response.headers.get('x-ai-paths-pagination-has-more')).toBe('false');
    expect(response.headers.get('x-ai-paths-pagination-scan-truncated')).toBe('false');
    expect(response.headers.get('x-ai-paths-export-redaction-mode')).toBe('off');
    const text = await response.text();
    const lines = text
      .trim()
      .split('\n')
      .filter((entry) => entry.length > 0)
      .map((entry) => JSON.parse(entry) as Record<string, unknown>);
    expect(lines[0]?.['type']).toBe('meta');
    expect(lines[1]?.['type']).toBe('entry');
    expect(lines[1]?.['attempts']).toEqual([
      expect.objectContaining({
        channel: 'webhook',
        attempted: true,
      }),
    ]);
  });

  it('compresses ndjson export when gzip is accepted and payload is large', async () => {
    const largeEndpoint = `https://example.test/${'x'.repeat(3000)}`;
    listSystemLogsMock.mockResolvedValueOnce({
      logs: [
        {
          id: 'log-replay-large-ndjson',
          level: 'warn',
          createdAt: '2026-03-05T01:00:00.000Z',
          context: {
            alertType: 'portable_audit_sink_auto_remediation_dead_letter_replay',
            dryRun: false,
            selectedCount: 1,
            attemptedCount: 1,
            deliveredCount: 1,
            failedCount: 0,
            skippedCount: 0,
            removedCount: 1,
            retainedCount: 0,
            persisted: true,
            filters: {
              channel: 'webhook',
              endpoint: largeEndpoint,
              limit: 1,
            },
            replayPolicy: {
              replayWindowSeconds: 3600,
              minimumQueuedAt: '2026-03-05T00:00:00.000Z',
              endpointAllowlistCount: 1,
            },
            attempts: [
              {
                replayedAt: '2026-03-05T01:00:00.000Z',
                queuedAt: '2026-03-05T00:59:00.000Z',
                channel: 'webhook',
                endpoint: largeEndpoint,
                attempted: true,
                delivered: true,
                statusCode: 204,
                error: null,
                signatureApplied: true,
                attemptCountBefore: 0,
                attemptCountAfter: 1,
              },
            ],
          },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 200,
    });

    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?includeAttempts=true&format=ndjson',
        {
          headers: {
            'accept-encoding': 'br, gzip',
          },
        }
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/x-ndjson');
    expect(response.headers.get('vary')).toContain('Accept-Encoding');
    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(response.headers.get('x-ai-paths-export-compression')).toBe('gzip');
    const uncompressedBytes = Number(response.headers.get('x-ai-paths-export-size-bytes'));
    const compressedBytes = Number(response.headers.get('x-ai-paths-export-size-compressed-bytes'));
    expect(uncompressedBytes).toBeGreaterThan(1024);
    expect(compressedBytes).toBeGreaterThan(0);
    expect(compressedBytes).toBeLessThan(uncompressedBytes);

    const text = await readPotentiallyGzippedResponseText(response);
    const lines = text
      .trim()
      .split('\n')
      .filter((entry) => entry.length > 0)
      .map((entry) => JSON.parse(entry) as Record<string, unknown>);
    expect(lines[0]?.['type']).toBe('meta');
    expect((lines[1]?.['filters'] as Record<string, unknown>)?.['endpoint']).toBe(largeEndpoint);
  });

  it('supports csv export format', async () => {
    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?format=csv'
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('x-ai-paths-pagination-has-more')).toBe('false');
    expect(response.headers.get('x-ai-paths-pagination-scan-truncated')).toBe('false');
    expect(response.headers.get('x-ai-paths-export-redaction-mode')).toBe('off');
    const text = await response.text();
    const lines = text
      .trim()
      .split('\n')
      .filter((entry) => entry.length > 0);
    expect(lines[0]).toContain('loggedAt,level,dryRun');
    expect(lines[1]).toContain('2026-03-05T01:00:00.000Z');
    expect(lines[1]).toContain('warn');
  });

  it('compresses csv export when gzip is accepted and payload is large', async () => {
    const largeEndpoint = `https://example.test/${'y'.repeat(3000)}`;
    listSystemLogsMock.mockResolvedValueOnce({
      logs: [
        {
          id: 'log-replay-large-csv',
          level: 'warn',
          createdAt: '2026-03-05T01:00:00.000Z',
          context: {
            alertType: 'portable_audit_sink_auto_remediation_dead_letter_replay',
            dryRun: false,
            selectedCount: 1,
            attemptedCount: 1,
            deliveredCount: 1,
            failedCount: 0,
            skippedCount: 0,
            removedCount: 1,
            retainedCount: 0,
            persisted: true,
            filters: {
              channel: 'webhook',
              endpoint: largeEndpoint,
              limit: 1,
            },
            replayPolicy: {
              replayWindowSeconds: 300,
              minimumQueuedAt: null,
              endpointAllowlistCount: 1,
            },
            attempts: [],
          },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 200,
    });

    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?format=csv',
        {
          headers: {
            'accept-encoding': 'gzip',
          },
        }
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('vary')).toContain('Accept-Encoding');
    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(response.headers.get('x-ai-paths-export-compression')).toBe('gzip');
    const uncompressedBytes = Number(response.headers.get('x-ai-paths-export-size-bytes'));
    const compressedBytes = Number(response.headers.get('x-ai-paths-export-size-compressed-bytes'));
    expect(uncompressedBytes).toBeGreaterThan(1024);
    expect(compressedBytes).toBeGreaterThan(0);
    expect(compressedBytes).toBeLessThan(uncompressedBytes);

    const text = await readPotentiallyGzippedResponseText(response);
    expect(text).toContain('loggedAt,level,dryRun');
    expect(text).toContain(largeEndpoint);
  });

  it('paginates replay history with cursor over older entries', async () => {
    listSystemLogsMock.mockResolvedValue({
      logs: [
        {
          id: 'log-replay-3',
          level: 'warn',
          createdAt: '2026-03-05T01:02:00.000Z',
          context: {
            alertType: 'portable_audit_sink_auto_remediation_dead_letter_replay',
            selectedCount: 1,
            attemptedCount: 1,
            deliveredCount: 1,
            failedCount: 0,
            skippedCount: 0,
            removedCount: 1,
            retainedCount: 0,
            persisted: true,
            filters: { channel: 'webhook', endpoint: 'https://example.test/a', limit: 1 },
            replayPolicy: {
              replayWindowSeconds: 300,
              minimumQueuedAt: null,
              endpointAllowlistCount: 1,
            },
          },
        },
        {
          id: 'log-replay-2',
          level: 'warn',
          createdAt: '2026-03-05T01:01:00.000Z',
          context: {
            alertType: 'portable_audit_sink_auto_remediation_dead_letter_replay',
            selectedCount: 1,
            attemptedCount: 1,
            deliveredCount: 0,
            failedCount: 1,
            skippedCount: 0,
            removedCount: 0,
            retainedCount: 1,
            persisted: true,
            filters: { channel: 'webhook', endpoint: 'https://example.test/b', limit: 1 },
            replayPolicy: {
              replayWindowSeconds: 300,
              minimumQueuedAt: null,
              endpointAllowlistCount: 1,
            },
          },
        },
        {
          id: 'log-replay-1',
          level: 'warn',
          createdAt: '2026-03-05T01:00:00.000Z',
          context: {
            alertType: 'portable_audit_sink_auto_remediation_dead_letter_replay',
            selectedCount: 1,
            attemptedCount: 0,
            deliveredCount: 0,
            failedCount: 0,
            skippedCount: 1,
            removedCount: 0,
            retainedCount: 1,
            persisted: true,
            filters: { channel: 'webhook', endpoint: 'https://example.test/c', limit: 1 },
            replayPolicy: {
              replayWindowSeconds: 300,
              minimumQueuedAt: null,
              endpointAllowlistCount: 1,
            },
          },
        },
      ],
      total: 3,
      page: 1,
      pageSize: 200,
    });

    const firstResponse = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?limit=1'
      ),
      {} as Parameters<typeof getHandler>[1]
    );
    expect(firstResponse.status).toBe(200);
    const firstPayload = (await firstResponse.json()) as Record<string, unknown>;
    expect(firstPayload['summary']).toEqual(
      expect.objectContaining({
        matchedReplayCount: 3,
        returnedCount: 1,
      })
    );
    expect((firstPayload['entries'] as Array<{ loggedAt: string }>)[0]?.loggedAt).toBe(
      '2026-03-05T01:02:00.000Z'
    );
    const firstPagination = firstPayload['pagination'] as Record<string, unknown>;
    expect(firstPagination['hasMore']).toBe(true);
    const nextCursor = String(firstPagination['nextCursor']);
    expect(nextCursor.length).toBeGreaterThan(10);

    const secondResponse = await getHandler(
      new NextRequest(
        `http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?limit=1&cursor=${encodeURIComponent(nextCursor)}`
      ),
      {} as Parameters<typeof getHandler>[1]
    );
    expect(secondResponse.status).toBe(200);
    const secondPayload = (await secondResponse.json()) as Record<string, unknown>;
    expect((secondPayload['entries'] as Array<{ loggedAt: string }>)[0]?.loggedAt).toBe(
      '2026-03-05T01:01:00.000Z'
    );
    expect((secondPayload['pagination'] as Record<string, unknown>)['hasMore']).toBe(true);
  });

  it('rejects invalid query parameters', async () => {
    await expect(
      getHandler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?limit=0'
        ),
        {} as Parameters<typeof getHandler>[1]
      )
    ).rejects.toThrow('Remediation replay history limit must be between 1 and 200.');

    await expect(
      getHandler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?from=2026-03-05T02:00:00.000Z&to=2026-03-05T01:00:00.000Z'
        ),
        {} as Parameters<typeof getHandler>[1]
      )
    ).rejects.toThrow(
      'Remediation replay history "from" timestamp must be earlier than or equal to "to".'
    );

    await expect(
      getHandler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?format=xml'
        ),
        {} as Parameters<typeof getHandler>[1]
      )
    ).rejects.toThrow('Remediation replay history "format" must be one of: json, ndjson, csv.');

    await expect(
      getHandler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?cursor=invalid'
        ),
        {} as Parameters<typeof getHandler>[1]
      )
    ).rejects.toThrow('Remediation replay history cursor is invalid.');

    const mismatchedCursor = Buffer.from(
      JSON.stringify({
        version: 1,
        beforeLoggedAt: '2026-03-05T01:00:00.000Z',
        beforeLogId: 'log-replay-1',
        from: null,
        to: null,
      }),
      'utf8'
    ).toString('base64url');
    await expect(
      getHandler(
        new NextRequest(
          `http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?from=2026-03-05T00:00:00.000Z&cursor=${encodeURIComponent(mismatchedCursor)}`
        ),
        {} as Parameters<typeof getHandler>[1]
      )
    ).rejects.toThrow('Remediation replay history cursor is invalid.');
  });
});
