import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilemakerEmailCampaign } from '../types';

const {
  sendFilemakerCampaignEmailMock,
} = vi.hoisted(() => ({
  sendFilemakerCampaignEmailMock: vi.fn(),
}));

vi.mock('./campaign-email-delivery', () => ({
  sendFilemakerCampaignEmail: sendFilemakerCampaignEmailMock,
}));

import { sendFilemakerEmailCampaignTest } from './filemaker-email-campaign-test-send';

const createTestCampaign = (
  overrides?: Partial<FilemakerEmailCampaign>
): FilemakerEmailCampaign => ({
  id: 'campaign-1',
  createdAt: '2026-04-02T11:00:00.000Z',
  updatedAt: '2026-04-02T11:00:00.000Z',
  name: 'Preview launch',
  description: null,
  status: 'draft',
  subject: 'Hello from Filemaker',
  previewText: null,
  mailAccountId: 'mail-account-sales',
  fromName: 'Campaign Owner',
  replyToEmail: 'replies@example.com',
  bodyText:
    'Hi {{email}}. Manage: {{preferences_url}}. Opt out: {{unsubscribe_url}}. Open: {{open_tracking_url}}. CTA: {{click_tracking_url:https://destination.example.com/offer}}',
  bodyHtml:
    '<p>Hi {{email}}</p><p><a href="{{preferences_url}}">preferences</a></p><p><a href="{{unsubscribe_url}}">unsubscribe</a></p><p><a href="{{click_tracking_url:https://destination.example.com/offer}}">CTA</a></p><div>{{open_tracking_pixel}}</div>',
  audience: {
    partyKinds: ['person'],
    emailStatuses: ['active'],
    includePartyReferences: [],
    excludePartyReferences: [],
    conditionGroup: {
      id: 'campaign-audience-root',
      type: 'group',
      combinator: 'and',
      children: [],
    },
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
  ...overrides,
});

describe('sendFilemakerEmailCampaignTest', () => {
  const originalAppUrl = process.env['NEXT_PUBLIC_APP_URL'];

  beforeEach(() => {
    sendFilemakerCampaignEmailMock.mockResolvedValue({
      provider: 'smtp',
      providerMessage: 'Sent through the Filemaker mail account "Sales".',
      sentAt: '2026-04-02T12:00:00.000Z',
    });
    process.env['NEXT_PUBLIC_APP_URL'] = 'https://app.example.com';
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (originalAppUrl === undefined) {
      delete process.env['NEXT_PUBLIC_APP_URL'];
    } else {
      process.env['NEXT_PUBLIC_APP_URL'] = originalAppUrl;
    }
  });

  it('renders preview-safe tokens and sends the draft through the current campaign route', async () => {
    const result = await sendFilemakerEmailCampaignTest({
      campaign: createTestCampaign(),
      recipientEmail: 'QA@Example.com',
    });

    expect(sendFilemakerCampaignEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'qa@example.com',
        subject: 'Hello from Filemaker',
        campaignId: 'campaign-1',
        mailAccountId: 'mail-account-sales',
        fromName: 'Campaign Owner',
        replyToEmail: 'replies@example.com',
        text: expect.stringContaining('qa@example.com'),
        html: expect.stringContaining('qa@example.com'),
      })
    );

    const payload = sendFilemakerCampaignEmailMock.mock.calls[0]?.[0];
    expect(payload?.text).toContain(
      'https://app.example.com/admin/filemaker/campaigns?preview=test-send&campaignId=campaign-1&action=preferences'
    );
    expect(payload?.text).toContain(
      'https://app.example.com/admin/filemaker/campaigns?preview=test-send&campaignId=campaign-1&action=unsubscribe'
    );
    expect(payload?.text).toContain(
      'https://app.example.com/admin/filemaker/campaigns?preview=test-send&campaignId=campaign-1&action=open_tracking'
    );
    expect(payload?.text).toContain('https://destination.example.com/offer');
    expect(payload?.text).not.toContain('{{');
    expect(payload?.html).toContain('https://destination.example.com/offer');
    expect(payload?.html).not.toContain('{{open_tracking_pixel}}');
    expect(payload?.html).not.toContain('<img ');
    expect(payload?.html).not.toContain('{{');
    expect(payload?.runId).toMatch(/^filemaker-email-campaign-test-run-/);
    expect(payload?.deliveryId).toMatch(/^filemaker-email-campaign-test-delivery-/);
    expect(result).toEqual({
      campaignId: 'campaign-1',
      recipientEmail: 'qa@example.com',
      provider: 'smtp',
      providerMessage: 'Sent through the Filemaker mail account "Sales".',
      sentAt: '2026-04-02T12:00:00.000Z',
    });
  });

  it('rejects test sends when the campaign has no assigned email account', async () => {
    await expect(
      sendFilemakerEmailCampaignTest({
        campaign: createTestCampaign({ mailAccountId: null }),
        recipientEmail: 'QA@Example.com',
      })
    ).rejects.toThrow('Campaign must have an email account assigned before sending a test.');

    expect(sendFilemakerCampaignEmailMock).not.toHaveBeenCalled();
  });
});
