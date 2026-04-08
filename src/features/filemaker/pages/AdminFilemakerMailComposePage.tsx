'use client';

import { ArrowLeft, SendHorizonal } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState, startTransition } from 'react';

import { DocumentWysiwygEditor } from '@/shared/lib/document-editor/public';
import { FilemakerMailSidebar } from '../components/FilemakerMailSidebar';
import { buildFilemakerMailComposeHref as buildComposeHref } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailThreadHref as buildThreadHref } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailSelectionHref as buildSelectionHref } from '../mail-ui-helpers';
import { parseFilemakerMailParticipantsInput } from '../mail-utils';

import type { FilemakerMailAccount, FilemakerMailParticipant } from '../types';
import { Button, Input, useToast } from '@/shared/ui/primitives.public';
import { FormField, FormSection, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { PanelHeader } from '@/shared/ui/templates.public';

type AccountsResponse = { accounts: FilemakerMailAccount[] };
type ForwardDraftResponse = {
  forwardDraft: {
    accountId: string;
    bodyHtml: string;
    bcc: FilemakerMailParticipant[];
    cc: FilemakerMailParticipant[];
    subject: string;
    to: FilemakerMailParticipant[];
  } | null;
};

const EMPTY_BODY_HTML = '<p><br/></p>';

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
  const [bodyHtml, setBodyHtml] = useState(EMPTY_BODY_HTML);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const accountIdFromRoute = searchParams.get('accountId');
  const forwardThreadId = searchParams.get('forwardThreadId');
  const mailboxPathFromRoute = searchParams.get('mailboxPath');
  const rawOriginPanel = searchParams.get('panel');
  const originPanel =
    rawOriginPanel === 'recent'
      ? 'recent'
      : rawOriginPanel === 'search'
        ? 'search'
        : null;
  const rawRecentMailboxFilter = searchParams.get('recentMailbox');
  const rawRecentUnreadOnly = searchParams.get('recentUnread') === '1';
  const rawRecentQuery = searchParams.get('recentQuery');
  const rawSearchQuery = searchParams.get('searchQuery');
  const rawSearchAccountId = searchParams.get('searchAccountId');
  const recentMailboxFilter =
    originPanel === 'recent' && rawRecentMailboxFilter ? rawRecentMailboxFilter : null;
  const recentUnreadOnly = originPanel === 'recent' ? rawRecentUnreadOnly : false;
  const recentQuery = originPanel === 'recent' && rawRecentQuery ? rawRecentQuery : null;
  const searchQuery = originPanel === 'search' && rawSearchQuery ? rawSearchQuery : null;
  const searchAccountId =
    originPanel === 'search' && rawSearchAccountId === 'all' ? 'all' : null;
  const isGlobalSearchContext = searchAccountId === 'all';
  const searchContextAccountId = originPanel === 'search'
    ? isGlobalSearchContext
      ? null
      : accountIdFromRoute
    : null;
  const backLabel =
    originPanel === 'recent'
      ? 'Back to Recent'
      : originPanel === 'search'
        ? 'Back to Search'
        : 'Back to Mail';
  const backHref = useMemo(() => {
    return buildSelectionHref({
      accountId: originPanel === 'search' ? searchContextAccountId : accountIdFromRoute,
      mailboxPath: originPanel ? null : mailboxPathFromRoute,
      panel: originPanel,
      recentMailboxFilter: originPanel === 'recent' ? recentMailboxFilter : null,
      recentUnreadOnly: originPanel === 'recent' ? recentUnreadOnly : false,
      recentQuery: originPanel === 'recent' ? recentQuery : null,
      searchQuery: originPanel === 'search' ? searchQuery : null,
    });
  }, [
    accountIdFromRoute,
    mailboxPathFromRoute,
    originPanel,
    recentMailboxFilter,
    recentQuery,
    recentUnreadOnly,
    searchContextAccountId,
    searchQuery,
  ]);
  useEffect(() => {
    if (
      (rawOriginPanel ?? null) === originPanel &&
      (rawRecentMailboxFilter ?? null) === recentMailboxFilter &&
      rawRecentUnreadOnly === recentUnreadOnly &&
      (rawRecentQuery ?? null) === recentQuery &&
      (rawSearchQuery ?? null) === searchQuery &&
      (rawSearchAccountId ?? null) === searchAccountId
    ) {
      return;
    }

    startTransition(() => { router.replace(
            buildComposeHref({
              accountId: accountIdFromRoute,
              forwardThreadId,
              mailboxPath: mailboxPathFromRoute,
              originPanel,
              recentMailboxFilter,
              recentUnreadOnly,
              recentQuery,
              searchAccountId,
              searchQuery,
            })
          ); });
  }, [
    accountIdFromRoute,
    forwardThreadId,
    mailboxPathFromRoute,
    originPanel,
    rawOriginPanel,
    rawRecentMailboxFilter,
    rawRecentQuery,
    rawRecentUnreadOnly,
    rawSearchAccountId,
    rawSearchQuery,
    recentMailboxFilter,
    recentQuery,
    recentUnreadOnly,
    router,
    searchAccountId,
    searchQuery,
  ]);
  const composeDraftResetKey = forwardThreadId
    ? `forward:${accountIdFromRoute ?? ''}:${forwardThreadId}`
    : `fresh:${accountIdFromRoute ?? ''}:${mailboxPathFromRoute ?? ''}:${originPanel ?? ''}:${recentMailboxFilter ?? ''}:${recentUnreadOnly ? '1' : '0'}:${recentQuery ?? ''}:${rawSearchAccountId ?? ''}:${searchQuery ?? ''}`;

  useEffect(() => {
    setAccountId(accountIdFromRoute ?? '');
    setTo('');
    setCc('');
    setBcc('');
    setSubject('');
    setBodyHtml(EMPTY_BODY_HTML);
  }, [accountIdFromRoute, composeDraftResetKey]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const result = await fetchJson<AccountsResponse>('/api/filemaker/mail/accounts');
        setAccounts(result.accounts);
        setAccountId((current) => current || accountIdFromRoute || result.accounts[0]?.id || '');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to load mailbox accounts.', {
          variant: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [accountIdFromRoute, toast]);

  useEffect(() => {
    let isActive = true;

    if (!forwardThreadId) {
      return () => {
        isActive = false;
      };
    }

    const loadForwardDraft = async (): Promise<void> => {
      try {
        const result = await fetchJson<ForwardDraftResponse>(
          `/api/filemaker/mail/threads/${encodeURIComponent(forwardThreadId)}`
        );
        if (!isActive || !result.forwardDraft) {
          return;
        }

        setAccountId(result.forwardDraft.accountId);
        setTo(formatParticipants(result.forwardDraft.to));
        setCc(formatParticipants(result.forwardDraft.cc));
        setBcc(formatParticipants(result.forwardDraft.bcc));
        setSubject(result.forwardDraft.subject);
        setBodyHtml(result.forwardDraft.bodyHtml);
      } catch (error) {
        if (!isActive) {
          return;
        }
        toast(error instanceof Error ? error.message : 'Failed to load forward draft.', {
          variant: 'error',
        });
      }
    };

    void loadForwardDraft();

    return () => {
      isActive = false;
    };
  }, [accountIdFromRoute, forwardThreadId, toast]);

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
      const preserveRouteContext = !accountIdFromRoute || accountIdFromRoute === accountId;
      startTransition(() => { router.push(
                buildThreadHref({
                  threadId: result.message.threadId,
                  accountId,
                  mailboxPath: preserveRouteContext ? mailboxPathFromRoute : null,
                  originPanel: preserveRouteContext ? originPanel : null,
                  recentMailboxFilter: preserveRouteContext ? recentMailboxFilter : null,
                  recentUnreadOnly: preserveRouteContext ? recentUnreadOnly : false,
                  recentQuery: preserveRouteContext ? recentQuery : null,
                  searchAccountId: preserveRouteContext && isGlobalSearchContext ? 'all' : null,
                  searchQuery: preserveRouteContext ? searchQuery : null,
                })
              ); });
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
        searchContextAccountId={searchContextAccountId}
        searchQuery={searchQuery}
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
              onClick: () => startTransition(() => { router.push(backHref); }),
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
            engineInstance='filemaker_email'
            showBrand
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholder='Write your email...'
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
