/**
 * @vitest-environment node
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';

import { POST } from './route';

const SECOND_KEY = 'test-second-key';

const mocks = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
  sendOrderConfirmation: vi.fn(),
  fulfillInpostOrder: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ findOneAndUpdate: mocks.findOneAndUpdate }),
  })),
}));

vi.mock('@/lib/providerSettings', () => ({
  readPayUProviderSettings: vi.fn(async () => null),
}));

vi.mock('@/lib/email', () => ({
  sendOrderConfirmation: mocks.sendOrderConfirmation,
}));

vi.mock('@/lib/inpost', () => ({
  fulfillInpostOrder: mocks.fulfillInpostOrder,
}));

vi.mock('@/lib/orders', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/orders')>();
  return {
    ...mod,
    serializeOrder: (doc: Record<string, unknown>) => ({ ...doc, _id: 'serialized-id' }),
  };
});

function makeSignature(body: string): string {
  const sig = createHash('md5').update(body + SECOND_KEY).digest('hex');
  return `sender=checkout;signature=${sig};algorithm=MD5;content=DOCUMENT`;
}

function makeRequest(body: string, signature: string | null = null): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (signature) headers['OpenPayU-Signature'] = signature;
  return new Request('http://localhost/api/webhooks/payu', {
    method: 'POST',
    headers,
    body,
  }) as NextRequest;
}

function makeNotification(payuOrderId: string, status: string, extOrderId = ''): string {
  return JSON.stringify({
    order: {
      orderId: payuOrderId,
      ...(extOrderId.length > 0 ? { extOrderId } : {}),
      status,
    },
  });
}

function makeSignedRequest(body: string): NextRequest {
  return makeRequest(body, makeSignature(body));
}

describe('PayU IPN webhook', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.stubEnv('PAYU_SECOND_KEY', SECOND_KEY);
    mocks.findOneAndUpdate.mockReset();
    mocks.sendOrderConfirmation.mockReset();
    mocks.fulfillInpostOrder.mockReset();
    mocks.findOneAndUpdate.mockResolvedValue({
      _id: { toString: () => 'mongo-id' },
      orderId: 'ARC-2026-ABCD1234',
      email: 'buyer@example.com',
      status: 'processing',
      items: [],
    });
    mocks.sendOrderConfirmation.mockResolvedValue(undefined);
    mocks.fulfillInpostOrder.mockResolvedValue(null);
  });

  it('updates order to processing and sends confirmation email on COMPLETED', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-13T12:00:00.000Z'));
    const body = makeNotification('PAYU-123', 'COMPLETED');
    const res = await POST(makeSignedRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      {
        payuOrderId: 'PAYU-123',
        status: 'pending_payment',
        confirmationEmailQueuedAt: { $exists: false },
      },
      {
        $set: {
          status: 'processing',
          payuOrderId: 'PAYU-123',
          confirmationEmailQueuedAt: '2026-05-13T12:00:00.000Z',
        },
      },
      { returnDocument: 'after' },
    );
    expect(mocks.sendOrderConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'serialized-id' }),
    );
    expect(mocks.fulfillInpostOrder).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'serialized-id' }),
    );
  });

  it('can confirm a precreated BLIK order by extOrderId before payuOrderId is attached', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-13T12:00:00.000Z'));
    const body = makeNotification('PAYU-123', 'COMPLETED', 'ARC-2026-ABCD1234');
    const res = await POST(makeSignedRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      {
        $or: [
          { payuOrderId: 'PAYU-123' },
          { orderId: 'ARC-2026-ABCD1234' },
        ],
        status: 'pending_payment',
        confirmationEmailQueuedAt: { $exists: false },
      },
      {
        $set: {
          status: 'processing',
          payuOrderId: 'PAYU-123',
          confirmationEmailQueuedAt: '2026-05-13T12:00:00.000Z',
        },
      },
      { returnDocument: 'after' },
    );
    expect(mocks.sendOrderConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'serialized-id' }),
    );
  });

  it('does not send duplicate confirmation emails for repeated COMPLETED notifications', async () => {
    mocks.findOneAndUpdate.mockResolvedValueOnce(null);

    const body = makeNotification('PAYU-123', 'COMPLETED');
    const res = await POST(makeSignedRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      {
        payuOrderId: 'PAYU-123',
        status: 'pending_payment',
        confirmationEmailQueuedAt: { $exists: false },
      },
      {
        $set: expect.objectContaining({
          status: 'processing',
          payuOrderId: 'PAYU-123',
          confirmationEmailQueuedAt: expect.any(String),
        }),
      },
      { returnDocument: 'after' },
    );
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(mocks.fulfillInpostOrder).not.toHaveBeenCalled();
  });

  it('updates order to cancelled on CANCELED without sending email', async () => {
    const body = makeNotification('PAYU-456', 'CANCELED');
    const res = await POST(makeSignedRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { payuOrderId: 'PAYU-456', status: 'pending_payment' },
      { $set: { status: 'cancelled', payuOrderId: 'PAYU-456' } },
      { returnDocument: 'after' },
    );
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(mocks.fulfillInpostOrder).not.toHaveBeenCalled();
  });

  it('does not downgrade completed orders on late CANCELED notifications', async () => {
    mocks.findOneAndUpdate.mockResolvedValueOnce(null);

    const body = makeNotification('PAYU-456', 'CANCELED');
    const res = await POST(makeSignedRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { payuOrderId: 'PAYU-456', status: 'pending_payment' },
      { $set: { status: 'cancelled', payuOrderId: 'PAYU-456' } },
      { returnDocument: 'after' },
    );
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(mocks.fulfillInpostOrder).not.toHaveBeenCalled();
  });

  it('keeps order in pending_payment on PENDING notification', async () => {
    const body = makeNotification('PAYU-789', 'PENDING');
    const res = await POST(makeSignedRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { payuOrderId: 'PAYU-789', status: 'pending_payment' },
      { $set: { status: 'pending_payment', payuOrderId: 'PAYU-789' } },
      { returnDocument: 'after' },
    );
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('verifies signature in production and rejects invalid ones', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYU_SECOND_KEY', SECOND_KEY);

    const body = makeNotification('PAYU-999', 'COMPLETED');
    const res = await POST(makeRequest(body, 'sender=checkout;signature=badhash;algorithm=MD5;content=DOCUMENT'));

    expect(res.status).toBe(401);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('accepts a correctly signed request in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYU_SECOND_KEY', SECOND_KEY);

    const body = makeNotification('PAYU-999', 'COMPLETED');
    const sig = makeSignature(body);
    const res = await POST(makeRequest(body, sig));

    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalled();
  });

  it('ignores unknown PayU statuses without erroring', async () => {
    const body = makeNotification('PAYU-000', 'NEW');
    const res = await POST(makeSignedRequest(body));

    expect(res.status).toBe(200);
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
