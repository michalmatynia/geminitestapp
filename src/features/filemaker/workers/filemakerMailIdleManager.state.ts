import type { ImapFlow } from 'imapflow';

import type { FilemakerMailAccount } from '../types';

export type AccountState = {
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

const createInitialManagerState = (): ManagerState => ({
  started: false,
  accountsById: new Map(),
  refreshTimer: null,
});

export const managerState: ManagerState =
  globalWithState.__filemakerMailIdleManagerState__ ??
  (globalWithState.__filemakerMailIdleManagerState__ = createInitialManagerState());

export const buildIdleRefreshKey = (account: FilemakerMailAccount): string =>
  [
    account.status,
    String(account.pushEnabled),
    account.imapHost,
    String(account.imapPort),
    String(account.imapSecure),
    account.imapUser,
    account.updatedAt ?? '',
  ].join('|');

export const getIdleAccountState = (accountId: string): AccountState | null =>
  managerState.accountsById.get(accountId) ?? null;

export const patchIdleAccountState = (
  accountId: string,
  patch: Partial<AccountState>
): AccountState | null => {
  const current = getIdleAccountState(accountId);
  if (current === null) return null;
  Object.assign(current, patch);
  return current;
};
