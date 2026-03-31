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

vi.mock('@/features/filemaker/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/filemaker/server')>();
  return {
    ...actual,
    readFilemakerCampaignSettingValue: readFilemakerCampaignSettingValueMock,
    upsertFilemakerCampaignSettingValue: upsertFilemakerCampaignSettingValueMock,
  };
});

import { POST_handler } from './handler';

describe('filemaker campaign unsubscribe handler', () => {
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
      if (key === 'filemaker_email_campaign_suppressions_v1') {
        return JSON.stringify({
          version: 1,
          entries: [],
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

  it('accepts a signed unsubscribe token instead of raw email input', async () => {
    const now = Date.now();
    const token = createFilemakerCampaignUnsubscribeToken({
      emailAddress: 'Jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      now,
      ttlMs: 1000 * 60 * 60,
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    const suppressionWrite = upsertFilemakerCampaignSettingValueMock.mock.calls.find(
      (call) => call[0] === 'filemaker_email_campaign_suppressions_v1'
    );
    expect(suppressionWrite?.[1]).toContain('"emailAddress":"jan@example.com"');
    expect(suppressionWrite?.[1]).toContain('signed-unsubscribe-token');
    expect(suppressionWrite?.[1]).toContain('"runId":"run-1"');
    expect(suppressionWrite?.[1]).toContain('"deliveryId":"delivery-1"');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      alreadySuppressed: false,
      reason: 'unsubscribed',
    });
  });

  it('adds an unsubscribed suppression entry and records a campaign event', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          emailAddress: 'Jan@example.com',
          campaignId: 'campaign-1',
          source: 'footer-link',
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(upsertFilemakerCampaignSettingValueMock).toHaveBeenCalledTimes(2);
    const suppressionWrite = upsertFilemakerCampaignSettingValueMock.mock.calls.find(
      (call) => call[0] === 'filemaker_email_campaign_suppressions_v1'
    );
    const eventWrite = upsertFilemakerCampaignSettingValueMock.mock.calls.find(
      (call) => call[0] === 'filemaker_email_campaign_events_v1'
    );

    expect(suppressionWrite?.[1]).toContain('"emailAddress":"jan@example.com"');
    expect(suppressionWrite?.[1]).toContain('"reason":"unsubscribed"');
    expect(suppressionWrite?.[1]).toContain('"actor":"recipient"');
    expect(suppressionWrite?.[1]).toContain('footer-link');
    expect(eventWrite?.[1]).toContain('"campaignId":"campaign-1"');
    expect(eventWrite?.[1]).toContain('"type":"unsubscribed"');
    expect(eventWrite?.[1]).toContain('jan@example.com unsubscribed via the public unsubscribe form.');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      alreadySuppressed: false,
      reason: 'unsubscribed',
    });
  });

  it('rejects invalid signed unsubscribe tokens', async () => {
    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/filemaker/campaigns/unsubscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: 'invalid.token',
          }),
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow('Invalid or expired unsubscribe token.');
    expect(upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });

  it('keeps the request campaign id but skips event writes when the campaign is missing', async () => {
    readFilemakerCampaignSettingValueMock.mockImplementation(async (key: string) => {
      if (key === 'filemaker_email_campaigns_v1') {
        return JSON.stringify({
          version: 1,
          campaigns: [],
        });
      }
      if (key === 'filemaker_email_campaign_suppressions_v1') {
        return JSON.stringify({
          version: 1,
          entries: [
            {
              id: 'suppression-1',
              emailAddress: 'jan@example.com',
              reason: 'manual_block',
              actor: 'admin',
              createdAt: '2026-03-27T10:00:00.000Z',
              updatedAt: '2026-03-27T10:00:00.000Z',
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

    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/unsubscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          emailAddress: 'jan@example.com',
          campaignId: 'campaign-missing',
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(upsertFilemakerCampaignSettingValueMock).toHaveBeenCalledTimes(1);
    expect(upsertFilemakerCampaignSettingValueMock).toHaveBeenCalledWith(
      'filemaker_email_campaign_suppressions_v1',
      expect.any(String)
    );
    await expect(response.json()).resolves.toEqual({
      ok: true,
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-missing',
      alreadySuppressed: true,
      reason: 'unsubscribed',
    });
  });
});
