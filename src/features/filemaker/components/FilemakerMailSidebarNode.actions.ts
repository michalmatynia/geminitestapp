import type { useToast } from '@/shared/ui/primitives.public';

import {
  buildFilemakerMailSelectionHref as buildMailSelectionHref,
  fetchFilemakerMailJson as fetchJson,
  resolveFilemakerMailSyncNotice,
  type FilemakerMailSyncDispatchResponseLike,
} from '../mail-ui-helpers';
import type { FilemakerMailMasterNode } from '../mail-master-tree';
import type { FilemakerMailAccount } from '../types';
import type { FilemakerMailSidebarContextValue } from './FilemakerMailSidebarContext';
import type { FilemakerMailSidebarNodeModel } from './FilemakerMailSidebarNode.model';
import {
  buildFilemakerMailComposeHref as buildComposeHref,
  buildFilemakerMailThreadHref as buildThreadHref,
  toFilemakerAccountStatusToggleDraft as toAccountStatusToggleDraft,
} from './FilemakerMailSidebar.helpers';

type SidebarNodeToast = ReturnType<typeof useToast>['toast'];

type FilemakerMailSidebarNodeActionInput = {
  context: FilemakerMailSidebarContextValue;
  model: FilemakerMailSidebarNodeModel;
  navigate: (href: string) => void;
  toast: SidebarNodeToast;
};

type NodeAction<K extends FilemakerMailMasterNode['kind']> = (
  parsed: Extract<FilemakerMailMasterNode, { kind: K }>,
  input: FilemakerMailSidebarNodeActionInput
) => void;

type NodeActionMap = {
  [K in FilemakerMailMasterNode['kind']]: NodeAction<K>;
};

const resolveSearchAccountId = (context: FilemakerMailSidebarContextValue): 'all' | null =>
  context.isSearchContext && context.effectiveSearchAccountId === null ? 'all' : null;

const navigateToMailboxSelection = (
  input: FilemakerMailSidebarNodeActionInput,
  hrefInput: Parameters<typeof buildMailSelectionHref>[0]
): void => {
  input.navigate(buildMailSelectionHref(hrefInput));
};

const handleNewAccount: NodeAction<'mail_new_account'> = (_parsed, input) => {
  if (input.context.onNewMailbox !== undefined) {
    input.context.onNewMailbox();
    return;
  }
  input.navigate('/admin/filemaker/mail-client');
};

const handleSearch: NodeAction<'mail_search'> = (_parsed, input) => {
  if (input.context.onSelectSearch !== undefined) {
    input.context.onSelectSearch();
    return;
  }
  navigateToMailboxSelection(input, {
    accountId: input.context.effectiveSearchAccountId,
    panel: 'search',
    searchQuery: input.context.searchQuery,
  });
};

const handleAttention: NodeAction<'mail_attention'> = (_parsed, input) => {
  if (input.context.onSelectAttention !== undefined) {
    input.context.onSelectAttention();
    return;
  }
  navigateToMailboxSelection(input, { panel: 'attention' });
};

const handleAccountSettings = (
  accountId: string,
  input: FilemakerMailSidebarNodeActionInput
): void => {
  if (input.context.onSelectAccountSettings !== undefined) {
    input.context.onSelectAccountSettings(accountId);
    return;
  }
  navigateToMailboxSelection(input, {
    accountId,
    panel: 'settings',
    recentMailboxFilter: input.context.recentMailboxFilter,
    recentQuery: input.context.recentQuery,
    recentUnreadOnly: input.context.recentUnreadOnly,
  });
};

const handleAttentionAccount: NodeAction<'mail_attention_account'> = (parsed, input) => {
  handleAccountSettings(parsed.accountId, input);
};

const handleFolder: NodeAction<'mail_folder'> = (parsed, input) => {
  if (input.context.onSelectFolder !== undefined) {
    input.context.onSelectFolder({
      accountId: parsed.accountId,
      mailboxPath: parsed.mailboxPath,
    });
    return;
  }
  navigateToMailboxSelection(input, {
    accountId: parsed.accountId,
    mailboxPath: parsed.mailboxPath,
    recentMailboxFilter: input.context.recentMailboxFilter,
    recentQuery: input.context.recentQuery,
    recentUnreadOnly: input.context.recentUnreadOnly,
  });
};

const handleCompose: NodeAction<'mail_account_compose'> = (parsed, input) => {
  input.navigate(
    buildComposeHref({
      accountId: parsed.accountId,
      originPanel: input.context.originPanel,
      recentMailboxFilter: input.context.recentMailboxFilter,
      recentQuery: input.context.recentQuery,
      recentUnreadOnly: input.context.recentUnreadOnly,
      searchAccountId: resolveSearchAccountId(input.context),
      searchQuery: input.context.searchQuery,
    })
  );
};

const runMailboxSync = async (
  accountId: string,
  input: FilemakerMailSidebarNodeActionInput
): Promise<void> => {
  try {
    const result = await fetchJson<FilemakerMailSyncDispatchResponseLike>(
      `/api/filemaker/mail/accounts/${encodeURIComponent(accountId)}/sync`,
      { method: 'POST' }
    );
    await input.context.fetchAccountsAndFolders();
    const notice = resolveFilemakerMailSyncNotice(result);
    input.toast(notice.message, { variant: notice.variant });
  } catch (error) {
    input.toast(error instanceof Error ? error.message : 'Mailbox sync failed.', {
      variant: 'error',
    });
  } finally {
    input.context.setSyncingAccountId(null);
  }
};

const handleSync: NodeAction<'mail_account_sync'> = (parsed, input) => {
  if (input.context.syncingAccountId === parsed.accountId) return;
  input.context.setSyncingAccountId(parsed.accountId);
  void runMailboxSync(parsed.accountId, input);
};

const runStatusToggle = async (
  account: FilemakerMailAccount,
  nextStatus: FilemakerMailAccount['status'],
  input: FilemakerMailSidebarNodeActionInput
): Promise<void> => {
  try {
    const result = await fetchJson<{ account: FilemakerMailAccount }>(
      '/api/filemaker/mail/accounts',
      {
        body: JSON.stringify(toAccountStatusToggleDraft(account, nextStatus)),
        method: 'POST',
      }
    );
    input.context.setAccounts((current) =>
      current.map((entry) => (entry.id === result.account.id ? result.account : entry))
    );
    await Promise.resolve(input.context.onAccountUpdated?.(result.account));
    input.toast(nextStatus === 'paused' ? 'Mailbox paused.' : 'Mailbox resumed.', {
      variant: 'success',
    });
  } catch (error) {
    input.toast(error instanceof Error ? error.message : 'Failed to update mailbox status.', {
      variant: 'error',
    });
  } finally {
    input.context.setStatusUpdatingAccountId(null);
  }
};

const handleStatusToggle: NodeAction<'mail_account_status_toggle'> = (parsed, input) => {
  const account = input.context.accounts.find((entry) => entry.id === parsed.accountId) ?? null;
  if (account === null || input.context.statusUpdatingAccountId === parsed.accountId) return;
  const nextStatus = account.status === 'active' ? 'paused' : 'active';
  input.context.setStatusUpdatingAccountId(parsed.accountId);
  void runStatusToggle(account, nextStatus, input);
};

const handleRecent: NodeAction<'mail_account_recent'> = (parsed, input) => {
  if (input.context.onSelectRecent !== undefined) {
    input.context.onSelectRecent(parsed.accountId);
    return;
  }
  navigateToMailboxSelection(input, {
    accountId: parsed.accountId,
    panel: 'recent',
    recentMailboxFilter: input.context.recentMailboxFilter,
    recentQuery: input.context.recentQuery,
    recentUnreadOnly: input.context.recentUnreadOnly,
  });
};

const handleThreadNavigation = (
  parsed: Extract<FilemakerMailMasterNode, { kind: 'mail_thread' | 'mail_recent_thread' }>,
  input: FilemakerMailSidebarNodeActionInput
): void => {
  input.navigate(
    buildThreadHref({
      accountId: parsed.accountId,
      mailboxPath: parsed.mailboxPath,
      originPanel: input.context.originPanel,
      recentMailboxFilter: input.context.recentMailboxFilter,
      recentQuery: input.context.recentQuery,
      recentUnreadOnly: input.context.recentUnreadOnly,
      searchAccountId: resolveSearchAccountId(input.context),
      searchQuery: input.context.searchQuery,
      threadId: parsed.threadId,
    })
  );
};

const handleThread: NodeAction<'mail_thread'> = (parsed, input) => {
  handleThreadNavigation(parsed, input);
};

const handleRecentThread: NodeAction<'mail_recent_thread'> = (parsed, input) => {
  handleThreadNavigation(parsed, input);
};

const handleSettings: NodeAction<'mail_account_settings'> = (parsed, input) => {
  handleAccountSettings(parsed.accountId, input);
};

const handleAccount: NodeAction<'mail_account'> = (parsed, input) => {
  if (input.context.onSelectAccount !== undefined) {
    input.context.onSelectAccount(parsed.accountId);
    return;
  }
  handleAccountSettings(parsed.accountId, input);
};

const NODE_ACTIONS: NodeActionMap = {
  mail_account: handleAccount,
  mail_account_compose: handleCompose,
  mail_account_recent: handleRecent,
  mail_account_settings: handleSettings,
  mail_account_status_toggle: handleStatusToggle,
  mail_account_sync: handleSync,
  mail_attention: handleAttention,
  mail_attention_account: handleAttentionAccount,
  mail_folder: handleFolder,
  mail_new_account: handleNewAccount,
  mail_recent_thread: handleRecentThread,
  mail_search: handleSearch,
  mail_thread: handleThread,
};

export const handleFilemakerMailSidebarNodeClick = (
  input: FilemakerMailSidebarNodeActionInput
): void => {
  const parsed = input.model.parsed;
  if (parsed === null) return;
  const action = NODE_ACTIONS[parsed.kind] as (
    node: FilemakerMailMasterNode,
    actionInput: FilemakerMailSidebarNodeActionInput
  ) => void;
  action(parsed, input);
};
