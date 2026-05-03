'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils/ui-utils';

type ProductFormScansHistoryHeaderProps = {
  activeScansCount: number;
  totalScansCount: number;
  isFetching: boolean;
  onRefetch: () => void;
};

export function ProductFormScansHistoryHeader({
  activeScansCount,
  totalScansCount,
  isFetching,
  onRefetch,
}: ProductFormScansHistoryHeaderProps): React.JSX.Element {
  return (
    <div className='flex items-center justify-between gap-4'>
      <div className='flex items-center gap-2'>
        <h4 className='text-sm font-semibold uppercase tracking-widest text-muted-foreground/80'>Scan History</h4>
        {activeScansCount > 0 ? (
          <span className='inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 ring-1 ring-inset ring-blue-500/20'>
            <Loader2 className='h-2.5 w-2.5 animate-spin' /> {activeScansCount} active
          </span>
        ) : <span className='text-xs font-medium text-muted-foreground/60'>({totalScansCount} total)</span>}
      </div>
      <Button variant='ghost' size='xs' onClick={onRefetch} disabled={isFetching} className='h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground'>
        <RefreshCw className={cn('h-3 w-3', isFetching === true && 'animate-spin')} /> Refresh
      </Button>
    </div>
  );
}
