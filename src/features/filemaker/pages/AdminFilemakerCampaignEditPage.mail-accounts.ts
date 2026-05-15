import { useEffect } from 'react';

import { api } from '@/shared/lib/api-client';
import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';

import type { FilemakerMailAccount } from '../types';
import type { CampaignEditToast } from './AdminFilemakerCampaignEditPage.model-types';

type FilemakerMailAccountsResponse = {
  accounts: FilemakerMailAccount[];
};

export function useCampaignEditMailAccounts(toast: CampaignEditToast): FilemakerMailAccount[] {
  const mailAccountsQueryKey = ['filemaker', 'mail', 'accounts', 'campaign-edit'] as const;
  const mailAccountsQuery = useSingleQueryV2<
    FilemakerMailAccountsResponse,
    FilemakerMailAccountsResponse,
    typeof mailAccountsQueryKey
  >({
    queryKey: mailAccountsQueryKey,
    queryFn: async ({ signal }) =>
      api.get<FilemakerMailAccountsResponse>('/api/filemaker/mail/accounts', { signal }),
    meta: {
      source:
        'features.filemaker.pages.AdminFilemakerCampaignEditPage.mail-accounts.useCampaignEditMailAccounts',
      operation: 'list',
      resource: 'filemaker.mail-accounts',
      domain: 'files',
      description: 'Load Filemaker mail accounts for campaign editing.',
      errorPresentation: 'toast',
    },
  });

  useEffect(() => {
    if (mailAccountsQuery.error === null) return;
    const message =
      mailAccountsQuery.error.message.length > 0
        ? mailAccountsQuery.error.message
        : 'Failed to load Filemaker mail accounts.';
    toast(message, { variant: 'error' });
  }, [mailAccountsQuery.error, toast]);

  return mailAccountsQuery.data?.accounts ?? [];
}
