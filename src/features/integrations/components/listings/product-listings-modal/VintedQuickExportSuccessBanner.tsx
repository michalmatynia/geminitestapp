import React from 'react';

import type { PersistedVintedQuickListFeedback } from '@/features/integrations/utils/vintedQuickListFeedback';
import {
  resolveVintedCompletedAtFromFeedbackAndListing,
  resolveVintedListingUrl,
} from '@/features/integrations/utils/vinted-listing-client-utils';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import { Card } from '@/shared/ui/primitives.public';
import { ExternalLink } from '@/shared/ui/forms-and-actions.public';

type VintedQuickExportSuccessBannerProps = {
  mode: 'empty' | 'content';
  feedback: PersistedVintedQuickListFeedback;
  listing?: ProductListingWithDetails | null | undefined;
  variant?: 'compact' | 'full';
};

export function VintedQuickExportSuccessBanner({
  mode,
  feedback,
  listing,
  variant = 'compact',
}: VintedQuickExportSuccessBannerProps): React.JSX.Element | null {
  if (feedback.status !== 'completed') {
    return null;
  }

  const listingUrl = resolveVintedListingUrl(
    feedback.listingUrl,
    feedback.externalListingId,
    listing
  );
  const externalListingId = listing?.externalListingId ?? feedback.externalListingId ?? null;
  const localListingId = listing?.id ?? feedback.listingId ?? null;
  const completedAt = resolveVintedCompletedAtFromFeedbackAndListing(
    feedback.completedAt,
    listing
  );
  const title = 'Vinted.pl quick export completed';
  const description =
    mode === 'empty'
      ? 'The product was listed on Vinted.pl, but the listing row is still catching up in this modal. Use the link below to open the created Vinted.pl item now.'
      : 'The product is now linked to the created Vinted.pl listing. Open the live Vinted item directly from here.';

  if (variant === 'full') {
    return (
      <Card variant='subtle' padding='lg' className='space-y-3 border-teal-500/30 bg-teal-500/10'>
        <div className='space-y-1 text-center'>
          <div className='text-sm font-semibold text-teal-100'>{title}</div>
          <p className='text-xs text-teal-50/80'>{description}</p>
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
          <div className='text-center text-[11px] text-teal-100/75'>Completed: {completedAt}</div>
        ) : null}
        {listingUrl ? (
          <div className='flex flex-wrap justify-center gap-2'>
            <ExternalLink
              href={listingUrl}
              className='rounded-md border border-teal-400/40 bg-teal-500/15 px-3 py-2 text-sm font-medium text-teal-100 hover:bg-teal-500/20 hover:text-white'
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
      className='border-teal-500/30 bg-teal-500/10 text-xs text-teal-50/85'
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='font-medium text-teal-100'>{title}</div>
          <div className='mt-1'>{description}</div>
          {(externalListingId || localListingId) && (
            <div className='mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-teal-100/80'>
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
          {completedAt ? (
            <div className='mt-2 text-[11px] text-teal-100/75'>Completed: {completedAt}</div>
          ) : null}
        </div>
        {listingUrl ? (
          <div className='flex flex-wrap gap-2'>
            <ExternalLink
              href={listingUrl}
              className='rounded-md border border-teal-400/40 bg-teal-500/15 px-3 py-2 text-sm font-medium text-teal-100 hover:bg-teal-500/20 hover:text-white'
            >
              Open listing
            </ExternalLink>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
