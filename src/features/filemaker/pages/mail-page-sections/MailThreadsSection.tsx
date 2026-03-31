import { Inbox } from 'lucide-react';
import React from 'react';

import type { ColumnDef } from '@tanstack/react-table';
import type { PanelAction } from '@/shared/contracts/ui/panels';

import { Badge, Checkbox, SelectSimple } from '@/shared/ui';

import { FilemakerEntityTablePage } from '../../components/shared/FilemakerEntityTablePage';

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

export function MailThreadsSection({
  isRecentPanel,
  selectedAccountLabel,
  selectedFolderLabel,
  selectedFolder,
  visibleThreads,
  recentMailboxFilter,
  onRecentMailboxFilterChange,
  recentUnreadOnly,
  onRecentUnreadOnlyChange,
  query,
  onQueryChange,
  recentMailboxOptions,
  tableActions,
  columns,
  isNavigationLoading,
  isThreadsLoading,
}: MailThreadsSectionProps): React.JSX.Element {
  return (
    <FilemakerEntityTablePage
      title={
        isRecentPanel
          ? `${selectedAccountLabel} / Recent`
          : `${selectedAccountLabel} / ${selectedFolderLabel}`
      }
      description={
        isRecentPanel
          ? 'Browse the latest synced conversations across this mailbox account.'
          : 'Browse synced mailbox threads and open a reply workspace.'
      }
      icon={<Inbox className='size-4' />}
      actions={tableActions}
      badges={
        <>
          {selectedFolder ? (
            <>
              <Badge variant='outline' className='text-[10px]'>
                Threads: {selectedFolder.threadCount}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                Unread: {selectedFolder.unreadCount}
              </Badge>
            </>
          ) : (
            <>
              <Badge variant='outline' className='text-[10px]'>
                Threads: {visibleThreads.length}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                Account Recent
                  </Badge>
              {recentMailboxFilter ? (
                <Badge variant='outline' className='text-[10px]'>
                  Mailbox: {recentMailboxFilter}
                </Badge>
              ) : null}
              {recentUnreadOnly ? (
                <Badge variant='outline' className='text-[10px]'>
                  Unread only
                </Badge>
              ) : null}
              {query ? (
                <Badge variant='outline' className='text-[10px]'>
                  Search: {query}
                </Badge>
              ) : null}
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
          )}
        </>
      }
      query={query}
      onQueryChange={onQueryChange}
      queryPlaceholder='Search subject, snippet, or participant...'
      columns={columns}
      data={visibleThreads}
      isLoading={isNavigationLoading || isThreadsLoading}
      emptyTitle={
        isRecentPanel ? 'No recent threads for this account yet' : 'No synced threads in this folder yet'
      }
      emptyDescription={
        isRecentPanel
          ? 'Run mailbox sync or open a specific folder.'
          : 'Run mailbox sync or select another folder.'
      }
    />
  );
}
