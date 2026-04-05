import { describe, expect, it } from 'vitest';

import {
  createFilemakerEmailCampaign,
  parseFilemakerEmailCampaignSchedulerStatus,
  resolveFilemakerEmailCampaignNextAutomationAt,
} from '@/features/filemaker/settings';

import type { FilemakerEmailCampaign } from '@/features/filemaker/types';

const createCampaign = (overrides?: Partial<FilemakerEmailCampaign>): FilemakerEmailCampaign =>
  createFilemakerEmailCampaign({
    id: 'campaign-1',
    name: 'Automation test',
    status: 'active',
    subject: 'Hello',
    bodyText: 'Body',
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
      scheduledAt: '2026-04-05T12:00:00.000Z',
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

describe('filemaker campaign scheduling helpers', () => {
  it('returns the one-shot scheduled launch time until the campaign has launched', () => {
    const scheduledCampaign = createCampaign();

    expect(
      resolveFilemakerEmailCampaignNextAutomationAt(
        scheduledCampaign,
        new Date('2026-04-03T10:00:00.000Z')
      )
    ).toBe('2026-04-05T12:00:00.000Z');

    expect(
      resolveFilemakerEmailCampaignNextAutomationAt(
        createCampaign({
          lastLaunchedAt: '2026-04-05T12:05:00.000Z',
        }),
        new Date('2026-04-06T10:00:00.000Z')
      )
    ).toBeNull();
  });

  it('returns due-now and next-window times for recurring campaigns', () => {
    const recurringCampaign = createCampaign({
      launch: {
        mode: 'recurring',
        scheduledAt: null,
        recurring: {
          frequency: 'weekly',
          interval: 1,
          weekdays: [4],
          hourStart: 9,
          hourEnd: 10,
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

    expect(
      resolveFilemakerEmailCampaignNextAutomationAt(
        recurringCampaign,
        new Date('2026-04-02T07:15:00.000Z')
      )
    ).toBe('2026-04-02T07:15:00.000Z');

    expect(
      resolveFilemakerEmailCampaignNextAutomationAt(
        createCampaign({
          launch: recurringCampaign.launch,
          lastLaunchedAt: '2026-04-02T07:20:00.000Z',
        }),
        new Date('2026-04-02T11:15:00.000Z')
      )
    ).toBe('2026-04-09T07:00:00.000Z');
  });

  it('normalizes scheduler status payloads', () => {
    const parsed = parseFilemakerEmailCampaignSchedulerStatus(
      JSON.stringify({
        version: 99,
        lastStartedAt: '2026-04-03T09:15:00.000Z',
        lastCompletedAt: '2026-04-03T09:16:00.000Z',
        lastSuccessfulAt: '2026-04-03T09:16:00.000Z',
        evaluatedCampaignCount: 4,
        dueCampaignCount: 2,
        launchedRuns: [
          {
            campaignId: 'campaign-1',
            runId: 'run-1',
            queuedDeliveryCount: 2,
            launchMode: 'scheduled',
          },
        ],
        queuedDispatchCount: 1,
        inlineDispatchCount: 0,
        skippedByReason: [{ reason: 'scheduled-not-due', count: 3 }],
        launchFailures: [{ campaignId: 'campaign-2', message: 'launch failed' }],
      })
    );

    expect(parsed).toEqual(
      expect.objectContaining({
        version: 1,
        evaluatedCampaignCount: 4,
        dueCampaignCount: 2,
        queuedDispatchCount: 1,
        inlineDispatchCount: 0,
        skippedByReason: [{ reason: 'scheduled-not-due', count: 3 }],
        launchFailures: [{ campaignId: 'campaign-2', message: 'launch failed' }],
      })
    );
  });
});
