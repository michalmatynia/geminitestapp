import React from 'react';

import { Card } from '@/shared/ui/primitives.public';

type BaseQuickExportFailureBannerProps = {
  status: string | null | undefined;
  runId: string | null | undefined;
  failureReason?: string | null | undefined;
};

export function BaseQuickExportFailureBanner({
  status,
  runId,
  failureReason,
}: BaseQuickExportFailureBannerProps): React.JSX.Element {
  const resolvedFailureReason =
    typeof failureReason === 'string' && failureReason.trim().length > 0
      ? failureReason.trim()
      : null;

  return (
    <Card variant='subtle' padding='lg' className='bg-card/50 space-y-3'>
      <div className='space-y-1 text-center'>
        <div className='text-sm font-semibold text-white'>Previous Base.com export failed</div>
        <p className='text-xs text-gray-300'>
          The one-click export did not create a saved marketplace listing. Review the last failure
          details below, then use the options above to retry with a connection.
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
            Run ID
          </div>
          <div className='font-mono text-white'>{runId ?? 'Unavailable'}</div>
        </div>
      </div>
      {resolvedFailureReason ? (
        <div className='rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-left'>
          <div className='text-[10px] font-semibold uppercase tracking-wide text-rose-200'>
            Error message
          </div>
          <p className='mt-1 text-sm text-rose-50'>{resolvedFailureReason}</p>
        </div>
      ) : null}
    </Card>
  );
}
