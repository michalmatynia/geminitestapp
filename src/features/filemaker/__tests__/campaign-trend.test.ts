import { describe, expect, it } from 'vitest';

import { summarizeFilemakerEmailCampaignRunTrend } from '../settings/campaign-trend';
import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignSuppressionEntry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../types';

const run = (overrides: Partial<FilemakerEmailCampaignRun>): FilemakerEmailCampaignRun => ({
  id: 'r1',
  campaignId: 'c1',
  mode: 'live',
  status: 'completed',
  launchReason: null,
  startedAt: '2026-04-20T10:00:00.000Z',
  completedAt: '2026-04-20T10:30:00.000Z',
  recipientCount: 0,
  deliveredCount: 0,
  failedCount: 0,
  skippedCount: 0,
  createdAt: '2026-04-20T10:00:00.000Z',
  updatedAt: '2026-04-20T10:30:00.000Z',
  ...overrides,
});

const delivery = (
  overrides: Partial<FilemakerEmailCampaignDelivery>
): FilemakerEmailCampaignDelivery => ({
  id: 'd1',
  campaignId: 'c1',
  runId: 'r1',
  emailId: 'em1',
  emailAddress: 'jan@example.com',
  partyKind: 'person',
  partyId: 'p1',
  status: 'sent',
  provider: 'smtp',
  failureCategory: null,
  providerMessage: null,
  lastError: null,
  sentAt: '2026-04-20T10:05:00.000Z',
  nextRetryAt: null,
  createdAt: '2026-04-20T10:05:00.000Z',
  updatedAt: '2026-04-20T10:05:00.000Z',
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
  createdAt: '2026-04-20T10:05:00.000Z',
  updatedAt: '2026-04-20T10:05:00.000Z',
  ...overrides,
});

const suppression = (
  overrides: Partial<FilemakerEmailCampaignSuppressionEntry>
): FilemakerEmailCampaignSuppressionEntry => ({
  id: 's1',
  emailAddress: 'cold@example.com',
  reason: 'cold',
  actor: 'engagement-tracker',
  notes: null,
  campaignId: 'c1',
  runId: 'r1',
  deliveryId: null,
  createdAt: '2026-04-20T10:30:00.000Z',
  updatedAt: '2026-04-20T10:30:00.000Z',
  ...overrides,
});

const registries = (input: {
  runs: FilemakerEmailCampaignRun[];
  deliveries: FilemakerEmailCampaignDelivery[];
  events: FilemakerEmailCampaignEvent[];
  suppressions: FilemakerEmailCampaignSuppressionEntry[];
}): {
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
} => ({
  runRegistry: { version: 1, runs: input.runs },
  deliveryRegistry: { version: 1, deliveries: input.deliveries },
  eventRegistry: { version: 1, events: input.events },
  suppressionRegistry: { version: 1, entries: input.suppressions },
});

describe('summarizeFilemakerEmailCampaignRunTrend', () => {
  it('returns empty points and zero averages when no runs match the campaign', () => {
    const summary = summarizeFilemakerEmailCampaignRunTrend({
      campaign: { id: 'c1' },
      ...registries({ runs: [], deliveries: [], events: [], suppressions: [] }),
    });
    expect(summary.points).toHaveLength(0);
    expect(summary.averages.openRatePercent).toBe(0);
  });

  it('orders points oldest → newest left-to-right and respects the limit', () => {
    const runs = Array.from({ length: 5 }, (_, index) =>
      run({
        id: `r${index + 1}`,
        completedAt: `2026-04-${20 + index}T10:30:00.000Z`,
        recipientCount: 1,
        deliveredCount: 1,
      })
    );
    const summary = summarizeFilemakerEmailCampaignRunTrend({
      campaign: { id: 'c1' },
      ...registries({ runs, deliveries: [], events: [], suppressions: [] }),
      limit: 3,
    });
    expect(summary.points.map((point) => point.runId)).toEqual(['r3', 'r4', 'r5']);
  });

  it('computes open rate, click rate, bounce rate, and counts cold suppressions per run', () => {
    const runs = [
      run({ id: 'r1', recipientCount: 2, deliveredCount: 2 }),
      run({
        id: 'r2',
        recipientCount: 2,
        deliveredCount: 1,
        completedAt: '2026-04-21T10:30:00.000Z',
      }),
    ];
    const deliveries = [
      delivery({ id: 'd1', runId: 'r1', emailAddress: 'jan@example.com' }),
      delivery({ id: 'd2', runId: 'r1', emailAddress: 'maria@example.com' }),
      delivery({ id: 'd3', runId: 'r2', emailAddress: 'jan@example.com' }),
      delivery({
        id: 'd4',
        runId: 'r2',
        emailAddress: 'spam@example.com',
        status: 'bounced',
      }),
    ];
    const events = [
      event({ id: 'e1', runId: 'r1', deliveryId: 'd1', type: 'opened' }),
      event({ id: 'e2', runId: 'r1', deliveryId: 'd1', type: 'opened' }),
      event({ id: 'e3', runId: 'r1', deliveryId: 'd2', type: 'clicked' }),
      event({ id: 'e4', runId: 'r2', deliveryId: 'd3', type: 'opened' }),
      event({
        id: 'e5',
        runId: 'r2',
        type: 'delivery_deferred_warmup',
        deliveryId: 'd3',
      }),
    ];
    const suppressions = [suppression({ runId: 'r2', emailAddress: 'cold@example.com' })];

    const summary = summarizeFilemakerEmailCampaignRunTrend({
      campaign: { id: 'c1' },
      ...registries({ runs, deliveries, events, suppressions }),
    });

    expect(summary.points).toHaveLength(2);
    const [r1, r2] = summary.points;
    if (!r1 || !r2) throw new Error('Expected two points');

    // r1: 2 unique opens? unique-by-deliveryId: only d1 opened (twice), so 1 unique open.
    expect(r1.runId).toBe('r1');
    expect(r1.uniqueOpens).toBe(1);
    expect(r1.uniqueClicks).toBe(1);
    expect(r1.openRatePercent).toBe(50);
    expect(r1.clickRatePercent).toBe(50);
    expect(r1.bounceRatePercent).toBe(0);
    expect(r1.coldSuppressionsAdded).toBe(0);
    expect(r1.decisionCount).toBe(0);

    // r2: 1 delivered, 1 bounced (recipient 2). 1 unique open. 1 cold suppression. 1 decision.
    expect(r2.runId).toBe('r2');
    expect(r2.deliveredCount).toBe(1);
    expect(r2.bouncedCount).toBe(1);
    expect(r2.bounceRatePercent).toBe(50);
    expect(r2.openRatePercent).toBe(100);
    expect(r2.coldSuppressionsAdded).toBe(1);
    expect(r2.decisionCount).toBe(1);

    // Averages span both runs.
    expect(summary.averages.openRatePercent).toBe(75);
    expect(summary.averages.bounceRatePercent).toBe(25);
  });
});
