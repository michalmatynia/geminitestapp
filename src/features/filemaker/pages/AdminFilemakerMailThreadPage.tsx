'use client';

import { Archive, ArrowLeft, Eye, EyeOff, Forward, Paperclip, Reply, Star, StarOff, Trash2 } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState, startTransition } from 'react';

import { DocumentWysiwygEditor } from '@/shared/lib/document-editor/public';
import { FilemakerMailSidebar } from '../components/FilemakerMailSidebar';
import { buildFilemakerMailComposeHref as buildComposeHref } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailThreadHref as buildThreadHref } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailSelectionHref as buildSelectionHref } from '../mail-ui-helpers';
import { parseFilemakerMailParticipantsInput } from '../mail-utils';
import { sanitizeHtml } from '@/shared/utils/sanitization';

import type { FilemakerMailParticipant, FilemakerMailThreadDetail } from '../types';
import { Badge, Button, Input, useToast } from '@/shared/ui/primitives.public';
import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';
import { PanelHeader } from '@/shared/ui/templates.public';
import { FilemakerCampaignContextLinks } from './FilemakerCampaignMailLinks';

type ThreadResponse = {
  detail: FilemakerMailThreadDetail;
  forwardDraft: {
    accountId: string;
    bodyHtml: string;
    bcc: FilemakerMailParticipant[];
    cc: FilemakerMailParticipant[];
    inReplyTo: string | null;
    subject: string;
    to: FilemakerMailParticipant[];
  } | null;
  replyDraft: {
    accountId: string;
    to: FilemakerMailParticipant[];
    subject: string;
    bodyHtml: string;
    inReplyTo: string | null;
  } | null;
};

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
  participants
    .map((entry) => (entry.name ? `${entry.name} <${entry.address}>` : entry.address))
    .join(', ');

type LoadThreadOptions = {
  preserveReplyDraft?: boolean;
};

export function AdminFilemakerMailThreadPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const rawThreadId = Array.isArray(params['threadId']) ? params['threadId'][0] : params['threadId'];
  const threadId = useMemo(() => decodeURIComponent(rawThreadId ?? ''), [rawThreadId]);
  const [detail, setDetail] = useState<FilemakerMailThreadDetail | null>(null);
  const [replyAccountId, setReplyAccountId] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [replyCc, setReplyCc] = useState('');
  const [replyBcc, setReplyBcc] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyInReplyTo, setReplyInReplyTo] = useState<string | null>(null);
  const [replyHtml, setReplyHtml] = useState('<p><br/></p>');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTogglingRead, setIsTogglingRead] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const accountId = searchParams.get('accountId');
  const mailboxPath = searchParams.get('mailboxPath');
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
  const rawRecentCampaignId = searchParams.get('campaignId');
  const rawRecentRunId = searchParams.get('runId');
  const rawRecentDeliveryId = searchParams.get('deliveryId');
  const rawSearchQuery = searchParams.get('searchQuery');
  const rawSearchAccountId = searchParams.get('searchAccountId');
  const rawSearchContextAccountId = searchParams.get('searchContextAccountId');
  const recentMailboxFilter =
    originPanel === 'recent' && rawRecentMailboxFilter ? rawRecentMailboxFilter : null;
  const recentUnreadOnly = originPanel === 'recent' ? rawRecentUnreadOnly : false;
  const recentQuery = originPanel === 'recent' && rawRecentQuery ? rawRecentQuery : null;
  const recentCampaignId =
    originPanel === 'recent' && rawRecentCampaignId ? rawRecentCampaignId : null;
  const recentRunId = originPanel === 'recent' && rawRecentRunId ? rawRecentRunId : null;
  const recentDeliveryId =
    originPanel === 'recent' && rawRecentDeliveryId ? rawRecentDeliveryId : null;
  const searchQuery = originPanel === 'search' && rawSearchQuery ? rawSearchQuery : null;
  const searchAccountId =
    originPanel === 'search' && rawSearchAccountId === 'all' ? 'all' : null;
  const isGlobalSearchContext = searchAccountId === 'all';
  const persistedSearchContextAccountId =
    originPanel === 'search' &&
    !isGlobalSearchContext &&
    rawSearchContextAccountId &&
    rawSearchContextAccountId !== accountId
      ? rawSearchContextAccountId
      : null;
  const searchContextAccountId = originPanel === 'search'
    ? isGlobalSearchContext
      ? null
      : persistedSearchContextAccountId ?? accountId
    : null;
  const backLabel =
    originPanel === 'recent'
      ? 'Back to Recent'
      : originPanel === 'search'
        ? 'Back to Search'
        : 'Back to Mail';
  const backHref = useMemo(() => {
    return buildSelectionHref({
      accountId: originPanel === 'search' ? searchContextAccountId : accountId,
      mailboxPath: originPanel ? null : mailboxPath,
      panel: originPanel,
      recentMailboxFilter: originPanel === 'recent' ? recentMailboxFilter : null,
      recentUnreadOnly: originPanel === 'recent' ? recentUnreadOnly : false,
      recentQuery: originPanel === 'recent' ? recentQuery : null,
      recentCampaignId: originPanel === 'recent' ? recentCampaignId : null,
      recentRunId: originPanel === 'recent' ? recentRunId : null,
      recentDeliveryId: originPanel === 'recent' ? recentDeliveryId : null,
      searchQuery: originPanel === 'search' ? searchQuery : null,
    });
  }, [
    accountId,
    mailboxPath,
    originPanel,
    recentCampaignId,
    recentDeliveryId,
    recentMailboxFilter,
    recentQuery,
    recentRunId,
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
      (rawRecentCampaignId ?? null) === recentCampaignId &&
      (rawRecentRunId ?? null) === recentRunId &&
      (rawRecentDeliveryId ?? null) === recentDeliveryId &&
      (rawSearchQuery ?? null) === searchQuery &&
      (rawSearchAccountId ?? null) === searchAccountId &&
      (rawSearchContextAccountId ?? null) === persistedSearchContextAccountId
    ) {
      return;
    }

    startTransition(() => { router.replace(
            buildThreadHref({
              threadId,
              accountId,
              mailboxPath,
              originPanel,
              recentMailboxFilter,
              recentUnreadOnly,
              recentQuery,
              recentCampaignId,
              recentRunId,
              recentDeliveryId,
              searchContextAccountId: persistedSearchContextAccountId,
              searchAccountId,
              searchQuery,
            })
          ); });
  }, [
    accountId,
    mailboxPath,
    originPanel,
    rawOriginPanel,
    rawRecentCampaignId,
    rawRecentDeliveryId,
    rawRecentMailboxFilter,
    rawRecentQuery,
    rawRecentRunId,
    rawRecentUnreadOnly,
    rawSearchAccountId,
    rawSearchContextAccountId,
    rawSearchQuery,
    recentCampaignId,
    recentDeliveryId,
    recentMailboxFilter,
    recentQuery,
    recentRunId,
    recentUnreadOnly,
    persistedSearchContextAccountId,
    router,
    searchAccountId,
    searchQuery,
    threadId,
  ]);

  const load = useCallback(async (options?: LoadThreadOptions): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await fetchJson<ThreadResponse>(
        `/api/filemaker/mail/threads/${encodeURIComponent(threadId)}`
      );
      setDetail(result.detail);
      if (!options?.preserveReplyDraft) {
        setReplyAccountId(result.replyDraft?.accountId ?? '');
        setReplyTo(formatParticipants(result.replyDraft?.to ?? []));
        setReplyCc('');
        setReplyBcc('');
        setReplySubject(result.replyDraft?.subject ?? result.detail.thread.subject);
        setReplyHtml(result.replyDraft?.bodyHtml ?? '<p><br/></p>');
        setReplyInReplyTo(result.replyDraft?.inReplyTo ?? null);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load mail thread.', {
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [threadId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReply = async (): Promise<void> => {
    setIsSending(true);
    try {
      await fetchJson('/api/filemaker/mail/send', {
        method: 'POST',
        body: JSON.stringify({
          accountId: replyAccountId,
          threadId,
          inReplyTo: replyInReplyTo,
          to: parseFilemakerMailParticipantsInput(replyTo),
          cc: parseFilemakerMailParticipantsInput(replyCc),
          bcc: parseFilemakerMailParticipantsInput(replyBcc),
          subject: replySubject,
          bodyHtml: replyHtml,
        }),
      });
      toast('Reply sent.', { variant: 'success' });
      await load();
      setSidebarRefreshKey((current) => current + 1);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to send reply.', {
        variant: 'error',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleRead = async (): Promise<void> => {
    if (!detail) return;
    setIsTogglingRead(true);
    try {
      const markRead = detail.thread.unreadCount > 0;
      await fetchJson(
        `/api/filemaker/mail/threads/${encodeURIComponent(threadId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ read: markRead }),
        }
      );
      toast(markRead ? 'Marked as read.' : 'Marked as unread.', { variant: 'success' });
      await load({ preserveReplyDraft: true });
      setSidebarRefreshKey((current) => current + 1);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update thread.', {
        variant: 'error',
      });
    } finally {
      setIsTogglingRead(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);
    try {
      await fetchJson(
        `/api/filemaker/mail/threads/${encodeURIComponent(threadId)}`,
        { method: 'DELETE' }
      );
      toast('Thread deleted.', { variant: 'success' });
      startTransition(() => { router.push(backHref); });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to delete thread.', {
        variant: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const [pendingMessageAction, setPendingMessageAction] = useState<string | null>(null);

  const handleToggleFlag = useCallback(async (messageId: string, flagged: boolean): Promise<void> => {
    setPendingMessageAction(`${messageId}:flag`);
    try {
      await fetchJson(`/api/filemaker/mail/messages/${encodeURIComponent(messageId)}/flags`, {
        method: 'PATCH',
        body: JSON.stringify({ flagged }),
      });
      await load({ preserveReplyDraft: true });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update flag.', {
        variant: 'error',
      });
    } finally {
      setPendingMessageAction(null);
    }
  }, [load, toast]);

  const handleMoveMessage = useCallback(async (
    messageId: string,
    targetRole: 'archive' | 'trash'
  ): Promise<void> => {
    setPendingMessageAction(`${messageId}:${targetRole}`);
    try {
      await fetchJson(`/api/filemaker/mail/messages/${encodeURIComponent(messageId)}/move`, {
        method: 'POST',
        body: JSON.stringify({ targetRole }),
      });
      toast(targetRole === 'archive' ? 'Archived.' : 'Moved to trash.', { variant: 'success' });
      await load({ preserveReplyDraft: true });
      setSidebarRefreshKey((current) => current + 1);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to move message.', {
        variant: 'error',
      });
    } finally {
      setPendingMessageAction(null);
    }
  }, [load, toast]);

  const isThreadUnread = (detail?.thread.unreadCount ?? 0) > 0;

  return (
    <div className='page-section-compact grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
      <FilemakerMailSidebar
        selection={{
          accountId,
          mailboxPath,
          threadId,
          originPanel,
        }}
        filters={{
          recentMailboxFilter,
          recentUnreadOnly,
          recentQuery,
          searchContextAccountId,
          searchQuery,
        }}
        refreshKey={sidebarRefreshKey}
      />

      <div className='space-y-6'>
        <PanelHeader
          title={detail?.thread.subject ?? 'Mail Thread'}
          description='Review synced messages and reply using the shared rich-text editor.'
          icon={<Reply className='size-4' />}
          actions={[
            {
              key: 'back',
              label: backLabel,
              icon: <ArrowLeft className='size-4' />,
              variant: 'outline',
              onClick: () => startTransition(() => { router.push(backHref); }),
            },
            ...(detail
              ? [
                  {
                    key: 'toggle-read',
                    label: isTogglingRead
                      ? 'Updating...'
                      : isThreadUnread
                        ? 'Mark Read'
                        : 'Mark Unread',
                    icon: isThreadUnread
                      ? <Eye className='size-4' />
                      : <EyeOff className='size-4' />,
                    variant: 'outline' as const,
                    disabled: isTogglingRead,
                    onClick: () => { void handleToggleRead(); },
                  },
                  {
                    key: 'forward',
                    label: 'Forward',
                    icon: <Forward className='size-4' />,
                    variant: 'outline' as const,
                    onClick: () => {
                      const lastMessage = detail.messages[detail.messages.length - 1];
                      if (!lastMessage) return;
                      startTransition(() => { router.push(
                                                buildComposeHref({
                                                  accountId: detail.thread.accountId,
                                                  forwardThreadId: threadId,
                                                  mailboxPath: mailboxPath ?? detail.thread.mailboxPath,
                                                  originPanel,
                                                  recentMailboxFilter,
                                                  recentUnreadOnly,
                                                  recentQuery,
                                                  searchContextAccountId: persistedSearchContextAccountId,
                                                  searchAccountId: isGlobalSearchContext ? 'all' : null,
                                                  searchQuery,
                                                })
                                              ); });
                    },
                  },
                  {
                    key: 'delete',
                    label: isDeleting ? 'Deleting...' : 'Delete',
                    icon: <Trash2 className='size-4' />,
                    variant: 'outline' as const,
                    disabled: isDeleting,
                    onClick: () => { void handleDelete(); },
                  },
                ]
              : []),
          ]}
        />

        {detail ? (
          <div className='space-y-4'>
            <div className='flex flex-wrap gap-2'>
              <Badge variant='outline' className='text-[10px]'>
                Messages: {detail.thread.messageCount}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                Unread: {detail.thread.unreadCount}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                Mailbox: {detail.thread.mailboxPath}
              </Badge>
              {detail.thread.campaignContext ? (
                <FilemakerCampaignContextLinks
                  context={detail.thread.campaignContext}
                  className='flex flex-wrap gap-2'
                />
              ) : null}
            </div>

            <div className='space-y-3'>
              {detail.messages.map((message) => (
                <div
                  key={message.id}
                  className='rounded-lg border border-border/60 bg-card/25 p-4 text-sm text-gray-300'
                >
                  <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                    <div>
                      <div className='font-medium text-white'>
                        {message.from?.name ?? message.from?.address ?? 'Unknown sender'}
                      </div>
                      <div className='text-[11px] text-gray-500'>
                        To: {formatParticipants(message.to)}
                      </div>
                      {message.campaignContext ? (
                        <FilemakerCampaignContextLinks
                          context={message.campaignContext}
                          className='mt-2 flex flex-wrap gap-2'
                        />
                      ) : null}
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={pendingMessageAction === `${message.id}:flag`}
                        onClick={(): void => {
                          void handleToggleFlag(message.id, message.flags?.flagged !== true);
                        }}
                        aria-label={message.flags?.flagged === true ? 'Unstar message' : 'Star message'}
                      >
                        {message.flags?.flagged === true ? (
                          <Star className='size-4 fill-yellow-300 text-yellow-300' />
                        ) : (
                          <StarOff className='size-4' />
                        )}
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={pendingMessageAction === `${message.id}:archive`}
                        onClick={(): void => {
                          void handleMoveMessage(message.id, 'archive');
                        }}
                        aria-label='Archive message'
                      >
                        <Archive className='size-4' />
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={pendingMessageAction === `${message.id}:trash`}
                        onClick={(): void => {
                          void handleMoveMessage(message.id, 'trash');
                        }}
                        aria-label='Move message to trash'
                      >
                        <Trash2 className='size-4' />
                      </Button>
                      <div className='text-[11px] text-gray-500'>
                        {(message.receivedAt ?? message.sentAt)
                          ? new Date(message.receivedAt ?? message.sentAt ?? '').toLocaleString()
                          : 'Unknown time'}
                      </div>
                    </div>
                  </div>
                  {message.htmlBody ? (
                    <div
                      className='prose prose-invert max-w-none prose-a:text-sky-300'
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.htmlBody) }}
                    />
                  ) : (
                    <pre className='whitespace-pre-wrap text-sm text-gray-300'>
                      {message.textBody ?? '(no content)'}
                    </pre>
                  )}
                  {(message.attachments ?? []).length > 0 ? (
                    <div className='mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-2'>
                      {(message.attachments ?? []).map((attachment) => (
                        <div
                          key={attachment.id}
                          className='inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-[11px] text-gray-300'
                        >
                          <Paperclip className='size-3' />
                          <span className='font-mono'>{attachment.fileName ?? 'attachment'}</span>
                          {typeof attachment.sizeBytes === 'number' ? (
                            <span className='text-gray-500'>
                              {(attachment.sizeBytes / 1024).toFixed(1)} KB
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <FormSection title='Reply' className='space-y-4 p-4'>
              <FormField label='To'>
                <Input value={replyTo} onChange={(event) => setReplyTo(event.target.value)} />
              </FormField>
              <div className='grid gap-3 md:grid-cols-2'>
                <FormField label='Cc'>
                  <Input
                    value={replyCc}
                    onChange={(event) => setReplyCc(event.target.value)}
                    placeholder='cc@example.com'
                  />
                </FormField>
                <FormField label='Bcc'>
                  <Input
                    value={replyBcc}
                    onChange={(event) => setReplyBcc(event.target.value)}
                    placeholder='bcc@example.com'
                  />
                </FormField>
              </div>
              <FormField label='Subject'>
                <Input
                  value={replySubject}
                  onChange={(event) => setReplySubject(event.target.value)}
                />
              </FormField>
              <DocumentWysiwygEditor
                engineInstance='filemaker_email'
                showBrand
                value={replyHtml}
                onChange={setReplyHtml}
                placeholder='Write your reply...'
              />
              <div className='flex justify-end'>
                <Button
                  type='button'
                  onClick={(): void => {
                    void handleReply();
                  }}
                  disabled={isSending || isLoading}
                >
                  {isSending ? 'Sending reply...' : 'Send Reply'}
                </Button>
              </div>
            </FormSection>
          </div>
        ) : null}
      </div>
    </div>
  );
}
