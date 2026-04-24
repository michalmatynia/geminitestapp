import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { setupAdminFilemakerMailPagesTest } from './AdminFilemakerMailPages.test-support';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import {
  toFilemakerMailAccountNodeId,
  toFilemakerMailFolderNodeId,
} from '@/features/filemaker/mail-master-tree';
import {
  FilemakerMailSidebarContext,
  type FilemakerMailSidebarContextValue,
} from '@/features/filemaker/components/FilemakerMailSidebarContext';

setupAdminFilemakerMailPagesTest();

const baseContextValue = {
  accounts: [],
  setAccounts: vi.fn(),
  syncingAccountId: null,
  setSyncingAccountId: vi.fn(),
  statusUpdatingAccountId: null,
  setStatusUpdatingAccountId: vi.fn(),
  fetchAccountsAndFolders: vi.fn(async () => undefined),
  effectiveSearchAccountId: null,
  searchQuery: null,
  recentMailboxFilter: null,
  recentUnreadOnly: false,
  recentQuery: null,
  originPanel: null,
  selectedPanel: null,
  isSearchContext: false,
} satisfies FilemakerMailSidebarContextValue;

const createInput = (
  overrides: Partial<FolderTreeViewportRenderNodeInput> = {}
): FolderTreeViewportRenderNodeInput => ({
  node: {
    id: toFilemakerMailAccountNodeId('account-1'),
    name: 'Support inbox',
    parentId: null,
    kind: 'mail_account',
    metadata: {
      accountId: 'account-1',
      emailAddress: 'support@example.com',
      status: 'active',
    },
  },
  depth: 0,
  hasChildren: true,
  isExpanded: true,
  isSelected: false,
  select: vi.fn(),
  toggleExpand: vi.fn(),
  ...overrides,
});

const createFolderInput = (
  overrides: Partial<FolderTreeViewportRenderNodeInput> = {}
): FolderTreeViewportRenderNodeInput => ({
  node: {
    id: toFilemakerMailFolderNodeId('account-1', 'INBOX'),
    name: 'Inbox',
    parentId: toFilemakerMailAccountNodeId('account-1'),
    kind: 'mail_folder',
    metadata: {
      accountId: 'account-1',
      mailboxPath: 'INBOX',
      mailboxRole: 'inbox',
      unreadCount: 2,
      threadCount: 5,
    },
  },
  depth: 1,
  hasChildren: false,
  isExpanded: true,
  isSelected: false,
  select: vi.fn(),
  toggleExpand: vi.fn(),
  ...overrides,
});

describe('FilemakerMailSidebarNode', () => {
  it('does not use folder-tree select for in-page account selection callbacks', async () => {
    const { FilemakerMailSidebarNode } = await import(
      '@/features/filemaker/components/FilemakerMailSidebarNode'
    );
    const onSelectAccount = vi.fn();
    const input = createInput();

    render(
      <FilemakerMailSidebarContext.Provider
        value={{
          ...baseContextValue,
          onSelectAccount,
        }}
      >
        <FilemakerMailSidebarNode input={input} />
      </FilemakerMailSidebarContext.Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Support inbox/ }));

    expect(input.select).not.toHaveBeenCalled();
    expect(onSelectAccount).toHaveBeenCalledWith('account-1');
  });

  it('does not use folder-tree select for in-page folder selection callbacks', async () => {
    const { FilemakerMailSidebarNode } = await import(
      '@/features/filemaker/components/FilemakerMailSidebarNode'
    );
    const onSelectFolder = vi.fn();
    const input = createFolderInput();

    render(
      <FilemakerMailSidebarContext.Provider
        value={{
          ...baseContextValue,
          onSelectFolder,
        }}
      >
        <FilemakerMailSidebarNode input={input} />
      </FilemakerMailSidebarContext.Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Inbox/ }));

    expect(input.select).not.toHaveBeenCalled();
    expect(onSelectFolder).toHaveBeenCalledWith({
      accountId: 'account-1',
      mailboxPath: 'INBOX',
    });
  });
});
