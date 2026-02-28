'use client';

import React from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

export type CategoryMapperNameCellProps = {
  name: string;
  depth: number;
  canExpand: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMapped: boolean;
  hasPendingChange: boolean;
};

export function CategoryMapperNameCell({
  name,
  depth,
  canExpand,
  isExpanded,
  onToggleExpand,
  isMapped,
  hasPendingChange,
}: CategoryMapperNameCellProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center',
        hasPendingChange && 'bg-yellow-500/5 rounded px-2 -ml-2 py-1'
      )}
    >
      <div style={{ paddingLeft: `${depth * 20}px` }} className='flex items-center'>
        {canExpand ? (
          <Button
            variant='ghost'
            size='xs'
            onClick={onToggleExpand}
            className='mr-2 p-0.5 text-gray-400 hover:text-white h-6 w-6'
          >
            {isExpanded ? (
              <ChevronDown className='h-4 w-4' />
            ) : (
              <ChevronRight className='h-4 w-4' />
            )}
          </Button>
        ) : (
          <span className='mr-2 w-6 inline-block' />
        )}
        <span className='text-sm text-gray-200'>{name}</span>
        {isMapped && <Check className='ml-2 h-3 w-3 text-emerald-400' />}
      </div>
    </div>
  );
}
