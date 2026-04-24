'use client';

import { type Dispatch, type SetStateAction, useCallback, useState } from 'react';

import { useOptionalToast } from '@/shared/ui/primitives.public';

import {
  fetchFilemakerMailJson,
  resolveFilemakerMailSyncNotice,
  type FilemakerMailSyncDispatchResponseLike,
} from '../mail-ui-helpers';
import type { FilemakerMailAccount } from '../types';

const createSyncAccountHandler = (input: {
  onReload: () => Promise<void>;
  toast: ReturnType<typeof useOptionalToast>['toast'];
  setSyncingAccountId: Dispatch<SetStateAction<string | null>>;
}) => async (accountId: string): Promise<void> => {
  input.setSyncingAccountId(accountId);
  try {
    const result = await fetchFilemakerMailJson<FilemakerMailSyncDispatchResponseLike>(
      `/api/filemaker/mail/accounts/${encodeURIComponent(accountId)}/sync`,
      { method: 'POST' }
    );
    const notice = resolveFilemakerMailSyncNotice(result);
    input.toast(notice.message, { variant: notice.variant });

    await input.onReload();
  } catch (error) {
    input.toast(error instanceof Error ? error.message : 'Mailbox sync failed.', {
      variant: 'error',
    });
  } finally {
    input.setSyncingAccountId(null);
  }
};

const createToggleAccountStatusHandler = (input: {
  onReload: () => Promise<void>;
  toast: ReturnType<typeof useOptionalToast>['toast'];
  setStatusUpdatingAccountId: Dispatch<SetStateAction<string | null>>;
}) => async (account: FilemakerMailAccount): Promise<void> => {
  const nextStatus = account.status === 'active' ? 'paused' : 'active';
  input.setStatusUpdatingAccountId(account.id);
  try {
    await fetchFilemakerMailJson<{ account: FilemakerMailAccount }>(
      `/api/filemaker/mail/accounts/${encodeURIComponent(account.id)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      }
    );

    input.toast(nextStatus === 'paused' ? 'Mailbox paused.' : 'Mailbox resumed.', {
      variant: 'success',
    });
    await input.onReload();
  } catch (error) {
    input.toast(error instanceof Error ? error.message : 'Failed to update mailbox status.', {
      variant: 'error',
    });
  } finally {
    input.setStatusUpdatingAccountId(null);
  }
};

export function useAdminFilemakerMailClientPageActions(input: {
  onReload: () => Promise<void>;
}): {
  syncingAccountId: string | null;
  statusUpdatingAccountId: string | null;
  handleSyncAccount: (accountId: string) => Promise<void>;
  handleToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
} {
  const { toast } = useOptionalToast();
  const { onReload } = input;
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [statusUpdatingAccountId, setStatusUpdatingAccountId] = useState<string | null>(null);

  const handleSyncAccount = useCallback(
    createSyncAccountHandler({ onReload, toast, setSyncingAccountId }),
    [onReload, toast]
  );

  const handleToggleAccountStatus = useCallback(
    createToggleAccountStatusHandler({ onReload, toast, setStatusUpdatingAccountId }),
    [onReload, toast]
  );

  return {
    syncingAccountId,
    statusUpdatingAccountId,
    handleSyncAccount,
    handleToggleAccountStatus,
  };
}
