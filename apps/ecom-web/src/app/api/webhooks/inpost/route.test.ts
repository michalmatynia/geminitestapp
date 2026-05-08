/**
 * @vitest-environment node
 */

import { createHmac } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ findOne: mocks.findOne, updateOne: mocks.updateOne }),
  })),
}));

function makePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    customerReference: 'ARC-2026-ABCD1234',
    trackingNumber: 'TRACK123',
    eventId: 'event-1#MMD.1001',
    eventCode: 'MMD.1001',
    timestamp: '2026-05-08T12:00:00.000Z',
    ...overrides,
  };
}

function signature(body: string, secret = 'webhook-secret'): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('base64');
}

function makeRequest(body: string, signed = true): NextRequest {
  return new Request('http://localhost/api/webhooks/inpost', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signed ? { 'x-inpost-signature': signature(body) } : {}),
    },
    body,
  }) as NextRequest;
}

describe('InPost webhook route', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('INPOST_WEBHOOK_SECRET', 'webhook-secret');
    mocks.findOne.mockReset();
    mocks.updateOne.mockReset();
    mocks.findOne.mockResolvedValue(null);
    mocks.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
  });

  it('rejects invalid signatures before parsing JSON', async () => {
    const body = JSON.stringify(makePayload());
    const req = new Request('http://localhost/api/webhooks/inpost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-inpost-signature': 'bad-signature',
      },
      body,
    }) as NextRequest;

    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it('applies in-transit tracking events by order reference or tracking number', async () => {
    const body = JSON.stringify(makePayload());
    const response = await POST(makeRequest(body));
    const json = await response.json() as { matched?: boolean; orderStatus?: string };

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ matched: true, orderStatus: 'in-transit' });
    expect(mocks.updateOne).toHaveBeenCalledWith(
      {
        $or: [
          { orderId: 'ARC-2026-ABCD1234' },
          { 'inpostShipment.trackingNumber': 'TRACK123' },
        ],
        inpostEventIds: { $ne: 'event-1#MMD.1001' },
        status: { $nin: ['delivered', 'cancelled'] },
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'in-transit',
          'inpostShipment.trackingNumber': 'TRACK123',
          'inpostShipment.status': 'MMD.1001',
          'inpostShipment.eventId': 'event-1#MMD.1001',
          'inpostShipment.eventCode': 'MMD.1001',
          'inpostShipment.eventTimestamp': '2026-05-08T12:00:00.000Z',
        }),
        $addToSet: { inpostEventIds: 'event-1#MMD.1001' },
        $push: {
          inpostTrackingEvents: {
            $each: [
              expect.objectContaining({
                customerReference: 'ARC-2026-ABCD1234',
                trackingNumber: 'TRACK123',
                eventId: 'event-1#MMD.1001',
                eventCode: 'MMD.1001',
                timestamp: '2026-05-08T12:00:00.000Z',
                receivedAt: expect.any(String),
              }),
            ],
            $slice: -25,
          },
        },
      }),
    );
  });

  it('treats repeated tracking events as duplicate without rewriting the order', async () => {
    mocks.updateOne.mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 });
    mocks.findOne.mockResolvedValueOnce({
      _id: 'order-id',
      inpostEventIds: ['event-1#MMD.1001'],
    });

    const body = JSON.stringify(makePayload());
    const response = await POST(makeRequest(body));
    const json = await response.json() as {
      matched?: boolean;
      modified?: boolean;
      duplicate?: boolean;
      orderStatus?: string;
    };

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      matched: true,
      modified: false,
      duplicate: true,
      orderStatus: 'in-transit',
    });
    expect(mocks.findOne).toHaveBeenCalledWith(
      {
        $or: [
          { orderId: 'ARC-2026-ABCD1234' },
          { 'inpostShipment.trackingNumber': 'TRACK123' },
        ],
      },
      { projection: { _id: 1, status: 1, inpostEventIds: 1 } },
    );
    expect(mocks.updateOne).toHaveBeenCalledTimes(1);
  });

  it('records late in-transit events without downgrading terminal order status', async () => {
    mocks.updateOne
      .mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 })
      .mockResolvedValueOnce({ matchedCount: 1, modifiedCount: 1 });
    mocks.findOne.mockResolvedValueOnce({
      _id: 'order-id',
      status: 'delivered',
      inpostEventIds: ['event-2#EOL.1002'],
    });

    const body = JSON.stringify(makePayload({
      eventId: 'event-late#MMD.1001',
      eventCode: 'MMD.1001',
    }));
    const response = await POST(makeRequest(body));
    const json = await response.json() as {
      matched?: boolean;
      modified?: boolean;
      stale?: boolean;
      orderStatus?: string;
    };

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      matched: true,
      modified: true,
      stale: true,
      orderStatus: 'in-transit',
    });
    expect(mocks.updateOne).toHaveBeenNthCalledWith(
      2,
      {
        $or: [
          { orderId: 'ARC-2026-ABCD1234' },
          { 'inpostShipment.trackingNumber': 'TRACK123' },
        ],
        inpostEventIds: { $ne: 'event-late#MMD.1001' },
      },
      {
        $addToSet: {
          inpostEventIds: 'event-late#MMD.1001',
        },
        $push: {
          inpostTrackingEvents: {
            $each: [
              expect.objectContaining({
                customerReference: 'ARC-2026-ABCD1234',
                trackingNumber: 'TRACK123',
                eventId: 'event-late#MMD.1001',
                eventCode: 'MMD.1001',
                timestamp: '2026-05-08T12:00:00.000Z',
                receivedAt: expect.any(String),
                stale: true,
              }),
            ],
            $slice: -25,
          },
        },
      },
    );
  });

  it('maps delivered events to delivered order status', async () => {
    const body = JSON.stringify(makePayload({
      eventId: 'event-2#EOL.1002',
      eventCode: 'EOL.1002',
    }));

    const response = await POST(makeRequest(body));
    const json = await response.json() as { orderStatus?: string };

    expect(response.status).toBe(200);
    expect(json.orderStatus).toBe('delivered');
    expect(mocks.updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'delivered' }),
      }),
    );
  });

  it('allows unsigned development webhooks when no secret is configured', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('INPOST_WEBHOOK_SECRET', '');

    const response = await POST(makeRequest(JSON.stringify(makePayload()), false));

    expect(response.status).toBe(200);
    expect(mocks.updateOne).toHaveBeenCalled();
  });

  it('rejects malformed tracking events', async () => {
    const body = JSON.stringify({ trackingNumber: 'TRACK123' });

    const response = await POST(makeRequest(body));

    expect(response.status).toBe(400);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });
});
