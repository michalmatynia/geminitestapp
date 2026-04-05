import React from 'react';
import Link from 'next/link';

import { Button, Card } from '@/shared/ui/primitives.public';

import { TraderaRecoveryContinueButton } from './TraderaRecoveryContinueButton';

type TraderaQuickExportRecoveryBannerProps = {
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

const isTraderaCategoryMapperFailure = (failureReason: string | null | undefined): boolean => {
  const normalized = (failureReason ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('category mapper') ||
    normalized.includes('category mapping') ||
    normalized.includes('fetch tradera categories')
  );
};

export function TraderaQuickExportRecoveryBanner({
  mode,
  status,
  requestId,
  runId,
  integrationId,
  connectionId,
  failureReason,
  canContinue = Boolean(integrationId && connectionId),
  variant = 'compact',
}: TraderaQuickExportRecoveryBannerProps): React.JSX.Element {
  const categoryMapperHref = connectionId
    ? `/admin/integrations/marketplaces/category-mapper?connectionId=${encodeURIComponent(connectionId)}`
    : null;
  const canOpenCategoryMapper = Boolean(
    !canContinue && categoryMapperHref && isTraderaCategoryMapperFailure(failureReason)
  );
  const title =
    mode === 'empty'
      ? 'Tradera quick export needs recovery'
      : canContinue
        ? 'Tradera quick export requires recovery'
        : 'Tradera quick export needs attention';
  const description =
    mode === 'empty' && !canContinue && failureReason ? (
      failureReason
    ) : mode === 'empty' ? (
      'The one-click Tradera export did not leave behind a usable listing record yet. Open the Tradera login window if needed, then continue directly into the Tradera listing flow from this modal.'
    ) : !canContinue && failureReason ? (
      failureReason
    ) : (
      <>
        Review the Tradera listing below and use
        <span className='font-semibold text-white'> Login and continue listing </span>
        if the last run needs manual verification.
      </>
    );

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
        {(canContinue || canOpenCategoryMapper) && (
          <div className='flex flex-wrap justify-center gap-2'>
            {canOpenCategoryMapper && categoryMapperHref && (
              <Button asChild type='button' variant='outline' size='default'>
                <Link href={categoryMapperHref}>Open Category Mapper</Link>
              </Button>
            )}
            {canContinue && (
              <TraderaRecoveryContinueButton
                integrationId={integrationId!}
                connectionId={connectionId!}
                size='md'
              />
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card variant='subtle' padding='sm' className='bg-card/60 text-xs text-gray-300'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='text-sm font-semibold text-white'>{title}</div>
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
        {(canContinue || canOpenCategoryMapper) && (
          <div className='flex shrink-0 flex-wrap gap-2'>
            {canOpenCategoryMapper && categoryMapperHref && (
              <Button asChild type='button' variant='outline' size='sm'>
                <Link href={categoryMapperHref}>Open Category Mapper</Link>
              </Button>
            )}
            {canContinue && (
              <TraderaRecoveryContinueButton
                integrationId={integrationId!}
                connectionId={connectionId!}
              />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
