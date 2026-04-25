import { describe, expect, it } from 'vitest';

import {
  createFilemakerEmailCampaign,
  createFilemakerEmailCampaignDelivery,
} from '../../../settings/campaign-factories';

import {
  FILEMAKER_CAMPAIGN_BOUNCE_CIRCUIT_BREAKER_MIN_SAMPLE_SIZE,
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
