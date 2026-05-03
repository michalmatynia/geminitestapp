import { Inbox } from 'lucide-react';
import React from 'react';

import type { ColumnDef } from '@tanstack/react-table';
import type { PanelAction } from '@/shared/contracts/ui/panels';

import { Badge, Checkbox } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { FilemakerEntityTablePage } from '../../components/shared/FilemakerEntityTablePage';
import { useMailPageContext } from '../FilemakerMail.context';

import type { FilemakerMailFolderSummary, FilemakerMailThread } from '../../types';

export interface MailThreadsSectionProps {
  isRecentPanel: boolean;
  selectedAccountLabel: string;
  selectedFolderLabel: string | null;
  selectedFolder: FilemakerMailFolderSummary | null;
  visibleThreads: FilemakerMailThread[];
  recentMailboxFilter: string;
  onRecentMailboxFilterChange: (value: string) => void;
  recentUnreadOnly: boolean;
  onRecentUnreadOnlyChange: (value: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  recentMailboxOptions: { value: string; label: string }[];
  tableActions: PanelAction[];
  columns: ColumnDef<FilemakerMailThread>[];
  isNavigationLoading: boolean;
  isThreadsLoading: boolean;
}

const buildMailThreadsTitle = (
  isRecentPanel: boolean,
  selectedAccountLabel: string,
  selectedFolderLabel: string | null
): string =>
  isRecentPanel
    ? `${selectedAccountLabel} / Recent`
    : `${selectedAccountLabel} / ${selectedFolderLabel}`;

const buildMailThreadsDescription = (isRecentPanel: boolean): string =>
  isRecentPanel
    ? 'Browse the latest synced conversations across this mailbox account.'
    : 'Browse synced mailbox threads and open a reply workspace.';

const buildEmptyThreadTitle = (isRecentPanel: boolean): string =>
  isRecentPanel ? 'No recent threads for this account yet' : 'No synced threads in this folder yet';

const buildEmptyThreadDescription = (isRecentPanel: boolean): string =>
  isRecentPanel ? 'Run mailbox sync or open a specific folder.' : 'Run mailbox sync or select another folder.';

function FolderThreadBadges({
  selectedFolder,
}: {
  selectedFolder: FilemakerMailFolderSummary;
}): React.JSX.Element {
  return (
    <>
      <Badge variant='outline' className='text-[10px]'>
        Threads: {selectedFolder.threadCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Unread: {selectedFolder.unreadCount}
      </Badge>
    </>
  );
}

function RecentThreadBadges({
  onRecentMailboxFilterChange,
  onRecentUnreadOnlyChange,
  query,
  recentCampaignId,
  recentDeliveryId,
  recentMailboxFilter,
  recentMailboxOptions,
  recentRunId,
  recentUnreadOnly,
  visibleThreads,
}: {
  onRecentMailboxFilterChange: (value: string) => void;
  onRecentUnreadOnlyChange: (value: boolean) => void;
  query: string;
  recentCampaignId: string;
  recentDeliveryId: string;
  recentMailboxFilter: string;
  recentMailboxOptions: { value: string; label: string }[];
  recentRunId: string;
  recentUnreadOnly: boolean;
  visibleThreads: FilemakerMailThread[];
}): React.JSX.Element {
  return (
    <>
      <Badge variant='outline' className='text-[10px]'>
        Threads: {visibleThreads.length}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Account Recent
      </Badge>
      {recentMailboxFilter !== '' ? (
        <Badge variant='outline' className='text-[10px]'>Mailbox: {recentMailboxFilter}</Badge>
      ) : null}
      {recentUnreadOnly ? <Badge variant='outline' className='text-[10px]'>Unread only</Badge> : null}
      {query !== '' ? <Badge variant='outline' className='text-[10px]'>Search: {query}</Badge> : null}
      {recentCampaignId !== '' ? <Badge variant='outline' className='text-[10px]'>Campaign: {recentCampaignId}</Badge> : null}
      {recentRunId !== '' ? <Badge variant='outline' className='text-[10px]'>Run: {recentRunId}</Badge> : null}
      {recentDeliveryId !== '' ? <Badge variant='outline' className='text-[10px]'>Delivery: {recentDeliveryId}</Badge> : null}
      <SelectSimple
        value={recentMailboxFilter}
        onValueChange={onRecentMailboxFilterChange}
        options={recentMailboxOptions}
        placeholder='All mailboxes'
        ariaLabel='Recent mailbox filter'
      />
      <label
        htmlFor='filemaker-mail-recent-unread-only'
        className='flex items-center gap-2 text-[11px] text-gray-300'
      >
        <Checkbox
          id='filemaker-mail-recent-unread-only'
          checked={recentUnreadOnly}
          onCheckedChange={(checked) => onRecentUnreadOnlyChange(checked === true)}
        />
        Unread only
      </label>
    </>
  );
}

export function MailThreadsSection(): React.JSX.Element {
  const {
    isRecentPanel,
    selectedAccountLabel,
    selectedFolderLabel,
    selectedFolder,
    visibleThreads,
    recentMailboxFilter,
    setRecentMailboxFilter: onRecentMailboxFilterChange,
    recentUnreadOnly,
    setRecentUnreadOnly: onRecentUnreadOnlyChange,
    recentCampaignId,
    recentRunId,
    recentDeliveryId,
    query,
    setQuery: onQueryChange,
    recentMailboxOptions,
    tableActions,
    columns,
    isNavigationLoading,
    isThreadsLoading,
  } = useMailPageContext();

  return (
    <FilemakerEntityTablePage
      title={buildMailThreadsTitle(isRecentPanel, selectedAccountLabel, selectedFolderLabel)}
      description={buildMailThreadsDescription(isRecentPanel)}
      icon={<Inbox className='size-4' />}
      actions={tableActions}
      badges={
        <>
          {selectedFolder !== null ? (
            <FolderThreadBadges selectedFolder={selectedFolder} />
          ) : (
            <RecentThreadBadges
              onRecentMailboxFilterChange={onRecentMailboxFilterChange}
              onRecentUnreadOnlyChange={onRecentUnreadOnlyChange}
              query={query}
              recentCampaignId={recentCampaignId}
              recentDeliveryId={recentDeliveryId}
              recentMailboxFilter={recentMailboxFilter}
              recentMailboxOptions={recentMailboxOptions}
              recentRunId={recentRunId}
              recentUnreadOnly={recentUnreadOnly}
              visibleThreads={visibleThreads}
            />
          )}
        </>
      }
      query={query}
      onQueryChange={onQueryChange}
      queryPlaceholder='Search subject, snippet, or participant...'
      columns={columns}
      data={visibleThreads}
      isLoading={isNavigationLoading || isThreadsLoading}
      emptyTitle={buildEmptyThreadTitle(isRecentPanel)}
      emptyDescription={buildEmptyThreadDescription(isRecentPanel)}
    />
  );
}
