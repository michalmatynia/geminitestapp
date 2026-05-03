import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assertSettingsManageAccessMock,
  repairFilemakerCampaignRunMailFilingMock,
} = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  repairFilemakerCampaignRunMailFilingMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/features/filemaker/server', () => ({
  repairFilemakerCampaignRunMailFiling: repairFilemakerCampaignRunMailFilingMock,
}));

import { postHandler } from './handler';

describe('filemaker campaign run mail filing repair handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
    repairFilemakerCampaignRunMailFilingMock.mockResolvedValue({
      campaignId: 'campaign-1',
      runId: 'run-1',
      repairedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      deliveries: [],
    });
  });

  it('requires settings access and repairs the requested run', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/campaigns/runs/run-1/repair-mail-filing', {
        method: 'POST',
      }),
      {} as Parameters<typeof postHandler>[1],
      { runId: 'run-1' }
    );

    expect(assertSettingsManageAccessMock).toHaveBeenCalled();
    expect(repairFilemakerCampaignRunMailFilingMock).toHaveBeenCalledWith('run-1');
    await expect(response.json()).resolves.toEqual({
      campaignId: 'campaign-1',
      runId: 'run-1',
      repairedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      deliveries: [],
    });
  });
});
