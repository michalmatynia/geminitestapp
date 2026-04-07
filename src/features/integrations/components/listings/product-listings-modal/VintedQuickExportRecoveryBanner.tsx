import React from 'react';

import { Card } from '@/shared/ui/primitives.public';

import { VintedRecoveryContinueButton } from './VintedRecoveryContinueButton';

type VintedQuickExportRecoveryBannerProps = {
  mode: 'empty' | 'content';
  status: string | null | undefined;
  requestId?: string | null | undefined;
  runId?: string | null | undefined;
  integrationId?: string | null | undefined;
  connectionId?: string | null | undefined;
  failureReason?: string | null | undefined;
  canContinue?: boolean;
  variant?: 'compact' | 'full';
};

const hasAuthSignal = (value: string | null | undefined): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('auth_required') ||
    normalized.includes('login') ||
    normalized.includes('verification') ||
    normalized.includes('captcha') ||
    normalized.includes('auth') ||
    normalized.includes('session expired')
  );
};

export function VintedQuickExportRecoveryBanner({
  mode,
  status,
  requestId,
  runId,
  integrationId,
  connectionId,
  failureReason,
  canContinue = Boolean(integrationId && connectionId),
  variant = 'compact',
}: VintedQuickExportRecoveryBannerProps): React.JSX.Element {
  const title =
    mode === 'empty'
      ? 'Vinted.pl quick export needs recovery'
      : canContinue
        ? 'Vinted.pl quick export requires recovery'
        : 'Vinted.pl quick export requires attention';
  const description =
    failureReason &&
    !hasAuthSignal(failureReason) &&
    (status ?? '').trim().toLowerCase() !== 'auth_required' &&
    (status ?? '').trim().toLowerCase() !== 'needs_login'
      ? failureReason
      : mode === 'empty'
        ? 'The Vinted.pl one-click export did not leave behind a usable listing record yet. Refresh the Vinted browser session if needed, then retry from this modal.'
        : canContinue
          ? (
            <>
              Review the Vinted listing below and use
              <span className='font-semibold text-white'> Login to Vinted.pl </span>
              if the last run needs a fresh browser session. After login, retry the Vinted listing manually.
            </>
          )
          : 'Review the Vinted status below. If the last run needs a fresh browser session, refresh the Vinted connection session and retry the listing manually.';

  if (variant === 'full') {
    return (
      <Card variant='subtle' padding='lg' className='bg-card/50 space-y-3'>
        <div className='space-y-1 text-center'>
          <div className='text-sm font-semibold text-white'>{title}</div>
          <p className='break-words whitespace-normal text-xs leading-relaxed text-gray-300'>
            {description}
          </p>
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
        {canContinue && integrationId && connectionId && (
          <div className='flex flex-wrap justify-center gap-2'>
            <VintedRecoveryContinueButton
              integrationId={integrationId}
              connectionId={connectionId}
              size='md'
            />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card variant='subtle' padding='sm' className='bg-card/60 text-xs text-gray-300'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0 flex-1'>
          <div className='text-sm font-semibold text-white'>{title}</div>
          <div className='break-words whitespace-normal leading-relaxed'>{description}</div>
          {(requestId || runId) && (
            <div className='mt-2 flex min-w-0 flex-wrap gap-3 font-mono text-[11px] text-gray-400'>
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
        {canContinue && integrationId && connectionId && (
          <div className='flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0'>
            <VintedRecoveryContinueButton
              integrationId={integrationId}
              connectionId={connectionId}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
