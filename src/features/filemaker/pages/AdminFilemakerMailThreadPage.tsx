'use client';

import { ArrowLeft, Reply } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { DocumentWysiwygEditor } from '@/features/document-editor/components/DocumentWysiwygEditor';
import { FilemakerMailSidebar } from '../components/FilemakerMailSidebar';
import { parseFilemakerMailParticipantsInput } from '../mail-utils';
import { sanitizeHtml } from '@/shared/utils';

import type { FilemakerMailParticipant, FilemakerMailThreadDetail } from '../types';
import { Badge, Button, FormField, FormSection, Input, PanelHeader, useToast } from '@/shared/ui';

type ThreadResponse = {
  detail: FilemakerMailThreadDetail;
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

export function AdminFilemakerMailThreadPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const threadId = useMemo(() => {
    const raw = Array.isArray(params['threadId']) ? params['threadId'][0] : params['threadId'];
    return decodeURIComponent(raw ?? '');
  }, [params]);
  const [detail, setDetail] = useState<FilemakerMailThreadDetail | null>(null);
  const [replyAccountId, setReplyAccountId] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyInReplyTo, setReplyInReplyTo] = useState<string | null>(null);
  const [replyHtml, setReplyHtml] = useState('<p><br/></p>');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const backHref = useMemo(() => {
    const search = new URLSearchParams();
    const accountId = searchParams.get('accountId');
    const mailboxPath = searchParams.get('mailboxPath');
    if (accountId) search.set('accountId', accountId);
    if (mailboxPath) search.set('mailboxPath', mailboxPath);
    const nextSearch = search.toString();
    return nextSearch ? `/admin/filemaker/mail?${nextSearch}` : '/admin/filemaker/mail';
  }, [searchParams]);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await fetchJson<ThreadResponse>(
        `/api/filemaker/mail/threads/${encodeURIComponent(threadId)}`
      );
      setDetail(result.detail);
      setReplyAccountId(result.replyDraft?.accountId ?? '');
      setReplyTo(formatParticipants(result.replyDraft?.to ?? []));
      setReplySubject(result.replyDraft?.subject ?? result.detail.thread.subject);
      setReplyHtml(result.replyDraft?.bodyHtml ?? '<p><br/></p>');
      setReplyInReplyTo(result.replyDraft?.inReplyTo ?? null);
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
          cc: [],
          bcc: [],
          subject: replySubject,
          bodyHtml: replyHtml,
        }),
      });
      toast('Reply sent.', { variant: 'success' });
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to send reply.', {
        variant: 'error',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className='page-section-compact grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
      <FilemakerMailSidebar
        selectedAccountId={searchParams.get('accountId')}
        selectedMailboxPath={searchParams.get('mailboxPath')}
      />

      <div className='space-y-6'>
        <PanelHeader
          title={detail?.thread.subject ?? 'Mail Thread'}
          description='Review synced messages and reply using the shared rich-text editor.'
          icon={<Reply className='size-4' />}
          actions={[
            {
              key: 'back',
              label: 'Back to Mail',
              icon: <ArrowLeft className='size-4' />,
              variant: 'outline',
              onClick: () => router.push(backHref),
            },
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
                    </div>
                    <div className='text-[11px] text-gray-500'>
                      {(message.receivedAt ?? message.sentAt)
                        ? new Date(message.receivedAt ?? message.sentAt ?? '').toLocaleString()
                        : 'Unknown time'}
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
                </div>
              ))}
            </div>

            <FormSection title='Reply' className='space-y-4 p-4'>
              <FormField label='Reply to'>
                <Input value={replyTo} onChange={(event) => setReplyTo(event.target.value)} />
              </FormField>
              <FormField label='Subject'>
                <Input
                  value={replySubject}
                  onChange={(event) => setReplySubject(event.target.value)}
                />
              </FormField>
              <DocumentWysiwygEditor
                value={replyHtml}
                onChange={setReplyHtml}
                placeholder='Write your reply...'
                enableAdvancedTools
                allowFontFamily
                allowTextAlign
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
