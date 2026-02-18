'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { MetadataItem, Hint, Alert, CopyButton } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

interface TestResultModalProps extends Omit<ModalStateProps, 'onSuccess'> {
  onSuccess?: () => void;
  success: boolean;
  message: string | null;
  meta?: {
    errorId?: string;
    integrationId?: string | null;
    connectionId?: string | null;
  } | undefined;
}

export function TestResultModal({
  isOpen,
  onClose,
  success,
  message,
  meta,
}: TestResultModalProps): React.JSX.Element | null {
  if (!message) return null;

  const metaLines = [
    meta?.errorId ? `Error ID: ${meta.errorId}` : null,
    meta?.integrationId ? `Integration ID: ${meta.integrationId}` : null,
    meta?.connectionId ? `Connection ID: ${meta.connectionId}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const copyText = metaLines ? `${metaLines}\n\n${message}` : message;

  const footer = (
    <CopyButton
      value={copyText}
      variant='outline'
      size='sm'
      showText
    />
  );

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={success ? 'Playwright Test Success' : 'Playwright Test Error'}
      footer={footer}
      size='lg'
    >
      <div className='space-y-4'>
        {!success && (
          <Hint variant='subtle' className='rounded-md border border-border bg-card/60 p-3'>
            Copy the raw error to share or debug it.
          </Hint>
        )}
        {(meta?.errorId || meta?.integrationId || meta?.connectionId) && (
          <div className='grid gap-3 md:grid-cols-3'>
            <MetadataItem
              label='Error ID'
              value={meta?.errorId}
              mono
            />
            <MetadataItem
              label='Integration ID'
              value={meta?.integrationId}
              mono
            />
            <MetadataItem
              label='Connection ID'
              value={meta?.connectionId}
              mono
            />
          </div>
        )}
        {success ? (
          <Alert variant='success' className='whitespace-pre-wrap break-words font-sans'>
            {message}
          </Alert>
        ) : (
          <div className='rounded-md border border-border bg-gray-950 p-4'>
            <pre className='max-h-[400px] overflow-auto text-[11px] text-gray-200 leading-relaxed font-mono'>
              <code className='select-text whitespace-pre-wrap'>{message}</code>
            </pre>
          </div>
        )}
      </div>
    </DetailModal>
  );
}
