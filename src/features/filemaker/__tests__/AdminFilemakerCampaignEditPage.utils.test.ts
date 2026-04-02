import { describe, expect, it } from 'vitest';

import {
  createDuplicatedCampaignDraft,
  getRunActions,
  removeCampaignArtifacts,
} from '@/features/filemaker/pages/AdminFilemakerCampaignEditPage.utils';

import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignRun,
} from '@/features/filemaker/types';
import type { FilemakerEmailCampaignSchedulerStatus } from '@/features/filemaker/settings';

const createRun = (overrides?: Partial<FilemakerEmailCampaignRun>): FilemakerEmailCampaignRun => ({
  id: 'run-1',
  campaignId: 'campaign-1',
  mode: 'live',
  status: 'queued',
  recipientCount: 1,
  deliveredCount: 0,
  failedCount: 0,
  skippedCount: 0,
  startedAt: null,
  completedAt: null,
  createdAt: '2026-04-02T10:00:00.000Z',
  updatedAt: '2026-04-02T10:00:00.000Z',
  ...overrides,
});

const createDelivery = (
  overrides?: Partial<FilemakerEmailCampaignDelivery>
): FilemakerEmailCampaignDelivery => ({
  id: 'delivery-1',
  campaignId: 'campaign-1',
  runId: 'run-1',
  emailId: 'email-1',
  emailAddress: 'jan@example.com',
  partyKind: 'person',
  partyId: 'person-1',
  status: 'queued',
  provider: null,
  failureCategory: null,
  providerMessage: null,
  lastError: null,
  sentAt: null,
  nextRetryAt: null,
  createdAt: '2026-04-02T10:00:00.000Z',
  updatedAt: '2026-04-02T10:00:00.000Z',
  ...overrides,
});

const emptyAttemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry = {
  version: 1,
  attempts: [],
};

const createCampaign = (
  overrides?: Partial<FilemakerEmailCampaign>
): FilemakerEmailCampaign => ({
  id: 'campaign-1',
  name: 'Launch Sequence',
  description: null,
  status: 'active',
  subject: 'Hello from Filemaker',
  previewText: null,
  mailAccountId: 'mail-account-sales',
  fromName: 'Campaign Owner',
  replyToEmail: 'replies@example.com',
  bodyText: 'Hello there',
  bodyHtml: '<p>Hello there</p>',
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
    minAudienceSize: 0,
    requireApproval: false,
    onlyWeekdays: false,
    allowedHourStart: null,
    allowedHourEnd: null,
    pauseOnBounceRatePercent: null,
    timezone: 'UTC',
  },
  approvalGrantedAt: '2026-04-01T08:00:00.000Z',
  approvedBy: 'admin',
  lastLaunchedAt: '2026-04-02T09:00:00.000Z',
  lastEvaluatedAt: '2026-04-02T09:30:00.000Z',
  createdAt: '2026-04-01T07:00:00.000Z',
  updatedAt: '2026-04-02T09:30:00.000Z',
  ...overrides,
});

describe('AdminFilemakerCampaignEditPage utils', () => {
  it('offers process and cancel actions for queued live runs with queued deliveries', () => {
    const actions = getRunActions({
      run: createRun(),
      deliveries: [createDelivery()],
      attemptRegistry: emptyAttemptRegistry,
    });

    expect(actions).toEqual([
      { action: 'process', label: 'Process queued (1)' },
      { action: 'cancel', label: 'Cancel run' },
    ]);
  });

  it('offers retry for completed runs with retryable failures', () => {
    const actions = getRunActions({
      run: createRun({ status: 'completed' }),
      deliveries: [
        createDelivery({
          status: 'failed',
          failureCategory: 'timeout',
          nextRetryAt: '2026-04-02T10:05:00.000Z',
        }),
      ],
      attemptRegistry: {
        version: 1,
        attempts: [
          {
            id: 'attempt-1',
            campaignId: 'campaign-1',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            emailAddress: 'jan@example.com',
            partyKind: 'person',
            partyId: 'person-1',
            attemptNumber: 1,
            status: 'failed',
            provider: 'smtp',
            failureCategory: 'timeout',
            providerMessage: null,
            errorMessage: 'Timed out',
            attemptedAt: '2026-04-02T10:01:00.000Z',
            createdAt: '2026-04-02T10:01:00.000Z',
            updatedAt: '2026-04-02T10:01:00.000Z',
          },
        ],
      },
    });

    expect(actions).toEqual([{ action: 'retry', label: 'Retry failed (1)' }]);
  });

  it('does not offer retry after the max attempts are exhausted', () => {
    const actions = getRunActions({
      run: createRun({ status: 'failed' }),
      deliveries: [
        createDelivery({
          status: 'failed',
          failureCategory: 'timeout',
        }),
      ],
      attemptRegistry: {
        version: 1,
        attempts: [
          {
            id: 'attempt-1',
            campaignId: 'campaign-1',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            emailAddress: 'jan@example.com',
            partyKind: 'person',
            partyId: 'person-1',
            attemptNumber: 1,
            status: 'failed',
            provider: 'smtp',
            failureCategory: 'timeout',
            providerMessage: null,
            errorMessage: 'Timed out',
            attemptedAt: '2026-04-02T10:01:00.000Z',
            createdAt: '2026-04-02T10:01:00.000Z',
            updatedAt: '2026-04-02T10:01:00.000Z',
          },
          {
            id: 'attempt-2',
            campaignId: 'campaign-1',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            emailAddress: 'jan@example.com',
            partyKind: 'person',
            partyId: 'person-1',
            attemptNumber: 2,
            status: 'failed',
            provider: 'smtp',
            failureCategory: 'timeout',
            providerMessage: null,
            errorMessage: 'Timed out again',
            attemptedAt: '2026-04-02T10:06:00.000Z',
            createdAt: '2026-04-02T10:06:00.000Z',
            updatedAt: '2026-04-02T10:06:00.000Z',
          },
          {
            id: 'attempt-3',
            campaignId: 'campaign-1',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            emailAddress: 'jan@example.com',
            partyKind: 'person',
            partyId: 'person-1',
            attemptNumber: 3,
            status: 'failed',
            provider: 'smtp',
            failureCategory: 'timeout',
            providerMessage: null,
            errorMessage: 'Timed out yet again',
            attemptedAt: '2026-04-02T10:12:00.000Z',
            createdAt: '2026-04-02T10:12:00.000Z',
            updatedAt: '2026-04-02T10:12:00.000Z',
          },
        ],
      },
    });

    expect(actions).toEqual([]);
  });

  it('creates a duplicate campaign draft with a unique name, id, and reset lifecycle fields', () => {
    const duplicated = createDuplicatedCampaignDraft({
      campaign: createCampaign(),
      existingCampaigns: [
        createCampaign(),
        createCampaign({
          id: 'campaign-2',
          name: 'Launch Sequence Copy',
        }),
      ],
      nowIso: '2026-04-03T10:00:00.000Z',
    });

    expect(duplicated).toEqual(
      expect.objectContaining({
        id: 'filemaker-email-campaign-launch-sequence-copy-2',
        name: 'Launch Sequence Copy 2',
        status: 'draft',
        subject: 'Hello from Filemaker',
        mailAccountId: 'mail-account-sales',
        fromName: 'Campaign Owner',
        replyToEmail: 'replies@example.com',
        approvalGrantedAt: null,
        approvedBy: null,
        lastLaunchedAt: null,
        lastEvaluatedAt: null,
        createdAt: '2026-04-03T10:00:00.000Z',
        updatedAt: '2026-04-03T10:00:00.000Z',
      })
    );
  });

  it('removes campaign runtime artifacts and scheduler traces when deleting a campaign', () => {
    const schedulerStatus: FilemakerEmailCampaignSchedulerStatus = {
      version: 1,
      lastStartedAt: '2026-04-02T08:00:00.000Z',
      lastCompletedAt: '2026-04-02T08:01:00.000Z',
      lastSuccessfulAt: '2026-04-02T08:01:00.000Z',
      evaluatedCampaignCount: 2,
      dueCampaignCount: 1,
      launchedRuns: [
        {
          campaignId: 'campaign-1',
          runId: 'run-1',
          queuedDeliveryCount: 1,
          launchMode: 'scheduled',
        },
        {
          campaignId: 'campaign-2',
          runId: 'run-2',
          queuedDeliveryCount: 3,
          launchMode: 'recurring',
        },
      ],
      queuedDispatchCount: 1,
      inlineDispatchCount: 0,
      skippedByReason: [],
      launchFailures: [
        { campaignId: 'campaign-1', message: 'SMTP timed out.' },
        { campaignId: 'campaign-2', message: 'Audience empty.' },
      ],
    };

    const cleaned = removeCampaignArtifacts({
      campaignId: 'campaign-1',
      runRegistry: {
        version: 1,
        runs: [
          createRun(),
          createRun({ id: 'run-2', campaignId: 'campaign-2' }),
        ],
      },
      deliveryRegistry: {
        version: 1,
        deliveries: [
          createDelivery(),
          createDelivery({
            id: 'delivery-2',
            campaignId: 'campaign-2',
            runId: 'run-2',
          }),
        ],
      },
      attemptRegistry: {
        version: 1,
        attempts: [
          {
            id: 'attempt-1',
            campaignId: 'campaign-1',
            runId: 'run-1',
            deliveryId: 'delivery-1',
            emailAddress: 'jan@example.com',
            partyKind: 'person',
            partyId: 'person-1',
            attemptNumber: 1,
            status: 'failed',
            provider: 'smtp',
            failureCategory: 'timeout',
            providerMessage: null,
            errorMessage: 'Timed out',
            attemptedAt: '2026-04-02T10:01:00.000Z',
            createdAt: '2026-04-02T10:01:00.000Z',
            updatedAt: '2026-04-02T10:01:00.000Z',
          },
          {
            id: 'attempt-2',
            campaignId: 'campaign-2',
            runId: 'run-2',
            deliveryId: 'delivery-2',
            emailAddress: 'jane@example.com',
            partyKind: 'person',
            partyId: 'person-2',
            attemptNumber: 1,
            status: 'sent',
            provider: 'smtp',
            failureCategory: null,
            providerMessage: 'Sent',
            errorMessage: null,
            attemptedAt: '2026-04-02T10:01:00.000Z',
            createdAt: '2026-04-02T10:01:00.000Z',
            updatedAt: '2026-04-02T10:01:00.000Z',
          },
        ],
      },
      eventRegistry: {
        version: 1,
        events: [
          {
            id: 'event-1',
            campaignId: 'campaign-1',
            runId: 'run-1',
            deliveryId: null,
            type: 'launched',
            message: 'Launched',
            actor: null,
            targetUrl: null,
            runStatus: 'queued',
            deliveryStatus: null,
            createdAt: '2026-04-02T10:00:00.000Z',
            updatedAt: '2026-04-02T10:00:00.000Z',
          },
          {
            id: 'event-2',
            campaignId: 'campaign-2',
            runId: 'run-2',
            deliveryId: null,
            type: 'completed',
            message: 'Completed',
            actor: null,
            targetUrl: null,
            runStatus: 'completed',
            deliveryStatus: null,
            createdAt: '2026-04-02T10:00:00.000Z',
            updatedAt: '2026-04-02T10:00:00.000Z',
          },
        ],
      },
      schedulerStatus,
    });

    expect(cleaned.runRegistry.runs.map((run) => run.campaignId)).toEqual(['campaign-2']);
    expect(cleaned.deliveryRegistry.deliveries.map((delivery) => delivery.campaignId)).toEqual([
      'campaign-2',
    ]);
    expect(cleaned.attemptRegistry.attempts.map((attempt) => attempt.campaignId)).toEqual([
      'campaign-2',
    ]);
    expect(cleaned.eventRegistry.events.map((event) => event.campaignId)).toEqual(['campaign-2']);
    expect(cleaned.schedulerStatus.launchedRuns.map((entry) => entry.campaignId)).toEqual([
      'campaign-2',
    ]);
    expect(cleaned.schedulerStatus.launchFailures.map((entry) => entry.campaignId)).toEqual([
      'campaign-2',
    ]);
  });
});
