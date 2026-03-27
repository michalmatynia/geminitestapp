import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assertSettingsManageAccessMock,
  readFilemakerCampaignSettingValueMock,
  startFilemakerEmailCampaignQueueMock,
  enqueueFilemakerEmailCampaignRunJobMock,
} = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  readFilemakerCampaignSettingValueMock: vi.fn(),
  startFilemakerEmailCampaignQueueMock: vi.fn(),
  enqueueFilemakerEmailCampaignRunJobMock: vi.fn(),
}));

vi.mock('@/shared/lib/auth/settings-manage-access', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/features/filemaker/server/campaign-settings-store', () => ({
  readFilemakerCampaignSettingValue: readFilemakerCampaignSettingValueMock,
}));

vi.mock('@/features/jobs/server', () => ({
  startFilemakerEmailCampaignQueue: startFilemakerEmailCampaignQueueMock,
  enqueueFilemakerEmailCampaignRunJob: enqueueFilemakerEmailCampaignRunJobMock,
}));

import { POST_handler } from './handler';

describe('filemaker campaign run process handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
    enqueueFilemakerEmailCampaignRunJobMock.mockResolvedValue({
      dispatchMode: 'inline',
      jobId: null,
    });
    readFilemakerCampaignSettingValueMock.mockImplementation(async (key: string) => {
      if (key === 'filemaker_email_campaign_runs_v1') {
        return JSON.stringify({
          version: 1,
          runs: [
            {
              id: 'run-1',
              campaignId: 'campaign-1',
              mode: 'live',
              status: 'queued',
              recipientCount: 2,
              deliveredCount: 0,
              failedCount: 0,
              skippedCount: 0,
            },
          ],
        });
      }
      if (key === 'filemaker_email_campaign_deliveries_v1') {
        return JSON.stringify({
          version: 1,
          deliveries: [
            {
              id: 'delivery-1',
              campaignId: 'campaign-1',
              runId: 'run-1',
              emailAddress: 'jan@example.com',
              partyKind: 'person',
              partyId: 'person-1',
              status: 'queued',
            },
          ],
        });
      }
      return null;
    });
  });

  it('reads the run, counts queued deliveries, and enqueues processing', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/runs/run-1/process', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'manual' }),
      }),
      {} as Parameters<typeof POST_handler>[1],
      {
        runId: 'run-1',
      }
    );

    expect(assertSettingsManageAccessMock).toHaveBeenCalled();
    expect(startFilemakerEmailCampaignQueueMock).toHaveBeenCalled();
    expect(enqueueFilemakerEmailCampaignRunJobMock).toHaveBeenCalledWith({
      campaignId: 'campaign-1',
      runId: 'run-1',
      reason: 'manual',
    });
    await expect(response.json()).resolves.toEqual({
      campaignId: 'campaign-1',
      runId: 'run-1',
      status: 'queued',
      dispatchMode: 'inline',
      queueJobId: null,
      queuedDeliveryCount: 1,
    });
  });
});
