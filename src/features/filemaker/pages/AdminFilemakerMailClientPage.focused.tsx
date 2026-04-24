import Link from 'next/link';
import React from 'react';

import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button, Card, CardContent } from '@/shared/ui/primitives.public';
import {
  buildFilemakerMailThreadHref,
  formatFilemakerMailFolderLabel,
  formatFilemakerMailLastSyncedLabel,
  formatFilemakerMailThreadParticipantsLabel,
} from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import { formatFilemakerMailboxAllowlist } from '../mail-utils';
import type {
  FilemakerMailAccount,
  FilemakerMailFolderSummary,
  FilemakerMailThread,
} from '../types';
import {
  buildMailClientComposeHref,
  buildMailClientSearchHref,
  buildMailClientWorkspaceHref,
  getFilemakerMailAccountStatusLabel,
  getFilemakerMailPrimaryFolder,
  hasFilemakerMailSyncIssue,
  hasText,
  type MailClientDashboardScope,
} from './AdminFilemakerMailClientPage.helpers';
import { buildMailClientDashboardHref } from './AdminFilemakerMailClientPage.route';
import {
  MailClientMailboxActions,
  MailClientMailboxShortcuts,
} from './AdminFilemakerMailClientPage.mailbox-actions';

const FOCUSED_FOLDER_SNAPSHOT_LIMIT = 3;
const FOCUSED_RECENT_THREAD_LIMIT = 2;

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

const getFocusedRecentThreads = (threads: FilemakerMailThread[]): FilemakerMailThread[] =>
  threads
    .slice()
    .sort((left, right) => {
      const leftTimestamp = Date.parse(left.lastMessageAt);
      const rightTimestamp = Date.parse(right.lastMessageAt);
      const normalizedLeft = Number.isNaN(leftTimestamp) ? 0 : leftTimestamp;
      const normalizedRight = Number.isNaN(rightTimestamp) ? 0 : rightTimestamp;
      if (normalizedLeft !== normalizedRight) return normalizedRight - normalizedLeft;
      return left.subject.localeCompare(right.subject);
    })
    .slice(0, FOCUSED_RECENT_THREAD_LIMIT);

type MailClientFocusedAccountSectionProps = {
  account: FilemakerMailAccount | null;
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  fallbackComposeAccountId: string | null;
  folders: FilemakerMailFolderSummary[];
  recentThreads: FilemakerMailThread[];
  isSyncing: boolean;
  isStatusUpdating: boolean;
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
};

function MailClientFocusedAccountSection({
  account,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  fallbackComposeAccountId,
  folders,
  recentThreads,
  isSyncing,
  isStatusUpdating,
  onSyncAccount,
  onToggleAccountStatus,
}: MailClientFocusedAccountSectionProps): React.JSX.Element | null {
  if (account === null) return null;

  const primaryFolder = getFilemakerMailPrimaryFolder(folders);
  const folderSnapshot = getFocusedFolderSnapshot(folders);
  const focusedRecentThreads = getFocusedRecentThreads(recentThreads);
  const composeHref = buildMailClientComposeHref({
    composeAccountId: account.status === 'active' ? account.id : fallbackComposeAccountId,
    dashboardQuery,
    focusedAccountId: account.id,
  });
  const unreadCount = folders.reduce((sum, folder) => sum + folder.unreadCount, 0);
  const allowlistLabel =
    account.folderAllowlist.length > 0
      ? formatFilemakerMailboxAllowlist(account.folderAllowlist)
      : 'Auto';
  const syncErrorMessage = hasText(account.lastSyncError) ? account.lastSyncError : null;

  return (
    <section className='space-y-4'>
      <SectionHeader
        title='Focused Mailbox'
        description='The dashboard is scoped to a single mailbox. Review connection health here or jump back to the full view.'
      />
      <Card
        data-testid={`mail-client-focused-account-${account.id}`}
        variant={hasFilemakerMailSyncIssue(account) ? 'warning' : 'subtle'}
        className='border-border/70'
      >
        <CardContent className='space-y-4 p-4'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='text-base font-semibold text-white'>{account.name}</div>
              <div className='text-sm text-gray-400'>{account.emailAddress}</div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Badge variant='outline'>Focused mailbox</Badge>
              <Badge variant='outline' className='capitalize'>
                {getFilemakerMailAccountStatusLabel(account)}
              </Badge>
              <Badge variant='outline'>Unread: {unreadCount}</Badge>
            </div>
          </div>

          <div className='grid gap-2 text-sm text-gray-400 md:grid-cols-2'>
            <div>{formatFilemakerMailLastSyncedLabel(account.lastSyncedAt)}</div>
            <div>Tracked folders: {folders.length}</div>
            <div>
              Primary folder:{' '}
              {primaryFolder !== null
                ? formatFilemakerMailFolderLabel(primaryFolder.mailboxPath, primaryFolder.mailboxRole)
                : 'Not set'}
            </div>
            <div>Allowlist: {allowlistLabel}</div>
          </div>

          {syncErrorMessage !== null ? (
            <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100'>
              {syncErrorMessage}
            </div>
          ) : (
            <MailClientFocusedSyncStatus
              account={account}
              dashboardQuery={dashboardQuery}
            />
          )}

          <MailClientMailboxActions
            account={account}
            composeHref={composeHref}
            dashboardAccountId={dashboardAccountId}
            dashboardQuery={dashboardQuery}
            dashboardScope={dashboardScope}
            primaryFolder={primaryFolder}
            onSyncAccount={onSyncAccount}
            onToggleAccountStatus={onToggleAccountStatus}
            isSyncing={isSyncing}
            isStatusUpdating={isStatusUpdating}
          />

          <MailClientFocusedRecentThreads
            accountId={account.id}
            dashboardQuery={dashboardQuery}
            dashboardScope={dashboardScope}
            recentThreads={focusedRecentThreads}
          />

          {folders.length > 0 ? (
            <MailClientFocusedFolderSnapshot
              accountId={account.id}
              folders={folderSnapshot}
              primaryFolder={primaryFolder}
            />
          ) : (
            <MailClientFocusedFolderStatus
              accountId={account.id}
              dashboardQuery={dashboardQuery}
              dashboardScope={dashboardScope}
            />
          )}

          {folders.length > 0 ? (
            <MailClientMailboxShortcuts accountId={account.id} folders={folders} />
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function MailClientFocusedSyncStatus({
  account,
  dashboardQuery,
}: {
  account: FilemakerMailAccount;
  dashboardQuery: string;
}): React.JSX.Element {
  const isHealthy = account.status === 'active';
  const href = buildMailClientDashboardHref({
    accountId: account.id,
    query: dashboardQuery,
    scope: isHealthy ? 'healthy' : 'attention',
  });

  return (
    <div
      data-testid='mail-client-focused-sync-status'
      className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-card/50 px-3 py-2'
    >
      <div className='text-sm text-gray-400'>
        {isHealthy ? 'Mailbox looks healthy. No sync errors recorded.' : 'This mailbox is currently paused.'}
      </div>
      <Button asChild variant='outline' size='sm'>
        <Link href={href}>{isHealthy ? 'Healthy Mailboxes' : 'Needs Attention'}</Link>
      </Button>
    </div>
  );
}

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
  const trimmedDashboardQuery = dashboardQuery.trim();
  const searchLabel = trimmedDashboardQuery !== '' ? 'Continue Search' : 'Search Mailbox';

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
        {folders.map((folder) => {
          const folderLabel = formatFilemakerMailFolderLabel(folder.mailboxPath, folder.mailboxRole);
          const isPrimaryFolder = primaryFolder?.id === folder.id;

          return (
            <div
              key={folder.id}
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
                Last activity: {formatFocusedFolderActivity(folder.lastMessageAt)}
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
        })}
      </div>
    </div>
  );
}

function MailClientFocusedRecentThreads({
  accountId,
  dashboardQuery,
  dashboardScope,
  recentThreads,
}: {
  accountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  recentThreads: FilemakerMailThread[];
}): React.JSX.Element {
  const latestThread = recentThreads[0] ?? null;
  const trimmedDashboardQuery = dashboardQuery.trim();
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
  const searchLabel = trimmedDashboardQuery !== '' ? 'Continue Search' : 'Search Mailbox';

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='space-y-1'>
          <div className='text-xs uppercase tracking-[0.18em] text-gray-500'>Latest Threads</div>
          <div className='text-xs text-gray-500'>Most recent activity for this mailbox in the current dashboard view.</div>
        </div>
        {latestThread !== null ? (
          <Button asChild variant='outline' size='sm'>
            <Link
              href={buildFilemakerMailThreadHref({
                threadId: latestThread.id,
                accountId: latestThread.accountId,
                mailboxPath: latestThread.mailboxPath,
                originPanel: trimmedDashboardQuery !== '' ? 'search' : null,
                searchQuery: trimmedDashboardQuery,
              })}
            >
              Open Latest Thread
            </Link>
          </Button>
        ) : null}
      </div>
      {recentThreads.length > 0 ? (
        <div className='grid gap-3 xl:grid-cols-2'>
          {recentThreads.map((thread) => (
            <div
              key={thread.id}
              data-testid={`mail-client-focused-thread-${thread.id}`}
              className='space-y-3 rounded-lg border border-border/70 bg-card/50 p-3'
            >
              <div className='space-y-1'>
                <div className='text-sm font-semibold text-white'>{thread.subject}</div>
                <div className='text-xs text-gray-400'>
                  {formatFilemakerMailThreadParticipantsLabel(thread.participantSummary)}
                </div>
              </div>
              <div className='line-clamp-2 text-sm text-gray-400'>
                {thread.snippet ?? 'No preview available.'}
              </div>
              <div className='flex flex-wrap gap-2 text-xs text-gray-500'>
                <Badge variant='outline'>{thread.mailboxPath}</Badge>
                <Badge variant='outline'>Unread: {thread.unreadCount}</Badge>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button asChild variant='outline' size='sm'>
                  <Link
                    href={buildFilemakerMailThreadHref({
                      threadId: thread.id,
                      accountId: thread.accountId,
                      mailboxPath: thread.mailboxPath,
                      originPanel: trimmedDashboardQuery !== '' ? 'search' : null,
                      searchQuery: trimmedDashboardQuery,
                    })}
                  >
                    Open Thread
                  </Link>
                </Button>
                <Button asChild variant='outline' size='sm'>
                  <Link
                    href={buildFilemakerMailSelectionHref({
                      accountId,
                      mailboxPath: thread.mailboxPath,
                    })}
                  >
                    Open Mailbox
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          data-testid='mail-client-focused-recent-status'
          className='space-y-3 rounded-lg border border-border/70 bg-card/50 p-3'
        >
          <div className='text-sm text-gray-400'>
            No recent threads match the current dashboard view for this mailbox.
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
      )}
    </div>
  );
}

export { MailClientFocusedAccountSection };
