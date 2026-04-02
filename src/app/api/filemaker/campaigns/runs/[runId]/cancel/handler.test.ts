import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assertSettingsManageAccessMock,
  cancelFilemakerEmailCampaignRunMock,
} = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  cancelFilemakerEmailCampaignRunMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/features/filemaker/server', () => ({
  cancelFilemakerEmailCampaignRun: cancelFilemakerEmailCampaignRunMock,
}));

import { POST_handler } from './handler';

describe('filemaker campaign run cancel handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
    cancelFilemakerEmailCampaignRunMock.mockResolvedValue({
      campaign: { id: 'campaign-1' },
      run: { id: 'run-1', status: 'cancelled' },
      deliveries: [],
    });
  });

  it('cancels a run through the runtime service', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/runs/run-1/cancel', {
        method: 'POST',
      }),
      {} as Parameters<typeof POST_handler>[1],
      {
        runId: 'run-1',
      }
    );

    expect(assertSettingsManageAccessMock).toHaveBeenCalled();
    expect(cancelFilemakerEmailCampaignRunMock).toHaveBeenCalledWith({
      runId: 'run-1',
      actor: 'admin',
      message: 'Run cancelled from the Filemaker campaign admin.',
    });
    await expect(response.json()).resolves.toEqual({
      campaignId: 'campaign-1',
      runId: 'run-1',
      status: 'cancelled',
    });
  });
});
