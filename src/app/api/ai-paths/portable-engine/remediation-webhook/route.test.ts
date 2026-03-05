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

import { resetPortablePathAutoRemediationWebhookReplayGuard } from './handler';
import { POST } from './route';

const buildSignatureHeader = (timestamp: string, body: string, secret: string): string => {
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return `v1=${digest}`;
};

describe('ai-paths portable-engine remediation-webhook route', () => {
  beforeEach(() => {
    resetPortablePathAutoRemediationWebhookReplayGuard();
    resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironmentMock
      .mockReset()
      .mockReturnValue('receiver-webhook-secret');
    resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironmentMock
      .mockReset()
      .mockReturnValue('receiver-email-secret');
  });

  it('accepts valid signatures through apiHandler wrapper', async () => {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({ event: 'portable_audit_sink_auto_remediation' });
    const signature = buildSignatureHeader(timestamp, body, 'receiver-webhook-secret');

    const response = await POST(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/remediation-webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ai-paths-signature': signature,
          'x-ai-paths-signature-timestamp': timestamp,
        },
        body,
      })
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload['accepted']).toBe(true);
  });

  it('maps signature failures to 401 via apiHandler error response', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/ai-paths/portable-engine/remediation-webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ event: 'portable_audit_sink_auto_remediation' }),
      })
    );

    expect(response.status).toBe(401);
    const payload = (await response.json()) as Record<string, unknown>;
    expect(String(payload['error'] ?? '')).toContain(
      'Invalid portable remediation webhook signature.'
    );
  });
});
