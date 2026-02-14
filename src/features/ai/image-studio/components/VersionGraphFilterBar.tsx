'use client';

import { Search, Shield, X } from 'lucide-react';
import React from 'react';

import { Input } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useVersionGraphControlsContext } from './VersionGraphControlsContext';

// ── Component ────────────────────────────────────────────────────────────────

export function VersionGraphFilterBar(): React.JSX.Element {
  const {
    filterQuery,
    filterTypes,
    filterHasMask,
    filterLeafOnly,
    hasActiveFilters,
    onSetFilterQuery,
    onToggleFilterType,
    onSetFilterHasMask,
    onToggleLeafOnly,
    onClearFilters,
  } = useVersionGraphControlsContext();

  return (
    <div className='border-b border-border/40 px-3 py-1.5'>
      <div className='flex items-center gap-1.5'>
        <div className='relative flex-1'>
          <Search className='absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-gray-500' />
          <Input size='sm'
            type='text'
            value={filterQuery}
            onChange={(e) => onSetFilterQuery(e.target.value)}
            placeholder='Search nodes...'
            className='h-6 w-full rounded border border-border/40 bg-transparent pl-5 pr-2 text-[10px] text-gray-300 placeholder:text-gray-600 focus:border-gray-500 focus:outline-none'
          />
        </div>

        {/* Type filter chips */}
        {(['base', 'generation', 'merge', 'composite'] as const).map((t) => (
          <button
            key={t}
            type='button'
            className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-medium',
              filterTypes.has(t)
                ? t === 'base'
                  ? 'bg-blue-500/20 text-blue-400'
                  : t === 'generation'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : t === 'composite'
                      ? 'bg-teal-500/20 text-teal-400'
                      : 'bg-purple-500/20 text-purple-400'
                : 'text-gray-500 hover:text-gray-400',
            )}
            title={`Filter: ${t}`}
            onClick={() => onToggleFilterType(t)}
          >
            {t === 'base' ? 'Base' : t === 'generation' ? 'Gen' : t === 'composite' ? 'Comp' : 'Merge'}
          </button>
        ))}

        {/* Mask filter */}
        <button
          type='button'
          className={cn(
            'rounded px-1.5 py-0.5 text-[9px] font-medium',
            filterHasMask !== null
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-gray-500 hover:text-gray-400',
          )}
          title={
            filterHasMask === null
              ? 'Filter: masks (any)'
              : filterHasMask
                ? 'Filter: has mask'
                : 'Filter: no mask'
          }
          onClick={() => {
            // Cycle: null → true → false → null
            if (filterHasMask === null) onSetFilterHasMask(true);
            else if (filterHasMask === true) onSetFilterHasMask(false);
            else onSetFilterHasMask(null);
          }}
        >
          <Shield className='inline size-2.5' />
        </button>

        {/* Leaf-only filter */}
        <button
          type='button'
          className={cn(
            'rounded px-1.5 py-0.5 text-[9px] font-medium',
            filterLeafOnly
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'text-gray-500 hover:text-gray-400',
          )}
          title={filterLeafOnly ? 'Show all nodes' : 'Show only leaf nodes (no children)'}
          onClick={onToggleLeafOnly}
        >
          Leaf
        </button>

        {/* Clear filters */}
        {hasActiveFilters ? (
          <button
            type='button'
            className='rounded px-1 py-0.5 text-[9px] text-gray-500 hover:text-gray-400'
            title='Clear all filters'
            onClick={onClearFilters}
          >
            <X className='size-3' />
          </button>
        ) : null}
      </div>
    </div>
  );
}
