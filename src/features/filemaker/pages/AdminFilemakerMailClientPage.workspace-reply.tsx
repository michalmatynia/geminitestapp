'use client';

import { Send } from 'lucide-react';
import React from 'react';

import { DocumentWysiwygEditor } from '@/shared/lib/document-editor/public';
import { Button, Input } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';

import { hasText } from './AdminFilemakerMailClientPage.workspace-model';

export type ReplyPanelProps = {
  disabled: boolean;
  isSending: boolean;
  replyBcc: string;
  replyCc: string;
  replyHtml: string;
  replySubject: string;
  replyTo: string;
  onReplyBccChange: (value: string) => void;
  onReplyCcChange: (value: string) => void;
  onReplyHtmlChange: (value: string) => void;
  onReplySubjectChange: (value: string) => void;
  onReplyToChange: (value: string) => void;
  onSendReply: () => void;
};

function ReplyInput({
  disabled,
  label,
  placeholder,
  value,
  onChange,
}: {
  disabled: boolean;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <FormField label={label}>
      <Input
        value={value}
        onChange={(event): void => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
    </FormField>
  );
}

function ReplyAddressFields(props: ReplyPanelProps): React.JSX.Element {
  const { disabled, replyBcc, replyCc, replySubject, replyTo } = props;
  return (
    <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
      <ReplyInput
        label='To'
        value={replyTo}
        disabled={disabled}
        placeholder='recipient@example.com'
        onChange={props.onReplyToChange}
      />
      <ReplyInput
        label='Subject'
        value={replySubject}
        disabled={disabled}
        placeholder='Subject'
        onChange={props.onReplySubjectChange}
      />
      <ReplyInput
        label='Cc'
        value={replyCc}
        disabled={disabled}
        placeholder='cc@example.com'
        onChange={props.onReplyCcChange}
      />
      <ReplyInput
        label='Bcc'
        value={replyBcc}
        disabled={disabled}
        placeholder='bcc@example.com'
        onChange={props.onReplyBccChange}
      />
    </div>
  );
}

function ReplyEditor({
  disabled,
  isSending,
  replyHtml,
  replySubject,
  replyTo,
  onReplyHtmlChange,
  onSendReply,
}: Pick<
  ReplyPanelProps,
  | 'disabled'
  | 'isSending'
  | 'replyHtml'
  | 'replySubject'
  | 'replyTo'
  | 'onReplyHtmlChange'
  | 'onSendReply'
>): React.JSX.Element {
  return (
    <>
      <div className='mt-3'>
        <DocumentWysiwygEditor
          engineInstance='filemaker_email'
          showBrand
          value={replyHtml}
          onChange={onReplyHtmlChange}
          disabled={disabled}
          placeholder='Write your reply...'
          surfaceClassName='min-h-[180px]'
          editorContentClassName='[&_.ProseMirror]:min-h-[160px]'
        />
      </div>
      <div className='mt-3 flex justify-end'>
        <Button
          type='button'
          onClick={onSendReply}
          disabled={disabled || isSending || !hasText(replyTo) || !hasText(replySubject)}
        >
          <Send className='mr-2 size-4' />
          {isSending ? 'Sending...' : 'Send Reply'}
        </Button>
      </div>
    </>
  );
}

export function ReplyPanel(props: ReplyPanelProps): React.JSX.Element {
  return (
    <div className='border-t border-border/60 bg-card/20 p-4'>
      <ReplyAddressFields {...props} />
      <ReplyEditor {...props} />
    </div>
  );
}
