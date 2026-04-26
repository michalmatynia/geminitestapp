import { describe, expect, it } from 'vitest';

import {
  buildFilemakerEmailCampaignDeliveriesForPreview,
  createDatabase,
  createFilemakerEmailCampaign,
  createFilemakerEmailCampaignEvent,
  createFilemakerEmailCampaignRun,
  createFilemakerEmailCampaignSuppressionEntry,
  evaluateFilemakerEmailCampaignLaunch,
  iso,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  resolveFilemakerEmailCampaignAudiencePreview,
  resolveFilemakerEmailCampaignRunStatusFromDeliveries,
  summarizeFilemakerEmailCampaignRunDeliveries,
  syncFilemakerEmailCampaignRunWithDeliveries,
} from './campaigns.test-support';

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
            mailAccountId: '  sales-account  ',
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
        mailAccountId: 'sales-account',
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

  it('filters organization audiences by legacy demand value conditions', () => {
    const database = {
      ...createDatabase(),
      values: [
        {
          id: 'value-market',
          parentId: null,
          label: 'Market',
          value: 'market',
          sortOrder: 1,
          legacyUuid: 'LEGACY-MARKET',
          createdAt: iso,
          updatedAt: iso,
        },
        {
          id: 'value-food',
          parentId: 'value-market',
          label: 'Food vendors',
          value: 'food-vendors',
          sortOrder: 2,
          legacyUuid: 'LEGACY-FOOD',
          createdAt: iso,
          updatedAt: iso,
        },
      ],
      organizationLegacyDemands: [
        {
          id: 'demand-1',
          organizationId: 'organization-1',
          valueIds: ['value-market', 'value-food'],
          legacyUuid: 'LEGACY-DEMAND-1',
          createdAt: iso,
          updatedAt: iso,
        },
      ],
    };
    const campaign = createFilemakerEmailCampaign({
      id: 'campaign-demand',
      name: 'Demand targeting',
      status: 'active',
      subject: 'Food vendor outreach',
      audience: {
        partyKinds: ['organization'],
        emailStatuses: ['active'],
        includePartyReferences: [],
        excludePartyReferences: [],
        conditionGroup: {
          id: 'group-demand',
          type: 'group',
          combinator: 'and',
          children: [
            {
              id: 'condition-demand',
              type: 'condition',
              field: 'organization.demandValueId',
              operator: 'equals',
              value: 'value-food',
            },
          ],
        },
        organizationIds: [],
        eventIds: [],
        countries: [],
        cities: [],
        dedupeByEmail: true,
        limit: null,
      },
    });

    const preview = resolveFilemakerEmailCampaignAudiencePreview(database, campaign.audience);

    expect(preview.recipients).toHaveLength(1);
    expect(preview.recipients[0]?.partyId).toBe('organization-1');
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
});
