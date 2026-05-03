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

vi.mock('@/features/filemaker/server/campaign-settings-store', () => ({
  readFilemakerCampaignSettingValue: readFilemakerCampaignSettingValueMock,
  upsertFilemakerCampaignSettingValue: upsertFilemakerCampaignSettingValueMock,
}));

import { getHandler } from './handler';

describe('filemaker campaign open tracking handler', () => {
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

  it('records the first open event for a signed delivery token and returns a pixel', async () => {
    const token = createFilemakerCampaignUnsubscribeToken({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      now: Date.now(),
      ttlMs: 1000 * 60 * 60,
    });

    const response = await getHandler(
      new NextRequest(`http://localhost/api/filemaker/campaigns/open?token=${encodeURIComponent(token)}`),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.headers.get('content-type')).toBe('image/gif');
    expect(response.status).toBe(200);
    const eventWrite = upsertFilemakerCampaignSettingValueMock.mock.calls.find(
      (call) => call[0] === 'filemaker_email_campaign_events_v1'
    );
    expect(eventWrite?.[1]).toContain('"type":"opened"');
    expect(eventWrite?.[1]).toContain('"campaignId":"campaign-1"');
    expect(eventWrite?.[1]).toContain('"runId":"run-1"');
    expect(eventWrite?.[1]).toContain('"deliveryId":"delivery-1"');
    expect(eventWrite?.[1]).toContain('jan@example.com opened the campaign email.');
  });

  it('deduplicates repeated open events for the same delivery', async () => {
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
              type: 'opened',
              message: 'jan@example.com opened the campaign email.',
              actor: 'recipient',
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
      now: Date.now(),
      ttlMs: 1000 * 60 * 60,
    });

    const response = await getHandler(
      new NextRequest(`http://localhost/api/filemaker/campaigns/open?token=${encodeURIComponent(token)}`),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.headers.get('content-type')).toBe('image/gif');
    expect(upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });

  it('returns the tracking pixel without writing when the token is invalid', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/filemaker/campaigns/open?token=invalid.token'),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(response.headers.get('content-type')).toBe('image/gif');
    expect(response.status).toBe(200);
    expect(upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });
});
