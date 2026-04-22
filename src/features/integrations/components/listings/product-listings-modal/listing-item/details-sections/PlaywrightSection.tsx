'use client';

import React from 'react';
import { ExternalLink } from '@/shared/ui/forms-and-actions.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import { JsonViewer } from '@/shared/ui/data-display.public';
import { formatTimestamp, type resolvePlaywrightExecutionSummary } from '../ProductListingDetails.utils';

export function PlaywrightSection({
  execution,
}: {
  execution: ReturnType<typeof resolvePlaywrightExecutionSummary>;
}): React.JSX.Element {
  return (
    <>
      <div className='mt-1 pt-2 border-t border-white/5 space-y-1'>
        {(execution.executedAt ?? null) !== null && (
          <MetadataItem
            label='Last execution'
            value={formatTimestamp(execution.executedAt)}
            variant='minimal'
          />
        )}
        {(execution.pendingQueuedAt ?? null) !== null && (
          <MetadataItem
            label='Pending relist'
            value={formatTimestamp(execution.pendingQueuedAt)}
            variant='minimal'
          />
        )}
        {(execution.pendingBrowserMode ?? '') !== '' && (
          <MetadataItem
            label='Pending browser mode'
            value={execution.pendingBrowserMode}
            variant='minimal'
          />
        )}
        {(execution.pendingRequestId ?? '') !== '' && (
          <MetadataItem
            label='Pending queue job'
            value={execution.pendingRequestId}
            mono
            variant='minimal'
          />
        )}
        {((execution.browserMode ?? '') !== '' || (execution.requestedBrowserMode ?? '') !== '') && (
          <MetadataItem
            label='Browser mode'
            value={execution.browserMode ?? execution.requestedBrowserMode!}
            variant='minimal'
          />
        )}
        {(execution.runId ?? '') !== '' && (
          <MetadataItem
            label='Run ID'
            value={execution.runId}
            mono
            variant='minimal'
          />
        )}
        {(execution.requestId ?? '') !== '' && (
          <MetadataItem
            label='Queue job'
            value={execution.requestId}
            mono
            variant='minimal'
          />
        )}
        {execution.publishVerified !== null && (
          <MetadataItem
            label='Publish verified'
            value={execution.publishVerified ? 'Yes' : 'No'}
            valueClassName={execution.publishVerified ? 'text-emerald-400' : 'text-rose-400'}
            variant='minimal'
          />
        )}
        {(execution.listingUrl ?? '') !== '' && (
          <MetadataItem
            label='Listing URL'
            value={(
              <ExternalLink href={execution.listingUrl!} className='text-sky-400 hover:text-sky-300'>
                Open listing
              </ExternalLink>
            )}
            variant='minimal'
          />
        )}
        {(execution.errorCategory ?? '') !== '' && (
          <MetadataItem
            label='Error category'
            value={execution.errorCategory}
            variant='minimal'
          />
        )}
      </div>

      {execution.rawResult !== null && (
        <div className='mt-4'>
          <JsonViewer
            title='Playwright run result'
            data={execution.rawResult}
            maxHeight={220}
            className='bg-white/5'
          />
        </div>
      )}
    </>
  );
}
