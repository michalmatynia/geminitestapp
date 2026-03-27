import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assertSettingsManageAccessMock,
  launchFilemakerEmailCampaignRunMock,
  startFilemakerEmailCampaignQueueMock,
  enqueueFilemakerEmailCampaignRunJobMock,
} = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  launchFilemakerEmailCampaignRunMock: vi.fn(),
  startFilemakerEmailCampaignQueueMock: vi.fn(),
  enqueueFilemakerEmailCampaignRunJobMock: vi.fn(),
}));

vi.mock('@/shared/lib/auth/settings-manage-access', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/features/filemaker/server/campaign-runtime', () => ({
  launchFilemakerEmailCampaignRun: launchFilemakerEmailCampaignRunMock,
}));

vi.mock('@/features/jobs/server', () => ({
  startFilemakerEmailCampaignQueue: startFilemakerEmailCampaignQueueMock,
  enqueueFilemakerEmailCampaignRunJob: enqueueFilemakerEmailCampaignRunJobMock,
}));

import { POST_handler } from './handler';

describe('filemaker campaign run launch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
    enqueueFilemakerEmailCampaignRunJobMock.mockResolvedValue({
      dispatchMode: 'queued',
      jobId: 'job-1',
    });
  });

  it('returns a dry run response without enqueueing the worker', async () => {
    launchFilemakerEmailCampaignRunMock.mockResolvedValue({
      campaign: { id: 'campaign-1' },
      run: { id: 'run-1', status: 'completed' },
      deliveries: [{ id: 'delivery-1', status: 'skipped' }],
      queuedDeliveryCount: 0,
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campaignId: 'campaign-1',
          mode: 'dry_run',
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(assertSettingsManageAccessMock).toHaveBeenCalled();
    expect(startFilemakerEmailCampaignQueueMock).not.toHaveBeenCalled();
    expect(enqueueFilemakerEmailCampaignRunJobMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      campaignId: 'campaign-1',
      runId: 'run-1',
      status: 'completed',
      dispatchMode: 'dry_run',
      queueJobId: null,
      queuedDeliveryCount: 0,
    });
  });

  it('launches a live run and enqueues it when queued deliveries exist', async () => {
    launchFilemakerEmailCampaignRunMock.mockResolvedValue({
      campaign: { id: 'campaign-1' },
      run: { id: 'run-2', status: 'queued' },
      deliveries: [
        { id: 'delivery-1', status: 'queued' },
        { id: 'delivery-2', status: 'queued' },
      ],
      queuedDeliveryCount: 2,
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campaignId: 'campaign-1',
          mode: 'live',
          launchReason: 'Manual launch',
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(startFilemakerEmailCampaignQueueMock).toHaveBeenCalled();
    expect(enqueueFilemakerEmailCampaignRunJobMock).toHaveBeenCalledWith({
      campaignId: 'campaign-1',
      runId: 'run-2',
      reason: 'launch',
    });
    await expect(response.json()).resolves.toEqual({
      campaignId: 'campaign-1',
      runId: 'run-2',
      status: 'queued',
      dispatchMode: 'queued',
      queueJobId: 'job-1',
      queuedDeliveryCount: 2,
    });
  });
});
