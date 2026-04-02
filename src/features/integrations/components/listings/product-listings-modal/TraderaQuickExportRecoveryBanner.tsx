import React from 'react';

import { Card } from '@/shared/ui';

import { TraderaRecoveryContinueButton } from './TraderaRecoveryContinueButton';

type TraderaQuickExportRecoveryBannerProps = {
  title: string;
  description: React.ReactNode;
  status: string | null | undefined;
  requestId?: string | null | undefined;
  runId?: string | null | undefined;
  integrationId?: string | null | undefined;
  connectionId?: string | null | undefined;
  variant?: 'compact' | 'full';
};

export function TraderaQuickExportRecoveryBanner({
  title,
  description,
  status,
  requestId,
  runId,
  integrationId,
  connectionId,
  variant = 'compact',
}: TraderaQuickExportRecoveryBannerProps): React.JSX.Element {
  const canContinue = Boolean(integrationId && connectionId);

  if (variant === 'full') {
    return (
      <Card variant='subtle' padding='lg' className='bg-card/50 space-y-3'>
        <div className='space-y-1 text-center'>
          <div className='text-sm font-semibold text-white'>{title}</div>
          <p className='text-xs text-gray-300'>{description}</p>
        </div>
        <div className='grid gap-2 text-xs text-gray-300 sm:grid-cols-2'>
          <div className='rounded-md border border-white/10 bg-card/60 px-3 py-2'>
            <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
              Status
            </div>
            <div className='font-mono text-white'>{status ?? 'Unknown'}</div>
          </div>
          <div className='rounded-md border border-white/10 bg-card/60 px-3 py-2'>
            <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
              Queue job
            </div>
            <div className='font-mono text-white'>{requestId ?? 'Unavailable'}</div>
          </div>
        </div>
        {canContinue && (
          <div className='flex justify-center'>
            <TraderaRecoveryContinueButton
              integrationId={integrationId!}
              connectionId={connectionId!}
              size='md'
            />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card variant='subtle' padding='sm' className='bg-card/60 text-xs text-gray-300'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div>{description}</div>
          {(requestId || runId) && (
            <div className='mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-gray-400'>
              {requestId && (
                <span>
                  Queue job: <span className='text-white'>{requestId}</span>
                </span>
              )}
              {runId && (
                <span>
                  Run ID: <span className='text-white'>{runId}</span>
                </span>
              )}
            </div>
          )}
        </div>
        {canContinue && (
          <TraderaRecoveryContinueButton
            integrationId={integrationId!}
            connectionId={connectionId!}
          />
        )}
      </div>
    </Card>
  );
}
