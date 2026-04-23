import { Settings2, ShieldAlert } from 'lucide-react';
import React from 'react';

import { Badge, Button } from '@/shared/ui/primitives.public';

import { formatFilemakerMailboxAllowlist } from '../../mail-utils';
import { useMailPageContext } from '../FilemakerMail.context';

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
            <div key={account.id} className='rounded-lg border border-border/60 bg-card/25 p-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <div className='text-sm font-semibold text-white'>{account.name}</div>
                  <div className='text-xs text-gray-500'>{account.emailAddress}</div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {account.status !== 'active' ? (
                    <Badge variant='outline' className='text-[10px]'>
                      Status: {account.status}
                    </Badge>
                  ) : null}
                  {account.lastSyncError ? (
                    <Badge variant='outline' className='text-[10px]'>
                      Sync error
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className='mt-3 grid gap-2 text-xs text-gray-500 md:grid-cols-2'>
                <div>
                  Last sync:{' '}
                  {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleString() : 'Never'}
                </div>
                <div>
                  Allowlist:{' '}
                  {account.folderAllowlist.length > 0
                    ? formatFilemakerMailboxAllowlist(account.folderAllowlist)
                    : 'Auto'}
                </div>
                {account.lastSyncError ? (
                  <div className='md:col-span-2 text-red-400'>{account.lastSyncError}</div>
                ) : null}
              </div>
              <div className='mt-4 flex flex-wrap gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    setSelection({
                      accountId: account.id,
                      mailboxPath: null,
                      panel: 'settings',
                    });
                  }}
                >
                  <Settings2 className='mr-2 size-4' />
                  Open Settings
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    setSelection({
                      accountId: account.id,
                      mailboxPath: null,
                      panel: 'settings',
                    });
                  }}
                >
                  <ShieldAlert className='mr-2 size-4' />
                  Open Mailbox
                </Button>
              </div>
            </div>
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
