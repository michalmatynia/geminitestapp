import { MailPlus, RefreshCcw } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition } from 'react';

import { Button, Checkbox, Input } from '@/shared/ui/primitives.public';
import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';

import { useMailPageContext } from '../FilemakerMail.context';
import { buildFilemakerMailComposeHref as buildComposeHref } from '../../components/FilemakerMailSidebar.helpers';

export function MailAccountSettingsSection(): React.JSX.Element {
  const {
    selectedAccountLabel,
    selectedAccount,
    syncingAccountId,
    handleSyncAccount,
    draft,
    setDraft,
    folderAllowlistValue,
    setFolderAllowlistValue,
    handleSaveAccount,
    isSavingAccount,
    router,
  } = useMailPageContext();

  return (
    <div className='space-y-6 rounded-lg border border-border/60 bg-card/25 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-base font-semibold text-white'>{selectedAccountLabel}</div>
          <div className='text-sm text-gray-500'>
            {selectedAccount
              ? 'Update mailbox connection settings and run sync from here.'
              : 'Create a new IMAP/SMTP mailbox for Filemaker mail sync and replies.'}
          </div>
        </div>
        {selectedAccount ? (
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={syncingAccountId === selectedAccount.id}
            onClick={() => {
              void handleSyncAccount(selectedAccount.id);
            }}
          >
            <RefreshCcw className='mr-2 size-4' />
            {syncingAccountId === selectedAccount.id ? 'Syncing...' : 'Sync'}
          </Button>
        ) : null}
      </div>

      {selectedAccount ? (
        <div className='grid gap-3 text-xs text-gray-500 md:grid-cols-3'>
          <div>
            Last sync:{' '}
            {selectedAccount.lastSyncedAt
              ? new Date(selectedAccount.lastSyncedAt).toLocaleString()
              : 'Never'}
          </div>
          <div>
            Allowlist:{' '}
            {selectedAccount.folderAllowlist.length > 0
              ? selectedAccount.folderAllowlist.join(', ')
              : 'Auto'}
          </div>
          <div>Status: {selectedAccount.status}</div>
          {selectedAccount.lastSyncError ? (
            <div className='md:col-span-3 text-red-400'>{selectedAccount.lastSyncError}</div>
          ) : null}
        </div>
      ) : null}

      <FormSection title={selectedAccount ? 'Mailbox Settings' : 'Add Mailbox'} className='space-y-3 p-4'>
        <FormField label='Mailbox name'>
          <Input
            value={draft.name}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setDraft((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder='Primary support inbox'
          />
        </FormField>
        <FormField label='Email address'>
          <Input
            value={draft.emailAddress}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setDraft((prev) => ({ ...prev, emailAddress: event.target.value }))
            }
            placeholder='support@example.com'
          />
        </FormField>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='IMAP host'>
            <Input
              value={draft.imapHost}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({ ...prev, imapHost: event.target.value }))
              }
              placeholder='imap.example.com'
            />
          </FormField>
          <FormField label='IMAP port'>
            <Input
              value={String(draft.imapPort)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({
                  ...prev,
                  imapPort: Number.parseInt(event.target.value, 10) || 993,
                }))
              }
            />
          </FormField>
          <FormField label='IMAP user'>
            <Input
              value={draft.imapUser}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({ ...prev, imapUser: event.target.value }))
              }
            />
          </FormField>
          <FormField label='IMAP password'>
            <Input
              type='password'
              value={draft.imapPassword}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({ ...prev, imapPassword: event.target.value }))
              }
              placeholder={selectedAccount ? 'Leave blank to keep current password' : ''}
            />
          </FormField>
        </div>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='SMTP host'>
            <Input
              value={draft.smtpHost}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({ ...prev, smtpHost: event.target.value }))
              }
              placeholder='smtp.example.com'
            />
          </FormField>
          <FormField label='SMTP port'>
            <Input
              value={String(draft.smtpPort)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({
                  ...prev,
                  smtpPort: Number.parseInt(event.target.value, 10) || 465,
                }))
              }
            />
          </FormField>
          <FormField label='SMTP user'>
            <Input
              value={draft.smtpUser}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({ ...prev, smtpUser: event.target.value }))
              }
            />
          </FormField>
          <FormField label='SMTP password'>
            <Input
              type='password'
              value={draft.smtpPassword}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({ ...prev, smtpPassword: event.target.value }))
              }
              placeholder={selectedAccount ? 'Leave blank to keep current password' : ''}
            />
          </FormField>
        </div>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='From name'>
            <Input
              value={draft.fromName ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({ ...prev, fromName: event.target.value || null }))
              }
              placeholder='Filemaker Team'
            />
          </FormField>
          <FormField label='Reply-to email'>
            <Input
              value={draft.replyToEmail ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({ ...prev, replyToEmail: event.target.value || null }))
              }
              placeholder='reply@example.com'
            />
          </FormField>
        </div>
        <FormField label='Mailbox allowlist'>
          <Input
            value={folderAllowlistValue}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setFolderAllowlistValue(event.target.value)
            }
            placeholder='INBOX, Sent'
          />
        </FormField>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField label='Initial sync lookback (days)'>
            <Input
              value={String(draft.initialSyncLookbackDays)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({
                  ...prev,
                  initialSyncLookbackDays: Number.parseInt(event.target.value, 10) || 30,
                }))
              }
            />
          </FormField>
          <FormField label='Max messages per sync'>
            <Input
              value={String(draft.maxMessagesPerSync)}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraft((prev) => ({
                  ...prev,
                  maxMessagesPerSync: Number.parseInt(event.target.value, 10) || 100,
                }))
              }
            />
          </FormField>
        </div>
        <div className='flex items-center gap-6'>
          <label
            htmlFor='filemaker-mail-account-imap-secure'
            className='flex items-center gap-2 text-sm text-white'
          >
            <Checkbox
              id='filemaker-mail-account-imap-secure'
              checked={draft.imapSecure}
              onCheckedChange={(checked) =>
                setDraft((prev) => ({ ...prev, imapSecure: checked === true }))
              }
            />
            IMAP secure
          </label>
          <label
            htmlFor='filemaker-mail-account-smtp-secure'
            className='flex items-center gap-2 text-sm text-white'
          >
            <Checkbox
              id='filemaker-mail-account-smtp-secure'
              checked={draft.smtpSecure}
              onCheckedChange={(checked) =>
                setDraft((prev) => ({ ...prev, smtpSecure: checked === true }))
              }
            />
            SMTP secure
          </label>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            onClick={() => {
              void handleSaveAccount();
            }}
            disabled={isSavingAccount}
          >
            {isSavingAccount
              ? selectedAccount
                ? 'Updating mailbox...'
                : 'Saving mailbox...'
              : selectedAccount
                ? 'Update Mailbox'
                : 'Save Mailbox'}
          </Button>
          {selectedAccount ? (
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                startTransition(() => {
                  router.push(buildComposeHref({ accountId: selectedAccount.id }));
                });
              }}
            >
              <MailPlus className='mr-2 size-4' />
              Compose from Account
            </Button>
          ) : null}
        </div>
      </FormSection>
    </div>
  );
}
