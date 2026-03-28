'use client';

import {
  Archive,
  Folder,
  Inbox,
  Mail,
  MailPlus,
  Send,
  Settings2,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { FolderTreeViewportV2, useMasterFolderTreeShell } from '@/features/foldertree/public';
import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { Badge, Button, useToast } from '@/shared/ui';
import { FolderTreePanel } from '@/shared/ui/FolderTreePanel';
import { cn } from '@/shared/utils';

import {
  buildFilemakerMailMasterNodes,
  parseFilemakerMailMasterNodeId,
  toFilemakerMailAccountNodeId,
  toFilemakerMailAccountSettingsNodeId,
} from '../mail-master-tree';

import type {
  FilemakerMailAccount,
  FilemakerMailFolderRole,
  FilemakerMailFolderSummary,
} from '../types';

type AccountsResponse = { accounts: FilemakerMailAccount[] };
type FoldersResponse = { folders: FilemakerMailFolderSummary[] };

type FilemakerMailSidebarProps = {
  selectedAccountId?: string | null;
  selectedMailboxPath?: string | null;
  selectedPanel?: 'account' | 'settings' | null;
  onSelectAccount?: (accountId: string) => void;
  onSelectAccountSettings?: (accountId: string) => void;
  onSelectFolder?: (selection: { accountId: string; mailboxPath: string }) => void;
  onNewMailbox?: () => void;
};

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
};

const getFolderIcon = (
  role: FilemakerMailFolderRole
): React.ComponentType<{ className?: string }> => {
  if (role === 'inbox') return Inbox;
  if (role === 'sent') return Send;
  if (role === 'archive') return Archive;
  if (role === 'spam') return ShieldAlert;
  if (role === 'trash') return Trash2;
  return Folder;
};

const renderCountBadge = (
  label: string,
  value: number,
  tone: 'default' | 'accent' = 'default'
) => (
  <span
    className={cn(
      'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
      tone === 'accent' ? 'bg-sky-500/20 text-sky-200' : 'bg-white/10 text-gray-300'
    )}
  >
    {label}
    {value}
  </span>
);

const buildMailSelectionHref = (input: {
  accountId?: string | null;
  mailboxPath?: string | null;
  panel?: 'account' | 'settings' | null;
}): string => {
  const search = new URLSearchParams();
  if (input.accountId) search.set('accountId', input.accountId);
  if (input.mailboxPath) search.set('mailboxPath', input.mailboxPath);
  if (input.accountId && input.panel === 'settings') search.set('panel', 'settings');
  const nextSearch = search.toString();
  return nextSearch ? `/admin/filemaker/mail?${nextSearch}` : '/admin/filemaker/mail';
};

const buildComposeHref = (input: {
  accountId?: string | null;
  mailboxPath?: string | null;
}): string => {
  const search = new URLSearchParams();
  if (input.accountId) search.set('accountId', input.accountId);
  if (input.mailboxPath) search.set('mailboxPath', input.mailboxPath);
  const nextSearch = search.toString();
  return nextSearch ? `/admin/filemaker/mail/compose?${nextSearch}` : '/admin/filemaker/mail/compose';
};

export function FilemakerMailSidebar({
  selectedAccountId = null,
  selectedMailboxPath = null,
  selectedPanel = null,
  onSelectAccount,
  onSelectAccountSettings,
  onSelectFolder,
  onNewMailbox,
}: FilemakerMailSidebarProps): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<FilemakerMailAccount[]>([]);
  const [folders, setFolders] = useState<FilemakerMailFolderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const treeNodes = useMemo(
    (): MasterTreeNode[] => buildFilemakerMailMasterNodes({ accounts, folders }),
    [accounts, folders]
  );
  const selectedNodeId = useMemo(() => {
    if (selectedAccountId && selectedMailboxPath) {
      const match = treeNodes.find(
        (node) =>
          node.kind === 'mail_folder' &&
          node.metadata?.['accountId'] === selectedAccountId &&
          node.metadata?.['mailboxPath'] === selectedMailboxPath
      );
      if (match) return match.id;
    }
    if (selectedAccountId && selectedPanel === 'settings') {
      return toFilemakerMailAccountSettingsNodeId(selectedAccountId);
    }
    if (selectedAccountId) {
      return toFilemakerMailAccountNodeId(selectedAccountId);
    }
    return null;
  }, [selectedAccountId, selectedMailboxPath, selectedPanel, treeNodes]);
  const initiallyExpandedNodeIds = useMemo(
    () => accounts.map((account) => toFilemakerMailAccountNodeId(account.id)),
    [accounts]
  );

  const {
    controller,
    appearance: { rootDropUi },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'filemaker_mail',
    nodes: treeNodes,
    selectedNodeId,
    initiallyExpandedNodeIds,
  });

  useEffect(() => {
    const load = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const [accountsResult, foldersResult] = await Promise.all([
          fetchJson<AccountsResponse>('/api/filemaker/mail/accounts'),
          fetchJson<FoldersResponse>('/api/filemaker/mail/folders'),
        ]);
        setAccounts(accountsResult.accounts);
        setFolders(foldersResult.folders);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to load Filemaker mail navigation.', {
          variant: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [toast]);

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.JSX.Element => {
      const parsed = parseFilemakerMailMasterNodeId(input.node.id);
      const unreadCount =
        typeof input.node.metadata?.['unreadCount'] === 'number'
          ? input.node.metadata['unreadCount']
          : 0;
      const threadCount =
        typeof input.node.metadata?.['threadCount'] === 'number'
          ? input.node.metadata['threadCount']
          : 0;
      const isAccount = parsed?.kind === 'mail_account';
      const isAccountSettings = parsed?.kind === 'mail_account_settings';
      const folderRole =
        typeof input.node.metadata?.['mailboxRole'] === 'string'
          ? (input.node.metadata['mailboxRole'] as FilemakerMailFolderRole)
          : 'custom';
      const Icon = isAccount ? Mail : isAccountSettings ? Settings2 : getFolderIcon(folderRole);
      const hasChildren = input.hasChildren;

      return (
        <button
          type='button'
          onClick={(event): void => {
            input.select(event);
            if (parsed?.kind === 'mail_folder') {
              if (onSelectFolder) {
                onSelectFolder({
                  accountId: parsed.accountId,
                  mailboxPath: parsed.mailboxPath,
                });
                return;
              }
              router.push(
                buildMailSelectionHref({
                  accountId: parsed.accountId,
                  mailboxPath: parsed.mailboxPath,
                })
              );
              return;
            }
            if (parsed?.kind === 'mail_account_settings') {
              if (onSelectAccountSettings) {
                onSelectAccountSettings(parsed.accountId);
                return;
              }
              router.push(
                buildMailSelectionHref({
                  accountId: parsed.accountId,
                  panel: 'settings',
                })
              );
              return;
            }
            if (parsed?.kind === 'mail_account') {
              if (onSelectAccount) {
                onSelectAccount(parsed.accountId);
                return;
              }
              router.push(
                buildMailSelectionHref({
                  accountId: parsed.accountId,
                  panel: 'account',
                })
              );
            }
          }}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition',
            input.isSelected
              ? 'bg-sky-500/15 text-white ring-1 ring-inset ring-sky-400/40'
              : 'text-gray-300 hover:bg-white/5'
          )}
          style={{ paddingLeft: `${input.depth * 16 + 8}px` }}
        >
          {hasChildren ? (
            <span
              aria-hidden='true'
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                input.toggleExpand();
              }}
              className='inline-flex size-4 items-center justify-center rounded hover:bg-white/5'
            >
              {input.isExpanded ? '▾' : '▸'}
            </span>
          ) : (
            <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>
              •
            </span>
          )}
          <Icon className='size-4 shrink-0 text-gray-400' />
          <span className='min-w-0 flex-1 truncate'>{input.node.name}</span>
          {threadCount > 0 ? renderCountBadge('', threadCount) : null}
          {unreadCount > 0 ? renderCountBadge('', unreadCount, 'accent') : null}
        </button>
      );
    },
    [router]
  );

  return (
    <div className='rounded-lg border border-border/60 bg-card/25 p-3'>
      <FolderTreePanel
        className='min-h-[680px]'
        bodyClassName='min-h-0 overflow-hidden'
        masterInstance='filemaker_mail'
        header={
          <div className='space-y-3 border-b border-border/60 px-1 pb-3'>
            <div>
              <div className='text-sm font-semibold text-white'>Mail Navigation</div>
              <div className='text-xs text-gray-500'>
                Manage mailbox accounts and browse synced folders.
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={(): void => {
                  if (onNewMailbox) {
                    onNewMailbox();
                    return;
                  }
                  router.push('/admin/filemaker/mail');
                }}
              >
                New Mailbox
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={(): void => {
                  router.push(
                    buildComposeHref({
                      accountId: selectedAccountId,
                      mailboxPath: selectedMailboxPath,
                    })
                  );
                }}
              >
                <MailPlus className='mr-2 size-4' />
                Compose
              </Button>
            </div>
            <div className='flex flex-wrap gap-2 text-[10px]'>
              <Badge variant='outline'>Accounts: {accounts.length}</Badge>
              <Badge variant='outline'>Folders: {folders.length}</Badge>
            </div>
          </div>
        }
      >
        <div className='min-h-0 overflow-auto p-2'>
          <FolderTreeViewportV2
            controller={controller}
            scrollToNodeRef={scrollToNodeRef}
            rootDropUi={rootDropUi}
            enableDnd={false}
            emptyLabel={isLoading ? 'Loading mailboxes...' : 'No mailboxes configured'}
            renderNode={renderNode}
          />
        </div>
      </FolderTreePanel>
    </div>
  );
}
