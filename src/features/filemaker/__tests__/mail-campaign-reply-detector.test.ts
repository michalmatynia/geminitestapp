import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilemakerMailMessage } from '@/features/filemaker/types';

vi.mock('server-only', () => ({}));

const findMailMessagesByProviderIdsSpy =
  vi.fn<(accountId: string, ids: string[]) => Promise<FilemakerMailMessage[]>>();
const readFilemakerCampaignSettingValueSpy = vi.fn(async () => null);
const upsertFilemakerCampaignSettingValueSpy = vi.fn(async () => true);

vi.mock('@/features/filemaker/server/mail/mail-storage', () => ({
  findMailMessagesByProviderIds: (accountId: string, ids: string[]) =>
    findMailMessagesByProviderIdsSpy(accountId, ids),
}));

vi.mock('@/features/filemaker/server/campaign-settings-store', () => ({
  readFilemakerCampaignSettingValue: () => readFilemakerCampaignSettingValueSpy(),
  upsertFilemakerCampaignSettingValue: (key: string, value: string) =>
    upsertFilemakerCampaignSettingValueSpy(key, value),
}));

const buildMessage = (
  overrides: Partial<FilemakerMailMessage>
): FilemakerMailMessage =>
  ({
    id: 'msg-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    accountId: 'acct-1',
    threadId: 'thread-1',
    mailboxPath: 'INBOX',
    mailboxRole: 'inbox',
    providerMessageId: 'provider-1@example.com',
    providerThreadId: null,
    providerUid: 1,
    direction: 'outbound',
    subject: 'Hello',
    snippet: null,
    from: { address: 'me@example.com', name: null },
    to: [{ address: 'them@example.com', name: null }],
    cc: [],
    bcc: [],
    replyTo: [],
    sentAt: '2026-01-01T00:00:00.000Z',
    receivedAt: '2026-01-01T00:00:00.000Z',
    flags: { seen: true, answered: false, flagged: false, draft: false, deleted: false },
    textBody: null,
    htmlBody: null,
    inReplyTo: null,
    references: [],
    attachments: [],
    relatedPersonIds: [],
    relatedOrganizationIds: [],
    ...overrides,
  } as FilemakerMailMessage);

describe('detectFilemakerCampaignReplyContext', () => {
  beforeEach(() => {
    findMailMessagesByProviderIdsSpy.mockReset();
    readFilemakerCampaignSettingValueSpy.mockReset();
    readFilemakerCampaignSettingValueSpy.mockResolvedValue(null);
    upsertFilemakerCampaignSettingValueSpy.mockReset();
    upsertFilemakerCampaignSettingValueSpy.mockResolvedValue(true);
  });

  it('returns campaign context when references match an outbound campaign send', async () => {
    findMailMessagesByProviderIdsSpy.mockResolvedValue([
      buildMessage({
        direction: 'outbound',
        providerMessageId: 'provider-1@example.com',
        campaignContext: {
          campaignId: 'campaign-abc',
          runId: 'run-1',
          deliveryId: 'delivery-1',
        },
      }),
    ]);
    const { detectFilemakerCampaignReplyContext } = await import(
      '@/features/filemaker/server/campaign-reply-detector'
    );
    const result = await detectFilemakerCampaignReplyContext({
      accountId: 'acct-1',
      references: ['provider-1@example.com'],
    });
    expect(result?.campaignId).toBe('campaign-abc');
  });

  it('returns null when the matched message has no campaign context', async () => {
    findMailMessagesByProviderIdsSpy.mockResolvedValue([
      buildMessage({
        direction: 'outbound',
        providerMessageId: 'provider-2@example.com',
        campaignContext: null,
      }),
    ]);
    const { detectFilemakerCampaignReplyContext } = await import(
      '@/features/filemaker/server/campaign-reply-detector'
    );
    const result = await detectFilemakerCampaignReplyContext({
      accountId: 'acct-1',
      references: ['provider-2@example.com'],
    });
    expect(result).toBeNull();
  });

  it('ignores inbound matches (only outbound sends anchor campaigns)', async () => {
    findMailMessagesByProviderIdsSpy.mockResolvedValue([
      buildMessage({
        direction: 'inbound',
        providerMessageId: 'provider-3@example.com',
        campaignContext: {
          campaignId: 'campaign-def',
          runId: null,
          deliveryId: null,
        },
      }),
    ]);
    const { detectFilemakerCampaignReplyContext } = await import(
      '@/features/filemaker/server/campaign-reply-detector'
    );
    const result = await detectFilemakerCampaignReplyContext({
      accountId: 'acct-1',
      references: ['provider-3@example.com'],
    });
    expect(result).toBeNull();
  });

  it('short-circuits with no references without calling storage', async () => {
    const { detectFilemakerCampaignReplyContext } = await import(
      '@/features/filemaker/server/campaign-reply-detector'
    );
    const result = await detectFilemakerCampaignReplyContext({
      accountId: 'acct-1',
      references: ['', '   '],
    });
    expect(result).toBeNull();
    expect(findMailMessagesByProviderIdsSpy).not.toHaveBeenCalled();
  });

  it('records reply events with mail thread and message linkage', async () => {
    const { recordFilemakerCampaignReply } = await import(
      '@/features/filemaker/server/campaign-reply-detector'
    );

    await recordFilemakerCampaignReply({
      campaignContext: {
        campaignId: 'campaign-abc',
        runId: 'run-1',
        deliveryId: 'delivery-1',
      },
      replyMessage: buildMessage({
        id: 'reply-message-1',
        threadId: 'reply-thread-1',
        direction: 'inbound',
        from: { address: 'jane@example.com', name: 'Jane' },
      }),
    });

    const persistedValue = upsertFilemakerCampaignSettingValueSpy.mock.calls[0]?.[1];
    expect(typeof persistedValue).toBe('string');
    const parsed = JSON.parse(persistedValue as string) as {
      events: Array<{ mailThreadId?: string | null; mailMessageId?: string | null }>;
    };
    expect(parsed.events[0]?.mailThreadId).toBe('reply-thread-1');
    expect(parsed.events[0]?.mailMessageId).toBe('reply-message-1');
  });
});
