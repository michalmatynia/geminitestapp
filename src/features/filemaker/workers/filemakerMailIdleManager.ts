import 'server-only';

import type { ImapFlow } from 'imapflow';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { readSecretSettingValues } from '@/shared/lib/settings/secret-settings';

import { listFilemakerMailAccounts } from '../server/filemaker-mail-service';
import * as mailServerUtils from '../server/mail/mail-utils';
import { createImapClient } from '../server/mail/mail-imap';
import type { FilemakerMailAccount } from '../types';
import { enqueueFilemakerMailSyncJob, startFilemakerMailSyncQueue } from './filemakerMailSyncQueue';

const LOG_SOURCE = 'filemaker-mail-idle';
const MIN_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const MAX_CONSECUTIVE_FAILURES = 6;
const SYNC_DEBOUNCE_MS = 1_500;

type AccountState = {
  accountId: string;
  client: ImapFlow | null;
  stopped: boolean;
  failureCount: number;
  reconnectTimer: NodeJS.Timeout | null;
  syncTimer: NodeJS.Timeout | null;
  refreshKey: string;
};

type ManagerState = {
  started: boolean;
  accountsById: Map<string, AccountState>;
  refreshTimer: NodeJS.Timeout | null;
};

const globalWithState = globalThis as typeof globalThis & {
  __filemakerMailIdleManagerState__?: ManagerState;
};

const managerState =
  globalWithState.__filemakerMailIdleManagerState__ ??
  (globalWithState.__filemakerMailIdleManagerState__ = {
    started: false,
    accountsById: new Map(),
    refreshTimer: null,
  });

const isPushDisabledGlobally = (): boolean =>
  (process.env['DISABLE_FILEMAKER_MAIL_IDLE'] ?? '').toLowerCase() === 'true';

const buildRefreshKey = (account: FilemakerMailAccount): string =>
  [
    account.status,
    String(account.pushEnabled ?? true),
    account.imapHost,
    String(account.imapPort),
    String(account.imapSecure),
    account.imapUser,
    account.updatedAt ?? '',
  ].join('|');

const scheduleReconnect = (state: AccountState): void => {
  if (state.stopped) return;
  const delay = Math.min(
    MAX_BACKOFF_MS,
    MIN_BACKOFF_MS * 2 ** Math.max(0, state.failureCount - 1)
  );
  if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    startIdleConnection(state).catch(() => {});
  }, delay);
};

const scheduleDebouncedSync = (state: AccountState): void => {
  if (state.stopped) return;
  if (state.syncTimer) return;
  state.syncTimer = setTimeout(async () => {
    state.syncTimer = null;
    try {
      startFilemakerMailSyncQueue();
      await enqueueFilemakerMailSyncJob({
        accountId: state.accountId,
        reason: 'idle',
      });
    } catch (error) {
      await logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: `Debounced sync enqueue failed for account ${state.accountId}`,
        error,
      }).catch(() => {});
    }
  }, SYNC_DEBOUNCE_MS);
};

const startIdleConnection = async (state: AccountState): Promise<void> => {
  if (state.stopped) return;
  const account = (await listFilemakerMailAccounts()).find(
    (entry) => entry.id === state.accountId
  );
  if (!account) {
    stopAccount(state.accountId);
    return;
  }
  if (account.status !== 'active' || account.pushEnabled === false) {
    await closeClient(state);
    return;
  }

  const passwordKey = mailServerUtils.resolveAccountSecretSettingKey(account, 'imap_password');
  const secrets = await readSecretSettingValues([passwordKey]);
  const password = secrets[passwordKey];
  if (!password) {
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `IMAP password missing for ${account.emailAddress}; idle disabled.`,
      context: { accountId: account.id },
    }).catch(() => {});
    return;
  }

  const client = createImapClient(account, password);
  state.client = client;

  const handleError = (label: string, error: unknown): void => {
    logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `IMAP IDLE ${label} for ${account.emailAddress}`,
      error,
      context: { accountId: account.id, failureCount: state.failureCount },
    }).catch(() => {});
    state.failureCount += 1;
    closeClient(state).catch(() => {});
    if (state.failureCount >= MAX_CONSECUTIVE_FAILURES) {
      logSystemEvent({
        level: 'error',
        source: LOG_SOURCE,
        message: `IMAP IDLE giving up after ${state.failureCount} failures for ${account.emailAddress}`,
        context: { accountId: account.id },
      }).catch(() => {});
      return;
    }
    scheduleReconnect(state);
  };

  client.on('error', (error: unknown) => handleError('error', error));
  client.on('close', () => handleError('close', new Error('connection closed')));
  client.on('exists', () => scheduleDebouncedSync(state));
  client.on('expunge', () => scheduleDebouncedSync(state));

  try {
    await client.connect();
    await client.mailboxOpen('INBOX', { readOnly: true });
    state.failureCount = 0;
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

const closeClient = async (state: AccountState): Promise<void> => {
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  if (state.syncTimer) {
    clearTimeout(state.syncTimer);
    state.syncTimer = null;
  }
  const client = state.client;
  state.client = null;
  if (!client) return;
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
  const refreshKey = buildRefreshKey(account);

  if (existing && existing.refreshKey === refreshKey && existing.client) return;

  if (existing) {
    existing.stopped = true;
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
  if (!existing) return;
  existing.stopped = true;
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
    for (const account of accounts) {
      await ensureAccount(account);
    }
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
  managerState.refreshTimer = setInterval(() => {
    refreshAccounts().catch(() => {});
  }, 60_000);
  if (typeof managerState.refreshTimer.unref === 'function') {
    managerState.refreshTimer.unref();
  }
};

export const stopFilemakerMailIdleManager = async (): Promise<void> => {
  if (managerState.refreshTimer) {
    clearInterval(managerState.refreshTimer);
    managerState.refreshTimer = null;
  }
  const accountIds = Array.from(managerState.accountsById.keys());
  for (const id of accountIds) stopAccount(id);
  managerState.started = false;
};

export const __forFilemakerMailIdleTestOnly = {
  refreshAccounts,
  managerState,
};
