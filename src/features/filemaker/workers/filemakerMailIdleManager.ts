import 'server-only';

import type { ImapFlow } from 'imapflow';

import {
  safeSetInterval,
  safeClearInterval,
  safeSetTimeout,
  safeClearTimeout,
} from '@/shared/lib/timers';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import { listFilemakerMailAccounts } from '../server/filemaker-mail-service';
import {
  resolveFilemakerMailImapCredential,
  type FilemakerMailCredential,
} from '../server/mail/mail-auth';
import { createImapClient } from '../server/mail/mail-imap';
import type { FilemakerMailAccount } from '../types';
import { enqueueFilemakerMailSyncJob, startFilemakerMailSyncQueue } from './filemakerMailSyncQueue';
import {
  buildIdleRefreshKey,
  getIdleAccountState,
  managerState,
  patchIdleAccountState,
  type AccountState,
} from './filemakerMailIdleManager.state';

const LOG_SOURCE = 'filemaker-mail-idle';
const MIN_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const MAX_CONSECUTIVE_FAILURES = 6;
const SYNC_DEBOUNCE_MS = 1_500;

const isPushDisabledGlobally = (): boolean =>
  (process.env['DISABLE_FILEMAKER_MAIL_IDLE'] ?? '').toLowerCase() === 'true';

const scheduleReconnect = (state: AccountState): void => {
  const current = getIdleAccountState(state.accountId);
  if (current === null || current.stopped) return;
  const delay = Math.min(
    MAX_BACKOFF_MS,
    MIN_BACKOFF_MS * 2 ** Math.max(0, current.failureCount - 1)
  );
  if (current.reconnectTimer !== null) safeClearTimeout(current.reconnectTimer);
  const reconnectTimer = safeSetTimeout(() => {
    const nextState = patchIdleAccountState(state.accountId, { reconnectTimer: null });
    if (nextState !== null) startIdleConnection(nextState).catch(() => {});
  }, delay);
  patchIdleAccountState(state.accountId, { reconnectTimer });
};

const runDebouncedSync = async (accountId: string): Promise<void> => {
  const state = patchIdleAccountState(accountId, { syncTimer: null });
  if (state === null || state.stopped) return;
  try {
    startFilemakerMailSyncQueue();
    await enqueueFilemakerMailSyncJob({
      accountId,
      reason: 'idle',
    });
  } catch (error) {
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `Debounced sync enqueue failed for account ${accountId}`,
      error,
    }).catch(() => {});
  }
};

const scheduleDebouncedSync = (state: AccountState): void => {
  const current = getIdleAccountState(state.accountId);
  if (current === null || current.stopped || current.syncTimer !== null) return;
  const syncTimer = safeSetTimeout(() => {
    runDebouncedSync(state.accountId).catch(() => {});
  }, SYNC_DEBOUNCE_MS);
  patchIdleAccountState(state.accountId, { syncTimer });
};

const resolveActiveIdleAccount = async (
  state: AccountState
): Promise<FilemakerMailAccount | null> => {
  const account = (await listFilemakerMailAccounts()).find(
    (entry) => entry.id === state.accountId
  );
  if (account === undefined) {
    stopAccount(state.accountId);
    return null;
  }
  if (account.status !== 'active' || account.pushEnabled === false) {
    await closeClient(state);
    return null;
  }
  return account;
};

const resolveIdleCredential = async (
  account: FilemakerMailAccount
): Promise<FilemakerMailCredential | null> => {
  try {
    return await resolveFilemakerMailImapCredential(account);
  } catch (error) {
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `IMAP credential missing for ${account.emailAddress}; idle disabled.`,
      error,
      context: { accountId: account.id },
    }).catch(() => {});
    return null;
  }
};

const createIdleErrorHandler = (
  state: AccountState,
  account: FilemakerMailAccount
): ((label: string, error: unknown) => void) =>
  (label: string, error: unknown): void => {
    const current = getIdleAccountState(state.accountId);
    const failureCount = (current?.failureCount ?? state.failureCount) + 1;
    patchIdleAccountState(state.accountId, { failureCount });
    logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `IMAP IDLE ${label} for ${account.emailAddress}`,
      error,
      context: { accountId: account.id, failureCount },
    }).catch(() => {});
    closeClient(state).catch(() => {});
    if (failureCount >= MAX_CONSECUTIVE_FAILURES) {
      logSystemEvent({
        level: 'error',
        source: LOG_SOURCE,
        message: `IMAP IDLE giving up after ${failureCount} failures for ${account.emailAddress}`,
        context: { accountId: account.id },
      }).catch(() => {});
      return;
    }
    const nextState = getIdleAccountState(state.accountId);
    if (nextState !== null) scheduleReconnect(nextState);
  };

const attachIdleClientHandlers = (
  client: ImapFlow,
  state: AccountState,
  handleError: (label: string, error: unknown) => void
): void => {
  client.on('error', (error: unknown) => handleError('error', error));
  client.on('close', () => handleError('close', new Error('connection closed')));
  client.on('exists', () => scheduleDebouncedSync(state));
  client.on('expunge', () => scheduleDebouncedSync(state));
};

const openIdleClient = async (
  state: AccountState,
  account: FilemakerMailAccount,
  client: ImapFlow,
  handleError: (label: string, error: unknown) => void
): Promise<void> => {
  try {
    await client.connect();
    await client.mailboxOpen('INBOX', { readOnly: true });
    patchIdleAccountState(state.accountId, { failureCount: 0 });
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `IDLE connection established for ${account.emailAddress}`,
      context: { accountId: account.id },
    }).catch(() => {});
    scheduleDebouncedSync(state);
  } catch (error) {
    handleError('connect failed', error);
  }
};

const startIdleConnection = async (state: AccountState): Promise<void> => {
  if (state.stopped) return;
  const account = await resolveActiveIdleAccount(state);
  if (account === null) return;
  const credential = await resolveIdleCredential(account);
  if (credential === null) return;
  const client = createImapClient(account, credential);
  patchIdleAccountState(state.accountId, { client });
  const handleError = createIdleErrorHandler(state, account);
  attachIdleClientHandlers(client, state, handleError);
  await openIdleClient(state, account, client, handleError);
};

const closeClient = async (state: AccountState): Promise<void> => {
  const current = getIdleAccountState(state.accountId) ?? state;
  if (current.reconnectTimer !== null) {
    safeClearTimeout(current.reconnectTimer);
    patchIdleAccountState(state.accountId, { reconnectTimer: null });
  }
  if (current.syncTimer !== null) {
    safeClearTimeout(current.syncTimer);
    patchIdleAccountState(state.accountId, { syncTimer: null });
  }
  const client = current.client;
  patchIdleAccountState(state.accountId, { client: null });
  if (client === null) return;
  try {
    await client.logout();
  } catch {
    try {
      client.close();
    } catch {
      // ignore
    }
  }
};

const ensureAccount = async (account: FilemakerMailAccount): Promise<void> => {
  const existing = managerState.accountsById.get(account.id);
  const refreshKey = buildIdleRefreshKey(account);

  if (existing?.refreshKey === refreshKey && existing.client !== null) return;

  if (existing !== undefined) {
    patchIdleAccountState(existing.accountId, { stopped: true });
    await closeClient(existing);
  }

  if (account.status !== 'active' || account.pushEnabled === false) {
    managerState.accountsById.delete(account.id);
    return;
  }

  const nextState: AccountState = {
    accountId: account.id,
    client: null,
    stopped: false,
    failureCount: 0,
    reconnectTimer: null,
    syncTimer: null,
    refreshKey,
  };
  managerState.accountsById.set(account.id, nextState);
  await startIdleConnection(nextState);
};

const stopAccount = (accountId: string): void => {
  const existing = managerState.accountsById.get(accountId);
  if (existing === undefined) return;
  patchIdleAccountState(accountId, { stopped: true });
  closeClient(existing).catch(() => {});
  managerState.accountsById.delete(accountId);
};

const refreshAccounts = async (): Promise<void> => {
  if (isPushDisabledGlobally()) return;
  try {
    const accounts = await listFilemakerMailAccounts();
    const accountIds = new Set(accounts.map((account) => account.id));
    for (const existingId of Array.from(managerState.accountsById.keys())) {
      if (!accountIds.has(existingId)) stopAccount(existingId);
    }
    await Promise.all(accounts.map((account) => ensureAccount(account)));
  } catch (error) {
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: 'Failed to refresh filemaker mail idle accounts',
      error,
    }).catch(() => {});
  }
};

export const startFilemakerMailIdleManager = (): void => {
  if (managerState.started) return;
  if (isPushDisabledGlobally()) {
    logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Filemaker mail IDLE disabled by DISABLE_FILEMAKER_MAIL_IDLE=true',
    }).catch(() => {});
    return;
  }
  managerState.started = true;

  refreshAccounts().catch(() => {});
  managerState.refreshTimer = safeSetInterval(() => {
    refreshAccounts().catch(() => {});
  }, 60_000);
  if (typeof managerState.refreshTimer.unref === 'function') {
    managerState.refreshTimer.unref();
  }
};

export const stopFilemakerMailIdleManager = (): void => {
  if (managerState.refreshTimer !== null) {
    safeClearInterval(managerState.refreshTimer);
    managerState.refreshTimer = null;
  }
  const accountIds = Array.from(managerState.accountsById.keys());
  for (const id of accountIds) stopAccount(id);
  managerState.started = false;
};

export const filemakerMailIdleManagerTestOnly = {
  refreshAccounts,
  managerState,
};
