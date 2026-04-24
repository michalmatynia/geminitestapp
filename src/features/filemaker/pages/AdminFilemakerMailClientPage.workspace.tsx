'use client';

import { Inbox, Mail } from 'lucide-react';
import React, { useCallback } from 'react';

import { Button } from '@/shared/ui/primitives.public';

import type { FilemakerMailThread } from '../types';
import { MailClientAccountsTree } from './AdminFilemakerMailClientPage.workspace-tree';
import { MailClientReaderEditor } from './AdminFilemakerMailClientPage.workspace-reader';
import { MailClientThreadList } from './AdminFilemakerMailClientPage.workspace-list';
import {
  getPrimaryFolderPath,
  getSelectedMailboxLabel,
  type MailClientWorkspaceProps,
} from './AdminFilemakerMailClientPage.workspace-model';
import {
  useMailClientDetail,
  useMailClientReplySender,
  useMailClientSelection,
  useMailClientThreads,
  useSelectedAccount,
} from './AdminFilemakerMailClientPage.workspace-hooks';
import { MailClientStatusLine } from './AdminFilemakerMailClientPage.workspace-shared';

type WorkspaceMainProps = {
  loadError: string | null;
  selectedAccount: ReturnType<typeof useSelectedAccount>;
  selectedMailboxLabel: string | null;
  selection: ReturnType<typeof useMailClientSelection>['selection'];
  threadsState: ReturnType<typeof useMailClientThreads>;
  detailState: ReturnType<typeof useMailClientDetail>;
  isSending: boolean;
  onOpenPrimaryFolder: () => void;
  onRefreshThreads: () => void;
  onSelectThread: (thread: FilemakerMailThread) => void;
  onSendReply: () => void;
};

type WorkspaceViewModel = Omit<
  WorkspaceMainProps,
  'loadError'
> & {
  selectAccount: (accountId: string) => void;
  selectFolder: (selection: { accountId: string; mailboxPath: string }) => void;
  selectTreeThread: ReturnType<typeof useMailClientSelection>['applySelection'];
};

type WorkspaceSelectionActions = Pick<
  WorkspaceViewModel,
  'onOpenPrimaryFolder' | 'onRefreshThreads' | 'onSelectThread' | 'selectAccount' | 'selectFolder' | 'selectTreeThread'
>;

function SelectionBanner({
  selectedAccount,
  selectedMailboxLabel,
  selection,
  onOpenPrimaryFolder,
}: Pick<
  WorkspaceMainProps,
  'selectedAccount' | 'selectedMailboxLabel' | 'selection' | 'onOpenPrimaryFolder'
>): React.JSX.Element | null {
  if (selectedAccount !== null && selection.mailboxPath === null) {
    return (
      <div className='flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground'>
        <Mail className='size-4' />
        <span className='min-w-0 truncate'>Showing all synced folders for {selectedAccount.name}.</span>
        <Button type='button' variant='outline' size='sm' onClick={onOpenPrimaryFolder}>
          Open primary folder
        </Button>
      </div>
    );
  }
  if (selectedMailboxLabel === null) return null;
  return (
    <div className='flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2 text-xs text-muted-foreground'>
      <Inbox className='size-4' />
      <span className='min-w-0 truncate'>Folder: {selectedMailboxLabel}</span>
    </div>
  );
}

function WorkspaceMain({
  detailState,
  isSending,
  loadError,
  selectedAccount,
  selectedMailboxLabel,
  selection,
  threadsState,
  onOpenPrimaryFolder,
  onRefreshThreads,
  onSelectThread,
  onSendReply,
}: WorkspaceMainProps): React.JSX.Element {
  if (loadError !== null && selectedAccount === null) {
    return (
      <div className='border-b border-border/60 p-4'>
        <MailClientStatusLine tone='error'>{loadError}</MailClientStatusLine>
      </div>
    );
  }
  return (
    <>
      <MailClientThreadList
        account={selectedAccount}
        error={threadsState.threadsError}
        isLoading={threadsState.isThreadsLoading}
        mailboxPath={selection.mailboxPath}
        selectedThreadId={selection.threadId}
        threads={threadsState.threads}
        onRefresh={onRefreshThreads}
        onSelectThread={onSelectThread}
      />
      <div className='grid min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
        <SelectionBanner
          selectedAccount={selectedAccount}
          selectedMailboxLabel={selectedMailboxLabel}
          selection={selection}
          onOpenPrimaryFolder={onOpenPrimaryFolder}
        />
        <MailClientReaderEditor
          detail={detailState.detail}
          error={detailState.detailError}
          isLoading={detailState.isDetailLoading}
          isSending={isSending}
          replyBcc={detailState.replyBcc}
          replyCc={detailState.replyCc}
          replyHtml={detailState.replyHtml}
          replySubject={detailState.replySubject}
          replyTo={detailState.replyTo}
          onReplyBccChange={detailState.setReplyBcc}
          onReplyCcChange={detailState.setReplyCc}
          onReplyHtmlChange={detailState.setReplyHtml}
          onReplySubjectChange={detailState.setReplySubject}
          onReplyToChange={detailState.setReplyTo}
          onSendReply={onSendReply}
        />
      </div>
    </>
  );
}

function useWorkspaceSelectionActions({
  folders,
  loadMailboxData,
  selectionController,
  threadsState,
}: {
  folders: MailClientWorkspaceProps['folders'];
  loadMailboxData: MailClientWorkspaceProps['loadMailboxData'];
  selectionController: ReturnType<typeof useMailClientSelection>;
  threadsState: ReturnType<typeof useMailClientThreads>;
}): WorkspaceSelectionActions {
  const selectAccount = useCallback(
    (accountId: string): void => selectionController.applySelection({ accountId, mailboxPath: null, threadId: null }),
    [selectionController]
  );
  const selectThread = useCallback(
    (thread: FilemakerMailThread): void => selectionController.applySelection({
      accountId: thread.accountId,
      mailboxPath: thread.mailboxPath,
      threadId: thread.id,
    }),
    [selectionController]
  );
  const selectFolder = useCallback(
    (selection: { accountId: string; mailboxPath: string }): void =>
      selectionController.applySelection({ ...selection, threadId: null }),
    [selectionController]
  );
  const openPrimaryFolder = useCallback((): void => {
    if (selectionController.selection.accountId === null) return;
    selectionController.applySelection({
      accountId: selectionController.selection.accountId,
      mailboxPath: getPrimaryFolderPath(folders, selectionController.selection.accountId),
      threadId: null,
    });
  }, [folders, selectionController]);
  const refreshThreads = useCallback((): void => {
    threadsState.refreshThreads();
    void loadMailboxData();
  }, [loadMailboxData, threadsState]);

  return {
    onOpenPrimaryFolder: openPrimaryFolder,
    onRefreshThreads: refreshThreads,
    onSelectThread: selectThread,
    selectAccount,
    selectFolder,
    selectTreeThread: selectionController.applySelection,
  };
}

function useMailClientWorkspaceViewModel(props: MailClientWorkspaceProps): WorkspaceViewModel {
  const { accounts, firstActiveAccount, folders, loadMailboxData } = props;
  const selectionController = useMailClientSelection({ accounts, firstActiveAccount });
  const threadsState = useMailClientThreads(selectionController);
  const detailState = useMailClientDetail(selectionController.selection.threadId);
  const selectedAccount = useSelectedAccount(accounts, selectionController.selection.accountId);
  const selectedMailboxLabel = getSelectedMailboxLabel({
    accountId: selectionController.selection.accountId,
    folders,
    mailboxPath: selectionController.selection.mailboxPath,
  });
  const replySender = useMailClientReplySender({
    detailState,
    loadMailboxData,
    refreshDetail: detailState.refreshDetail,
    refreshThreads: threadsState.refreshThreads,
    threadId: selectionController.selection.threadId,
  });
  const actions = useWorkspaceSelectionActions({
    folders,
    loadMailboxData,
    selectionController,
    threadsState,
  });

  return {
    detailState,
    isSending: replySender.isSending,
    selectedAccount,
    selectedMailboxLabel,
    selection: selectionController.selection,
    threadsState,
    ...actions,
    onSendReply: replySender.sendReply,
  };
}

function WorkspaceLayout({
  accounts,
  folders,
  isLoading,
  loadError,
  viewModel,
}: {
  accounts: MailClientWorkspaceProps['accounts'];
  folders: MailClientWorkspaceProps['folders'];
  isLoading: boolean;
  loadError: string | null;
  viewModel: WorkspaceViewModel;
}): React.JSX.Element {
  return (
    <div className='grid min-h-[calc(100vh-13rem)] overflow-hidden border border-border/60 bg-card/15 lg:grid-cols-[320px_minmax(0,1fr)]'>
      <aside className='min-h-0 border-b border-border/60 lg:border-b-0 lg:border-r'>
        <MailClientAccountsTree
          accounts={accounts}
          folders={folders}
          threads={viewModel.threadsState.threads}
          selection={viewModel.selection}
          isLoading={isLoading}
          onSelectAccount={viewModel.selectAccount}
          onSelectFolder={viewModel.selectFolder}
          onSelectThread={viewModel.selectTreeThread}
        />
      </aside>
      <main className='grid min-h-0 grid-rows-[minmax(240px,38vh)_minmax(420px,1fr)]'>
        <WorkspaceMain
          detailState={viewModel.detailState}
          isSending={viewModel.isSending}
          loadError={loadError}
          selectedAccount={viewModel.selectedAccount}
          selectedMailboxLabel={viewModel.selectedMailboxLabel}
          selection={viewModel.selection}
          threadsState={viewModel.threadsState}
          onOpenPrimaryFolder={viewModel.onOpenPrimaryFolder}
          onRefreshThreads={viewModel.onRefreshThreads}
          onSelectThread={viewModel.onSelectThread}
          onSendReply={viewModel.onSendReply}
        />
      </main>
    </div>
  );
}

export function MailClientWorkspace(props: MailClientWorkspaceProps): React.JSX.Element {
  const viewModel = useMailClientWorkspaceViewModel(props);
  return (
    <WorkspaceLayout
      accounts={props.accounts}
      folders={props.folders}
      isLoading={props.isLoading}
      loadError={props.loadError}
      viewModel={viewModel}
    />
  );
}
