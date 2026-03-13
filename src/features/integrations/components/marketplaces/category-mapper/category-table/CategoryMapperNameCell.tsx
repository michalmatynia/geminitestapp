'use client';

import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import React from 'react';

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

type CategoryMapperExpandRuntimeValue = {
  isExpanded: boolean;
  onToggleExpand: () => void;
};

const CategoryMapperExpandRuntimeContext =
  React.createContext<CategoryMapperExpandRuntimeValue | null>(null);

function useCategoryMapperExpandRuntime(): CategoryMapperExpandRuntimeValue {
  const runtime = React.useContext(CategoryMapperExpandRuntimeContext);
  if (!runtime) {
    throw new Error(
      'useCategoryMapperExpandRuntime must be used within CategoryMapperExpandRuntimeContext.Provider'
    );
  }
  return runtime;
}

function CategoryMapperExpandButton(): React.JSX.Element {
  const { isExpanded, onToggleExpand } = useCategoryMapperExpandRuntime();
  return (
    <Button
      variant='ghost'
      size='xs'
      onClick={onToggleExpand}
      aria-label={isExpanded ? 'Collapse category' : 'Expand category'}
      className='mr-2 p-0.5 text-gray-400 hover:text-white h-6 w-6'
    >
      {isExpanded ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}
    </Button>
  );
}

export function CategoryMapperNameCell({
  name,
  depth,
  canExpand,
  isExpanded,
  onToggleExpand,
  isMapped,
  hasPendingChange,
}: CategoryMapperNameCellProps): React.JSX.Element {
  const expandRuntimeValue = React.useMemo(
    () => ({ isExpanded, onToggleExpand }),
    [isExpanded, onToggleExpand]
  );

  return (
    <div
      className={cn(
        'flex items-center',
        hasPendingChange && 'bg-yellow-500/5 rounded px-2 -ml-2 py-1'
      )}
    >
      <div style={{ paddingLeft: `${depth * 20}px` }} className='flex items-center'>
        {canExpand ? (
          <CategoryMapperExpandRuntimeContext.Provider value={expandRuntimeValue}>
            <CategoryMapperExpandButton />
          </CategoryMapperExpandRuntimeContext.Provider>
        ) : (
          <span className='mr-2 w-6 inline-block' />
        )}
        <span className='text-sm text-gray-200'>{name}</span>
        {isMapped && <Check className='ml-2 h-3 w-3 text-emerald-400' />}
      </div>
    </div>
  );
}
