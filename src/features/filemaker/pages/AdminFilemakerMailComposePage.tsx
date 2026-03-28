'use client';

import { ArrowLeft, SendHorizonal } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import { DocumentWysiwygEditor } from '@/features/document-editor/components/DocumentWysiwygEditor';
import { parseFilemakerMailParticipantsInput } from '../mail-utils';
import { FilemakerMailSidebar } from '../components/FilemakerMailSidebar';

import type { FilemakerMailAccount, FilemakerMailParticipant } from '../types';
import { Button, FormField, FormSection, Input, PanelHeader, SelectSimple, useToast } from '@/shared/ui';

type AccountsResponse = { accounts: FilemakerMailAccount[] };

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
};

const formatParticipants = (participants: FilemakerMailParticipant[]): string =>
  participants.map((entry) => entry.name ? `${entry.name} <${entry.address}>` : entry.address).join(', ');

export function AdminFilemakerMailComposePage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<FilemakerMailAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('<p><br/></p>');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const accountIdFromRoute = searchParams.get('accountId');
  const mailboxPathFromRoute = searchParams.get('mailboxPath');
  const originPanel = searchParams.get('panel') === 'recent' ? 'recent' : null;
  const recentMailboxFilter = searchParams.get('recentMailbox');
  const recentUnreadOnly = searchParams.get('recentUnread') === '1';
  const recentQuery = searchParams.get('recentQuery');
  const backLabel = originPanel === 'recent' ? 'Back to Recent' : 'Back to Mail';
  const backHref = useMemo(() => {
    const search = new URLSearchParams();
    if (accountIdFromRoute) search.set('accountId', accountIdFromRoute);
    if (originPanel === 'recent' && accountIdFromRoute) {
      search.set('panel', 'recent');
    } else if (mailboxPathFromRoute) {
      search.set('mailboxPath', mailboxPathFromRoute);
    }
    if (recentMailboxFilter) search.set('recentMailbox', recentMailboxFilter);
    if (recentUnreadOnly) search.set('recentUnread', '1');
    if (recentQuery) search.set('recentQuery', recentQuery);
    const nextSearch = search.toString();
    return nextSearch ? `/admin/filemaker/mail?${nextSearch}` : '/admin/filemaker/mail';
  }, [
    accountIdFromRoute,
    mailboxPathFromRoute,
    originPanel,
    recentMailboxFilter,
    recentQuery,
    recentUnreadOnly,
  ]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const result = await fetchJson<AccountsResponse>('/api/filemaker/mail/accounts');
        setAccounts(result.accounts);
        setAccountId(accountIdFromRoute ?? result.accounts[0]?.id ?? '');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to load mailbox accounts.', {
          variant: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [accountIdFromRoute, searchParams, toast]);

  const handleSend = async (): Promise<void> => {
    setIsSending(true);
    try {
      const result = await fetchJson<{ message: { threadId: string } }>('/api/filemaker/mail/send', {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          to: parseFilemakerMailParticipantsInput(to),
          cc: parseFilemakerMailParticipantsInput(cc),
          bcc: parseFilemakerMailParticipantsInput(bcc),
          subject,
          bodyHtml,
        }),
      });
      toast('Email sent.', { variant: 'success' });
      const search = new URLSearchParams();
      search.set('accountId', accountId);
      if (mailboxPathFromRoute) search.set('mailboxPath', mailboxPathFromRoute);
      if (originPanel === 'recent') search.set('panel', 'recent');
      if (recentMailboxFilter) search.set('recentMailbox', recentMailboxFilter);
      if (recentUnreadOnly) search.set('recentUnread', '1');
      if (recentQuery) search.set('recentQuery', recentQuery);
      router.push(
        `/admin/filemaker/mail/threads/${encodeURIComponent(result.message.threadId)}?${search.toString()}`
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to send email.', {
        variant: 'error',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className='page-section-compact grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
      <FilemakerMailSidebar
        selectedAccountId={accountId || accountIdFromRoute}
        selectedMailboxPath={mailboxPathFromRoute}
        selectedPanel='compose'
        originPanel={originPanel}
        recentMailboxFilter={recentMailboxFilter}
        recentUnreadOnly={recentUnreadOnly}
        recentQuery={recentQuery}
        onAccountUpdated={(account) => {
          setAccounts((current) =>
            current.map((entry) => (entry.id === account.id ? account : entry))
          );
        }}
      />

      <div className='space-y-6'>
        <PanelHeader
          title='Compose Filemaker Email'
          description='Write a new email using the shared rich-text editor.'
          icon={<SendHorizonal className='size-4' />}
          actions={[
            {
              key: 'back',
              label: backLabel,
              icon: <ArrowLeft className='size-4' />,
              variant: 'outline',
              onClick: () => router.push(backHref),
            },
            {
              key: 'send',
              label: isSending ? 'Sending...' : 'Send Email',
              icon: <SendHorizonal className='size-4' />,
              onClick: () => {
                void handleSend();
              },
            },
          ]}
        />

        <FormSection title='Message' className='space-y-4 p-4'>
          <div className='grid gap-3 md:grid-cols-2'>
            <FormField label='Mailbox account'>
              <SelectSimple
                value={accountId}
                onValueChange={setAccountId}
                options={accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                  description: account.emailAddress,
                }))}
                placeholder={isLoading ? 'Loading accounts...' : 'Select mailbox account'}
                size='sm'
                ariaLabel='Mailbox account'
              />
            </FormField>
            <FormField label='Subject'>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
            </FormField>
            <FormField label='To' className='md:col-span-2'>
              <Input
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder='Jane Doe <jane@example.com>, team@example.com'
              />
            </FormField>
            <FormField label='Cc'>
              <Input value={cc} onChange={(event) => setCc(event.target.value)} />
            </FormField>
            <FormField label='Bcc'>
              <Input value={bcc} onChange={(event) => setBcc(event.target.value)} />
            </FormField>
          </div>

          <DocumentWysiwygEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholder='Write your email...'
            enableAdvancedTools
            allowFontFamily
            allowTextAlign
          />

          {accountId ? (
            <div className='text-xs text-gray-500'>
              Sending from:{' '}
              {formatParticipants(
                accounts
                  .filter((account) => account.id === accountId)
                  .map((account) => ({
                    address: account.emailAddress,
                    name: account.fromName ?? null,
                  }))
              ) || 'Unknown account'}
            </div>
          ) : null}

          <div className='flex justify-end'>
            <Button
              type='button'
              onClick={(): void => {
                void handleSend();
              }}
              disabled={isSending || isLoading}
            >
              {isSending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </FormSection>
      </div>
    </div>
  );
}
