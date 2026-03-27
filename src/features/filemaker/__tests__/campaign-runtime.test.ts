import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createFilemakerEmailCampaign,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  toPersistedFilemakerDatabase,
} from '@/features/filemaker/settings';
import { parseFilemakerCampaignUnsubscribeToken } from '@/features/filemaker/server/campaign-unsubscribe-token';
import { FilemakerCampaignEmailDeliveryError } from '@/features/filemaker/server/campaign-email-delivery';
import { createFilemakerCampaignRuntimeService } from '@/features/filemaker/server/campaign-runtime';

import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignSuppressionRegistry,
} from '@/features/filemaker/types';

const iso = '2026-03-27T10:00:00.000Z';
const originalEnv = {
  FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET: process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'],
  NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
};

const createDatabase = (): FilemakerDatabase => ({
  version: 2,
  persons: [
    {
      id: 'person-1',
      firstName: 'Jan',
      lastName: 'Kowalski',
      addressId: '',
      street: '',
      streetNumber: '',
      city: 'Warsaw',
      postalCode: '',
      country: 'Poland',
      countryId: 'PL',
      nip: '',
      regon: '',
      phoneNumbers: [],
      createdAt: iso,
      updatedAt: iso,
    },
  ],
  organizations: [
    {
      id: 'organization-1',
      name: 'Acme Events',
      addressId: '',
      street: '',
      streetNumber: '',
      city: 'Berlin',
      postalCode: '',
      country: 'Germany',
      countryId: 'DE',
      taxId: '',
      krs: '',
      createdAt: iso,
      updatedAt: iso,
    },
  ],
  events: [],
  addresses: [],
  addressLinks: [],
  phoneNumbers: [],
  phoneNumberLinks: [],
  emails: [
    {
      id: 'email-1',
      email: 'jan@example.com',
      status: 'active',
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: 'email-2',
      email: 'hello@acme.test',
      status: 'active',
      createdAt: iso,
      updatedAt: iso,
    },
  ],
  emailLinks: [
    {
      id: 'email-link-person',
      emailId: 'email-1',
      partyKind: 'person',
      partyId: 'person-1',
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: 'email-link-org',
      emailId: 'email-2',
      partyKind: 'organization',
      partyId: 'organization-1',
      createdAt: iso,
      updatedAt: iso,
    },
  ],
  eventOrganizationLinks: [],
});

const createCampaign = (overrides?: Partial<FilemakerEmailCampaign>): FilemakerEmailCampaign =>
  createFilemakerEmailCampaign({
    id: 'campaign-1',
    name: 'Expo outreach',
    status: 'active',
    subject: 'Hello from Filemaker',
    bodyText: 'We would like to invite you.',
    audience: {
      partyKinds: ['person', 'organization'],
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
    createdAt: iso,
    updatedAt: iso,
    ...overrides,
  });

const createRuntimeHarness = (input?: {
  campaign?: FilemakerEmailCampaign;
  sendCampaignEmail?: ReturnType<typeof vi.fn>;
  suppressions?: FilemakerEmailCampaignSuppressionRegistry;
}) => {
  const store = new Map<string, string>([
    [
      FILEMAKER_DATABASE_KEY,
      JSON.stringify(toPersistedFilemakerDatabase(createDatabase())),
    ],
    [
      FILEMAKER_EMAIL_CAMPAIGNS_KEY,
      JSON.stringify({
        version: 1,
        campaigns: [input?.campaign ?? createCampaign()],
      }),
    ],
    [FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY, JSON.stringify({ version: 1, runs: [] })],
    [
      FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
      JSON.stringify({ version: 1, deliveries: [] }),
    ],
    [FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY, JSON.stringify({ version: 1, events: [] })],
    [
      FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
      JSON.stringify(input?.suppressions ?? { version: 1, entries: [] }),
    ],
  ]);

  const sendCampaignEmail =
    input?.sendCampaignEmail ??
    vi.fn().mockResolvedValue({
      provider: 'smtp',
      providerMessage: 'Sent through SMTP.',
      sentAt: iso,
    });

  const service = createFilemakerCampaignRuntimeService({
    readSettingValue: async (key: string) => store.get(key) ?? null,
    upsertSettingValue: async (key: string, value: string) => {
      store.set(key, value);
      return true;
    },
    sendCampaignEmail,
    now: () => new Date(iso),
  });

  return {
    store,
    service,
    sendCampaignEmail,
  };
};

describe('filemaker campaign runtime service', () => {
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

  it('creates a live run with queued deliveries in persisted settings', async () => {
    const { service, store } = createRuntimeHarness();

    const result = await service.launchRun({
      campaignId: 'campaign-1',
      mode: 'live',
    });

    expect(result.run.status).toBe('queued');
    expect(result.queuedDeliveryCount).toBe(2);

    const storedCampaigns = parseFilemakerEmailCampaignRegistry(
      store.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY)
    );
    const storedRuns = parseFilemakerEmailCampaignRunRegistry(
      store.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY)
    );
    const storedDeliveries = parseFilemakerEmailCampaignDeliveryRegistry(
      store.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY)
    );
    const storedEvents = parseFilemakerEmailCampaignEventRegistry(
      store.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY)
    );

    expect(storedCampaigns.campaigns[0]?.lastLaunchedAt).toBe(iso);
    expect(storedRuns.runs).toHaveLength(1);
    expect(storedRuns.runs[0]?.status).toBe('queued');
    expect(storedDeliveries.deliveries).toHaveLength(2);
    expect(
      storedDeliveries.deliveries.every((delivery) => delivery.status === 'queued')
    ).toBe(true);
    expect(storedEvents.events[0]).toEqual(
      expect.objectContaining({
        campaignId: 'campaign-1',
        runId: result.run.id,
        type: 'launched',
        runStatus: 'queued',
      })
    );
  });

  it('processes queued deliveries into sent records and completes the run', async () => {
    const { service, store, sendCampaignEmail } = createRuntimeHarness();
    const launched = await service.launchRun({
      campaignId: 'campaign-1',
      mode: 'live',
    });

    const processed = await service.processRun({
      runId: launched.run.id,
    });

    expect(sendCampaignEmail).toHaveBeenCalledTimes(2);
    expect(processed.run.status).toBe('completed');
    expect(processed.progress.sentCount).toBe(2);
    expect(processed.progress.failedCount).toBe(0);

    const storedRuns = parseFilemakerEmailCampaignRunRegistry(
      store.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY)
    );
    const storedDeliveries = parseFilemakerEmailCampaignDeliveryRegistry(
      store.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY)
    );
    const storedEvents = parseFilemakerEmailCampaignEventRegistry(
      store.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY)
    );

    expect(storedRuns.runs[0]?.status).toBe('completed');
    expect(
      storedDeliveries.deliveries.every((delivery) => delivery.status === 'sent')
    ).toBe(true);
    expect(storedEvents.events.some((event) => event.type === 'processing_started')).toBe(true);
    expect(
      storedEvents.events.filter((event) => event.type === 'delivery_sent')
    ).toHaveLength(2);
    expect(storedEvents.events.some((event) => event.type === 'completed')).toBe(true);
  });

  it('expands signed unsubscribe, preferences, address-wide preferences, open tracking, and click tracking placeholders per recipient before sending', async () => {
    process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET'] = 'unsubscribe-secret';
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://app.example.com';

    const { service, sendCampaignEmail } = createRuntimeHarness({
      campaign: createCampaign({
        bodyText:
          'To opt out visit {{unsubscribe_url}}, manage delivery at {{preferences_url}}, manage all campaigns at {{manage_all_preferences_url}}, or reply from {{email}}. Open telemetry: {{open_tracking_url}}. CTA: {{click_tracking_url:https://destination.example.com/offer}}',
        bodyHtml:
          '<p>To opt out visit <a href="{{unsubscribe_url}}">unsubscribe</a>, <a href="{{preferences_url}}">preferences</a>, or <a href="{{manage_all_preferences_url}}">manage all</a>.</p><p>{{email}}</p><a href="{{click_tracking_url:https://destination.example.com/offer}}">CTA</a><div>{{open_tracking_pixel}}</div>',
      }),
    });
    const launched = await service.launchRun({
      campaignId: 'campaign-1',
      mode: 'live',
    });

    await service.processRun({
      runId: launched.run.id,
    });

    const firstCall = sendCampaignEmail.mock.calls[0]?.[0];
    expect(firstCall?.text).toContain('https://app.example.com/filemaker/unsubscribe?token=');
    expect(firstCall?.text).toContain('https://app.example.com/filemaker/preferences?token=');
    expect(firstCall?.text).toContain('manage all campaigns at https://app.example.com/filemaker/preferences?token=');
    expect(firstCall?.text).toContain('https://app.example.com/api/filemaker/campaigns/open?token=');
    expect(firstCall?.text).toContain('https://app.example.com/api/filemaker/campaigns/click?token=');
    expect(firstCall?.text).toContain('jan@example.com');
    expect(firstCall?.text).not.toContain('{{unsubscribe_url}}');
    expect(firstCall?.text).not.toContain('{{preferences_url}}');
    expect(firstCall?.text).not.toContain('{{manage_all_preferences_url}}');
    expect(firstCall?.text).not.toContain('{{open_tracking_url}}');
    expect(firstCall?.text).not.toContain('{{click_tracking_url:');
    expect(firstCall?.html).toContain('https://app.example.com/filemaker/unsubscribe?token=');
    expect(firstCall?.html).toContain('https://app.example.com/filemaker/preferences?token=');
    expect(firstCall?.html).toContain('https://app.example.com/api/filemaker/campaigns/open?token=');
    expect(firstCall?.html).toContain('https://app.example.com/api/filemaker/campaigns/click?token=');
    expect(firstCall?.html).toContain('<img src="https://app.example.com/api/filemaker/campaigns/open?token=');
    expect(firstCall?.html).toContain('jan@example.com');
    expect(firstCall?.html).not.toContain('{{unsubscribe_url}}');
    expect(firstCall?.html).not.toContain('{{preferences_url}}');
    expect(firstCall?.html).not.toContain('{{manage_all_preferences_url}}');
    expect(firstCall?.html).not.toContain('{{open_tracking_pixel}}');
    expect(firstCall?.html).not.toContain('{{click_tracking_url:');
    const unsubscribeUrl = firstCall?.text.match(
      /https:\/\/app\.example\.com\/filemaker\/unsubscribe\?token=[^\s,]+/
    )?.[0];
    expect(unsubscribeUrl).toBeTruthy();
    const token = unsubscribeUrl
      ? new URL(unsubscribeUrl).searchParams.get('token')
      : null;
    expect(parseFilemakerCampaignUnsubscribeToken(token, Date.parse(iso))).toEqual(
      expect.objectContaining({
        emailAddress: 'jan@example.com',
        campaignId: launched.run.campaignId,
        runId: launched.run.id,
        deliveryId: launched.deliveries[0]?.id ?? null,
      })
    );
    const preferencesUrl = firstCall?.text.match(
      /https:\/\/app\.example\.com\/filemaker\/preferences\?token=[^\s,]+/
    )?.[0];
    expect(preferencesUrl).toBeTruthy();
    const preferencesToken = preferencesUrl
      ? new URL(preferencesUrl).searchParams.get('token')
      : null;
    expect(parseFilemakerCampaignUnsubscribeToken(preferencesToken, Date.parse(iso))).toEqual(
      expect.objectContaining({
        emailAddress: 'jan@example.com',
        campaignId: launched.run.campaignId,
        runId: launched.run.id,
        deliveryId: launched.deliveries[0]?.id ?? null,
        redirectTo: null,
        scope: 'campaign',
      })
    );
    const allPreferencesUrls =
      firstCall?.text.match(/https:\/\/app\.example\.com\/filemaker\/preferences\?token=[^\s,]+/g) ??
      [];
    expect(allPreferencesUrls).toHaveLength(2);
    const allPreferencesToken = new URL(allPreferencesUrls[1] ?? '').searchParams.get('token');
    expect(parseFilemakerCampaignUnsubscribeToken(allPreferencesToken, Date.parse(iso))).toEqual(
      expect.objectContaining({
        emailAddress: 'jan@example.com',
        campaignId: launched.run.campaignId,
        runId: launched.run.id,
        deliveryId: launched.deliveries[0]?.id ?? null,
        redirectTo: null,
        scope: 'all_campaigns',
      })
    );
    const openTrackingUrl = firstCall?.text.match(
      /https:\/\/app\.example\.com\/api\/filemaker\/campaigns\/open\?token=[^\s]+/
    )?.[0];
    expect(openTrackingUrl).toBeTruthy();
    const openToken = openTrackingUrl ? new URL(openTrackingUrl).searchParams.get('token') : null;
    expect(parseFilemakerCampaignUnsubscribeToken(openToken, Date.parse(iso))).toEqual(
      expect.objectContaining({
        emailAddress: 'jan@example.com',
        campaignId: launched.run.campaignId,
        runId: launched.run.id,
        deliveryId: launched.deliveries[0]?.id ?? null,
        redirectTo: null,
      })
    );
    const clickTrackingUrl = firstCall?.text.match(
      /https:\/\/app\.example\.com\/api\/filemaker\/campaigns\/click\?token=[^\s]+/
    )?.[0];
    expect(clickTrackingUrl).toBeTruthy();
    const clickToken = clickTrackingUrl ? new URL(clickTrackingUrl).searchParams.get('token') : null;
    expect(parseFilemakerCampaignUnsubscribeToken(clickToken, Date.parse(iso))).toEqual(
      expect.objectContaining({
        emailAddress: 'jan@example.com',
        campaignId: launched.run.campaignId,
        runId: launched.run.id,
        deliveryId: launched.deliveries[0]?.id ?? null,
        redirectTo: 'https://destination.example.com/offer',
      })
    );
  });

  it('excludes suppressed addresses when creating a live run', async () => {
    const { service } = createRuntimeHarness({
      suppressions: {
        version: 1,
        entries: [
          {
            id: 'suppression-1',
            emailAddress: 'hello@acme.test',
            reason: 'manual_block',
            actor: 'admin',
            notes: null,
            campaignId: null,
            runId: null,
            deliveryId: null,
            createdAt: iso,
            updatedAt: iso,
          },
        ],
      },
    });

    const result = await service.launchRun({
      campaignId: 'campaign-1',
      mode: 'live',
    });

    expect(result.queuedDeliveryCount).toBe(1);
    expect(result.deliveries).toHaveLength(1);
    expect(result.deliveries[0]?.emailAddress).toBe('jan@example.com');
  });

  it('pauses the campaign when the configured bounce threshold is exceeded', async () => {
    const sendCampaignEmail = vi
      .fn()
      .mockRejectedValueOnce(
        new FilemakerCampaignEmailDeliveryError({
          message: '550 mailbox unavailable hard bounce from SMTP provider.',
          provider: 'smtp',
          failureCategory: 'hard_bounce',
        })
      )
      .mockResolvedValueOnce({
        provider: 'smtp',
        providerMessage: 'Sent through SMTP.',
        sentAt: iso,
      });
    const { service, store } = createRuntimeHarness({
      campaign: createCampaign({
        launch: {
          mode: 'manual',
          scheduledAt: null,
          recurring: null,
          minAudienceSize: 1,
          requireApproval: false,
          onlyWeekdays: false,
          allowedHourStart: null,
          allowedHourEnd: null,
          pauseOnBounceRatePercent: 40,
          timezone: 'UTC',
        },
      }),
      sendCampaignEmail,
    });
    const launched = await service.launchRun({
      campaignId: 'campaign-1',
      mode: 'live',
    });

    const processed = await service.processRun({
      runId: launched.run.id,
    });

    expect(processed.progress.bouncedCount).toBe(1);

    const storedCampaigns = parseFilemakerEmailCampaignRegistry(
      store.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY)
    );
    const storedDeliveries = parseFilemakerEmailCampaignDeliveryRegistry(
      store.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY)
    );
    const storedEvents = parseFilemakerEmailCampaignEventRegistry(
      store.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY)
    );
    const storedSuppressions = parseFilemakerEmailCampaignSuppressionRegistry(
      store.get(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY)
    );

    expect(storedCampaigns.campaigns[0]?.status).toBe('paused');
    expect(storedDeliveries.deliveries.some((delivery) => delivery.status === 'bounced')).toBe(
      true
    );
    expect(storedDeliveries.deliveries[0]).toEqual(
      expect.objectContaining({
        status: 'bounced',
        provider: 'smtp',
        failureCategory: 'hard_bounce',
      })
    );
    expect(storedEvents.events.some((event) => event.type === 'delivery_bounced')).toBe(true);
    expect(storedEvents.events.some((event) => event.type === 'paused')).toBe(true);
    expect(storedSuppressions.entries).toHaveLength(1);
    expect(storedSuppressions.entries[0]).toEqual(
      expect.objectContaining({
        emailAddress: 'jan@example.com',
        reason: 'bounced',
      })
    );
  });
});
