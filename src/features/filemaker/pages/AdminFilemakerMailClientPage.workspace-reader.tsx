'use client';

import { FileText } from 'lucide-react';
import React from 'react';

import { sanitizeHtml } from '@/shared/utils/sanitization';

import type { FilemakerMailMessage, FilemakerMailThreadDetail } from '../types';
import {
  formatDateTime,
  formatParticipants,
  hasText,
} from './AdminFilemakerMailClientPage.workspace-model';
import { ReplyPanel, type ReplyPanelProps } from './AdminFilemakerMailClientPage.workspace-reply';
import { MailClientStatusLine } from './AdminFilemakerMailClientPage.workspace-shared';

const formatMessageSender = (message: FilemakerMailMessage): string => {
  if (message.from === null || message.from === undefined) return 'Unknown sender';
  if (hasText(message.from.name)) return `${message.from.name.trim()} <${message.from.address}>`;
  return message.from.address;
};

function MailClientMessage({
  message,
}: {
  message: FilemakerMailMessage;
}): React.JSX.Element {
  const hasHtmlBody = hasText(message.htmlBody);
  return (
    <article className='border-b border-border/60 px-4 py-4 last:border-b-0'>
      <div className='mb-3 flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='truncate text-sm font-semibold text-foreground'>
            {formatMessageSender(message)}
          </div>
          <div className='truncate text-xs text-muted-foreground'>
            To: {formatParticipants(message.to)}
          </div>
        </div>
        <div className='shrink-0 text-[11px] text-muted-foreground'>
          {formatDateTime(message.receivedAt ?? message.sentAt ?? null)}
        </div>
      </div>
      {hasHtmlBody ? (
        <div
          className='prose prose-sm max-w-none dark:prose-invert prose-a:text-sky-400'
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.htmlBody ?? '') }}
        />
      ) : (
        <pre className='whitespace-pre-wrap text-sm text-foreground'>
          {message.textBody ?? '(no content)'}
        </pre>
      )}
      <MessageAttachments message={message} />
    </article>
  );
}

function MessageAttachments({
  message,
}: {
  message: FilemakerMailMessage;
}): React.JSX.Element | null {
  if (message.attachments.length === 0) return null;
  return (
    <div className='mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3'>
      {message.attachments.map((attachment) => (
        <span
          key={attachment.id}
          className='inline-flex items-center gap-2 rounded-md border border-border/60 px-2 py-1 text-[11px] text-muted-foreground'
        >
          <FileText className='size-3' />
          {attachment.fileName}
        </span>
      ))}
    </div>
  );
}

function ReaderHeader({
  detail,
}: {
  detail: FilemakerMailThreadDetail | null;
}): React.JSX.Element {
  return (
    <div className='border-b border-border/60 px-4 py-3'>
      <h2 className='truncate text-sm font-semibold text-foreground'>
        {detail === null ? 'Reader / editor' : detail.thread.subject}
      </h2>
      <p className='truncate text-xs text-muted-foreground'>
        {detail === null ? 'Select an email above to read and reply.' : `${detail.messages.length} message thread`}
      </p>
    </div>
  );
}

function ReaderBody({
  detail,
  error,
  isLoading,
}: {
  detail: FilemakerMailThreadDetail | null;
  error: string | null;
  isLoading: boolean;
}): React.JSX.Element {
  if (error !== null) {
    return <div className='p-4'><MailClientStatusLine tone='error'>{error}</MailClientStatusLine></div>;
  }
  if (isLoading) {
    return <div className='p-4'><MailClientStatusLine>Loading selected email...</MailClientStatusLine></div>;
  }
  if (detail === null) {
    return <div className='p-4'><MailClientStatusLine>No email selected.</MailClientStatusLine></div>;
  }
  return (
    <>
      {detail.messages.map((message) => (
        <MailClientMessage key={message.id} message={message} />
      ))}
    </>
  );
}

type MailClientReaderEditorProps = {
  detail: FilemakerMailThreadDetail | null;
  error: string | null;
  isLoading: boolean;
} & Omit<ReplyPanelProps, 'disabled'>;

export function MailClientReaderEditor({
  detail,
  error,
  isLoading,
  isSending,
  replyBcc,
  replyCc,
  replyHtml,
  replySubject,
  replyTo,
  onReplyBccChange,
  onReplyCcChange,
  onReplyHtmlChange,
  onReplySubjectChange,
  onReplyToChange,
  onSendReply,
}: MailClientReaderEditorProps): React.JSX.Element {
  const disabled = detail === null || isSending;
  return (
    <section className='grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]'>
      <ReaderHeader detail={detail} />
      <div className='min-h-0 overflow-auto bg-background/40'>
        <ReaderBody detail={detail} error={error} isLoading={isLoading} />
      </div>
      <ReplyPanel
        disabled={disabled}
        isSending={isSending}
        replyBcc={replyBcc}
        replyCc={replyCc}
        replyHtml={replyHtml}
        replySubject={replySubject}
        replyTo={replyTo}
        onReplyBccChange={onReplyBccChange}
        onReplyCcChange={onReplyCcChange}
        onReplyHtmlChange={onReplyHtmlChange}
        onReplySubjectChange={onReplySubjectChange}
        onReplyToChange={onReplyToChange}
        onSendReply={onSendReply}
      />
    </section>
  );
}
