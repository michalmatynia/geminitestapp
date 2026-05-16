import Link from 'next/link';
import React from 'react';

import { Badge, Button } from '@/shared/ui/primitives.public';

import { formatFilemakerMailFolderLabel } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailFolderSummary } from '../types';
import {
  buildMailClientSearchHref,
  buildMailClientWorkspaceHref,
  hasText,
  type MailClientDashboardScope,
} from './AdminFilemakerMailClientPage.helpers';
import { buildMailClientDashboardHref } from './AdminFilemakerMailClientPage.route';

const FOCUSED_FOLDER_SNAPSHOT_LIMIT = 3;

const formatFocusedFolderActivity = (value: string | null): string => {
  if (!hasText(value)) return 'No recent activity';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'No recent activity';
  return new Date(parsed).toLocaleString();
};

const getFocusedFolderSnapshot = (
  folders: FilemakerMailFolderSummary[]
): FilemakerMailFolderSummary[] =>
  folders
    .slice()
    .sort((left, right) => {
      const unreadDelta = right.unreadCount - left.unreadCount;
      if (unreadDelta !== 0) return unreadDelta;

      const threadDelta = right.threadCount - left.threadCount;
      if (threadDelta !== 0) return threadDelta;

      const leftTimestamp = hasText(left.lastMessageAt) ? Date.parse(left.lastMessageAt) : 0;
      const rightTimestamp = hasText(right.lastMessageAt) ? Date.parse(right.lastMessageAt) : 0;
      if (leftTimestamp !== rightTimestamp) return rightTimestamp - leftTimestamp;

      return left.mailboxPath.localeCompare(right.mailboxPath);
    })
    .slice(0, FOCUSED_FOLDER_SNAPSHOT_LIMIT);

function MailClientFocusedFolderStatus({
  accountId,
  dashboardQuery,
  dashboardScope,
}: {
  accountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
}): React.JSX.Element {
  const searchHref = buildMailClientSearchHref({
    dashboardQuery,
    focusedAccountId: accountId,
  });
  const workspaceHref = buildMailClientWorkspaceHref({
    focusedAccountId: accountId,
  });
  const showAllHref = buildMailClientDashboardHref({
    accountId: '',
    query: dashboardQuery,
    scope: dashboardScope,
  });
  const searchLabel = dashboardQuery.trim() !== '' ? 'Continue Search' : 'Search Mailbox';

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-xs uppercase tracking-[0.18em] text-gray-500'>Folder Snapshot</div>
        <div className='text-xs text-gray-500'>Tracked folders will appear here when available.</div>
      </div>
      <div
        data-testid='mail-client-focused-folder-status'
        className='space-y-3 rounded-lg border border-border/70 bg-card/50 p-3'
      >
        <div className='text-sm text-gray-400'>
          No tracked folders are available for this mailbox yet.
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline' size='sm'>
            <Link href={searchHref}>{searchLabel}</Link>
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href={workspaceHref}>Open Workspace</Link>
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href={showAllHref}>Show All</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function MailClientFocusedFolderCard({
  accountId,
  folder,
  primaryFolder,
}: {
  accountId: string;
  folder: FilemakerMailFolderSummary;
  primaryFolder: FilemakerMailFolderSummary | null;
}): React.JSX.Element {
  const folderLabel = formatFilemakerMailFolderLabel(folder.mailboxPath, folder.mailboxRole);
  const isPrimaryFolder = primaryFolder?.id === folder.id;

  return (
    <div
      data-testid={`mail-client-focused-folder-${folder.id}`}
      className='space-y-3 rounded-lg border border-border/70 bg-card/50 p-3'
    >
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div className='text-sm font-semibold text-white'>{folderLabel}</div>
        {isPrimaryFolder ? <Badge variant='outline'>Primary</Badge> : null}
      </div>
      <div className='flex flex-wrap gap-2 text-xs text-gray-500'>
        <Badge variant='outline'>Unread: {folder.unreadCount}</Badge>
        <Badge variant='outline'>Threads: {folder.threadCount}</Badge>
      </div>
      <div className='text-xs text-gray-400'>
        Last activity: {formatFocusedFolderActivity(folder.lastMessageAt ?? null)}
      </div>
      <Button asChild variant='outline' size='sm'>
        <Link
          href={buildFilemakerMailSelectionHref({
            accountId,
            mailboxPath: folder.mailboxPath,
          })}
        >
          Open {folderLabel}
        </Link>
      </Button>
    </div>
  );
}

function MailClientFocusedFolderSnapshot({
  accountId,
  folders,
  primaryFolder,
}: {
  accountId: string;
  folders: FilemakerMailFolderSummary[];
  primaryFolder: FilemakerMailFolderSummary | null;
}): React.JSX.Element {
  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-xs uppercase tracking-[0.18em] text-gray-500'>Folder Snapshot</div>
        <div className='text-xs text-gray-500'>Top folders by unread load and activity.</div>
      </div>
      <div className='grid gap-3 xl:grid-cols-3'>
        {folders.map((folder) => (
          <MailClientFocusedFolderCard
            key={folder.id}
            accountId={accountId}
            folder={folder}
            primaryFolder={primaryFolder}
          />
        ))}
      </div>
    </div>
  );
}

export {
  getFocusedFolderSnapshot,
  MailClientFocusedFolderSnapshot,
  MailClientFocusedFolderStatus,
};
