import { describe, expect, it } from 'vitest';

import {
  buildFilemakerMailMasterNodes,
  parseFilemakerMailMasterNodeId,
  toFilemakerMailAccountNodeId,
  toFilemakerMailFolderNodeId,
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
    });

    expect(nodes).toHaveLength(3);
    expect(nodes[0]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailAccountNodeId('account-1'),
        kind: 'mail_account',
        name: 'Support',
        parentId: null,
        metadata: expect.objectContaining({
          unreadCount: 2,
          folderCount: 2,
        }),
      })
    );
    expect(nodes[1]).toEqual(
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
    expect(nodes[2]).toEqual(
      expect.objectContaining({
        id: toFilemakerMailFolderNodeId('account-1', 'Sent'),
        kind: 'mail_folder',
        name: 'Sent',
      })
    );
  });

  it('parses account and folder node ids', () => {
    expect(parseFilemakerMailMasterNodeId(toFilemakerMailAccountNodeId('account-1'))).toEqual({
      kind: 'mail_account',
      accountId: 'account-1',
    });
    expect(
      parseFilemakerMailMasterNodeId(toFilemakerMailFolderNodeId('account-1', 'Archive/2026'))
    ).toEqual({
      kind: 'mail_folder',
      accountId: 'account-1',
      mailboxPath: 'Archive/2026',
    });
  });
});
