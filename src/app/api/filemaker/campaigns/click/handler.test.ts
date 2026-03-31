import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createFilemakerCampaignUnsubscribeToken } from '@/features/filemaker/server';

const {
  readFilemakerCampaignSettingValueMock,
  upsertFilemakerCampaignSettingValueMock,
} = vi.hoisted(() => ({
  readFilemakerCampaignSettingValueMock: vi.fn(),
  upsertFilemakerCampaignSettingValueMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  readFilemakerCampaignSettingValue: readFilemakerCampaignSettingValueMock,
  upsertFilemakerCampaignSettingValue: upsertFilemakerCampaignSettingValueMock,
}));

import { GET_handler } from './handler';

describe('filemaker campaign click tracking handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'] = 'unsubscribe-secret';
    upsertFilemakerCampaignSettingValueMock.mockResolvedValue(true);
    readFilemakerCampaignSettingValueMock.mockImplementation(async (key: string) => {
      if (key === 'filemaker_email_campaigns_v1') {
        return JSON.stringify({
          version: 1,
          campaigns: [
            {
              id: 'campaign-1',
              name: 'Campaign one',
              status: 'active',
              subject: 'Hello',
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
                pauseOnBounceRatePercent: null,
                timezone: 'UTC',
              },
            },
          ],
        });
      }
      if (key === 'filemaker_email_campaign_events_v1') {
        return JSON.stringify({
          version: 1,
          events: [],
        });
      }
      return null;
    });
  });

  it('records the first click event for a signed redirect token and forwards to the destination', async () => {
    const token = createFilemakerCampaignUnsubscribeToken({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      redirectTo: 'https://destination.example.com/offer',
      now: Date.now(),
      ttlMs: 1000 * 60 * 60,
    });

    const response = await GET_handler(
      new NextRequest(`http://localhost/api/filemaker/campaigns/click?token=${encodeURIComponent(token)}`),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://destination.example.com/offer');
    const eventWrite = upsertFilemakerCampaignSettingValueMock.mock.calls.find(
      (call) => call[0] === 'filemaker_email_campaign_events_v1'
    );
    expect(eventWrite?.[1]).toContain('"type":"clicked"');
    expect(eventWrite?.[1]).toContain('"campaignId":"campaign-1"');
    expect(eventWrite?.[1]).toContain('"runId":"run-1"');
    expect(eventWrite?.[1]).toContain('"deliveryId":"delivery-1"');
    expect(eventWrite?.[1]).toContain('"targetUrl":"https://destination.example.com/offer"');
  });

  it('deduplicates repeated click events for the same delivery and destination', async () => {
    readFilemakerCampaignSettingValueMock.mockImplementation(async (key: string) => {
      if (key === 'filemaker_email_campaigns_v1') {
        return JSON.stringify({
          version: 1,
          campaigns: [
            {
              id: 'campaign-1',
              name: 'Campaign one',
              status: 'active',
              subject: 'Hello',
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
                pauseOnBounceRatePercent: null,
                timezone: 'UTC',
              },
            },
          ],
        });
      }
      if (key === 'filemaker_email_campaign_events_v1') {
        return JSON.stringify({
          version: 1,
          events: [
            {
              id: 'event-1',
              campaignId: 'campaign-1',
              runId: 'run-1',
              deliveryId: 'delivery-1',
              type: 'clicked',
              actor: 'recipient',
              targetUrl: 'https://destination.example.com/offer',
              message: 'jan@example.com clicked https://destination.example.com/offer.',
              createdAt: '2026-03-27T10:00:00.000Z',
              updatedAt: '2026-03-27T10:00:00.000Z',
            },
          ],
        });
      }
      return null;
    });

    const token = createFilemakerCampaignUnsubscribeToken({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      redirectTo: 'https://destination.example.com/offer',
      now: Date.now(),
      ttlMs: 1000 * 60 * 60,
    });

    const response = await GET_handler(
      new NextRequest(`http://localhost/api/filemaker/campaigns/click?token=${encodeURIComponent(token)}`),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://destination.example.com/offer');
    expect(upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });

  it('falls back to the app root when the click token is invalid', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/click?token=invalid.token'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('http://localhost');
    expect(upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });
});
