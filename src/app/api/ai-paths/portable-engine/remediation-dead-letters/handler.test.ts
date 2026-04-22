import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';

const { requireAiPathsAccessMock } = vi.hoisted(() => ({
  requireAiPathsAccessMock: vi.fn(),
}));

const {
  loadPortablePathAuditSinkAutoRemediationDeadLettersMock,
  replayPortablePathAuditSinkAutoRemediationDeadLettersMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayEndpointAllowlistFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock,
} = vi.hoisted(() => ({
  loadPortablePathAuditSinkAutoRemediationDeadLettersMock: vi.fn(),
  replayPortablePathAuditSinkAutoRemediationDeadLettersMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayEndpointAllowlistFromEnvironmentMock:
    vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSecondsFromEnvironmentMock:
    vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
}));

vi.mock('@/shared/lib/ai-paths/portable-engine/server', () => ({
  loadPortablePathAuditSinkAutoRemediationDeadLetters:
    loadPortablePathAuditSinkAutoRemediationDeadLettersMock,
  replayPortablePathAuditSinkAutoRemediationDeadLetters:
    replayPortablePathAuditSinkAutoRemediationDeadLettersMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayEndpointAllowlistFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayEndpointAllowlistFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSecondsFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSecondsFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock,
}));

import { getHandler, postHandler } from './handler';

describe('ai-paths portable-engine remediation dead-letter handler', () => {
  beforeEach(() => {
    requireAiPathsAccessMock.mockReset().mockResolvedValue(undefined);
    loadPortablePathAuditSinkAutoRemediationDeadLettersMock.mockReset().mockResolvedValue([
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
        queuedAt: '2026-03-05T00:05:00.000Z',
        channel: 'email',
        endpoint: 'https://example.test/email',
        payload: { event: 'portable_audit_sink_auto_remediation_email' },
        error: 'notification_http_500',
        statusCode: 500,
        attemptCount: 1,
        signature: null,
      },
    ]);
    replayPortablePathAuditSinkAutoRemediationDeadLettersMock.mockReset().mockResolvedValue({
      dryRun: true,
      selectedCount: 1,
      attemptedCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      skippedCount: 1,
      removedCount: 0,
      retainedCount: 2,
      persisted: true,
      remainingCount: 2,
      attempts: [],
    });
    resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironmentMock
      .mockReset()
      .mockReturnValue(100);
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSecondsFromEnvironmentMock
      .mockReset()
      .mockReturnValue(3600);
    resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironmentMock
      .mockReset()
      .mockReturnValue('https://example.test/remediation');
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironmentMock
      .mockReset()
      .mockReturnValue('https://example.test/email');
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayEndpointAllowlistFromEnvironmentMock
      .mockReset()
      .mockReturnValue(['https://example.test/extra']);
    resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock
      .mockReset()
      .mockReturnValue('webhook-secret');
    resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironmentMock
      .mockReset()
      .mockReturnValue('webhook-key-id');
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock
      .mockReset()
      .mockReturnValue('email-secret');
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironmentMock
      .mockReset()
      .mockReturnValue('email-key-id');
  });

  it('returns filtered remediation dead-letter payload', async () => {
    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters?limit=1&channel=webhook'
      ),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(requireAiPathsAccessMock).toHaveBeenCalledTimes(1);
    expect(loadPortablePathAuditSinkAutoRemediationDeadLettersMock).toHaveBeenCalledWith({
      maxEntries: 100,
    });
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['specVersion']).toBe(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION);
    expect(payload['kind']).toBe('portable_audit_sink_auto_remediation_dead_letters');
    expect(payload['summary']).toEqual(
      expect.objectContaining({
        totalStored: 2,
        matchedCount: 1,
        returnedCount: 1,
      })
    );
    expect(payload['entries']).toEqual([
      expect.objectContaining({
        channel: 'webhook',
      }),
    ]);
  });

  it('runs dead-letter replay with parsed request options', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/remediation-dead-letters', {
        method: 'POST',
      }),
      {
        body: {
          action: 'replay',
          dryRun: false,
          limit: 5,
          channel: 'webhook',
          endpoint: 'https://example.test/remediation',
          timeoutMs: 2500,
        },
      } as Parameters<typeof postHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(replayPortablePathAuditSinkAutoRemediationDeadLettersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: false,
        limit: 5,
        channel: 'webhook',
        endpoint: 'https://example.test/remediation',
        replayWindowSeconds: 3600,
        endpointAllowlist: [
          'https://example.test/remediation',
          'https://example.test/email',
          'https://example.test/extra',
        ],
        timeoutMs: 2500,
        maxEntries: 100,
        webhookSecret: 'webhook-secret',
        webhookSignatureKeyId: 'webhook-key-id',
        emailWebhookSecret: 'email-secret',
        emailWebhookSignatureKeyId: 'email-key-id',
      })
    );
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['kind']).toBe('portable_audit_sink_auto_remediation_dead_letter_replay');
    expect(payload['request']).toEqual(
      expect.objectContaining({
        action: 'replay',
        dryRun: false,
        limit: 5,
        channel: 'webhook',
        replayWindowSeconds: 3600,
        endpointAllowlistCount: 3,
      })
    );
  });

  it('rejects invalid replay payloads and invalid channel filters', async () => {
    await expect(
      getHandler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/remediation-dead-letters?channel=invalid'
        ),
        {} as Parameters<typeof getHandler>[1]
      )
    ).rejects.toThrow('Remediation dead-letter channel must be one of: webhook, email.');

    await expect(
      postHandler(
        new NextRequest('http://localhost/api/ai-paths/portable-engine/remediation-dead-letters', {
          method: 'POST',
        }),
        {
          body: {
            action: 'invalid',
          },
        } as Parameters<typeof postHandler>[1]
      )
    ).rejects.toThrow('Unsupported remediation dead-letter action.');
  });
});
