/**
 * @vitest-environment node
 */

import { createHash } from 'crypto';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const TEST_SECOND_KEY = 'test-payu-second-key';

vi.stubEnv('PAYU_SECOND_KEY', TEST_SECOND_KEY);

import { verifyPayUWebhook } from './payu';

function makeSignatureHeader(body: string, key: string): string {
  const sig = createHash('md5').update(body + key).digest('hex');
  return `sender=checkout;signature=${sig};algorithm=MD5;content=DOCUMENT`;
}

describe('verifyPayUWebhook', () => {
  const body = JSON.stringify({ order: { status: 'COMPLETED', orderId: 'PAYU-123' } });

  it('returns true for a correctly signed request', () => {
    const header = makeSignatureHeader(body, TEST_SECOND_KEY);
    expect(verifyPayUWebhook(body, header)).toBe(true);
  });

  it('returns false when the signature does not match the body', () => {
    const header = makeSignatureHeader('tampered-body', TEST_SECOND_KEY);
    expect(verifyPayUWebhook(body, header)).toBe(false);
  });

  it('returns false when signed with a different key', () => {
    const header = makeSignatureHeader(body, 'wrong-key');
    expect(verifyPayUWebhook(body, header)).toBe(false);
  });

  it('returns false when signatureHeader is null', () => {
    expect(verifyPayUWebhook(body, null)).toBe(false);
  });

  it('returns false when signatureHeader has no signature field', () => {
    expect(verifyPayUWebhook(body, 'sender=checkout;algorithm=MD5')).toBe(false);
  });

  it('is case-insensitive for the hex digest', () => {
    const sig = createHash('md5').update(body + TEST_SECOND_KEY).digest('hex').toUpperCase();
    const header = `sender=checkout;signature=${sig};algorithm=MD5`;
    expect(verifyPayUWebhook(body, header)).toBe(true);
  });

  it('returns false when PAYU_SECOND_KEY is not set', () => {
    vi.stubEnv('PAYU_SECOND_KEY', '');
    const header = makeSignatureHeader(body, TEST_SECOND_KEY);
    const result = verifyPayUWebhook(body, header);
    vi.stubEnv('PAYU_SECOND_KEY', TEST_SECOND_KEY);
    expect(result).toBe(false);
  });
});
