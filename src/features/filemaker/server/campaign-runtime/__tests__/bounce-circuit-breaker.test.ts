import { describe, expect, it } from 'vitest';

import {
  createFilemakerEmailCampaign,
  createFilemakerEmailCampaignDelivery,
  createFilemakerEmailCampaignDeliveryAttempt,
} from '../../../settings/campaign-factories';

import {
  FILEMAKER_CAMPAIGN_BOUNCE_CIRCUIT_BREAKER_MIN_SAMPLE_SIZE,
  shouldDeferDeliveryForDomainHealth,
  shouldPauseRunForBounceRate,
} from '../runtime-utils';

const buildCampaignWithThreshold = (pauseOnBounceRatePercent: number | null) =>
  createFilemakerEmailCampaign({
    id: 'campaign-cb',
    name: 'Threshold test',
    status: 'active',
    subject: 'Hi',
    audience: {
      partyKinds: ['person'],
      emailStatuses: ['active'],
      includePartyReferences: [],
      excludePartyReferences: [],
      organizationIds: [],
      eventIds: [],
      countries: [],
      cities: [],
      dedupeByEmail: true,
      limit: null,
    },
    launch: {
      mode: 'manual',
      scheduledAt: null,
      recurring: null,
      minAudienceSize: 1,
      requireApproval: false,
      onlyWeekdays: false,
      allowedHourStart: null,
      allowedHourEnd: null,
      pauseOnBounceRatePercent,
      timezone: 'UTC',
    },
  });

const buildDeliveries = (input: { sent: number; bounced: number; queued?: number }) => {
  const deliveries = [];
  for (let i = 0; i < input.sent; i += 1) {
    deliveries.push(
      createFilemakerEmailCampaignDelivery({
        campaignId: 'campaign-cb',
        runId: 'run-1',
        emailAddress: `sent${i}@example.com`,
        partyKind: 'person',
        partyId: `person-sent-${i}`,
        status: 'sent',
      })
    );
  }
  for (let i = 0; i < input.bounced; i += 1) {
    deliveries.push(
      createFilemakerEmailCampaignDelivery({
        campaignId: 'campaign-cb',
        runId: 'run-1',
        emailAddress: `bounce${i}@example.com`,
        partyKind: 'person',
        partyId: `person-bounce-${i}`,
        status: 'bounced',
      })
    );
  }
  for (let i = 0; i < (input.queued ?? 0); i += 1) {
    deliveries.push(
      createFilemakerEmailCampaignDelivery({
        campaignId: 'campaign-cb',
        runId: 'run-1',
        emailAddress: `queue${i}@example.com`,
        partyKind: 'person',
        partyId: `person-queue-${i}`,
        status: 'queued',
      })
    );
  }
  return deliveries;
};

describe('shouldPauseRunForBounceRate', () => {
  it('returns false when no threshold is configured', () => {
    expect(
      shouldPauseRunForBounceRate({
        campaign: buildCampaignWithThreshold(null),
        deliveries: buildDeliveries({ sent: 5, bounced: 100 }),
      })
    ).toBe(false);
  });

  it('returns false below minimum sample size even if rate exceeds threshold', () => {
    expect(
      shouldPauseRunForBounceRate({
        campaign: buildCampaignWithThreshold(5),
        deliveries: buildDeliveries({ sent: 0, bounced: 3 }),
      })
    ).toBe(false);
  });

  it('returns true when bounce rate >= threshold and sample size sufficient', () => {
    expect(
      shouldPauseRunForBounceRate({
        campaign: buildCampaignWithThreshold(10),
        deliveries: buildDeliveries({ sent: 90, bounced: 10 }),
      })
    ).toBe(true);
  });

  it('returns false when bounce rate is below threshold', () => {
    expect(
      shouldPauseRunForBounceRate({
        campaign: buildCampaignWithThreshold(10),
        deliveries: buildDeliveries({
          sent: FILEMAKER_CAMPAIGN_BOUNCE_CIRCUIT_BREAKER_MIN_SAMPLE_SIZE,
          bounced: 1,
        }),
      })
    ).toBe(false);
  });

  it('ignores still-queued deliveries when computing the decided sample', () => {
    expect(
      shouldPauseRunForBounceRate({
        campaign: buildCampaignWithThreshold(50),
        deliveries: buildDeliveries({ sent: 0, bounced: 5, queued: 1000 }),
        minSampleSize: 5,
      })
    ).toBe(true);
  });
});

describe('shouldDeferDeliveryForDomainHealth', () => {
  it('defers same-domain deliveries after the run-level failure rate crosses the guard', () => {
    const campaign = buildCampaignWithThreshold(null);
    const previousDeliveries = [
      ...buildDeliveries({ sent: 1, bounced: 2 }),
      createFilemakerEmailCampaignDelivery({
        campaignId: campaign.id,
        runId: 'run-1',
        emailAddress: 'next@example.com',
        partyKind: 'person',
        partyId: 'person-next',
        status: 'queued',
      }),
    ];

    expect(
      shouldDeferDeliveryForDomainHealth({
        delivery: previousDeliveries[3]!,
        deliveries: previousDeliveries,
      })
    ).toBe(true);
  });

  it('does not defer other recipient domains', () => {
    const previousDeliveries = [
      ...buildDeliveries({ sent: 1, bounced: 2 }),
      createFilemakerEmailCampaignDelivery({
        campaignId: 'campaign-cb',
        runId: 'run-1',
        emailAddress: 'next@elsewhere.test',
        partyKind: 'person',
        partyId: 'person-next',
        status: 'queued',
      }),
    ];

    expect(
      shouldDeferDeliveryForDomainHealth({
        delivery: previousDeliveries[3]!,
        deliveries: previousDeliveries,
      })
    ).toBe(false);
  });

  it('uses recent same-run delivery attempts during retry passes', () => {
    const delivery = createFilemakerEmailCampaignDelivery({
      campaignId: 'campaign-cb',
      runId: 'run-1',
      emailAddress: 'retry@example.com',
      partyKind: 'person',
      partyId: 'person-retry',
      status: 'queued',
    });
    const attempts = ['sent', 'bounced', 'bounced'].map((status, index) =>
      createFilemakerEmailCampaignDeliveryAttempt({
        campaignId: 'campaign-cb',
        runId: 'run-1',
        deliveryId: `delivery-${index}`,
        emailAddress: `attempt-${index}@example.com`,
        partyKind: 'person',
        partyId: `person-attempt-${index}`,
        attemptNumber: 1,
        status: status as 'sent' | 'bounced',
        createdAt: '2026-03-27T10:00:00.000Z',
      })
    );

    expect(
      shouldDeferDeliveryForDomainHealth({
        delivery,
        deliveries: [delivery],
        attempts,
        nowMs: Date.parse('2026-03-27T10:05:00.000Z'),
      })
    ).toBe(true);
  });

  it('ignores stale delivery attempts outside the cooldown window', () => {
    const delivery = createFilemakerEmailCampaignDelivery({
      campaignId: 'campaign-cb',
      runId: 'run-1',
      emailAddress: 'retry@example.com',
      partyKind: 'person',
      partyId: 'person-retry',
      status: 'queued',
    });
    const attempts = [0, 1, 2].map((index) =>
      createFilemakerEmailCampaignDeliveryAttempt({
        campaignId: 'campaign-cb',
        runId: 'run-1',
        deliveryId: `delivery-${index}`,
        emailAddress: `attempt-${index}@example.com`,
        partyKind: 'person',
        partyId: `person-attempt-${index}`,
        attemptNumber: 1,
        status: 'bounced',
        createdAt: '2026-03-27T08:00:00.000Z',
      })
    );

    expect(
      shouldDeferDeliveryForDomainHealth({
        delivery,
        deliveries: [delivery],
        attempts,
        nowMs: Date.parse('2026-03-27T10:05:00.000Z'),
      })
    ).toBe(false);
  });

  it('ignores stale delivery statuses outside the cooldown window', () => {
    const delivery = createFilemakerEmailCampaignDelivery({
      campaignId: 'campaign-cb',
      runId: 'run-1',
      emailAddress: 'retry@example.com',
      partyKind: 'person',
      partyId: 'person-retry',
      status: 'queued',
      createdAt: '2026-03-27T10:05:00.000Z',
      updatedAt: '2026-03-27T10:05:00.000Z',
    });
    const staleFailures = [0, 1, 2].map((index) =>
      createFilemakerEmailCampaignDelivery({
        campaignId: 'campaign-cb',
        runId: 'run-1',
        emailAddress: `stale-${index}@example.com`,
        partyKind: 'person',
        partyId: `person-stale-${index}`,
        status: 'failed',
        failureCategory: 'rate_limited',
        createdAt: '2026-03-27T08:00:00.000Z',
        updatedAt: '2026-03-27T08:00:00.000Z',
      })
    );

    expect(
      shouldDeferDeliveryForDomainHealth({
        delivery,
        deliveries: staleFailures.concat(delivery),
        nowMs: Date.parse('2026-03-27T10:05:00.000Z'),
      })
    ).toBe(false);
  });
});
