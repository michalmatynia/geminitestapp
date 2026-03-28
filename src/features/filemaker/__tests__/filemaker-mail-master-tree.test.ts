import { describe, expect, it } from 'vitest';

import {
  buildFilemakerMailMasterNodes,
  parseFilemakerMailMasterNodeId,
  toFilemakerMailAttentionAccountNodeId,
  toFilemakerMailAttentionNodeId,
  toFilemakerMailAccountNodeId,
  toFilemakerMailAccountComposeNodeId,
  toFilemakerMailAccountRecentNodeId,
  toFilemakerMailAccountSettingsNodeId,
  toFilemakerMailAccountStatusToggleNodeId,
  toFilemakerMailAccountSyncNodeId,
  toFilemakerMailFolderNodeId,
  toFilemakerMailNewAccountNodeId,
  toFilemakerMailRecentThreadNodeId,
  toFilemakerMailThreadNodeId,
} from '../mail-master-tree';

describe('filemaker mail master tree', () => {
  it('builds account and folder nodes with aggregated counts', () => {
    const nodes = buildFilemakerMailMasterNodes({
      accounts: [
        {
          id: 'account-1',
          name: 'Support',
          emailAddress: 'support@example.com',
          provider: 'imap_smtp',
          status: 'active',
          imapHost: 'imap.example.com',
          imapPort: 993,
          imapSecure: true,
          imapUser: 'support@example.com',
          imapPasswordSettingKey: 'imap-key',
          smtpHost: 'smtp.example.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'support@example.com',
          smtpPasswordSettingKey: 'smtp-key',
          fromName: null,
          replyToEmail: null,
          folderAllowlist: ['INBOX', 'Sent'],
          initialSyncLookbackDays: 30,
          maxMessagesPerSync: 100,
          lastSyncedAt: null,
          lastSyncError: null,
          createdAt: '2026-03-28T10:00:00.000Z',
          updatedAt: '2026-03-28T10:00:00.000Z',
        },
      ],
      folders: [
        {
          id: 'account-1::INBOX',
          accountId: 'account-1',
          mailboxPath: 'INBOX',
          mailboxRole: 'inbox',
          threadCount: 4,
          unreadCount: 2,
          lastMessageAt: '2026-03-28T11:00:00.000Z',
        },
        {
          id: 'account-1::Sent',
          accountId: 'account-1',
          mailboxPath: 'Sent',
          mailboxRole: 'sent',
          threadCount: 1,
          unreadCount: 0,
          lastMessageAt: '2026-03-28T09:00:00.000Z',
        },
      ],
      threads: [
        {
          id: 'thread-1',
          createdAt: '2026-03-28T09:30:00.000Z',
          updatedAt: '2026-03-28T11:00:00.000Z',
          accountId: 'account-1',
          mailboxPath: 'INBOX',
          mailboxRole: 'inbox',
          providerThreadId: null,
          subject: 'Welcome',
          normalizedSubject: 'Welcome',
          snippet: 'Hello there',
          participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
          relatedPersonIds: [],
          relatedOrganizationIds: [],
          unreadCount: 2,
          messageCount: 1,
          lastMessageAt: '2026-03-28T11:00:00.000Z',
        },
      ],
      recentThreads: [
        {
          id: 'thread-2',
          createdAt: '2026-03-28T09:40:00.000Z',
          updatedAt: '2026-03-28T11:10:00.000Z',
          accountId: 'account-1',
          mailboxPath: 'Sent',
          mailboxRole: 'sent',
          providerThreadId: null,
          subject: 'Recent Follow-up',
          normalizedSubject: 'Recent Follow-up',
          snippet: 'Latest recent message',
          participantSummary: [{ address: 'team@example.com', name: 'Team' }],
          relatedPersonIds: [],
          relatedOrganizationIds: [],
          unreadCount: 0,
          messageCount: 2,
          lastMessageAt: '2026-03-28T11:10:00.000Z',
        },
      ],
    });

    expect(nodes).toHaveLength(11);
    expect(nodes[0]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailNewAccountNodeId(),
        kind: 'mail_new_account',
        name: 'Add Mailbox',
        parentId: null,
      })
    );
    expect(nodes[1]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailAccountNodeId('account-1'),
        kind: 'mail_account',
        name: 'Support',
        parentId: null,
        metadata: expect.objectContaining({
          unreadCount: 2,
          folderCount: 2,
          lastSyncedAt: null,
          lastSyncError: null,
        }),
      })
    );
    expect(nodes[2]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailAccountComposeNodeId('account-1'),
        kind: 'mail_account_compose',
        name: 'Compose',
        parentId: toFilemakerMailAccountNodeId('account-1'),
      })
    );
    expect(nodes[3]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailAccountSyncNodeId('account-1'),
        kind: 'mail_account_sync',
        name: 'Sync',
        parentId: toFilemakerMailAccountNodeId('account-1'),
        metadata: expect.objectContaining({
          lastSyncedAt: null,
          lastSyncError: null,
        }),
      })
    );
    expect(nodes[4]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailAccountStatusToggleNodeId('account-1'),
        kind: 'mail_account_status_toggle',
        name: 'Pause',
        parentId: toFilemakerMailAccountNodeId('account-1'),
        metadata: expect.objectContaining({
          status: 'active',
          nextStatus: 'paused',
        }),
      })
    );
    expect(nodes[5]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailAccountRecentNodeId('account-1'),
        kind: 'mail_account_recent',
        name: 'Recent',
        parentId: toFilemakerMailAccountNodeId('account-1'),
      })
    );
    expect(nodes[6]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailRecentThreadNodeId('account-1', 'Sent', 'thread-2'),
        type: 'file',
        kind: 'mail_recent_thread',
        name: 'Recent Follow-up',
        parentId: toFilemakerMailAccountRecentNodeId('account-1'),
        metadata: expect.objectContaining({
          threadId: 'thread-2',
          mailboxPath: 'Sent',
          messageCount: 2,
        }),
      })
    );
    expect(nodes[7]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailAccountSettingsNodeId('account-1'),
        kind: 'mail_account_settings',
        name: 'Settings',
        parentId: toFilemakerMailAccountNodeId('account-1'),
        metadata: expect.objectContaining({
          lastSyncedAt: null,
          lastSyncError: null,
        }),
      })
    );
    expect(nodes[8]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailFolderNodeId('account-1', 'INBOX'),
        kind: 'mail_folder',
        name: 'Inbox',
        parentId: toFilemakerMailAccountNodeId('account-1'),
        metadata: expect.objectContaining({
          threadCount: 4,
          unreadCount: 2,
        }),
      })
    );
    expect(nodes[9]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailThreadNodeId('account-1', 'INBOX', 'thread-1'),
        type: 'file',
        kind: 'mail_thread',
        name: 'Welcome',
        parentId: toFilemakerMailFolderNodeId('account-1', 'INBOX'),
        metadata: expect.objectContaining({
          threadId: 'thread-1',
          unreadCount: 2,
          messageCount: 1,
        }),
      })
    );
    expect(nodes[10]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailFolderNodeId('account-1', 'Sent'),
        kind: 'mail_folder',
        name: 'Sent',
      })
    );
  });

  it('builds attention nodes for paused or errored accounts', () => {
    const nodes = buildFilemakerMailMasterNodes({
      accounts: [
        {
          id: 'account-1',
          name: 'Support',
          emailAddress: 'support@example.com',
          provider: 'imap_smtp',
          status: 'paused',
          imapHost: 'imap.example.com',
          imapPort: 993,
          imapSecure: true,
          imapUser: 'support@example.com',
          imapPasswordSettingKey: 'imap-key',
          smtpHost: 'smtp.example.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'support@example.com',
          smtpPasswordSettingKey: 'smtp-key',
          fromName: null,
          replyToEmail: null,
          folderAllowlist: ['INBOX'],
          initialSyncLookbackDays: 30,
          maxMessagesPerSync: 100,
          lastSyncedAt: null,
          lastSyncError: 'Authentication failed',
          createdAt: '2026-03-28T10:00:00.000Z',
          updatedAt: '2026-03-28T10:00:00.000Z',
        },
      ],
      folders: [],
    });

    expect(nodes[0]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailAttentionNodeId(),
        kind: 'mail_attention',
        name: 'Needs Attention',
        parentId: null,
        metadata: expect.objectContaining({
          accountCount: 1,
        }),
      })
    );
    expect(nodes[1]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailAttentionAccountNodeId('account-1'),
        kind: 'mail_attention_account',
        name: 'Support',
        parentId: toFilemakerMailAttentionNodeId(),
        metadata: expect.objectContaining({
          accountId: 'account-1',
          status: 'paused',
          lastSyncError: 'Authentication failed',
        }),
      })
    );
  });

  it('parses account and folder node ids', () => {
    expect(parseFilemakerMailMasterNodeId(toFilemakerMailAttentionNodeId())).toEqual({
      kind: 'mail_attention',
    });
    expect(
      parseFilemakerMailMasterNodeId(toFilemakerMailAttentionAccountNodeId('account-1'))
    ).toEqual({
      kind: 'mail_attention_account',
      accountId: 'account-1',
    });
    expect(parseFilemakerMailMasterNodeId(toFilemakerMailNewAccountNodeId())).toEqual({
      kind: 'mail_new_account',
    });
    expect(parseFilemakerMailMasterNodeId(toFilemakerMailAccountNodeId('account-1'))).toEqual({
      kind: 'mail_account',
      accountId: 'account-1',
    });
    expect(
      parseFilemakerMailMasterNodeId(toFilemakerMailAccountComposeNodeId('account-1'))
    ).toEqual({
      kind: 'mail_account_compose',
      accountId: 'account-1',
    });
    expect(
      parseFilemakerMailMasterNodeId(toFilemakerMailAccountSyncNodeId('account-1'))
    ).toEqual({
      kind: 'mail_account_sync',
      accountId: 'account-1',
    });
    expect(
      parseFilemakerMailMasterNodeId(toFilemakerMailAccountStatusToggleNodeId('account-1'))
    ).toEqual({
      kind: 'mail_account_status_toggle',
      accountId: 'account-1',
    });
    expect(
      parseFilemakerMailMasterNodeId(toFilemakerMailAccountRecentNodeId('account-1'))
    ).toEqual({
      kind: 'mail_account_recent',
      accountId: 'account-1',
    });
    expect(
      parseFilemakerMailMasterNodeId(toFilemakerMailAccountSettingsNodeId('account-1'))
    ).toEqual({
      kind: 'mail_account_settings',
      accountId: 'account-1',
    });
    expect(
      parseFilemakerMailMasterNodeId(toFilemakerMailFolderNodeId('account-1', 'Archive/2026'))
    ).toEqual({
      kind: 'mail_folder',
      accountId: 'account-1',
      mailboxPath: 'Archive/2026',
    });
    expect(
      parseFilemakerMailMasterNodeId(
        toFilemakerMailThreadNodeId('account-1', 'Archive/2026', 'thread-1')
      )
    ).toEqual({
      kind: 'mail_thread',
      accountId: 'account-1',
      mailboxPath: 'Archive/2026',
      threadId: 'thread-1',
    });
    expect(
      parseFilemakerMailMasterNodeId(
        toFilemakerMailRecentThreadNodeId('account-1', 'Archive/2026', 'thread-1')
      )
    ).toEqual({
      kind: 'mail_recent_thread',
      accountId: 'account-1',
      mailboxPath: 'Archive/2026',
      threadId: 'thread-1',
    });
  });
});
