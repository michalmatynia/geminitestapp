import { createHmac } from 'crypto';
import { describe, expect, it, vi } from 'vitest';

import { verifyPortablePathWebhookSignature } from '../receiver-signature';

const buildSignatureHeader = (timestamp: string, body: string, secret: string): string => {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `v1=${digest}`;
};

describe('portable-engine receiver signature verification', () => {
  it('accepts valid signed payloads within skew window and marks replay guard', async () => {
    const body = JSON.stringify({ event: 'portable_audit_sink_auto_remediation' });
    const timestamp = '2026-03-05T01:00:00.000Z';
    const signature = buildSignatureHeader(timestamp, body, 'receiver-secret');
    const hasSeen = vi.fn().mockResolvedValue(false);
    const markSeen = vi.fn().mockResolvedValue(undefined);

    const result = await verifyPortablePathWebhookSignature({
      rawBody: body,
      signatureHeader: signature,
      timestampHeader: timestamp,
      secret: 'receiver-secret',
      now: '2026-03-05T01:00:30.000Z',
      maxSkewSeconds: 300,
      replayGuard: {
        hasSeen,
        markSeen,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skewSeconds).toBeLessThanOrEqual(300);
    expect(result.replayKey).toMatch(/^[a-f0-9]{64}$/);
    expect(hasSeen).toHaveBeenCalledTimes(1);
    expect(markSeen).toHaveBeenCalledTimes(1);
  });

  it('rejects payload when timestamp skew exceeds maxSkewSeconds', async () => {
    const body = JSON.stringify({ event: 'portable_audit_sink_auto_remediation' });
    const timestamp = '2026-03-05T01:00:00.000Z';
    const signature = buildSignatureHeader(timestamp, body, 'receiver-secret');

    const result = await verifyPortablePathWebhookSignature({
      rawBody: body,
      signatureHeader: signature,
      timestampHeader: timestamp,
      secret: 'receiver-secret',
      now: '2026-03-05T01:10:30.000Z',
      maxSkewSeconds: 60,
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        reason: 'clock_skew_exceeded',
      })
    );
  });

  it('rejects replayed payloads when replay guard reports seen key', async () => {
    const body = JSON.stringify({ event: 'portable_audit_sink_auto_remediation' });
    const timestamp = '2026-03-05T01:00:00.000Z';
    const signature = buildSignatureHeader(timestamp, body, 'receiver-secret');

    const result = await verifyPortablePathWebhookSignature({
      rawBody: body,
      signatureHeader: signature,
      timestampHeader: timestamp,
      secret: 'receiver-secret',
      now: '2026-03-05T01:00:05.000Z',
      replayGuard: {
        hasSeen: async () => true,
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        reason: 'replay_detected',
      })
    );
  });

  it('rejects signature mismatches', async () => {
    const result = await verifyPortablePathWebhookSignature({
      rawBody: JSON.stringify({ event: 'portable_audit_sink_auto_remediation' }),
      signatureHeader: 'v1=1234',
      timestampHeader: '2026-03-05T01:00:00.000Z',
      secret: 'receiver-secret',
      now: '2026-03-05T01:00:01.000Z',
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        reason: 'signature_mismatch',
      })
    );
  });
});
