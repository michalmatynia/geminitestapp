import { describe, expect, it } from 'vitest';

import {
  buildFilemakerEmailCampaignDeliveriesForPreview,
  createFilemakerEmailCampaign,
  createFilemakerEmailCampaignEvent,
  createFilemakerEmailCampaignSuppressionEntry,
  createFilemakerEmailCampaignRun,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  resolveFilemakerEmailCampaignAudiencePreview,
  resolveFilemakerEmailCampaignRunStatusFromDeliveries,
  summarizeFilemakerEmailCampaignAnalytics,
  summarizeFilemakerEmailCampaignRunDeliveries,
  syncFilemakerEmailCampaignRunWithDeliveries,
  evaluateFilemakerEmailCampaignLaunch,
} from '@/features/filemaker/settings';

import type { FilemakerDatabase } from '@/features/filemaker/types';

const iso = '2026-03-27T10:00:00.000Z';

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
  events: [
    {
      id: 'event-1',
      eventName: 'Expo 2026',
      addressId: '',
      street: '',
      streetNumber: '',
      city: 'Berlin',
      postalCode: '',
      country: 'Germany',
      countryId: 'DE',
      createdAt: iso,
      updatedAt: iso,
    },
  ],
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
    {
      id: 'email-3',
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
      id: 'email-link-org-primary',
      emailId: 'email-2',
      partyKind: 'organization',
      partyId: 'organization-1',
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: 'email-link-org-duplicate',
      emailId: 'email-3',
      partyKind: 'organization',
      partyId: 'organization-1',
      createdAt: iso,
      updatedAt: iso,
    },
  ],
  eventOrganizationLinks: [
    {
      id: 'event-org-1',
      eventId: 'event-1',
      organizationId: 'organization-1',
      createdAt: iso,
      updatedAt: iso,
    },
  ],
});

describe('filemaker campaign settings', () => {
  it('normalizes campaign registries and keeps a default audience/launch contract', () => {
    const registry = parseFilemakerEmailCampaignRegistry(
      JSON.stringify({
        version: 99,
        campaigns: [
          {
            id: 'campaign-1',
            name: ' Spring Expo ',
            status: 'ACTIVE',
            subject: 'Join us',
            audience: {
              partyKinds: ['organization'],
              emailStatuses: ['active'],
              dedupeByEmail: false,
            },
            launch: {
              mode: 'scheduled',
              scheduledAt: '2026-04-10T09:00',
              minAudienceSize: 25,
              requireApproval: true,
            },
          },
        ],
      })
    );

    expect(registry.version).toBe(1);
    expect(registry.campaigns[0]).toEqual(
      expect.objectContaining({
        name: 'Spring Expo',
        status: 'active',
        subject: 'Join us',
        audience: expect.objectContaining({
          partyKinds: ['organization'],
          emailStatuses: ['active'],
          dedupeByEmail: false,
          includePartyReferences: [],
        }),
        launch: expect.objectContaining({
          mode: 'scheduled',
          scheduledAt: '2026-04-10T09:00',
          minAudienceSize: 25,
          requireApproval: true,
          onlyWeekdays: false,
        }),
      })
    );
  });

  it('resolves audience previews from persons, organizations, events, and dedupe rules', () => {
    const database = createDatabase();
    const campaign = createFilemakerEmailCampaign({
      id: 'campaign-1',
      name: 'Expo outreach',
      status: 'active',
      subject: 'Expo hello',
      audience: {
        partyKinds: ['organization'],
        emailStatuses: ['active'],
        includePartyReferences: [],
        excludePartyReferences: [],
        organizationIds: [],
        eventIds: ['event-1'],
        countries: ['Germany'],
        cities: ['Berlin'],
        dedupeByEmail: true,
        limit: null,
      },
    });

    const preview = resolveFilemakerEmailCampaignAudiencePreview(database, campaign.audience);

    expect(preview.totalLinkedEmailCount).toBe(3);
    expect(preview.recipients).toHaveLength(1);
    expect(preview.suppressedCount).toBe(0);
    expect(preview.dedupedCount).toBe(1);
    expect(preview.recipients[0]).toEqual(
      expect.objectContaining({
        partyKind: 'organization',
        partyId: 'organization-1',
        email: 'hello@acme.test',
        country: 'Germany',
        city: 'Berlin',
        matchedEventIds: ['event-1'],
      })
    );
  });

  it('evaluates launch blockers for inactive, approval-gated, and future-scheduled campaigns', () => {
    const database = createDatabase();
    const campaign = createFilemakerEmailCampaign({
      id: 'campaign-2',
      name: 'Blocked launch',
      status: 'draft',
      subject: 'Pending',
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
        mode: 'scheduled',
        scheduledAt: '2026-04-01T09:00:00.000Z',
        recurring: null,
        minAudienceSize: 2,
        requireApproval: true,
        onlyWeekdays: true,
        allowedHourStart: 9,
        allowedHourEnd: 17,
        pauseOnBounceRatePercent: 5,
        timezone: 'UTC',
      },
    });

    const preview = resolveFilemakerEmailCampaignAudiencePreview(database, campaign.audience);
    const evaluation = evaluateFilemakerEmailCampaignLaunch(
      campaign,
      preview,
      new Date('2026-03-27T04:00:00.000Z')
    );

    expect(evaluation.isEligible).toBe(false);
    expect(evaluation.blockers).toContain('Campaign must be active before it can launch.');
    expect(evaluation.blockers).toContain('Campaign launch requires approval.');
    expect(evaluation.blockers).toContain(
      'Audience preview has 1 recipients, below the minimum of 2.'
    );
    expect(evaluation.blockers).toContain('Campaign is outside of the allowed launch hours.');
    expect(evaluation.blockers).toContain('Campaign is scheduled for a future time.');
    expect(evaluation.nextEligibleAt).toBe('2026-04-01T09:00:00.000Z');
  });

  it('excludes suppressed email addresses from the audience preview', () => {
    const database = createDatabase();
    const campaign = createFilemakerEmailCampaign({
      id: 'campaign-suppressed',
      name: 'Suppression aware',
      status: 'active',
      subject: 'Hello',
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
    });

    const suppressionRegistry = parseFilemakerEmailCampaignSuppressionRegistry(
      JSON.stringify({
        version: 1,
        entries: [
          createFilemakerEmailCampaignSuppressionEntry({
            emailAddress: 'hello@acme.test',
            reason: 'unsubscribed',
            actor: 'admin',
            createdAt: iso,
            updatedAt: iso,
          }),
        ],
      })
    );

    const preview = resolveFilemakerEmailCampaignAudiencePreview(
      database,
      campaign.audience,
      suppressionRegistry
    );

    expect(preview.totalLinkedEmailCount).toBe(3);
    expect(preview.recipients).toHaveLength(1);
    expect(preview.recipients[0]?.email).toBe('jan@example.com');
    expect(preview.suppressedCount).toBe(2);
    expect(preview.excludedCount).toBe(2);
  });

  it('keeps nullable launch and recurring hour controls as null instead of coercing them to zero', () => {
    const campaign = createFilemakerEmailCampaign({
      id: 'campaign-3',
      name: 'Null window campaign',
      status: 'active',
      subject: 'Window test',
      launch: {
        mode: 'manual',
        scheduledAt: null,
        recurring: {
          frequency: 'weekly',
          interval: 1,
          weekdays: [1, 2, 3, 4, 5],
          hourStart: null,
          hourEnd: null,
        },
        minAudienceSize: 1,
        requireApproval: false,
        onlyWeekdays: false,
        allowedHourStart: null,
        allowedHourEnd: null,
        pauseOnBounceRatePercent: null,
        timezone: 'UTC',
      },
    });

    expect(campaign.launch.allowedHourStart).toBeNull();
    expect(campaign.launch.allowedHourEnd).toBeNull();
    expect(campaign.launch.pauseOnBounceRatePercent).toBeNull();
    expect(campaign.launch.recurring?.hourStart).toBeNull();
    expect(campaign.launch.recurring?.hourEnd).toBeNull();
  });

  it('normalizes and sorts run registries', () => {
    const runRegistry = parseFilemakerEmailCampaignRunRegistry(
      JSON.stringify({
        version: 3,
        runs: [
          {
            id: 'run-older',
            campaignId: 'campaign-1',
            mode: 'live',
            status: 'running',
            recipientCount: 20,
            deliveredCount: 5,
            failedCount: 1,
            skippedCount: 0,
            createdAt: '2026-03-25T10:00:00.000Z',
          },
          createFilemakerEmailCampaignRun({
            id: 'run-newer',
            campaignId: 'campaign-1',
            mode: 'dry_run',
            status: 'completed',
            recipientCount: 12,
            deliveredCount: 0,
            failedCount: 0,
            skippedCount: 12,
            createdAt: '2026-03-27T10:00:00.000Z',
          }),
        ],
      })
    );

    expect(runRegistry.version).toBe(1);
    expect(runRegistry.runs.map((run) => run.id)).toEqual(['run-newer', 'run-older']);
    expect(runRegistry.runs[0]).toEqual(
      expect.objectContaining({
        mode: 'dry_run',
        status: 'completed',
        skippedCount: 12,
      })
    );
  });

  it('normalizes delivery registries and syncs run metrics from recipient delivery states', () => {
    const preview = {
      recipients: [
        {
          emailId: 'email-1',
          email: 'jan@example.com',
          emailStatus: 'active' as const,
          partyKind: 'person' as const,
          partyId: 'person-1',
          partyName: 'Jan Kowalski',
          city: 'Warsaw',
          country: 'Poland',
          matchedEventIds: [],
        },
        {
          emailId: 'email-2',
          email: 'hello@acme.test',
          emailStatus: 'active' as const,
          partyKind: 'organization' as const,
          partyId: 'organization-1',
          partyName: 'Acme Events',
          city: 'Berlin',
          country: 'Germany',
          matchedEventIds: ['event-1'],
        },
      ],
      excludedCount: 0,
      dedupedCount: 0,
      totalLinkedEmailCount: 2,
      sampleRecipients: [],
    };

    const deliveries = buildFilemakerEmailCampaignDeliveriesForPreview({
      campaignId: 'campaign-1',
      runId: 'run-1',
      preview,
      mode: 'live',
    }).map((delivery, index) =>
      index === 0
        ? { ...delivery, status: 'sent' as const, sentAt: '2026-03-27T10:05:00.000Z' }
        : { ...delivery, status: 'failed' as const, lastError: 'Mailbox rejected the message.' }
    );

    const deliveryRegistry = parseFilemakerEmailCampaignDeliveryRegistry(
      JSON.stringify({
        version: 7,
        deliveries,
      })
    );
    const metrics = summarizeFilemakerEmailCampaignRunDeliveries(deliveryRegistry.deliveries);
    const syncedRun = syncFilemakerEmailCampaignRunWithDeliveries({
      run: createFilemakerEmailCampaignRun({
        id: 'run-1',
        campaignId: 'campaign-1',
        mode: 'live',
        status: 'running',
        recipientCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        skippedCount: 0,
      }),
      deliveries: deliveryRegistry.deliveries,
    });

    expect(deliveryRegistry.version).toBe(1);
    expect(metrics).toEqual({
      recipientCount: 2,
      deliveredCount: 1,
      failedCount: 1,
      skippedCount: 0,
    });
    expect(resolveFilemakerEmailCampaignRunStatusFromDeliveries({
      currentStatus: 'running',
      deliveries: deliveryRegistry.deliveries,
    })).toBe('completed');
    expect(syncedRun).toEqual(
      expect.objectContaining({
        status: 'completed',
        recipientCount: 2,
        deliveredCount: 1,
        failedCount: 1,
        skippedCount: 0,
      })
    );
  });

  it('normalizes campaign event registries and keeps the newest events first', () => {
    const registry = parseFilemakerEmailCampaignEventRegistry(
      JSON.stringify({
        version: 7,
        events: [
          createFilemakerEmailCampaignEvent({
            id: 'event-older',
            campaignId: 'campaign-1',
            runId: 'run-1',
            type: 'launched',
            message: 'Campaign launched.',
            createdAt: '2026-03-26T09:00:00.000Z',
            updatedAt: '2026-03-26T09:00:00.000Z',
          }),
          {
            id: 'event-newer',
            campaignId: 'campaign-1',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            type: 'DELIVERY_SENT',
            message: ' Delivery sent to jan@example.com. ',
            deliveryStatus: 'sent',
            createdAt: '2026-03-27T09:00:00.000Z',
            updatedAt: '2026-03-27T09:00:00.000Z',
          },
        ],
      })
    );

    expect(registry.version).toBe(1);
    expect(registry.events.map((event) => event.id)).toEqual(['event-newer', 'event-older']);
    expect(registry.events[0]).toEqual(
      expect.objectContaining({
        type: 'delivery_sent',
        message: 'Delivery sent to jan@example.com.',
        deliveryStatus: 'sent',
      })
    );
  });

  it('normalizes suppression registries and keeps one entry per address', () => {
    const registry = parseFilemakerEmailCampaignSuppressionRegistry(
      JSON.stringify({
        version: 9,
        entries: [
          {
            id: 'suppression-older',
            emailAddress: 'blocked@example.com',
            reason: 'manual_block',
            actor: 'admin',
            createdAt: '2026-03-26T09:00:00.000Z',
            updatedAt: '2026-03-26T09:00:00.000Z',
          },
          {
            id: 'suppression-newer',
            emailAddress: 'BLOCKED@example.com',
            reason: 'unsubscribed',
            actor: 'admin',
            createdAt: '2026-03-27T09:00:00.000Z',
            updatedAt: '2026-03-27T09:00:00.000Z',
          },
        ],
      })
    );

    expect(registry.version).toBe(1);
    expect(registry.entries).toHaveLength(1);
    expect(registry.entries[0]).toEqual(
      expect.objectContaining({
        emailAddress: 'blocked@example.com',
        reason: 'unsubscribed',
      })
    );
  });

  it('summarizes campaign analytics from runs, deliveries, events, and suppression impact', () => {
    const campaign = createFilemakerEmailCampaign({
      id: 'campaign-analytics',
      name: 'Analytics campaign',
      status: 'active',
      subject: 'Campaign analytics',
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
    });
    const database = createDatabase();
    const runRegistry = parseFilemakerEmailCampaignRunRegistry(
      JSON.stringify({
        version: 1,
        runs: [
          {
            id: 'run-1',
            campaignId: 'campaign-analytics',
            mode: 'live',
            status: 'completed',
            recipientCount: 2,
            deliveredCount: 1,
            failedCount: 1,
            skippedCount: 0,
            createdAt: '2026-03-27T10:00:00.000Z',
            updatedAt: '2026-03-27T10:30:00.000Z',
          },
          {
            id: 'run-2',
            campaignId: 'campaign-analytics',
            mode: 'dry_run',
            status: 'completed',
            recipientCount: 1,
            deliveredCount: 0,
            failedCount: 0,
            skippedCount: 1,
            createdAt: '2026-03-28T10:00:00.000Z',
            updatedAt: '2026-03-28T10:05:00.000Z',
          },
        ],
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
            createdAt: '2026-03-27T10:00:00.000Z',
            updatedAt: '2026-03-27T10:10:00.000Z',
          },
          {
            id: 'delivery-2',
            campaignId: 'campaign-analytics',
            runId: 'run-1',
            emailId: 'email-2',
            emailAddress: 'hello@acme.test',
            partyKind: 'organization',
            partyId: 'organization-1',
            status: 'bounced',
            createdAt: '2026-03-27T10:00:00.000Z',
            updatedAt: '2026-03-27T10:20:00.000Z',
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
            id: 'event-1',
            campaignId: 'campaign-analytics',
            runId: 'run-1',
            type: 'launched',
            message: 'Live launch',
            createdAt: '2026-03-27T10:00:00.000Z',
            updatedAt: '2026-03-27T10:00:00.000Z',
          },
          {
            id: 'event-2',
            campaignId: 'campaign-analytics',
            runId: 'run-2',
            type: 'completed',
            message: 'Dry run completed',
            createdAt: '2026-03-28T10:06:00.000Z',
            updatedAt: '2026-03-28T10:06:00.000Z',
          },
        ],
      })
    );
    const suppressionRegistry = parseFilemakerEmailCampaignSuppressionRegistry(
      JSON.stringify({
        version: 1,
        entries: [
          createFilemakerEmailCampaignSuppressionEntry({
            emailAddress: 'hello@acme.test',
            reason: 'bounced',
            actor: 'system',
            createdAt: '2026-03-27T10:20:00.000Z',
            updatedAt: '2026-03-27T10:20:00.000Z',
          }),
        ],
      })
    );

    const analytics = summarizeFilemakerEmailCampaignAnalytics({
      campaign,
      database,
      runRegistry,
      deliveryRegistry,
      eventRegistry,
      suppressionRegistry,
    });

    expect(analytics).toEqual(
      expect.objectContaining({
        totalRuns: 2,
        liveRunCount: 1,
        dryRunCount: 1,
        totalRecipients: 3,
        processedCount: 3,
        sentCount: 1,
        failedCount: 0,
        bouncedCount: 1,
        skippedCount: 1,
        completionRatePercent: 100,
        deliveryRatePercent: 33.3,
        failureRatePercent: 33.3,
        bounceRatePercent: 33.3,
        suppressionImpactCount: 2,
        latestRunStatus: 'completed',
        latestRunAt: '2026-03-28T10:00:00.000Z',
        latestActivityAt: '2026-03-28T10:06:00.000Z',
        eventCount: 2,
      })
    );
  });
});
