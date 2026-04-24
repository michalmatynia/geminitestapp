import {
  buildFilemakerMailComposeHref,
  formatFilemakerMailThreadParticipantsLabel,
} from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailAccount, FilemakerMailFolderSummary, FilemakerMailThread } from '../types';

type MailClientDashboardScope = 'all' | 'attention' | 'healthy';

const MAILBOX_ROLE_PRIORITY: Record<FilemakerMailFolderSummary['mailboxRole'], number> = {
  inbox: 0,
  sent: 1,
  drafts: 2,
  archive: 3,
  custom: 4,
  spam: 5,
  trash: 6,
};

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim() !== '';

const normalizeMailClientFilterValue = (value: string): string =>
  value.trim().toLowerCase();

const groupFilemakerMailFoldersByAccount = (
  folders: FilemakerMailFolderSummary[]
): Map<string, FilemakerMailFolderSummary[]> => {
  const nextMap = new Map<string, FilemakerMailFolderSummary[]>();

  folders.forEach((folder) => {
    const existing = nextMap.get(folder.accountId);
    if (existing !== undefined) {
      existing.push(folder);
      return;
    }

    nextMap.set(folder.accountId, [folder]);
  });

  return nextMap;
};

const getFilemakerMailPrimaryFolder = (
  folders: FilemakerMailFolderSummary[]
): FilemakerMailFolderSummary | null => {
  if (folders.length === 0) return null;

  return [...folders].sort((left, right) => {
    const roleDelta = MAILBOX_ROLE_PRIORITY[left.mailboxRole] - MAILBOX_ROLE_PRIORITY[right.mailboxRole];
    if (roleDelta !== 0) return roleDelta;

    const leftTimestamp = hasText(left.lastMessageAt) ? Date.parse(left.lastMessageAt) : 0;
    const rightTimestamp = hasText(right.lastMessageAt) ? Date.parse(right.lastMessageAt) : 0;
    if (leftTimestamp !== rightTimestamp) return rightTimestamp - leftTimestamp;

    return left.mailboxPath.localeCompare(right.mailboxPath);
  })[0] ?? null;
};

const hasFilemakerMailSyncIssue = (account: FilemakerMailAccount): boolean =>
  account.status !== 'active' || hasText(account.lastSyncError);

const getFilemakerMailAccountStatusLabel = (account: FilemakerMailAccount): string => {
  if (hasText(account.lastSyncError)) return 'Needs attention';
  if (account.status !== 'active') return account.status;
  return 'Active';
};

const matchesMailClientAccountScope = (
  account: FilemakerMailAccount,
  scope: MailClientDashboardScope
): boolean => {
  if (scope === 'all') return true;
  if (scope === 'attention') return hasFilemakerMailSyncIssue(account);
  return !hasFilemakerMailSyncIssue(account);
};

const matchesMailClientAccountQuery = (
  account: FilemakerMailAccount,
  folders: FilemakerMailFolderSummary[],
  rawQuery: string
): boolean => {
  const query = normalizeMailClientFilterValue(rawQuery);
  if (query === '') return true;

  const haystack = [
    account.name,
    account.emailAddress,
    account.status,
    account.lastSyncError ?? '',
    ...folders.map((folder) => folder.mailboxPath),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
};

const getMailClientThreadAccountTokens = (
  account: FilemakerMailAccount | null
): string[] => {
  if (account === null) return [];
  return [account.name, account.emailAddress];
};

const getMailClientThreadCampaignTokens = (
  campaignContext: FilemakerMailThread['campaignContext']
): string[] => {
  if (campaignContext === null || campaignContext === undefined) return [];
  return [
    campaignContext.campaignId,
    campaignContext.runId ?? '',
    campaignContext.deliveryId ?? '',
  ];
};

const matchesMailClientThreadQuery = (
  thread: FilemakerMailThread,
  account: FilemakerMailAccount | null,
  rawQuery: string
): boolean => {
  const query = normalizeMailClientFilterValue(rawQuery);
  if (query === '') return true;

  const haystack = [
    thread.subject,
    thread.snippet ?? '',
    thread.mailboxPath,
    formatFilemakerMailThreadParticipantsLabel(thread.participantSummary),
    ...getMailClientThreadAccountTokens(account),
    ...getMailClientThreadCampaignTokens(thread.campaignContext),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
};

const buildMailClientComposeHref = ({
  composeAccountId,
  dashboardQuery,
  focusedAccountId,
}: {
  composeAccountId: string | null;
  dashboardQuery: string;
  focusedAccountId: string | null;
}): string => {
  const trimmedDashboardQuery = dashboardQuery.trim();
  if (trimmedDashboardQuery === '') {
    return buildFilemakerMailComposeHref({ accountId: composeAccountId });
  }

  if (focusedAccountId === null) {
    return buildFilemakerMailComposeHref({
      accountId: composeAccountId,
      originPanel: 'search',
      searchAccountId: 'all',
      searchQuery: trimmedDashboardQuery,
    });
  }

  return buildFilemakerMailComposeHref({
    accountId: composeAccountId,
    originPanel: 'search',
    searchContextAccountId:
      composeAccountId !== null && composeAccountId !== focusedAccountId ? focusedAccountId : null,
    searchQuery: trimmedDashboardQuery,
  });
};

const buildMailClientSearchHref = ({
  dashboardQuery,
  focusedAccountId,
}: {
  dashboardQuery: string;
  focusedAccountId: string | null;
}): string => {
  const trimmedDashboardQuery = dashboardQuery.trim();

  return buildFilemakerMailSelectionHref({
    panel: 'search',
    accountId: focusedAccountId,
    searchQuery: trimmedDashboardQuery,
  });
};

const buildMailClientWorkspaceHref = ({
  focusedAccountId,
}: {
  focusedAccountId: string | null;
}): string =>
  focusedAccountId !== null
    ? buildFilemakerMailSelectionHref({
        accountId: focusedAccountId,
        panel: 'settings',
      })
    : '/admin/filemaker/mail';

export {
  buildMailClientComposeHref,
  buildMailClientSearchHref,
  buildMailClientWorkspaceHref,
  getFilemakerMailAccountStatusLabel,
  getFilemakerMailPrimaryFolder,
  groupFilemakerMailFoldersByAccount,
  hasFilemakerMailSyncIssue,
  hasText,
  matchesMailClientAccountScope,
  matchesMailClientAccountQuery,
  matchesMailClientThreadQuery,
  type MailClientDashboardScope,
  normalizeMailClientFilterValue,
};
