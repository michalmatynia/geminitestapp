'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { DetailModal } from '@/shared/ui/templates/modals';
import { Button } from '@/shared/ui';

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
    <Button
      variant='outline'
      size='sm'
      onClick={() => {
        void navigator.clipboard.writeText(copyText);
      }}
    >
      Copy Payload
    </Button>
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
          <div className='rounded-md border border-border bg-card/60 p-3 text-xs text-gray-300'>
            Copy the raw error to share or debug it.
          </div>
        )}
        {(meta?.errorId || meta?.integrationId || meta?.connectionId) && (
          <div className='grid gap-3 rounded-md border border-border bg-card/60 p-3 text-xs text-gray-300 md:grid-cols-3'>
            <div>
              <p className='text-[10px] uppercase font-bold text-gray-500'>Error ID</p>
              <p className='mt-1 font-mono break-all text-gray-200'>{meta?.errorId || '—'}</p>
            </div>
            <div>
              <p className='text-[10px] uppercase font-bold text-gray-500'>Integration ID</p>
              <p className='mt-1 font-mono break-all text-gray-200'>{meta?.integrationId || '—'}</p>
            </div>
            <div>
              <p className='text-[10px] uppercase font-bold text-gray-500'>Connection ID</p>
              <p className='mt-1 font-mono break-all text-gray-200'>{meta?.connectionId || '—'}</p>
            </div>
          </div>
        )}
        {success ? (
          <div className='rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 text-emerald-100 text-sm'>
            <p className='whitespace-pre-wrap break-words leading-relaxed'>{message}</p>
          </div>
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
