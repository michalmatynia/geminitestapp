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

import { POST_handler } from './handler';

describe('filemaker campaign preferences handler', () => {
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

  it('unsubscribes a signed recipient from the preferences center', async () => {
    const token = createFilemakerCampaignUnsubscribeToken({
      emailAddress: 'Jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      now: Date.now(),
      ttlMs: 1000 * 60 * 60,
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'unsubscribe',
          source: 'preferences-center',
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    const suppressionWrite = upsertFilemakerCampaignSettingValueMock.mock.calls.find(
      (call) => call[0] === 'filemaker_email_campaign_suppressions_v1'
    );
    const eventWrite = upsertFilemakerCampaignSettingValueMock.mock.calls.find(
      (call) => call[0] === 'filemaker_email_campaign_events_v1'
    );

    expect(suppressionWrite?.[1]).toContain('"emailAddress":"jan@example.com"');
    expect(suppressionWrite?.[1]).toContain('"reason":"unsubscribed"');
    expect(suppressionWrite?.[1]).toContain('"runId":"run-1"');
    expect(suppressionWrite?.[1]).toContain('"deliveryId":"delivery-1"');
    expect(suppressionWrite?.[1]).toContain('preferences-center');
    expect(eventWrite?.[1]).toContain('"type":"unsubscribed"');
    expect(eventWrite?.[1]).toContain(
      'jan@example.com unsubscribed from the preferences center.'
    );
    await expect(response.json()).resolves.toEqual({
      ok: true,
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      status: 'unsubscribed',
      reason: 'unsubscribed',
      canResubscribe: true,
    });
  });

  it('keeps campaign attribution when an all-campaign preferences token is used', async () => {
    const token = createFilemakerCampaignUnsubscribeToken({
      emailAddress: 'Jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      scope: 'all_campaigns',
      now: Date.now(),
      ttlMs: 1000 * 60 * 60,
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'unsubscribe',
          source: 'preferences-center-all-campaigns',
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    const eventWrite = upsertFilemakerCampaignSettingValueMock.mock.calls.find(
      (call) => call[0] === 'filemaker_email_campaign_events_v1'
    );

    expect(eventWrite?.[1]).toContain('"campaignId":"campaign-1"');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      status: 'unsubscribed',
      reason: 'unsubscribed',
      canResubscribe: true,
    });
  });

  it('restores a previously unsubscribed address', async () => {
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
          entries: [
            {
              id: 'suppression-1',
              emailAddress: 'jan@example.com',
              reason: 'unsubscribed',
              actor: 'recipient',
              campaignId: 'campaign-1',
              runId: 'run-1',
              deliveryId: 'delivery-1',
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

    const token = createFilemakerCampaignUnsubscribeToken({
      emailAddress: 'Jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      now: Date.now(),
      ttlMs: 1000 * 60 * 60,
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'resubscribe',
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    const suppressionWrite = upsertFilemakerCampaignSettingValueMock.mock.calls.find(
      (call) => call[0] === 'filemaker_email_campaign_suppressions_v1'
    );
    const eventWrite = upsertFilemakerCampaignSettingValueMock.mock.calls.find(
      (call) => call[0] === 'filemaker_email_campaign_events_v1'
    );

    expect(suppressionWrite?.[1]).toContain('"entries":[]');
    expect(eventWrite?.[1]).toContain('"type":"resubscribed"');
    expect(eventWrite?.[1]).toContain(
      'jan@example.com restored campaign delivery from the preferences center.'
    );
    await expect(response.json()).resolves.toEqual({
      ok: true,
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      status: 'subscribed',
      reason: null,
      canResubscribe: false,
    });
  });

  it('does not allow self-service restore for manually blocked addresses', async () => {
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
          entries: [
            {
              id: 'suppression-1',
              emailAddress: 'jan@example.com',
              reason: 'manual_block',
              actor: 'admin',
              campaignId: 'campaign-1',
              runId: null,
              deliveryId: null,
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

    const token = createFilemakerCampaignUnsubscribeToken({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      now: Date.now(),
      ttlMs: 1000 * 60 * 60,
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'resubscribe',
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      status: 'blocked',
      reason: 'manual_block',
      canResubscribe: false,
    });
  });

  it('rejects invalid preferences tokens', async () => {
    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/filemaker/campaigns/preferences', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: 'invalid.token',
            action: 'unsubscribe',
          }),
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow('Invalid or expired preferences token.');

    expect(upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });
});
