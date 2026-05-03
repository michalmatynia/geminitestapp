import { describe, expect, it } from 'vitest';

import {
  createFilemakerEmailCampaignDelivery,
  createFilemakerEmailCampaignEvent,
} from '../../settings/campaign-factories';

import { findFilemakerCampaignColdRecipients } from '../campaign-engagement-pruning';

const buildSentDeliveries = (
  emailAddress: string,
  count: number,
  baseId = emailAddress.replace(/[^a-z0-9]/gi, '')
) =>
  Array.from({ length: count }, (_, index) =>
    createFilemakerEmailCampaignDelivery({
      id: `delivery-${baseId}-${index}`,
      campaignId: 'campaign-1',
      runId: `run-${index}`,
      emailAddress,
      partyKind: 'person',
      partyId: `person-${baseId}`,
      status: 'sent',
      sentAt: new Date(2026, 0, index + 1).toISOString(),
    })
  );

describe('findFilemakerCampaignColdRecipients', () => {
  it('returns addresses with sends >= threshold and zero engagement events', () => {
    const deliveries = [
      ...buildSentDeliveries('cold@example.com', 5),
      ...buildSentDeliveries('warm@example.com', 5, 'warm'),
    ];
    const events = [
      createFilemakerEmailCampaignEvent({
        campaignId: 'campaign-1',
        runId: 'run-0',
        deliveryId: 'delivery-warm-0',
        type: 'opened',
        message: 'opened',
      }),
    ];

    const result = findFilemakerCampaignColdRecipients({
      deliveries,
      events,
      minSendsWithoutEngagement: 5,
    });

    expect(result.map((entry) => entry.emailAddress)).toEqual(['cold@example.com']);
    expect(result[0]!.sentCount).toBe(5);
  });

  it('skips addresses below the send threshold', () => {
    const deliveries = buildSentDeliveries('few@example.com', 3);
    const result = findFilemakerCampaignColdRecipients({
      deliveries,
      events: [],
      minSendsWithoutEngagement: 5,
    });
    expect(result).toEqual([]);
  });

  it('treats a click event as engagement (no pruning)', () => {
    const deliveries = buildSentDeliveries('clicker@example.com', 6, 'clicker');
    const events = [
      createFilemakerEmailCampaignEvent({
        campaignId: 'campaign-1',
        runId: 'run-2',
        deliveryId: 'delivery-clicker-2',
        type: 'clicked',
        message: 'clicked',
      }),
    ];

    const result = findFilemakerCampaignColdRecipients({
      deliveries,
      events,
      minSendsWithoutEngagement: 5,
    });
    expect(result).toEqual([]);
  });

  it('only counts deliveries with status=sent toward the threshold', () => {
    const deliveries = [
      ...buildSentDeliveries('mixed@example.com', 4, 'mixed'),
      createFilemakerEmailCampaignDelivery({
        id: 'delivery-mixed-failed',
        campaignId: 'campaign-1',
        runId: 'run-fail',
        emailAddress: 'mixed@example.com',
        partyKind: 'person',
        partyId: 'person-mixed',
        status: 'failed',
      }),
    ];
    const result = findFilemakerCampaignColdRecipients({
      deliveries,
      events: [],
      minSendsWithoutEngagement: 5,
    });
    expect(result).toEqual([]);
  });

  it('returns empty when threshold is 0 or negative', () => {
    const deliveries = buildSentDeliveries('any@example.com', 10);
    expect(
      findFilemakerCampaignColdRecipients({
        deliveries,
        events: [],
        minSendsWithoutEngagement: 0,
      })
    ).toEqual([]);
  });

  it('sorts results by sentCount descending', () => {
    const deliveries = [
      ...buildSentDeliveries('mid@example.com', 6, 'mid'),
      ...buildSentDeliveries('top@example.com', 12, 'top'),
      ...buildSentDeliveries('low@example.com', 5, 'low'),
    ];
    const result = findFilemakerCampaignColdRecipients({
      deliveries,
      events: [],
      minSendsWithoutEngagement: 5,
    });
    expect(result.map((entry) => entry.emailAddress)).toEqual([
      'top@example.com',
      'mid@example.com',
      'low@example.com',
    ]);
  });
});
