import { describe, expect, it, vi } from 'vitest';

import {
  createFilemakerEmailCampaign,
  createFilemakerEmailCampaignDelivery,
  createFilemakerEmailCampaignDeliveryAttempt,
  createFilemakerEmailCampaignRun,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  toPersistedFilemakerDatabase,
} from '@/features/filemaker/settings';
import {
  createFilemakerEmailCampaignSchedulerService,
  resolveDueFilemakerEmailCampaigns,
} from '@/features/filemaker/server/filemakerEmailCampaignScheduler';
import { resolveDueFilemakerEmailCampaignRetryRuns } from '@/features/filemaker/server/campaign-retry-scheduler';
import { createDatabase } from './campaigns.test-support';

import type { FilemakerEmailCampaign } from '@/features/filemaker/types';

const baseIso = '2026-04-02T09:00:00.000Z';

const createCampaign = (overrides?: Partial<FilemakerEmailCampaign>): FilemakerEmailCampaign =>
  createFilemakerEmailCampaign({
    id: 'campaign-1',
    name: 'Spring launch',
    status: 'active',
    subject: 'Hello',
    bodyText: 'Body',
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
      mode: 'scheduled',
      scheduledAt: '2026-04-02T08:00:00.000Z',
      recurring: null,
      minAudienceSize: 1,
      requireApproval: false,
      onlyWeekdays: false,
      allowedHourStart: null,
      allowedHourEnd: null,
      pauseOnBounceRatePercent: null,
      timezone: 'UTC',
    },
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  });

describe('filemakerEmailCampaignScheduler', () => {
  it('resolves scheduled campaigns as due only until they have been launched', () => {
    const campaignRegistry = parseFilemakerEmailCampaignRegistry(
      JSON.stringify({
        version: 1,
        campaigns: [createCampaign()],
      })
    );
    const runRegistry = parseFilemakerEmailCampaignRunRegistry(
      JSON.stringify({ version: 1, runs: [] })
    );
    const suppressionRegistry = parseFilemakerEmailCampaignSuppressionRegistry(
      JSON.stringify({ version: 1, entries: [] })
    );

    const due = resolveDueFilemakerEmailCampaigns({
      campaignRegistry,
      runRegistry,
      suppressionRegistry,
      database: createDatabase(),
      now: new Date(baseIso),
    });

    expect(due.evaluatedCampaignCount).toBe(1);
    expect(due.dueCampaigns).toEqual([
      expect.objectContaining({
        campaignId: 'campaign-1',
        launchMode: 'scheduled',
        scheduleWindowKey: 'scheduled:1775116800000',
      }),
    ]);

    const launchedResolution = resolveDueFilemakerEmailCampaigns({
      campaignRegistry: parseFilemakerEmailCampaignRegistry(
        JSON.stringify({
          version: 1,
          campaigns: [
            createCampaign({
              lastLaunchedAt: '2026-04-02T08:30:00.000Z',
            }),
          ],
        })
      ),
      runRegistry,
      suppressionRegistry,
      database: createDatabase(),
      now: new Date(baseIso),
    });

    expect(launchedResolution.dueCampaigns).toHaveLength(0);
    expect(launchedResolution.skippedByReason).toEqual([
      { reason: 'scheduled-not-due', count: 1 },
    ]);
  });

  it('uses recurring cadence windows and blocks launches when a live run is already in progress', () => {
    const recurringCampaign = createCampaign({
      id: 'campaign-recurring',
      name: 'Recurring launch',
      createdAt: '2026-04-01T00:00:00.000Z',
      launch: {
        mode: 'recurring',
        scheduledAt: null,
        recurring: {
          frequency: 'daily',
          interval: 2,
          weekdays: [],
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
      lastLaunchedAt: '2026-04-02T09:00:00.000Z',
    });

    const due = resolveDueFilemakerEmailCampaigns({
      campaignRegistry: parseFilemakerEmailCampaignRegistry(
        JSON.stringify({ version: 1, campaigns: [recurringCampaign] })
      ),
      runRegistry: parseFilemakerEmailCampaignRunRegistry(
        JSON.stringify({ version: 1, runs: [] })
      ),
      suppressionRegistry: parseFilemakerEmailCampaignSuppressionRegistry(
        JSON.stringify({ version: 1, entries: [] })
      ),
      database: createDatabase(),
      now: new Date('2026-04-03T09:00:00.000Z'),
    });

    expect(due.dueCampaigns).toEqual([
      expect.objectContaining({
        campaignId: 'campaign-recurring',
        launchMode: 'recurring',
        scheduleWindowKey: 'recurring:daily:1',
      }),
    ]);

    const blockedByRun = resolveDueFilemakerEmailCampaigns({
      campaignRegistry: parseFilemakerEmailCampaignRegistry(
        JSON.stringify({ version: 1, campaigns: [recurringCampaign] })
      ),
      runRegistry: parseFilemakerEmailCampaignRunRegistry(
        JSON.stringify({
          version: 1,
          runs: [
            {
              id: 'run-active',
              campaignId: 'campaign-recurring',
              mode: 'live',
              status: 'queued',
              recipientCount: 2,
              deliveredCount: 0,
              failedCount: 0,
              skippedCount: 0,
              createdAt: '2026-04-03T08:59:00.000Z',
              updatedAt: '2026-04-03T08:59:00.000Z',
            },
          ],
        })
      ),
      suppressionRegistry: parseFilemakerEmailCampaignSuppressionRegistry(
        JSON.stringify({ version: 1, entries: [] })
      ),
      database: createDatabase(),
      now: new Date('2026-04-03T09:00:00.000Z'),
    });

    expect(blockedByRun.dueCampaigns).toHaveLength(0);
    expect(blockedByRun.skippedByReason).toEqual([
      { reason: 'live-run-in-progress', count: 1 },
    ]);
  });

  it('runs a scheduler tick, launches due campaigns, and keeps per-campaign failures isolated', async () => {
    const campaigns = [
      createCampaign({
        id: 'campaign-scheduled',
      }),
      createCampaign({
        id: 'campaign-recurring',
        launch: {
          mode: 'recurring',
          scheduledAt: null,
          recurring: {
            frequency: 'weekly',
            interval: 1,
            weekdays: [5],
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
      }),
    ];

    const store = new Map<string, string>([
      [
        FILEMAKER_DATABASE_KEY,
        JSON.stringify(toPersistedFilemakerDatabase(createDatabase())),
      ],
      [FILEMAKER_EMAIL_CAMPAIGNS_KEY, JSON.stringify({ version: 1, campaigns })],
      [FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY, JSON.stringify({ version: 1, runs: [] })],
      [FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY, JSON.stringify({ version: 1, entries: [] })],
    ]);
    const launchRunMock = vi
      .fn()
      .mockResolvedValueOnce({
        campaign: { id: 'campaign-scheduled' },
        run: { id: 'run-1' },
        deliveries: [],
        queuedDeliveryCount: 2,
      })
      .mockRejectedValueOnce(new Error('launch failed'));

    const service = createFilemakerEmailCampaignSchedulerService({
      now: () => new Date('2026-04-03T09:00:00.000Z'),
      readSettingValue: async (key: string) => store.get(key) ?? null,
      upsertSettingValue: async (key: string, value: string) => {
        store.set(key, value);
        return true;
      },
      launchRun: launchRunMock,
    });

    const result = await service.runTick();

    expect(launchRunMock).toHaveBeenNthCalledWith(1, {
      campaignId: 'campaign-scheduled',
      mode: 'live',
      launchReason: 'Automatically launched when the scheduled send window was reached.',
    });
    expect(launchRunMock).toHaveBeenNthCalledWith(2, {
      campaignId: 'campaign-recurring',
      mode: 'live',
      launchReason: 'Automatically launched from the recurring campaign window.',
    });
    expect(result.evaluatedCampaignCount).toBe(2);
    expect(result.dueCampaignCount).toBe(2);
    expect(result.launchedRuns).toEqual([
      {
        campaignId: 'campaign-scheduled',
        runId: 'run-1',
        queuedDeliveryCount: 2,
        launchMode: 'scheduled',
      },
    ]);
    expect(result.launchFailures).toEqual([
      {
        campaignId: 'campaign-recurring',
        message: 'launch failed',
      },
    ]);
    expect(result.dueRetryRuns).toEqual([]);
    expect(
      parseFilemakerEmailCampaignRegistry(store.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY)).campaigns.map(
        (campaign) => ({
          id: campaign.id,
          lastEvaluatedAt: campaign.lastEvaluatedAt,
        })
      )
    ).toEqual(
      expect.arrayContaining([
        { id: 'campaign-recurring', lastEvaluatedAt: '2026-04-03T09:00:00.000Z' },
        { id: 'campaign-scheduled', lastEvaluatedAt: '2026-04-03T09:00:00.000Z' },
      ])
    );
  });

  it('resolves due retry runs from failed deliveries whose retry time has arrived', () => {
    const run = createFilemakerEmailCampaignRun({
      id: 'run-retry',
      campaignId: 'campaign-1',
      mode: 'live',
      status: 'queued',
    });
    const dueDelivery = createFilemakerEmailCampaignDelivery({
      id: 'delivery-due',
      campaignId: 'campaign-1',
      runId: run.id,
      emailAddress: 'due@example.com',
      partyKind: 'person',
      partyId: 'person-due',
      status: 'failed',
      failureCategory: 'rate_limited',
      nextRetryAt: '2026-04-03T08:55:00.000Z',
    });
    const futureDelivery = createFilemakerEmailCampaignDelivery({
      id: 'delivery-future',
      campaignId: 'campaign-1',
      runId: run.id,
      emailAddress: 'future@example.com',
      partyKind: 'person',
      partyId: 'person-future',
      status: 'failed',
      failureCategory: 'rate_limited',
      nextRetryAt: '2026-04-03T09:30:00.000Z',
    });

    const dueRetryRuns = resolveDueFilemakerEmailCampaignRetryRuns({
      runsRaw: JSON.stringify({ version: 1, runs: [run] }),
      deliveriesRaw: JSON.stringify({
        version: 1,
        deliveries: [dueDelivery, futureDelivery],
      }),
      attemptsRaw: JSON.stringify({
        version: 1,
        attempts: [
          createFilemakerEmailCampaignDeliveryAttempt({
            id: 'attempt-due',
            campaignId: dueDelivery.campaignId,
            runId: dueDelivery.runId,
            deliveryId: dueDelivery.id,
            emailAddress: dueDelivery.emailAddress,
            partyKind: dueDelivery.partyKind,
            partyId: dueDelivery.partyId,
            attemptNumber: 1,
            status: 'failed',
            failureCategory: 'rate_limited',
          }),
          createFilemakerEmailCampaignDeliveryAttempt({
            id: 'attempt-future',
            campaignId: futureDelivery.campaignId,
            runId: futureDelivery.runId,
            deliveryId: futureDelivery.id,
            emailAddress: futureDelivery.emailAddress,
            partyKind: futureDelivery.partyKind,
            partyId: futureDelivery.partyId,
            attemptNumber: 1,
            status: 'failed',
            failureCategory: 'rate_limited',
          }),
        ],
      }),
      now: new Date('2026-04-03T09:00:00.000Z'),
    });

    expect(dueRetryRuns).toEqual([
      {
        campaignId: 'campaign-1',
        runId: 'run-retry',
        retryableDeliveryCount: 1,
        nextRetryAt: '2026-04-03T08:55:00.000Z',
      },
    ]);
  });

  it('includes due retry runs in scheduler tick results without relaunching campaigns', async () => {
    const campaign = createCampaign({
      lastLaunchedAt: '2026-04-02T08:30:00.000Z',
    });
    const run = createFilemakerEmailCampaignRun({
      id: 'run-retry',
      campaignId: campaign.id,
      mode: 'live',
      status: 'queued',
    });
    const delivery = createFilemakerEmailCampaignDelivery({
      id: 'delivery-due',
      campaignId: campaign.id,
      runId: run.id,
      emailAddress: 'due@example.com',
      partyKind: 'person',
      partyId: 'person-due',
      status: 'failed',
      failureCategory: 'timeout',
      nextRetryAt: '2026-04-03T08:55:00.000Z',
    });
    const store = new Map<string, string>([
      [
        FILEMAKER_DATABASE_KEY,
        JSON.stringify(toPersistedFilemakerDatabase(createDatabase())),
      ],
      [FILEMAKER_EMAIL_CAMPAIGNS_KEY, JSON.stringify({ version: 1, campaigns: [campaign] })],
      [FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY, JSON.stringify({ version: 1, runs: [run] })],
      [
        FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
        JSON.stringify({ version: 1, deliveries: [delivery] }),
      ],
      [
        FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
        JSON.stringify({
          version: 1,
          attempts: [
            createFilemakerEmailCampaignDeliveryAttempt({
              id: 'attempt-due',
              campaignId: delivery.campaignId,
              runId: delivery.runId,
              deliveryId: delivery.id,
              emailAddress: delivery.emailAddress,
              partyKind: delivery.partyKind,
              partyId: delivery.partyId,
              attemptNumber: 1,
              status: 'failed',
              failureCategory: 'timeout',
            }),
          ],
        }),
      ],
      [FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY, JSON.stringify({ version: 1, entries: [] })],
    ]);
    const launchRunMock = vi.fn();

    const service = createFilemakerEmailCampaignSchedulerService({
      now: () => new Date('2026-04-03T09:00:00.000Z'),
      readSettingValue: async (key: string) => store.get(key) ?? null,
      upsertSettingValue: async (key: string, value: string) => {
        store.set(key, value);
        return true;
      },
      launchRun: launchRunMock,
    });

    const result = await service.runTick();

    expect(launchRunMock).not.toHaveBeenCalled();
    expect(result.launchedRuns).toEqual([]);
    expect(result.dueRetryRuns).toEqual([
      {
        campaignId: campaign.id,
        runId: run.id,
        retryableDeliveryCount: 1,
        nextRetryAt: '2026-04-03T08:55:00.000Z',
      },
    ]);
  });
});
