'use client';

import { ArrowLeft, Paperclip, SendHorizonal, X } from 'lucide-react';
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

class FetchJsonError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      try {
        body = await response.text();
      } catch {
        body = null;
      }
    }
    const message =
      (body && typeof body === 'object' && 'message' in (body as Record<string, unknown>) &&
        typeof (body as { message?: unknown }).message === 'string'
          ? (body as { message: string }).message
          : null) ?? `Request failed (${response.status})`;
    throw new FetchJsonError(response.status, body, message);
  }
  return (await response.json()) as T;
};

const readFileAsBase64 = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (): void => reject(reader.error ?? new Error('File read failed'));
    reader.onload = (): void => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected file reader result'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.readAsDataURL(file);
  });

type ComposeAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  dataBase64: string;
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
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([]);
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
  const rawSearchContextAccountId = searchParams.get('searchContextAccountId');
  const recentMailboxFilter =
    originPanel === 'recent' && rawRecentMailboxFilter ? rawRecentMailboxFilter : null;
  const recentUnreadOnly = originPanel === 'recent' ? rawRecentUnreadOnly : false;
  const recentQuery = originPanel === 'recent' && rawRecentQuery ? rawRecentQuery : null;
  const searchQuery = originPanel === 'search' && rawSearchQuery ? rawSearchQuery : null;
  const searchAccountId =
    originPanel === 'search' && rawSearchAccountId === 'all' ? 'all' : null;
  const isGlobalSearchContext = searchAccountId === 'all';
  const persistedSearchContextAccountId =
    originPanel === 'search' &&
    !isGlobalSearchContext &&
    rawSearchContextAccountId &&
    rawSearchContextAccountId !== accountIdFromRoute
      ? rawSearchContextAccountId
      : null;
  const searchContextAccountId = originPanel === 'search'
    ? isGlobalSearchContext
      ? null
      : persistedSearchContextAccountId ?? accountIdFromRoute
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
      (rawSearchAccountId ?? null) === searchAccountId &&
      (rawSearchContextAccountId ?? null) === persistedSearchContextAccountId
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
              searchContextAccountId: persistedSearchContextAccountId,
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
    rawSearchContextAccountId,
    rawSearchQuery,
    recentMailboxFilter,
    recentQuery,
    recentUnreadOnly,
    persistedSearchContextAccountId,
    router,
    searchAccountId,
    searchQuery,
  ]);
  const composeDraftResetKey = forwardThreadId
    ? `forward:${accountIdFromRoute ?? ''}:${forwardThreadId}`
    : `fresh:${accountIdFromRoute ?? ''}:${mailboxPathFromRoute ?? ''}:${originPanel ?? ''}:${recentMailboxFilter ?? ''}:${recentUnreadOnly ? '1' : '0'}:${recentQuery ?? ''}:${rawSearchAccountId ?? ''}:${rawSearchContextAccountId ?? ''}:${searchQuery ?? ''}`;

  useEffect(() => {
    setAccountId(accountIdFromRoute ?? '');
    setTo('');
    setCc('');
    setBcc('');
    setSubject('');
    setBodyHtml(EMPTY_BODY_HTML);
    setAttachments([]);
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

  const handleSend = async (options?: { overrideSuppression?: boolean }): Promise<void> => {
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
          attachments: attachments.map((entry) => ({
            fileName: entry.fileName,
            contentType: entry.contentType,
            dataBase64: entry.dataBase64,
          })),
          ...(options?.overrideSuppression ? { overrideSuppression: true } : {}),
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
                  searchContextAccountId: preserveRouteContext ? persistedSearchContextAccountId : null,
                  searchAccountId: preserveRouteContext && isGlobalSearchContext ? 'all' : null,
                  searchQuery: preserveRouteContext ? searchQuery : null,
                })
              ); });
    } catch (error) {
      const isSuppression =
        error instanceof FetchJsonError &&
        error.status >= 400 &&
        error.status < 500 &&
        /suppression/i.test(error.message);
      if (isSuppression && !options?.overrideSuppression) {
        const confirmed =
          typeof window !== 'undefined' &&
          window.confirm(
            `${error.message}\n\nSend anyway? This will bypass the campaign suppression list for this message only.`
          );
        if (confirmed) {
          setIsSending(false);
          await handleSend({ overrideSuppression: true });
          return;
        }
      }
      toast(error instanceof Error ? error.message : 'Failed to send email.', {
        variant: 'error',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleAddAttachments = async (fileList: FileList | null): Promise<void> => {
    if (!fileList || fileList.length === 0) return;
    const additions: ComposeAttachment[] = [];
    for (const file of Array.from(fileList)) {
      try {
        const dataBase64 = await readFileAsBase64(file);
        additions.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          dataBase64,
        });
      } catch (error) {
        toast(
          `Could not attach ${file.name}: ${error instanceof Error ? error.message : 'unknown error'}`,
          { variant: 'error' }
        );
      }
    }
    if (additions.length > 0) {
      setAttachments((current) => [...current, ...additions]);
    }
  };

  return (
    <div className='page-section-compact grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
      <FilemakerMailSidebar
        selection={{
          accountId: accountId || accountIdFromRoute,
          mailboxPath: mailboxPathFromRoute,
          panel: 'compose',
          originPanel,
        }}
        filters={{
          recentMailboxFilter,
          recentUnreadOnly,
          recentQuery,
          searchContextAccountId,
          searchQuery,
        }}
        actions={{
          onAccountUpdated: (account) => {
            setAccounts((current) =>
              current.map((entry) => (entry.id === account.id ? account : entry))
            );
          },
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

          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <label className='inline-flex cursor-pointer items-center gap-2 text-xs text-gray-300 underline-offset-2 hover:underline'>
                <Paperclip className='size-4' />
                Add attachments
                <input
                  type='file'
                  multiple
                  className='hidden'
                  onChange={(event) => {
                    const files = event.target.files;
                    void handleAddAttachments(files);
                    event.target.value = '';
                  }}
                />
              </label>
              {attachments.length > 0 ? (
                <span className='text-[11px] text-gray-500'>{attachments.length} file(s)</span>
              ) : null}
            </div>
            {attachments.length > 0 ? (
              <ul className='flex flex-wrap gap-2'>
                {attachments.map((entry) => (
                  <li
                    key={entry.id}
                    className='inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/30 px-2 py-1 text-[11px] text-gray-300'
                  >
                    <span>{entry.fileName}</span>
                    <span className='text-gray-500'>
                      {(entry.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type='button'
                      onClick={() => {
                        setAttachments((current) => current.filter((item) => item.id !== entry.id));
                      }}
                      aria-label={`Remove ${entry.fileName}`}
                      className='text-gray-400 hover:text-red-300'
                    >
                      <X className='size-3' />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

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
