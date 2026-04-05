import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assertSettingsManageAccessMock,
  sendFilemakerEmailCampaignTestMock,
} = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  sendFilemakerEmailCampaignTestMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/features/filemaker/server', () => ({
  sendFilemakerEmailCampaignTest: sendFilemakerEmailCampaignTestMock,
}));

import { POST_handler } from './handler';

describe('filemaker campaign test send handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
  });

  it('parses the current campaign draft and returns the test send result', async () => {
    sendFilemakerEmailCampaignTestMock.mockResolvedValue({
      campaignId: 'campaign-1',
      recipientEmail: 'qa@example.com',
      provider: 'smtp',
      providerMessage: 'Sent through the Filemaker mail account "Sales".',
      sentAt: '2026-04-02T12:00:00.000Z',
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/campaigns/test-send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campaign: {
            id: 'campaign-1',
            createdAt: '2026-04-02T11:00:00.000Z',
            updatedAt: '2026-04-02T11:00:00.000Z',
            name: 'Launch preview',
            description: null,
            status: 'draft',
            subject: 'Hello from Filemaker',
            previewText: null,
            mailAccountId: 'mail-account-sales',
            fromName: null,
            replyToEmail: null,
            bodyText: 'Hello {{email}}',
            bodyHtml: '<p>Hello {{email}}</p>',
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
            approvalGrantedAt: null,
            approvedBy: null,
            lastLaunchedAt: null,
            lastEvaluatedAt: null,
          },
          recipientEmail: 'qa@example.com',
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(assertSettingsManageAccessMock).toHaveBeenCalled();
    expect(sendFilemakerEmailCampaignTestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: 'qa@example.com',
        campaign: expect.objectContaining({
          id: 'campaign-1',
          subject: 'Hello from Filemaker',
          mailAccountId: 'mail-account-sales',
        }),
      })
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      campaignId: 'campaign-1',
      recipientEmail: 'qa@example.com',
      provider: 'smtp',
      providerMessage: 'Sent through the Filemaker mail account "Sales".',
      sentAt: '2026-04-02T12:00:00.000Z',
    });
  });
});
