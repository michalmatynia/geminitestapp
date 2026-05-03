import { Settings2, ShieldAlert } from 'lucide-react';
import React from 'react';

import { Badge, Button } from '@/shared/ui/primitives.public';

import { formatFilemakerMailboxAllowlist } from '../../mail-utils';
import type { FilemakerMailAccount } from '../../types';
import { useMailPageContext } from '../FilemakerMail.context';

type MailboxSelectionSetter = ReturnType<typeof useMailPageContext>['setSelection'];

const formatMailboxLastSynced = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return 'Never';
  return new Date(value).toLocaleString();
};

function MailboxAttentionCard({
  account,
  setSelection,
}: {
  account: FilemakerMailAccount;
  setSelection: MailboxSelectionSetter;
}): React.JSX.Element {
  const lastSyncError = account.lastSyncError?.trim() ?? '';
  const allowlistLabel =
    account.folderAllowlist.length > 0
      ? formatFilemakerMailboxAllowlist(account.folderAllowlist)
      : 'Auto';
  const openSettings = (): void => {
    setSelection({
      accountId: account.id,
      mailboxPath: null,
      panel: 'settings',
    });
  };

  return (
    <div className='rounded-lg border border-border/60 bg-card/25 p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <div className='text-sm font-semibold text-white'>{account.name}</div>
          <div className='text-xs text-gray-500'>{account.emailAddress}</div>
        </div>
        <div className='flex flex-wrap gap-2'>
          {account.status !== 'active' ? (
            <Badge variant='outline' className='text-[10px]'>Status: {account.status}</Badge>
          ) : null}
          {lastSyncError !== '' ? (
            <Badge variant='outline' className='text-[10px]'>Sync error</Badge>
          ) : null}
        </div>
      </div>
      <div className='mt-3 grid gap-2 text-xs text-gray-500 md:grid-cols-2'>
        <div>Last sync: {formatMailboxLastSynced(account.lastSyncedAt)}</div>
        <div>Allowlist: {allowlistLabel}</div>
        {lastSyncError !== '' ? (
          <div className='md:col-span-2 text-red-400'>{lastSyncError}</div>
        ) : null}
      </div>
      <div className='mt-4 flex flex-wrap gap-2'>
        <Button type='button' size='sm' variant='outline' onClick={openSettings}>
          <Settings2 className='mr-2 size-4' />
          Open Settings
        </Button>
        <Button type='button' size='sm' variant='outline' onClick={openSettings}>
          <ShieldAlert className='mr-2 size-4' />
          Open Mailbox
        </Button>
      </div>
    </div>
  );
}

export function MailboxesAttentionSection(): React.JSX.Element {
  const { attentionAccounts, setSelection } = useMailPageContext();

  return (
    <div className='space-y-6 rounded-lg border border-border/60 bg-card/25 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-base font-semibold text-white'>Mailboxes Requiring Attention</div>
          <div className='text-sm text-gray-500'>
            Review paused accounts and sync failures, then jump into mailbox settings.
          </div>
        </div>
        <Badge variant='outline' className='text-[10px]'>
          Affected: {attentionAccounts.length}
        </Badge>
      </div>

      {attentionAccounts.length > 0 ? (
        <div className='grid gap-3'>
          {attentionAccounts.map((account) => (
            <MailboxAttentionCard key={account.id} account={account} setSelection={setSelection} />
          ))}
        </div>
      ) : (
        <div className='rounded-lg border border-border/60 bg-card/25 p-4 text-sm text-gray-500'>
          All mailbox accounts are healthy.
        </div>
      )}
    </div>
  );
}
