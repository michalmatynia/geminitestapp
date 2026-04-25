import { afterEach, describe, expect, it } from 'vitest';

import {
  __testOnly,
  buildFilemakerCampaignClickTrackingUrl,
  buildFilemakerCampaignManageAllPreferencesUrl,
  buildFilemakerCampaignOneClickUnsubscribeUrl,
  buildFilemakerCampaignOpenTrackingUrl,
  buildFilemakerCampaignPreferencesUrl,
  buildFilemakerCampaignUnsubscribeUrl,
  createFilemakerCampaignUnsubscribeToken,
  parseFilemakerCampaignUnsubscribeToken,
} from '@/features/filemaker/server/campaign-unsubscribe-token';

const originalEnv = {
  FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET: process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'],
  NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
};

describe('filemaker campaign unsubscribe token', () => {
  afterEach(() => {
    if (originalEnv.FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET === undefined) {
      delete process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'];
    } else {
      process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'] =
        originalEnv.FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET;
    }

    if (originalEnv.NEXT_PUBLIC_APP_URL === undefined) {
      delete process.env['NEXT_PUBLIC_APP_URL'];
    } else {
      process.env['NEXT_PUBLIC_APP_URL'] = originalEnv.NEXT_PUBLIC_APP_URL;
    }
  });

  it('creates and parses a signed unsubscribe token', () => {
    process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'] = 'unsubscribe-secret';

    const token = createFilemakerCampaignUnsubscribeToken({
      emailAddress: 'Jan@Example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      now: 1_000,
      ttlMs: 5_000,
    });

    expect(parseFilemakerCampaignUnsubscribeToken(token, 2_000)).toEqual({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      redirectTo: null,
      scope: 'campaign',
      exp: 6_000,
    });
    expect(parseFilemakerCampaignUnsubscribeToken(token, 6_001)).toBeNull();
  });

  it('builds an absolute unsubscribe url with the signed token', () => {
    process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'] = 'unsubscribe-secret';
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://app.example.com/';

    const url = buildFilemakerCampaignUnsubscribeUrl({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      now: 1_000,
      ttlMs: 5_000,
    });

    expect(url.startsWith('https://app.example.com/admin/filemaker/campaigns/unsubscribe?token=')).toBe(true);
    expect(__testOnly.resolvePublicAppUrl()).toBe('https://app.example.com');
  });

  it('builds an API one-click unsubscribe url for List-Unsubscribe-Post', () => {
    process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'] = 'unsubscribe-secret';
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://app.example.com/';

    const url = buildFilemakerCampaignOneClickUnsubscribeUrl({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      now: 1_000,
      ttlMs: 5_000,
    });

    expect(
      url.startsWith('https://app.example.com/api/filemaker/campaigns/unsubscribe?token=')
    ).toBe(true);
    const token = new URL(url).searchParams.get('token');
    expect(parseFilemakerCampaignUnsubscribeToken(token, 2_000)).toEqual(
      expect.objectContaining({
        emailAddress: 'jan@example.com',
        campaignId: 'campaign-1',
        runId: 'run-1',
        deliveryId: 'delivery-1',
      })
    );
  });

  it('builds an absolute open tracking url with the same signed recipient token', () => {
    process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'] = 'unsubscribe-secret';
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://app.example.com/';

    const url = buildFilemakerCampaignOpenTrackingUrl({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      now: 1_000,
      ttlMs: 5_000,
    });

    expect(url.startsWith('https://app.example.com/api/filemaker/campaigns/open?token=')).toBe(
      true
    );
  });

  it('builds an absolute preferences url with the same signed recipient token', () => {
    process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'] = 'unsubscribe-secret';
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://app.example.com/';

    const url = buildFilemakerCampaignPreferencesUrl({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      now: 1_000,
      ttlMs: 5_000,
    });

    expect(url.startsWith('https://app.example.com/admin/filemaker/campaigns/preferences?token=')).toBe(true);
    const token = new URL(url).searchParams.get('token');
    expect(parseFilemakerCampaignUnsubscribeToken(token, 2_000)).toEqual({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      redirectTo: null,
      scope: 'campaign',
      exp: 6_000,
    });
  });

  it('builds an absolute all-campaign preferences url with a scoped signed recipient token', () => {
    process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'] = 'unsubscribe-secret';
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://app.example.com/';

    const url = buildFilemakerCampaignManageAllPreferencesUrl({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      now: 1_000,
      ttlMs: 5_000,
    });

    expect(url.startsWith('https://app.example.com/admin/filemaker/campaigns/preferences?token=')).toBe(true);
    const token = new URL(url).searchParams.get('token');
    expect(parseFilemakerCampaignUnsubscribeToken(token, 2_000)).toEqual({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      redirectTo: null,
      scope: 'all_campaigns',
      exp: 6_000,
    });
  });

  it('builds an absolute click tracking url with the signed redirect target', () => {
    process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'] = 'unsubscribe-secret';
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://app.example.com/';

    const url = buildFilemakerCampaignClickTrackingUrl({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      redirectTo: 'https://destination.example.com/offer',
      now: 1_000,
      ttlMs: 5_000,
    });

    expect(url.startsWith('https://app.example.com/api/filemaker/campaigns/click?token=')).toBe(
      true
    );
    const token = new URL(url).searchParams.get('token');
    expect(parseFilemakerCampaignUnsubscribeToken(token, 2_000)).toEqual({
      emailAddress: 'jan@example.com',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      redirectTo: 'https://destination.example.com/offer',
      scope: 'campaign',
      exp: 6_000,
    });
  });
});
