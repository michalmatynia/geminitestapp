'use client';

import React from 'react';
import { AlertCircle, Headphones } from 'lucide-react';
import { cn } from '@/features/kangur/shared/utils';
import type { KangurLessonPageValidation } from '../content-creator-insights';

export function ActivePageHealthPanel({ review }: { review: KangurLessonPageValidation }): React.JSX.Element {
  const { narrationCoverage, warnings } = review;

  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <div className={cn(
        'rounded-2xl border p-4',
        narrationCoverage.state === 'ready' ? 'border-emerald-100 bg-emerald-50/30' : 'border-amber-100 bg-amber-50/30'
      )}>
        <div className='flex items-center gap-2'>
          <Headphones className={cn('size-4', narrationCoverage.state === 'ready' ? 'text-emerald-600' : 'text-amber-600')} />
          <div className='text-sm font-semibold'>Narration on this page</div>
        </div>
        <div className='mt-1 text-xs text-muted-foreground'>
          {narrationCoverage.detail}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className='rounded-2xl border border-rose-100 bg-rose-50/30 p-4'>
          <div className='flex items-center gap-2'>
            <AlertCircle className='size-4 text-rose-600' />
            <div className='text-sm font-semibold'>Page health</div>
          </div>
          <div className='mt-1 space-y-1'>
            {warnings.map((warning, index) => (
              <div key={index} className='text-xs text-muted-foreground'>
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
