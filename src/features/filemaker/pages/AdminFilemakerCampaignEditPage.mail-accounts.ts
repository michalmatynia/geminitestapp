import { useEffect, useState } from 'react';

import { api } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { FilemakerMailAccount } from '../types';
import type { CampaignEditToast } from './AdminFilemakerCampaignEditPage.model-types';

type FilemakerMailAccountsResponse = {
  accounts: FilemakerMailAccount[];
};

export function useCampaignEditMailAccounts(toast: CampaignEditToast): FilemakerMailAccount[] {
  const [mailAccounts, setMailAccounts] = useState<FilemakerMailAccount[]>([]);

  useEffect(() => {
    let isActive = true;

    const loadMailAccounts = async (): Promise<void> => {
      try {
        const result = await api.get<FilemakerMailAccountsResponse>('/api/filemaker/mail/accounts');
        if (isActive === false) return;
        setMailAccounts(result.accounts);
      } catch (error: unknown) {
        if (isActive === false) return;
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to load Filemaker mail accounts.', {
          variant: 'error',
        });
      }
    };

    void loadMailAccounts();

    return () => {
      isActive = false;
    };
  }, [toast]);

  return mailAccounts;
}
