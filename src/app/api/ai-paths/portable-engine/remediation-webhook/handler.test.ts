import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock,
} = vi.hoisted(() => ({
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock: vi.fn(),
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/portable-engine/server', () => ({
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment:
    resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock,
}));

import { POST_handler, resetPortablePathAutoRemediationWebhookReplayGuard } from './handler';

const buildSignatureHeader = (timestamp: string, body: string, secret: string): string => {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `v1=${digest}`;
};

describe('ai-paths portable-engine remediation webhook receiver handler', () => {
  beforeEach(() => {
    resetPortablePathAutoRemediationWebhookReplayGuard();
    resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock
      .mockReset()
      .mockReturnValue('receiver-webhook-secret');
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock
      .mockReset()
      .mockReturnValue('receiver-email-secret');
  });

  it('accepts valid signed webhook payloads', async () => {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({ event: 'portable_audit_sink_auto_remediation' });
    const signature = buildSignatureHeader(timestamp, body, 'receiver-webhook-secret');
    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/remediation-webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ai-paths-signature': signature,
          'x-ai-paths-signature-timestamp': timestamp,
        },
        body,
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['kind']).toBe('portable_audit_sink_auto_remediation_webhook_receipt');
    expect(payload['accepted']).toBe(true);
    expect(payload['channel']).toBe('webhook');
    expect(payload['replayKey']).toMatch(/^[a-f0-9]{64}$/);
  });

  it('accepts email channel signatures when channel is provided via URL query', async () => {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({ event: 'portable_audit_sink_auto_remediation_email' });
    const signature = buildSignatureHeader(timestamp, body, 'receiver-email-secret');
    const response = await POST_handler(
      new NextRequest(
        'http://localhost/api/ai-paths/portable-engine/remediation-webhook?channel=email',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-ai-paths-signature': signature,
            'x-ai-paths-signature-timestamp': timestamp,
          },
          body,
        }
      ),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['channel']).toBe('email');
    expect(payload['accepted']).toBe(true);
  });

  it('rejects skewed timestamps when maxSkewSeconds is exceeded', async () => {
    const timestamp = '2026-03-05T00:00:00.000Z';
    const body = JSON.stringify({ event: 'portable_audit_sink_auto_remediation' });
    const signature = buildSignatureHeader(timestamp, body, 'receiver-webhook-secret');

    await expect(
      POST_handler(
        new NextRequest(
          'http://localhost/api/ai-paths/portable-engine/remediation-webhook?maxSkewSeconds=1',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-ai-paths-signature': signature,
              'x-ai-paths-signature-timestamp': timestamp,
            },
            body,
          }
        ),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow('Invalid portable remediation webhook signature.');
  });

  it('rejects replayed signed payloads', async () => {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({ event: 'portable_audit_sink_auto_remediation' });
    const signature = buildSignatureHeader(timestamp, body, 'receiver-webhook-secret');
    const requestUrl = 'http://localhost/api/ai-paths/portable-engine/remediation-webhook';

    const firstResponse = await POST_handler(
      new NextRequest(requestUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ai-paths-signature': signature,
          'x-ai-paths-signature-timestamp': timestamp,
        },
        body,
      }),
      {} as Parameters<typeof POST_handler>[1]
    );
    expect(firstResponse.status).toBe(200);

    await expect(
      POST_handler(
        new NextRequest(requestUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-ai-paths-signature': signature,
            'x-ai-paths-signature-timestamp': timestamp,
          },
          body,
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow('Invalid portable remediation webhook signature.');
  });
});
