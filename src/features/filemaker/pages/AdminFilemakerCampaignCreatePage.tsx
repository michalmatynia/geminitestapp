'use client';

import React, { useState } from 'react';

import { useRouter } from 'nextjs-toploader/app';

import { api } from '@/shared/lib/api-client';
import { useSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { FormField, FormSection, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Button, Input, Textarea, useToast } from '@/shared/ui/primitives.public';

import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  toPersistedFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRegistry,
  createFilemakerEmailCampaign,
} from '../settings';
import { buildCampaignIdFromName, CAMPAIGN_STATUS_OPTIONS } from './AdminFilemakerCampaignEditPage.utils';
import type { FilemakerMailAccount } from '../types';

/* eslint-disable complexity, max-lines-per-function */

const SHARED_OPTION = { value: '', label: 'No sender account (assign later)' };

const buildMailAccountLabel = (account: FilemakerMailAccount): string =>
  `${account.name} <${account.emailAddress}>${account.status === 'active' ? '' : ' (paused)'}`;

type MailAccountsResponse = { accounts: FilemakerMailAccount[] };

function useMailAccounts(): FilemakerMailAccount[] {
  const { toast } = useToast();
  const query = useSingleQueryV2<MailAccountsResponse, MailAccountsResponse, readonly string[]>({
    queryKey: ['filemaker', 'mail', 'accounts', 'campaign-create'],
    queryFn: async ({ signal }) =>
      api.get<MailAccountsResponse>('/api/filemaker/mail/accounts', { signal }),
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerCampaignCreatePage.useMailAccounts',
      operation: 'list',
      resource: 'filemaker.mail-accounts',
      domain: 'files',
      description: 'Load mail accounts for new campaign creation.',
      errorPresentation: 'toast',
    },
  });

  React.useEffect(() => {
    if (query.error === null) return;
    toast(
      query.error.message.length > 0 ? query.error.message : 'Failed to load mail accounts.',
      { variant: 'error' }
    );
  }, [query.error, toast]);

  return query.data?.accounts ?? [];
}

export function AdminFilemakerCampaignCreatePage(): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const mailAccounts = useMailAccounts();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState<'draft' | 'active' | 'paused' | 'archived'>('draft');
  const [mailAccountId, setMailAccountId] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyToEmail, setReplyToEmail] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const mailAccountOptions = [
    SHARED_OPTION,
    ...mailAccounts.map((account) => ({
      value: account.id,
      label: buildMailAccountLabel(account),
    })),
  ];

  const isValid = name.trim().length > 0 && subject.trim().length > 0;

  const handleCreate = async (): Promise<void> => {
    if (!isValid) return;

    const campaignId = buildCampaignIdFromName(name.trim());
    const rawRegistry = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
    const existingRegistry = parseFilemakerEmailCampaignRegistry(rawRegistry);

    const idAlreadyExists = existingRegistry.campaigns.some((c) => c.id === campaignId);
    if (idAlreadyExists) {
      toast(
        `A campaign with ID "${campaignId}" already exists. Choose a different name.`,
        { variant: 'error' }
      );
      return;
    }
    const normalizedFromName = fromName.trim();
    const normalizedReplyToEmail = replyToEmail.trim();
    const normalizedDescription = description.trim();

    const campaign = createFilemakerEmailCampaign({
      id: campaignId,
      name: name.trim(),
      subject: subject.trim(),
      status,
      mailAccountId: mailAccountId.length > 0 ? mailAccountId : null,
      fromName: normalizedFromName.length > 0 ? normalizedFromName : null,
      replyToEmail: normalizedReplyToEmail.length > 0 ? normalizedReplyToEmail : null,
      description: normalizedDescription.length > 0 ? normalizedDescription : null,
    });

    const nextCampaigns = [...existingRegistry.campaigns, campaign].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGNS_KEY,
        value: JSON.stringify(
          toPersistedFilemakerEmailCampaignRegistry({ version: 1, campaigns: nextCampaigns })
        ),
      });
      toast(`Campaign "${campaign.name}" created.`, { variant: 'success' });
      settingsStore.refetch();
      router.push(`/admin/filemaker/campaigns/${encodeURIComponent(campaign.id)}`);
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : 'Failed to create campaign.', {
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='page-section-compact space-y-6'>
      <SectionHeader
        title='Email Creator'
        description='Set the essentials — name, subject line, and sender account. You can configure audience, content, and launch rules on the next page.'
        eyebrow={
          <AdminFilemakerBreadcrumbs
            parent={{ label: 'Email Campaigns', href: '/admin/filemaker/campaigns' }}
            current='Email Creator'
            className='mb-2'
          />
        }
        actions={
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => router.push('/admin/filemaker/campaigns')}
            >
              Cancel
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={!isValid || isSaving}
              onClick={() => { void handleCreate(); }}
            >
              {isSaving ? 'Creating…' : 'Create Campaign'}
            </Button>
          </div>
        }
      />

      <FormSection title='Campaign Details' className='space-y-4 p-4'>
        <div className='grid gap-4 md:grid-cols-2'>
          <FormField
            label='Campaign name'
            description='Used to identify this campaign internally. Also determines the campaign ID.'
          >
            <Input
              placeholder='e.g. Spring Newsletter 2026'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField label='Status'>
            <SelectSimple
              ariaLabel='Campaign status'
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
              options={CAMPAIGN_STATUS_OPTIONS}
            />
          </FormField>
          <FormField
            label='Email subject'
            description='The subject line recipients will see in their inbox.'
          >
            <Input
              placeholder='e.g. Updates from our team — Spring 2026'
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </FormField>
          <FormField
            label='Sender email account'
            description='The mailbox used for SMTP delivery and sender defaults. Can be assigned later.'
          >
            <SelectSimple
              ariaLabel='Campaign sender account'
              value={mailAccountId}
              onValueChange={setMailAccountId}
              options={mailAccountOptions}
            />
          </FormField>
          <FormField
            label='From name override'
            description='Optional. Leave blank to use the sender account default.'
          >
            <Input
              placeholder='e.g. The Team'
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />
          </FormField>
          <FormField
            label='Reply-to override'
            description='Optional. Leave blank to use the sender account reply-to.'
          >
            <Input
              placeholder='e.g. hello@example.com'
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
            />
          </FormField>
          <div className='md:col-span-2'>
            <FormField label='Internal description'>
              <Textarea
                rows={3}
                placeholder='What is this campaign for? (internal only, not sent to recipients)'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        {!isValid && (name.trim().length > 0 || subject.trim().length > 0) && (
          <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200'>
            Both a campaign name and a subject line are required before creating.
          </div>
        )}
      </FormSection>

      <div className='flex justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={() => router.push('/admin/filemaker/campaigns')}
        >
          Cancel
        </Button>
        <Button
          type='button'
          disabled={!isValid || isSaving}
          onClick={() => { void handleCreate(); }}
        >
          {isSaving ? 'Creating…' : 'Create Campaign'}
        </Button>
      </div>
    </div>
  );
}
