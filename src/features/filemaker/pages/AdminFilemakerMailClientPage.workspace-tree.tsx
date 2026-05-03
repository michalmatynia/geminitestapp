'use client';

import { Folder, Inbox, MailOpen, UserRound } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import { FolderTreeViewportV2, useMasterFolderTreeShell } from '@/shared/lib/foldertree/public';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { Badge } from '@/shared/ui/primitives.public';
import { FolderTreePanel } from '@/shared/ui/FolderTreePanel';
import { cn } from '@/shared/utils/ui-utils';

import {
  buildFilemakerMailMasterNodes,
  parseFilemakerMailMasterNodeId,
  toFilemakerMailAccountNodeId,
  toFilemakerMailFolderNodeId,
  toFilemakerMailThreadNodeId,
} from '../mail-master-tree';
import type {
  FilemakerMailAccount,
  FilemakerMailFolderSummary,
  FilemakerMailThread,
} from '../types';
import { isClientTreeNode, type MailClientSelection } from './AdminFilemakerMailClientPage.workspace-model';

type MailClientTreeHandlers = {
  onSelectAccount: (accountId: string) => void;
  onSelectFolder: (selection: { accountId: string; mailboxPath: string }) => void;
  onSelectThread: (selection: { accountId: string; mailboxPath: string; threadId: string }) => void;
};

const readNumberMeta = (
  input: FolderTreeViewportRenderNodeInput,
  key: string
): number => {
  const value = input.node.metadata?.[key];
  return typeof value === 'number' ? value : 0;
};

const readStringMeta = (
  input: FolderTreeViewportRenderNodeInput,
  key: string
): string => {
  const value = input.node.metadata?.[key];
  return typeof value === 'string' ? value : '';
};

const getTreeNodeIcon = (
  kind: string | null,
  mailboxRole: string
): typeof UserRound => {
  if (kind === 'mail_account') return UserRound;
  if (kind === 'mail_thread') return MailOpen;
  if (mailboxRole === 'inbox') return Inbox;
  return Folder;
};

const handleTreeNodeSelection = (
  parsed: ReturnType<typeof parseFilemakerMailMasterNodeId>,
  handlers: MailClientTreeHandlers
): void => {
  if (parsed?.kind === 'mail_account') {
    handlers.onSelectAccount(parsed.accountId);
    return;
  }
  if (parsed?.kind === 'mail_folder') {
    handlers.onSelectFolder({ accountId: parsed.accountId, mailboxPath: parsed.mailboxPath });
    return;
  }
  if (parsed?.kind === 'mail_thread') {
    handlers.onSelectThread({
      accountId: parsed.accountId,
      mailboxPath: parsed.mailboxPath,
      threadId: parsed.threadId,
    });
  }
};

function TreeCountBadges({
  threadCount,
  unreadCount,
}: {
  threadCount: number;
  unreadCount: number;
}): React.JSX.Element {
  return (
    <>
      {threadCount > 0 ? <Badge variant='outline'>{threadCount}</Badge> : null}
      {unreadCount > 0 ? <Badge variant='default'>{unreadCount}</Badge> : null}
    </>
  );
}

function MailClientTreeNode({
  input,
  handlers,
}: {
  input: FolderTreeViewportRenderNodeInput;
  handlers: MailClientTreeHandlers;
}): React.JSX.Element {
  const parsed = parseFilemakerMailMasterNodeId(input.node.id);
  const mailboxRole = readStringMeta(input, 'mailboxRole');
  const emailAddress = readStringMeta(input, 'emailAddress');
  const Icon = getTreeNodeIcon(parsed?.kind ?? null, mailboxRole);

  return (
    <button
      type='button'
      className={cn(
        'flex min-h-9 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition',
        input.isSelected
          ? 'bg-sky-500/15 text-foreground ring-1 ring-inset ring-sky-400/40'
          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
      )}
      style={{ paddingLeft: `${input.depth * 16 + 8}px` }}
      onClick={(): void => handleTreeNodeSelection(parsed, handlers)}
    >
      <TreeExpandToggle input={input} />
      <Icon className='size-4 shrink-0' />
      <span className='min-w-0 flex-1'>
        <span className='block truncate'>{input.node.name}</span>
        {parsed?.kind === 'mail_account' && emailAddress.trim() !== '' ? (
          <span className='block truncate text-[11px] text-muted-foreground/75'>
            {emailAddress}
          </span>
        ) : null}
      </span>
      <TreeCountBadges
        threadCount={readNumberMeta(input, 'threadCount')}
        unreadCount={readNumberMeta(input, 'unreadCount')}
      />
    </button>
  );
}

function TreeExpandToggle({
  input,
}: {
  input: FolderTreeViewportRenderNodeInput;
}): React.JSX.Element {
  if (!input.hasChildren) {
    return <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>;
  }
  return (
    <span
      aria-hidden='true'
      className='inline-flex size-4 items-center justify-center rounded text-xs hover:bg-foreground/10'
      onClick={(event): void => {
        event.preventDefault();
        event.stopPropagation();
        input.toggleExpand();
      }}
    >
      {input.isExpanded ? '▾' : '▸'}
    </span>
  );
}

const useClientTreeNodes = ({
  accounts,
  folders,
  threads,
}: {
  accounts: FilemakerMailAccount[];
  folders: FilemakerMailFolderSummary[];
  threads: FilemakerMailThread[];
}): MasterTreeNode[] =>
  useMemo(
    () =>
      buildFilemakerMailMasterNodes({
        accounts,
        folders,
        threads,
      }).filter(isClientTreeNode),
    [accounts, folders, threads]
  );

type MasterTreeNode = ReturnType<typeof buildFilemakerMailMasterNodes>[number];

const useSelectedTreeNodeId = (selection: MailClientSelection): string | null =>
  useMemo(() => {
    if (selection.accountId === null) return null;
    if (selection.mailboxPath === null) return toFilemakerMailAccountNodeId(selection.accountId);
    if (selection.threadId === null) {
      return toFilemakerMailFolderNodeId(selection.accountId, selection.mailboxPath);
    }
    return toFilemakerMailThreadNodeId(
      selection.accountId,
      selection.mailboxPath,
      selection.threadId
    );
  }, [selection.accountId, selection.mailboxPath, selection.threadId]);

const useExpandedTreeNodeIds = (
  accounts: FilemakerMailAccount[],
  selection: MailClientSelection
): string[] =>
  useMemo(() => {
    const accountNodeIds = accounts.map((account) => toFilemakerMailAccountNodeId(account.id));
    if (selection.accountId !== null && selection.mailboxPath !== null) {
      accountNodeIds.push(toFilemakerMailFolderNodeId(selection.accountId, selection.mailboxPath));
    }
    return accountNodeIds;
  }, [accounts, selection.accountId, selection.mailboxPath]);

export function MailClientAccountsTree({
  accounts,
  folders,
  threads,
  selection,
  isLoading,
  ...handlers
}: {
  accounts: FilemakerMailAccount[];
  folders: FilemakerMailFolderSummary[];
  threads: FilemakerMailThread[];
  selection: MailClientSelection;
  isLoading: boolean;
} & MailClientTreeHandlers): React.JSX.Element {
  const treeNodes = useClientTreeNodes({ accounts, folders, threads });
  const selectedNodeId = useSelectedTreeNodeId(selection);
  const initiallyExpandedNodeIds = useExpandedTreeNodeIds(accounts, selection);
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
  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.JSX.Element => (
      <MailClientTreeNode input={input} handlers={handlers} />
    ),
    [handlers]
  );

  return (
    <FolderTreePanel
      className='h-full rounded-none border-0 bg-transparent'
      bodyClassName='min-h-0 overflow-hidden'
      masterInstance='filemaker_mail'
      header={<MailClientAccountsTreeHeader />}
    >
      <div className='min-h-0 overflow-auto p-2'>
        <FolderTreeViewportV2
          controller={controller}
          scrollToNodeRef={scrollToNodeRef}
          rootDropUi={rootDropUi}
          enableDnd={false}
          emptyLabel={isLoading ? 'Loading accounts...' : 'No mailboxes configured'}
          renderNode={renderNode}
        />
      </div>
    </FolderTreePanel>
  );
}

function MailClientAccountsTreeHeader(): React.JSX.Element {
  return (
    <div className='border-b border-border/60 px-3 py-3'>
      <div className='text-sm font-semibold text-foreground'>Accounts</div>
      <div className='text-xs text-muted-foreground'>Mailboxes and synced folders</div>
    </div>
  );
}
