import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import {
  fetchMock,
  jsonResponse,
  renderWithProviders,
  routeParamsMock,
  setupAdminFilemakerMailPagesTest,
  toastMock,
} from './AdminFilemakerMailPages.test-support';
import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  createFilemakerEmailCampaign,
  createFilemakerEmailCampaignDelivery,
  createFilemakerEmailCampaignEvent,
  createFilemakerEmailCampaignRun,
} from '@/features/filemaker/settings';

const settingsMapRef = vi.hoisted(() => ({
  current: new Map<string, string>(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    map: settingsMapRef.current,
    isLoading: false,
    isFetching: false,
    error: null,
    get: (key: string) => settingsMapRef.current.get(key),
    getBoolean: () => false,
    getNumber: () => undefined,
    refetch: vi.fn(),
  }),
}));

setupAdminFilemakerMailPagesTest();

const setCampaignRunSettings = (): void => {
  const campaign = createFilemakerEmailCampaign({
    id: 'campaign-1',
    name: 'Spring Expo',
    status: 'active',
    subject: 'Meet us at the expo',
    mailAccountId: 'mail-account-1',
  });
  const run = createFilemakerEmailCampaignRun({
    id: 'run-1',
    campaignId: 'campaign-1',
    mode: 'live',
    status: 'completed',
    startedAt: '2026-04-01T10:00:00.000Z',
    completedAt: '2026-04-01T10:10:00.000Z',
    recipientCount: 1,
    deliveredCount: 1,
  });
  const delivery = createFilemakerEmailCampaignDelivery({
    id: 'delivery-1',
    campaignId: 'campaign-1',
    runId: 'run-1',
    emailAddress: 'jane@example.com',
    partyKind: 'person',
    partyId: 'person-1',
    status: 'sent',
    provider: 'smtp',
    sentAt: '2026-04-01T10:02:00.000Z',
  });
  const replyEvent = createFilemakerEmailCampaignEvent({
    id: 'event-reply-1',
    campaignId: 'campaign-1',
    runId: 'run-1',
    deliveryId: 'delivery-1',
    type: 'reply_received',
    message: 'Reply received from jane@example.com.',
    mailThreadId: 'thread-reply-1',
    mailMessageId: 'message-reply-1',
    createdAt: '2026-04-01T10:12:00.000Z',
  });

  settingsMapRef.current = new Map([
    [FILEMAKER_EMAIL_CAMPAIGNS_KEY, JSON.stringify({ version: 1, campaigns: [campaign] })],
    [FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY, JSON.stringify({ version: 1, runs: [run] })],
    [
      FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
      JSON.stringify({ version: 1, deliveries: [delivery] }),
    ],
    [FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY, JSON.stringify({ version: 1, attempts: [] })],
    [FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY, JSON.stringify({ version: 1, events: [replyEvent] })],
  ]);
};

describe('AdminFilemakerCampaignRunPage mail integration', () => {
  beforeEach(() => {
    routeParamsMock.runId = 'run-1';
    setCampaignRunSettings();
  });

  it('loads campaign-linked mail threads and links deliveries and reply events back to mail', async () => {
    const { AdminFilemakerCampaignRunPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerCampaignRunPage'
    );

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (
        url === '/api/filemaker/mail/threads?campaignId=campaign-1&runId=run-1'
      ) {
        return jsonResponse({
          threads: [
            {
              id: 'thread-delivery-1',
              accountId: 'mail-account-1',
              mailboxPath: 'Sent',
              mailboxRole: 'sent',
              subject: 'Meet us at the expo',
              campaignContext: {
                campaignId: 'campaign-1',
                runId: 'run-1',
                deliveryId: 'delivery-1',
              },
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    renderWithProviders(<AdminFilemakerCampaignRunPage />);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url]) => String(url) === '/api/filemaker/mail/threads?campaignId=campaign-1&runId=run-1'
        )
      ).toBe(true);
    });

    expect(await screen.findByText('Linked mail threads: 1')).toBeInTheDocument();
    expect(screen.getByText('Mail filed')).toBeInTheDocument();
    expect(screen.queryByText('Mail filing pending')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Open Mail Thread' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail/threads/thread-delivery-1?accountId=mail-account-1&mailboxPath=Sent'
    );
    expect(screen.getByRole('link', { name: 'Open Reply Thread' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail/threads/thread-reply-1'
    );
  });

  it('repairs missing campaign mail filing from the run page', async () => {
    const { AdminFilemakerCampaignRunPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerCampaignRunPage'
    );
    let repaired = false;

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (
        url === '/api/filemaker/mail/threads?campaignId=campaign-1&runId=run-1'
      ) {
        return jsonResponse({
          threads: repaired
            ? [
                {
                  id: 'thread-repaired-1',
                  accountId: 'mail-account-1',
                  mailboxPath: 'Sent',
                  mailboxRole: 'sent',
                  subject: 'Meet us at the expo',
                  campaignContext: {
                    campaignId: 'campaign-1',
                    runId: 'run-1',
                    deliveryId: 'delivery-1',
                  },
                },
              ]
            : [],
        });
      }
      if (
        url === '/api/filemaker/campaigns/runs/run-1/repair-mail-filing' &&
        init?.method === 'POST'
      ) {
        repaired = true;
        return jsonResponse({
          campaignId: 'campaign-1',
          runId: 'run-1',
          repairedCount: 1,
          skippedCount: 0,
          failedCount: 0,
          deliveries: [],
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    renderWithProviders(<AdminFilemakerCampaignRunPage />);

    expect(await screen.findByText('Mail filing pending')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Repair Mail Filing' }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url) === '/api/filemaker/campaigns/runs/run-1/repair-mail-filing' &&
            init?.method === 'POST'
        )
      ).toBe(true);
    });
    expect(await screen.findByText('Mail filed')).toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith(
      'Mail filing repair finished. Repaired: 1, skipped: 0, failed: 0.',
      { variant: 'success' }
    );
  });
});
