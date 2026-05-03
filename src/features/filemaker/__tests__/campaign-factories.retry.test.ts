import { describe, expect, it } from 'vitest';

import {
  createFilemakerEmailCampaignDelivery,
  createFilemakerEmailCampaignDeliveryAttempt,
  resolveFilemakerEmailCampaignRetryableDeliveries,
  resolveFilemakerEmailCampaignRetryDelayMs,
} from '../settings/campaign-factories';

const buildRetryableDelivery = () =>
  createFilemakerEmailCampaignDelivery({
    id: 'delivery-1',
    campaignId: 'campaign-1',
    runId: 'run-1',
    emailAddress: 'recipient@example.com',
    partyKind: 'person',
    partyId: 'person-1',
    status: 'failed',
    failureCategory: 'rate_limited',
    nextRetryAt: '2026-03-27T10:15:00.000Z',
  });

const buildAttemptRegistry = () => ({
  version: 1,
  attempts: [
    createFilemakerEmailCampaignDeliveryAttempt({
      id: 'attempt-1',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      emailAddress: 'recipient@example.com',
      partyKind: 'person',
      partyId: 'person-1',
      attemptNumber: 1,
      status: 'failed',
      failureCategory: 'rate_limited',
      attemptedAt: '2026-03-27T10:00:00.000Z',
    }),
  ],
});

describe('campaign retry factories', () => {
  it('does not select deliveries whose nextRetryAt is still in the future', () => {
    const delivery = buildRetryableDelivery();
    const attemptRegistry = buildAttemptRegistry();

    const earlySummary = resolveFilemakerEmailCampaignRetryableDeliveries({
      deliveries: [delivery],
      attemptRegistry,
      nowMs: Date.parse('2026-03-27T10:00:00.000Z'),
    });
    const dueSummary = resolveFilemakerEmailCampaignRetryableDeliveries({
      deliveries: [delivery],
      attemptRegistry,
      nowMs: Date.parse('2026-03-27T10:15:00.000Z'),
    });

    expect(earlySummary.retryableDeliveries).toEqual([]);
    expect(earlySummary.exhaustedDeliveries).toEqual([]);
    expect(dueSummary.retryableDeliveries).toHaveLength(1);
  });

  it('uses nextRetryAt when calculating the next retry delay', () => {
    const delivery = buildRetryableDelivery();
    const attemptRegistry = buildAttemptRegistry();

    expect(
      resolveFilemakerEmailCampaignRetryDelayMs({
        deliveries: [delivery],
        attemptRegistry,
        nowMs: Date.parse('2026-03-27T10:00:00.000Z'),
      })
    ).toBe(15 * 60_000);

    expect(
      resolveFilemakerEmailCampaignRetryDelayMs({
        deliveries: [delivery],
        attemptRegistry,
        nowMs: Date.parse('2026-03-27T10:16:00.000Z'),
      })
    ).toBe(0);
  });
});
