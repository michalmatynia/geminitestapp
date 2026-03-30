import { describe, expect, it } from 'vitest';

import {
  createFilemakerEmailCampaign,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  summarizeFilemakerEmailCampaignRecipientActivity,
} from './campaigns.test-support';

describe('filemaker campaign settings', () => {
  it('summarizes recipient-level delivery and engagement history for the preferences center', () => {
    const campaign = createFilemakerEmailCampaign({
      id: 'campaign-analytics',
      name: 'Analytics campaign',
      status: 'active',
      subject: 'Campaign analytics',
    });
    const campaignRegistry = parseFilemakerEmailCampaignRegistry(
      JSON.stringify({
        version: 1,
        campaigns: [campaign],
      })
    );
    const deliveryRegistry = parseFilemakerEmailCampaignDeliveryRegistry(
      JSON.stringify({
        version: 1,
        deliveries: [
          {
            id: 'delivery-1',
            campaignId: 'campaign-analytics',
            runId: 'run-1',
            emailId: 'email-1',
            emailAddress: 'jan@example.com',
            partyKind: 'person',
            partyId: 'person-1',
            status: 'sent',
            sentAt: '2026-03-27T10:05:00.000Z',
            createdAt: '2026-03-27T10:00:00.000Z',
            updatedAt: '2026-03-27T10:05:00.000Z',
          },
          {
            id: 'delivery-3',
            campaignId: 'campaign-analytics',
            runId: 'run-2',
            emailId: 'email-1',
            emailAddress: 'jan@example.com',
            partyKind: 'person',
            partyId: 'person-1',
            status: 'skipped',
            createdAt: '2026-03-28T10:00:00.000Z',
            updatedAt: '2026-03-28T10:01:00.000Z',
          },
        ],
      })
    );
    const eventRegistry = parseFilemakerEmailCampaignEventRegistry(
      JSON.stringify({
        version: 1,
        events: [
          {
            id: 'event-3',
            campaignId: 'campaign-analytics',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            type: 'opened',
            message: 'jan@example.com opened the campaign email.',
            createdAt: '2026-03-28T12:00:00.000Z',
            updatedAt: '2026-03-28T12:00:00.000Z',
          },
          {
            id: 'event-4',
            campaignId: 'campaign-analytics',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            type: 'clicked',
            targetUrl: 'https://destination.example.com/offer',
            message: 'jan@example.com clicked https://destination.example.com/offer.',
            createdAt: '2026-03-28T13:00:00.000Z',
            updatedAt: '2026-03-28T13:00:00.000Z',
          },
          {
            id: 'event-5',
            campaignId: 'campaign-analytics',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            type: 'unsubscribed',
            message: 'jan@example.com unsubscribed after delivery.',
            createdAt: '2026-03-29T09:00:00.000Z',
            updatedAt: '2026-03-29T09:00:00.000Z',
          },
          {
            id: 'event-6',
            campaignId: 'campaign-analytics',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            type: 'resubscribed',
            message: 'jan@example.com restored delivery later.',
            createdAt: '2026-03-30T11:00:00.000Z',
            updatedAt: '2026-03-30T11:00:00.000Z',
          },
        ],
      })
    );

    const summary = summarizeFilemakerEmailCampaignRecipientActivity({
      emailAddress: 'Jan@Example.com',
      campaignId: 'campaign-analytics',
      campaignRegistry,
      deliveryRegistry,
      eventRegistry,
    });

    expect(summary).toEqual(
      expect.objectContaining({
        emailAddress: 'jan@example.com',
        campaignId: 'campaign-analytics',
        campaignName: 'Analytics campaign',
        deliveryCount: 2,
        sentCount: 1,
        skippedCount: 1,
        openCount: 1,
        clickCount: 1,
        unsubscribeCount: 1,
        resubscribeCount: 1,
        latestSentAt: '2026-03-27T10:05:00.000Z',
        latestOpenAt: '2026-03-28T12:00:00.000Z',
        latestClickAt: '2026-03-28T13:00:00.000Z',
        latestUnsubscribeAt: '2026-03-29T09:00:00.000Z',
        latestResubscribeAt: '2026-03-30T11:00:00.000Z',
      })
    );
    expect(summary.recentActivity.map((entry) => entry.type)).toEqual([
      'resubscribed',
      'unsubscribed',
      'clicked',
      'opened',
      'delivery_sent',
    ]);
  });

  it('summarizes recipient activity across all campaigns when no campaign scope is provided', () => {
    const campaignRegistry = parseFilemakerEmailCampaignRegistry(
      JSON.stringify({
        version: 1,
        campaigns: [
          createFilemakerEmailCampaign({
            id: 'campaign-a',
            name: 'Campaign A',
            status: 'active',
            subject: 'Campaign A',
          }),
          createFilemakerEmailCampaign({
            id: 'campaign-b',
            name: 'Campaign B',
            status: 'active',
            subject: 'Campaign B',
          }),
        ],
      })
    );
    const deliveryRegistry = parseFilemakerEmailCampaignDeliveryRegistry(
      JSON.stringify({
        version: 1,
        deliveries: [
          {
            id: 'delivery-a',
            campaignId: 'campaign-a',
            runId: 'run-a',
            emailId: 'email-1',
            emailAddress: 'jan@example.com',
            partyKind: 'person',
            partyId: 'person-1',
            status: 'sent',
            sentAt: '2026-03-27T10:05:00.000Z',
            createdAt: '2026-03-27T10:00:00.000Z',
            updatedAt: '2026-03-27T10:05:00.000Z',
          },
          {
            id: 'delivery-b',
            campaignId: 'campaign-b',
            runId: 'run-b',
            emailId: 'email-1',
            emailAddress: 'jan@example.com',
            partyKind: 'person',
            partyId: 'person-1',
            status: 'bounced',
            createdAt: '2026-03-28T08:00:00.000Z',
            updatedAt: '2026-03-28T08:02:00.000Z',
          },
        ],
      })
    );
    const eventRegistry = parseFilemakerEmailCampaignEventRegistry(
      JSON.stringify({
        version: 1,
        events: [
          {
            id: 'event-open-a',
            campaignId: 'campaign-a',
            runId: 'run-a',
            deliveryId: 'delivery-a',
            type: 'opened',
            message: 'jan@example.com opened campaign A.',
            createdAt: '2026-03-27T12:00:00.000Z',
            updatedAt: '2026-03-27T12:00:00.000Z',
          },
          {
            id: 'event-click-b',
            campaignId: 'campaign-b',
            runId: 'run-b',
            deliveryId: 'delivery-b',
            type: 'clicked',
            targetUrl: 'https://destination.example.com/b',
            message: 'jan@example.com clicked campaign B.',
            createdAt: '2026-03-28T09:00:00.000Z',
            updatedAt: '2026-03-28T09:00:00.000Z',
          },
        ],
      })
    );

    const summary = summarizeFilemakerEmailCampaignRecipientActivity({
      emailAddress: 'Jan@Example.com',
      campaignId: null,
      campaignRegistry,
      deliveryRegistry,
      eventRegistry,
    });

    expect(summary).toEqual(
      expect.objectContaining({
        emailAddress: 'jan@example.com',
        campaignId: null,
        campaignName: null,
        deliveryCount: 2,
        sentCount: 1,
        bouncedCount: 1,
        openCount: 1,
        clickCount: 1,
        latestSentAt: '2026-03-27T10:05:00.000Z',
        latestOpenAt: '2026-03-27T12:00:00.000Z',
        latestClickAt: '2026-03-28T09:00:00.000Z',
      })
    );
    expect(summary.recentActivity.map((entry) => entry.campaignName)).toEqual([
      'Campaign B',
      'Campaign B',
      'Campaign A',
      'Campaign A',
    ]);
  });
});
