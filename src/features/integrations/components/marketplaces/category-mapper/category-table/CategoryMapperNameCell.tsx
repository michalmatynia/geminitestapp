'use client';

import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import React from 'react';

import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/utils/ui-utils';

export type CategoryMapperNameCellProps = {
  name: string;
  path?: string | null;
  depth: number;
  canExpand: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMapped: boolean;
  hasPendingChange: boolean;
};

export function CategoryMapperNameCell({
  name,
  path = null,
  depth,
  canExpand,
  isExpanded,
  onToggleExpand,
  isMapped,
  hasPendingChange,
}: CategoryMapperNameCellProps): React.JSX.Element {
  const normalizedPath = typeof path === 'string' ? path.trim() : '';
  const shouldShowPath = normalizedPath.length > 0 && normalizedPath !== name.trim();

  return (
    <div
      className={cn(
        'flex items-center',
        hasPendingChange && 'bg-yellow-500/5 rounded px-2 -ml-2 py-1'
      )}
    >
      <div style={{ paddingLeft: `${depth * 20}px` }} className='flex items-center'>
        {canExpand ? (
          <button
            type='button'
            onClick={onToggleExpand}
            aria-label={isExpanded ? 'Collapse category' : 'Expand category'}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'xs' }),
              'mr-2 h-6 w-6 p-0.5 text-gray-400 hover:text-white'
            )}
            title={isExpanded ? 'Collapse category' : 'Expand category'}
          >
            {isExpanded ? (
              <ChevronDown className='h-4 w-4' />
            ) : (
              <ChevronRight className='h-4 w-4' />
            )}
          </button>
        ) : (
          <span className='mr-2 w-6 inline-block' />
        )}
        <div className='min-w-0'>
          <div className='flex items-center'>
            <span className='text-sm text-gray-200'>{name}</span>
            {isMapped && <Check className='ml-2 h-3 w-3 text-emerald-400' />}
          </div>
          {shouldShowPath ? (
            <div className='text-[11px] text-gray-500 truncate' title={normalizedPath}>
              {normalizedPath}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
