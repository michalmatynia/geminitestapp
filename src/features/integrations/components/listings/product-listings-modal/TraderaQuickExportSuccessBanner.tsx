import React from 'react';

import type { PersistedTraderaQuickListFeedback } from '@/features/integrations/utils/traderaQuickListFeedback';
import {
  resolveCompletedAtFromFeedbackAndListing,
  resolveDuplicateLinkedFromListing,
  resolveListingUrl,
} from '@/features/integrations/utils/tradera-listing-client-utils';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import { Card } from '@/shared/ui/primitives.public';
import { ExternalLink } from '@/shared/ui/forms-and-actions.public';

type TraderaQuickExportSuccessBannerProps = {
  mode: 'empty' | 'content';
  feedback: PersistedTraderaQuickListFeedback;
  listing?: ProductListingWithDetails | null | undefined;
  variant?: 'compact' | 'full';
};

export function TraderaQuickExportSuccessBanner({
  mode,
  feedback,
  listing,
  variant = 'compact',
}: TraderaQuickExportSuccessBannerProps): React.JSX.Element | null {
  if (feedback.status !== 'completed') {
    return null;
  }

  const listingUrl = resolveListingUrl(feedback.listingUrl, feedback.externalListingId, listing);
  const externalListingId = listing?.externalListingId ?? feedback.externalListingId ?? null;
  const localListingId = listing?.id ?? feedback.listingId ?? null;
  const completedAt = resolveCompletedAtFromFeedbackAndListing(feedback.completedAt, listing);
  const duplicateLinked =
    resolveDuplicateLinkedFromListing(listing) || feedback.duplicateLinked === true;
  const title = duplicateLinked
    ? 'Tradera existing listing linked'
    : 'Tradera quick export completed';
  const description =
    duplicateLinked
      ? mode === 'empty'
        ? 'The product matched an existing Tradera listing and has now been linked in this modal. Use the link below to open the live Tradera item.'
        : 'The product is now linked to an existing Tradera listing. Open the live Tradera item directly from here.'
      : mode === 'empty'
        ? 'The product was listed on Tradera, but the listing row is still catching up in this modal. Use the link below to open the created Tradera item now.'
        : 'The product is now linked to the created Tradera listing. Open the live Tradera item directly from here.';
  const completedLabel = duplicateLinked ? 'Linked' : 'Completed';

  if (variant === 'full') {
    return (
      <Card variant='subtle' padding='lg' className='space-y-3 border-emerald-500/30 bg-emerald-500/10'>
        <div className='space-y-1 text-center'>
          <div className='text-sm font-semibold text-emerald-100'>{title}</div>
          <p className='text-xs text-emerald-50/80'>{description}</p>
        </div>
        {(externalListingId || localListingId) && (
          <div className='grid gap-2 text-xs text-gray-200 sm:grid-cols-2'>
            <div className='rounded-md border border-white/10 bg-card/50 px-3 py-2'>
              <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                External ID
              </div>
              <div className='font-mono text-white'>{externalListingId ?? 'Unavailable'}</div>
            </div>
            <div className='rounded-md border border-white/10 bg-card/50 px-3 py-2'>
              <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                App Listing
              </div>
              <div className='font-mono text-white'>{localListingId ?? 'Unavailable'}</div>
            </div>
          </div>
        )}
        {completedAt ? (
          <div className='text-center text-[11px] text-emerald-100/75'>{completedLabel}: {completedAt}</div>
        ) : null}
        {listingUrl ? (
          <div className='flex justify-center'>
            <ExternalLink
              href={listingUrl}
              className='rounded-md border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/20 hover:text-white'
            >
              Open listing
            </ExternalLink>
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <Card
      variant='subtle'
      padding='sm'
      className='border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-50/85'
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='font-medium text-emerald-100'>{title}</div>
          <div className='mt-1'>{description}</div>
          {(externalListingId || localListingId) && (
            <div className='mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-emerald-100/80'>
              {externalListingId ? (
                <span>
                  External ID: <span className='text-white'>{externalListingId}</span>
                </span>
              ) : null}
              {localListingId ? (
                <span>
                  App listing: <span className='text-white'>{localListingId}</span>
                </span>
              ) : null}
            </div>
          )}
          {completedAt ? <div className='mt-2 text-[11px] text-emerald-100/75'>{completedLabel}: {completedAt}</div> : null}
        </div>
        {listingUrl ? (
          <ExternalLink
            href={listingUrl}
            className='rounded-md border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/20 hover:text-white'
          >
            Open listing
          </ExternalLink>
        ) : null}
      </div>
    </Card>
  );
}
