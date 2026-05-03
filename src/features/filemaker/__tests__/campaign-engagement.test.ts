import { describe, expect, it } from 'vitest';

import {
  autoSuppressColdAddresses,
  computeEngagementSnapshot,
  findColdAddresses,
} from '../settings/campaign-engagement';
import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
} from '../types';

const delivery = (
  overrides: Partial<FilemakerEmailCampaignDelivery>
): FilemakerEmailCampaignDelivery => ({
  id: 'd1',
  campaignId: 'c1',
  runId: 'r1',
  emailId: 'em-1',
  emailAddress: 'jan@example.com',
  partyKind: 'person',
  partyId: 'p1',
  status: 'sent',
  provider: 'smtp',
  failureCategory: null,
  providerMessage: null,
  lastError: null,
  sentAt: '2026-04-20T10:00:00.000Z',
  nextRetryAt: null,
  createdAt: '2026-04-20T10:00:00.000Z',
  updatedAt: '2026-04-20T10:00:00.000Z',
  ...overrides,
});

const event = (overrides: Partial<FilemakerEmailCampaignEvent>): FilemakerEmailCampaignEvent => ({
  id: 'e1',
  campaignId: 'c1',
  runId: 'r1',
  deliveryId: 'd1',
  type: 'delivery_sent',
  message: '',
  actor: null,
  targetUrl: null,
  mailThreadId: null,
  mailMessageId: null,
  runStatus: null,
  deliveryStatus: null,
  createdAt: '2026-04-20T10:00:00.000Z',
  updatedAt: '2026-04-20T10:00:00.000Z',
  ...overrides,
});

const registries = (
  deliveries: FilemakerEmailCampaignDelivery[],
  events: FilemakerEmailCampaignEvent[]
): {
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
} => ({
  deliveryRegistry: { version: 1, deliveries },
  eventRegistry: { version: 1, events },
});

describe('computeEngagementSnapshot', () => {
  it('counts sends, opens, and clicks per email address', () => {
    const { eventRegistry, deliveryRegistry } = registries(
      [delivery({ id: 'd1', emailAddress: 'jan@example.com' })],
      [
        event({ id: 'e1', type: 'delivery_sent', deliveryId: 'd1', createdAt: '2026-04-20T10:00:00.000Z' }),
        event({ id: 'e2', type: 'opened', deliveryId: 'd1', createdAt: '2026-04-20T10:05:00.000Z' }),
        event({ id: 'e3', type: 'clicked', deliveryId: 'd1', createdAt: '2026-04-20T10:06:00.000Z' }),
      ]
    );

    const snapshot = computeEngagementSnapshot({ eventRegistry, deliveryRegistry });
    const counter = snapshot.countersByEmailAddress.get('jan@example.com');
    expect(counter?.sends).toBe(1);
    expect(counter?.opens).toBe(1);
    expect(counter?.clicks).toBe(1);
    expect(counter?.consecutiveSendsSinceEngagement).toBe(0);
    expect(counter?.lastEngagementAt).toBe('2026-04-20T10:06:00.000Z');
  });

  it('increments consecutiveSendsSinceEngagement on sends and resets on engagement', () => {
    const { eventRegistry, deliveryRegistry } = registries(
      [
        delivery({ id: 'd1', runId: 'r1', emailAddress: 'jan@example.com' }),
        delivery({ id: 'd2', runId: 'r2', emailAddress: 'jan@example.com' }),
        delivery({ id: 'd3', runId: 'r3', emailAddress: 'jan@example.com' }),
        delivery({ id: 'd4', runId: 'r4', emailAddress: 'jan@example.com' }),
      ],
      [
        event({ id: 'e1', type: 'delivery_sent', deliveryId: 'd1', createdAt: '2026-04-01T10:00:00.000Z' }),
        event({ id: 'e2', type: 'delivery_sent', deliveryId: 'd2', createdAt: '2026-04-08T10:00:00.000Z' }),
        event({ id: 'e3', type: 'opened', deliveryId: 'd2', createdAt: '2026-04-08T10:05:00.000Z' }),
        event({ id: 'e4', type: 'delivery_sent', deliveryId: 'd3', createdAt: '2026-04-15T10:00:00.000Z' }),
        event({ id: 'e5', type: 'delivery_sent', deliveryId: 'd4', createdAt: '2026-04-22T10:00:00.000Z' }),
      ]
    );

    const snapshot = computeEngagementSnapshot({ eventRegistry, deliveryRegistry });
    const counter = snapshot.countersByEmailAddress.get('jan@example.com');
    expect(counter?.sends).toBe(4);
    expect(counter?.opens).toBe(1);
    // Two sends after the open with no engagement.
    expect(counter?.consecutiveSendsSinceEngagement).toBe(2);
  });

  it('ignores events whose delivery is missing', () => {
    const { eventRegistry, deliveryRegistry } = registries(
      [],
      [event({ id: 'e1', type: 'delivery_sent', deliveryId: 'd-missing' })]
    );
    const snapshot = computeEngagementSnapshot({ eventRegistry, deliveryRegistry });
    expect(snapshot.countersByEmailAddress.size).toBe(0);
  });
});

describe('findColdAddresses', () => {
  it('returns addresses past the threshold and excludes those below minSends', () => {
    const { eventRegistry, deliveryRegistry } = registries(
      [
        delivery({ id: 'd1', emailAddress: 'cold@example.com' }),
        delivery({ id: 'd2', emailAddress: 'cold@example.com' }),
        delivery({ id: 'd3', emailAddress: 'cold@example.com' }),
        delivery({ id: 'd4', emailAddress: 'cold@example.com' }),
        delivery({ id: 'd5', emailAddress: 'newish@example.com' }),
        delivery({ id: 'd6', emailAddress: 'engaged@example.com' }),
        delivery({ id: 'd7', emailAddress: 'engaged@example.com' }),
        delivery({ id: 'd8', emailAddress: 'engaged@example.com' }),
        delivery({ id: 'd9', emailAddress: 'engaged@example.com' }),
      ],
      [
        // cold: 4 sends, no engagement
        event({ id: 'e1', deliveryId: 'd1', type: 'delivery_sent', createdAt: '2026-03-01T00:00:00.000Z' }),
        event({ id: 'e2', deliveryId: 'd2', type: 'delivery_sent', createdAt: '2026-03-08T00:00:00.000Z' }),
        event({ id: 'e3', deliveryId: 'd3', type: 'delivery_sent', createdAt: '2026-03-15T00:00:00.000Z' }),
        event({ id: 'e4', deliveryId: 'd4', type: 'delivery_sent', createdAt: '2026-03-22T00:00:00.000Z' }),
        // newish: only one send
        event({ id: 'e5', deliveryId: 'd5', type: 'delivery_sent', createdAt: '2026-03-23T00:00:00.000Z' }),
        // engaged: 4 sends but 1 click
        event({ id: 'e6', deliveryId: 'd6', type: 'delivery_sent', createdAt: '2026-03-01T00:00:00.000Z' }),
        event({ id: 'e7', deliveryId: 'd7', type: 'delivery_sent', createdAt: '2026-03-08T00:00:00.000Z' }),
        event({ id: 'e8', deliveryId: 'd8', type: 'delivery_sent', createdAt: '2026-03-15T00:00:00.000Z' }),
        event({ id: 'e9', deliveryId: 'd8', type: 'clicked', createdAt: '2026-03-15T00:05:00.000Z' }),
        event({ id: 'e10', deliveryId: 'd9', type: 'delivery_sent', createdAt: '2026-03-22T00:00:00.000Z' }),
      ]
    );

    const snapshot = computeEngagementSnapshot({ eventRegistry, deliveryRegistry });
    const cold = findColdAddresses(snapshot, { minSends: 3, consecutiveSendsThreshold: 4 });
    expect(cold.map((entry) => entry.emailAddress)).toEqual(['cold@example.com']);
  });

  it('autoSuppressColdAddresses adds new "cold" entries and skips already-suppressed ones', () => {
    const { eventRegistry, deliveryRegistry } = registries(
      [
        delivery({ id: 'd1', emailAddress: 'cold-a@example.com' }),
        delivery({ id: 'd2', emailAddress: 'cold-a@example.com' }),
        delivery({ id: 'd3', emailAddress: 'cold-a@example.com' }),
        delivery({ id: 'd4', emailAddress: 'cold-b@example.com' }),
        delivery({ id: 'd5', emailAddress: 'cold-b@example.com' }),
        delivery({ id: 'd6', emailAddress: 'cold-b@example.com' }),
      ],
      [
        event({ id: 'e1', deliveryId: 'd1', type: 'delivery_sent' }),
        event({ id: 'e2', deliveryId: 'd2', type: 'delivery_sent' }),
        event({ id: 'e3', deliveryId: 'd3', type: 'delivery_sent' }),
        event({ id: 'e4', deliveryId: 'd4', type: 'delivery_sent' }),
        event({ id: 'e5', deliveryId: 'd5', type: 'delivery_sent' }),
        event({ id: 'e6', deliveryId: 'd6', type: 'delivery_sent' }),
      ]
    );

    const snapshot = computeEngagementSnapshot({ eventRegistry, deliveryRegistry });
    const result = autoSuppressColdAddresses({
      snapshot,
      suppressionRegistry: {
        version: 1,
        entries: [
          {
            id: 's-existing',
            emailAddress: 'cold-a@example.com',
            reason: 'manual_block',
            actor: null,
            notes: null,
            campaignId: null,
            runId: null,
            deliveryId: null,
            createdAt: '2026-04-01T00:00:00.000Z',
            updatedAt: '2026-04-01T00:00:00.000Z',
          },
        ],
      },
      consecutiveSendsThreshold: 3,
      minSends: 3,
      campaignId: 'c1',
      runId: 'r1',
      actor: 'engagement-tracker',
    });

    expect(result.addedEntries.map((entry) => entry.emailAddress)).toEqual([
      'cold-b@example.com',
    ]);
    expect(result.addedEntries[0]?.reason).toBe('cold');
    expect(
      result.nextRegistry.entries.some((entry) => entry.emailAddress === 'cold-b@example.com')
    ).toBe(true);
    expect(
      result.nextRegistry.entries.find((entry) => entry.emailAddress === 'cold-a@example.com')
        ?.reason
    ).toBe('manual_block');
  });

  it('respects excludeAddresses (e.g. addresses already suppressed)', () => {
    const { eventRegistry, deliveryRegistry } = registries(
      [
        delivery({ id: 'd1', emailAddress: 'cold@example.com' }),
        delivery({ id: 'd2', emailAddress: 'cold@example.com' }),
        delivery({ id: 'd3', emailAddress: 'cold@example.com' }),
      ],
      [
        event({ id: 'e1', deliveryId: 'd1', type: 'delivery_sent' }),
        event({ id: 'e2', deliveryId: 'd2', type: 'delivery_sent' }),
        event({ id: 'e3', deliveryId: 'd3', type: 'delivery_sent' }),
      ]
    );
    const snapshot = computeEngagementSnapshot({ eventRegistry, deliveryRegistry });
    const cold = findColdAddresses(snapshot, {
      minSends: 2,
      consecutiveSendsThreshold: 2,
      excludeAddresses: new Set(['cold@example.com']),
    });
    expect(cold).toEqual([]);
  });
});
