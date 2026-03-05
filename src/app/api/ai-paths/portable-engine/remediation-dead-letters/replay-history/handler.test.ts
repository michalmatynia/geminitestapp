import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAiPathsAccessMock } = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
}));

const { listSystemLogsMock } = vi.hoisted(() => ({
  listSystemLogsMock: vi.fn(),
}));

const {
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironmentMock,
} = vi.hoisted(() => ({
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironmentMock:
    vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironmentMock:
    vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
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
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironmentMock,
}));

import { GET_handler } from './handler';

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
  });

  it('returns replay history records and signs export payload when configured', async () => {
    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?limit=10'
      ),
      {} as Parameters<typeof GET_handler>[1]
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
    expect(payload['entries']).toEqual([
      expect.objectContaining({
        dryRun: false,
        selectedCount: 2,
        attemptedCount: 1,
        deliveredCount: 1,
        failedCount: 1,
        replayPolicy: expect.objectContaining({
          replayWindowSeconds: 3600,
          endpointAllowlistCount: 2,
        }),
        attempts: null,
      }),
    ]);
    expect(payload['signature']).toEqual(
      expect.objectContaining({
        algorithm: 'hmac_sha256',
        keyId: 'history-export-key-v1',
      })
    );
    expect(String((payload['signature'] as Record<string, unknown>)['value'])).toMatch(
      /^v1=[a-f0-9]{64}$/
    );
  });

  it('includes attempts when includeAttempts=true and supports unsigned export', async () => {
    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?includeAttempts=true&signed=false'
      ),
      {} as Parameters<typeof GET_handler>[1]
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

  it('supports ndjson export format with signature headers', async () => {
    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?includeAttempts=true&format=ndjson'
      ),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/x-ndjson');
    expect(response.headers.get('x-ai-paths-export-signature')).toMatch(/^v1=[a-f0-9]{64}$/);
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

  it('supports csv export format', async () => {
    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?format=csv'
      ),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    const text = await response.text();
    const lines = text
      .trim()
      .split('\n')
      .filter((entry) => entry.length > 0);
    expect(lines[0]).toContain('loggedAt,level,dryRun');
    expect(lines[1]).toContain('2026-03-05T01:00:00.000Z');
    expect(lines[1]).toContain('warn');
  });

  it('rejects invalid query parameters', async () => {
    await expect(
      GET_handler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?limit=0'
        ),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Remediation replay history limit must be between 1 and 200.');

    await expect(
      GET_handler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?from=2026-03-05T02:00:00.000Z&to=2026-03-05T01:00:00.000Z'
        ),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow(
      'Remediation replay history "from" timestamp must be earlier than or equal to "to".'
    );

    await expect(
      GET_handler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters/replay-history?format=xml'
        ),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow(
      'Remediation replay history "format" must be one of: json, ndjson, csv.'
    );
  });
});
