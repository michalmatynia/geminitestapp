'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GoogleOAuthCredentialsSettings } from '@/shared/lib/oauth/components/GoogleOAuthCredentialsSettings';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/ui/primitives.public';
import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';

import {
  createDefaultFilemakerMailDraft,
  hasFilemakerMailAccountDraftErrors,
  validateFilemakerMailAccountDraft,
  type FilemakerMailAccountDraftFieldErrors,
} from './AdminFilemakerMailPage.helpers';
import { fetchFilemakerMailJson as fetchJson, resolveFilemakerMailSyncNotice } from '../mail-ui-helpers';
import { formatFilemakerMailboxAllowlist } from '../mail-utils';

import type { FilemakerMailAccount, FilemakerMailAccountDraft, FilemakerMailSyncDispatchResponseLike } from '../types';
import { useToast } from '@/shared/ui/primitives.public';

const toNullable = (v: string): string | null => (v.length > 0 ? v : null);
const parsePositiveInt = (v: string, fallback: number): number => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

function ConnectionFields({
  draft,
  errors,
  setDraft,
}: {
  draft: FilemakerMailAccountDraft;
  errors: FilemakerMailAccountDraftFieldErrors;
  setDraft: React.Dispatch<React.SetStateAction<FilemakerMailAccountDraft>>;
}): React.JSX.Element {
  return (
    <>
      <FormField label='Mailbox name' required error={errors.name}>
        <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder='Primary support inbox' />
      </FormField>
      <FormField label='Email address' required error={errors.emailAddress}>
        <Input value={draft.emailAddress} onChange={(e) => setDraft((p) => ({ ...p, emailAddress: e.target.value }))} placeholder='support@example.com' />
      </FormField>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='IMAP host' required error={errors.imapHost}>
          <Input value={draft.imapHost} onChange={(e) => setDraft((p) => ({ ...p, imapHost: e.target.value }))} placeholder='imap.example.com' />
        </FormField>
        <FormField label='IMAP port' required error={errors.imapPort}>
          <Input value={String(draft.imapPort)} onChange={(e) => setDraft((p) => ({ ...p, imapPort: parsePositiveInt(e.target.value, 993) }))} />
        </FormField>
        <FormField label='IMAP user' required error={errors.imapUser}>
          <Input value={draft.imapUser} onChange={(e) => setDraft((p) => ({ ...p, imapUser: e.target.value }))} />
        </FormField>
        <FormField label='IMAP password' required error={errors.imapPassword}>
          <Input type='password' value={draft.imapPassword} onChange={(e) => setDraft((p) => ({ ...p, imapPassword: e.target.value }))} />
        </FormField>
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='SMTP host' required error={errors.smtpHost}>
          <Input value={draft.smtpHost} onChange={(e) => setDraft((p) => ({ ...p, smtpHost: e.target.value }))} placeholder='smtp.example.com' />
        </FormField>
        <FormField label='SMTP port' required error={errors.smtpPort}>
          <Input value={String(draft.smtpPort)} onChange={(e) => setDraft((p) => ({ ...p, smtpPort: parsePositiveInt(e.target.value, 465) }))} />
        </FormField>
        <FormField label='SMTP user' required error={errors.smtpUser}>
          <Input value={draft.smtpUser} onChange={(e) => setDraft((p) => ({ ...p, smtpUser: e.target.value }))} />
        </FormField>
        <FormField label='SMTP password' required error={errors.smtpPassword}>
          <Input type='password' value={draft.smtpPassword} onChange={(e) => setDraft((p) => ({ ...p, smtpPassword: e.target.value }))} />
        </FormField>
      </div>
    </>
  );
}

function SenderFields({
  draft,
  folderAllowlistValue,
  setDraft,
  setFolderAllowlistValue,
}: {
  draft: FilemakerMailAccountDraft;
  folderAllowlistValue: string;
  setDraft: React.Dispatch<React.SetStateAction<FilemakerMailAccountDraft>>;
  setFolderAllowlistValue: (v: string) => void;
}): React.JSX.Element {
  return (
    <>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='From name'>
          <Input value={draft.fromName ?? ''} onChange={(e) => setDraft((p) => ({ ...p, fromName: toNullable(e.target.value) }))} placeholder='Filemaker Team' />
        </FormField>
        <FormField label='Reply-to email'>
          <Input value={draft.replyToEmail ?? ''} onChange={(e) => setDraft((p) => ({ ...p, replyToEmail: toNullable(e.target.value) }))} placeholder='reply@example.com' />
        </FormField>
      </div>
      <FormField label='Mailbox allowlist'>
        <Input value={folderAllowlistValue} onChange={(e) => setFolderAllowlistValue(e.target.value)} placeholder='INBOX, Sent' />
      </FormField>
    </>
  );
}

function SyncLimitsFields({
  draft,
  errors,
  setDraft,
}: {
  draft: FilemakerMailAccountDraft;
  errors: FilemakerMailAccountDraftFieldErrors;
  setDraft: React.Dispatch<React.SetStateAction<FilemakerMailAccountDraft>>;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      <FormField label='Initial sync lookback (days)' required error={errors.initialSyncLookbackDays}>
        <Input value={String(draft.initialSyncLookbackDays)} onChange={(e) => setDraft((p) => ({ ...p, initialSyncLookbackDays: parsePositiveInt(e.target.value, 30) }))} />
      </FormField>
      <FormField label='Max messages per sync' required error={errors.maxMessagesPerSync}>
        <Input value={String(draft.maxMessagesPerSync)} onChange={(e) => setDraft((p) => ({ ...p, maxMessagesPerSync: parsePositiveInt(e.target.value, 100) }))} />
      </FormField>
    </div>
  );
}

function DkimSection({
  draft,
  setDraft,
}: {
  draft: FilemakerMailAccountDraft;
  setDraft: React.Dispatch<React.SetStateAction<FilemakerMailAccountDraft>>;
}): React.JSX.Element {
  return (
    <FormSection title='DKIM signing (optional)' className='space-y-3 p-0'>
      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='DKIM domain'>
          <Input value={draft.dkimDomain ?? ''} onChange={(e) => setDraft((p) => ({ ...p, dkimDomain: toNullable(e.target.value) }))} placeholder='example.com' />
        </FormField>
        <FormField label='DKIM selector'>
          <Input value={draft.dkimKeySelector ?? ''} onChange={(e) => setDraft((p) => ({ ...p, dkimKeySelector: toNullable(e.target.value) }))} placeholder='mail' />
        </FormField>
      </div>
      <FormField label='DKIM private key (PEM)'>
        <Input type='password' value={draft.dkimPrivateKey} onChange={(e) => setDraft((p) => ({ ...p, dkimPrivateKey: e.target.value }))} placeholder='-----BEGIN PRIVATE KEY-----' autoComplete='off' />
      </FormField>
    </FormSection>
  );
}

function SecurityToggles({
  draft,
  setDraft,
}: {
  draft: FilemakerMailAccountDraft;
  setDraft: React.Dispatch<React.SetStateAction<FilemakerMailAccountDraft>>;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-6'>
      <label htmlFor='add-mailbox-imap-secure' className='flex items-center gap-2 text-sm text-white'>
        <Checkbox id='add-mailbox-imap-secure' checked={draft.imapSecure} onCheckedChange={(v) => setDraft((p) => ({ ...p, imapSecure: v === true }))} />
        IMAP secure
      </label>
      <label htmlFor='add-mailbox-smtp-secure' className='flex items-center gap-2 text-sm text-white'>
        <Checkbox id='add-mailbox-smtp-secure' checked={draft.smtpSecure} onCheckedChange={(v) => setDraft((p) => ({ ...p, smtpSecure: v === true }))} />
        SMTP secure
      </label>
      <label htmlFor='add-mailbox-push-enabled' className='flex items-center gap-2 text-sm text-white' title='Maintain a live IMAP IDLE connection for push-style new-mail notifications'>
        <Checkbox id='add-mailbox-push-enabled' checked={draft.pushEnabled} onCheckedChange={(v) => setDraft((p) => ({ ...p, pushEnabled: v === true }))} />
        Push (IMAP IDLE)
      </label>
    </div>
  );
}

function useAddMailboxForm(onSuccess: (account: FilemakerMailAccount) => void) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<FilemakerMailAccountDraft>(createDefaultFilemakerMailDraft);
  const [errors, setErrors] = useState<FilemakerMailAccountDraftFieldErrors>({});
  const [folderAllowlistValue, setFolderAllowlistValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setErrors({});
  }, [draft, folderAllowlistValue]);

  const reset = useCallback(() => {
    setDraft(createDefaultFilemakerMailDraft());
    setErrors({});
    setFolderAllowlistValue('');
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    const nextErrors = validateFilemakerMailAccountDraft(draft);
    if (hasFilemakerMailAccountDraftErrors(nextErrors)) {
      setErrors(nextErrors);
      toast('Fill the highlighted mailbox fields and try again.', { variant: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      setErrors({});
      const payload = {
        ...draft,
        folderAllowlist: folderAllowlistValue
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean),
      };
      const result = await fetchJson<{ account: FilemakerMailAccount }>(
        '/api/filemaker/mail/accounts',
        { method: 'POST', body: JSON.stringify(payload) }
      );
      toast('Mailbox account saved.', { variant: 'success' });
      try {
        const syncResult = await fetchJson<FilemakerMailSyncDispatchResponseLike>(
          `/api/filemaker/mail/accounts/${encodeURIComponent(result.account.id)}/sync`,
          { method: 'POST' }
        );
        const notice = resolveFilemakerMailSyncNotice(syncResult);
        toast(notice.message, { variant: notice.variant });
      } catch (syncError) {
        toast(
          syncError instanceof Error
            ? `Mailbox saved, but initial sync failed: ${syncError.message}`
            : 'Mailbox saved, but initial sync failed.',
          { variant: 'error' }
        );
      }
      onSuccess(result.account);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save mailbox account.', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [draft, folderAllowlistValue, onSuccess, toast]);

  return { draft, setDraft, errors, folderAllowlistValue, setFolderAllowlistValue, isSaving, handleSave, reset };
}

export function AddMailboxModal({
  open,
  onClose,
  onAccountAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAccountAdded: (account: FilemakerMailAccount) => void;
}): React.JSX.Element {
  const handleSuccess = useCallback(
    (account: FilemakerMailAccount) => {
      onAccountAdded(account);
      onClose();
    },
    [onAccountAdded, onClose]
  );

  const { draft, setDraft, errors, folderAllowlistValue, setFolderAllowlistValue, isSaving, handleSave, reset } =
    useAddMailboxForm(handleSuccess);

  const prevOpen = useRef(open);
  useEffect(() => {
    if (!prevOpen.current && open) reset();
    prevOpen.current = open;
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>New mailbox account</DialogTitle>
          <DialogDescription>
            Create a new IMAP/SMTP mailbox for Filemaker mail sync and replies.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-2'>
          <GoogleOAuthCredentialsSettings id='add-mailbox-google-oauth' />

          <FormSection title='Add Mailbox' className='space-y-3 p-4'>
            <ConnectionFields draft={draft} errors={errors} setDraft={setDraft} />
            <SenderFields
              draft={draft}
              folderAllowlistValue={folderAllowlistValue}
              setDraft={setDraft}
              setFolderAllowlistValue={setFolderAllowlistValue}
            />
            <SyncLimitsFields draft={draft} errors={errors} setDraft={setDraft} />
            <DkimSection draft={draft} setDraft={setDraft} />
            <SecurityToggles draft={draft} setDraft={setDraft} />
            <div className='flex justify-end gap-2 pt-2'>
              <Button type='button' variant='outline' onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                type='button'
                disabled={isSaving}
                onClick={() => { void handleSave(); }}
              >
                {isSaving ? 'Saving mailbox...' : 'Save Mailbox'}
              </Button>
            </div>
          </FormSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}
