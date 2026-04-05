'use client';

import { Shield, X } from 'lucide-react';
import React from 'react';

import { getImageStudioDocTooltip } from '@/features/ai/image-studio/utils/studio-docs';
import { SearchInput } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

import { useVersionGraphControlsContext } from './VersionGraphControlsContext';
import { useSettingsState } from '../context/SettingsContext';

// ── Component ────────────────────────────────────────────────────────────────

export function VersionGraphFilterBar(): React.JSX.Element {
  const { studioSettings } = useSettingsState();
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
  const versionGraphTooltipsEnabled = studioSettings.helpTooltips.versionGraphButtonsEnabled;
  const tooltipContent = React.useMemo(
    () => ({
      search: getImageStudioDocTooltip('version_graph_filter_search'),
      base: getImageStudioDocTooltip('version_graph_filter_type_base'),
      generation: getImageStudioDocTooltip('version_graph_filter_type_generation'),
      merge: getImageStudioDocTooltip('version_graph_filter_type_merge'),
      composite: getImageStudioDocTooltip('version_graph_filter_type_composite'),
      maskCycle: getImageStudioDocTooltip('version_graph_filter_mask_cycle'),
      leafToggle: getImageStudioDocTooltip('version_graph_filter_leaf_toggle'),
      clear: getImageStudioDocTooltip('version_graph_filter_clear'),
    }),
    []
  );
  const resolveTypeTooltip = (type: 'base' | 'generation' | 'merge' | 'composite'): string => {
    if (type === 'base') return tooltipContent.base;
    if (type === 'generation') return tooltipContent.generation;
    if (type === 'merge') return tooltipContent.merge;
    return tooltipContent.composite;
  };

  return (
    <div className='border-b border-border/40 px-3 py-1.5'>
      <div className='flex items-center gap-1.5'>
        <SearchInput
          value={filterQuery}
          onChange={(e) => onSetFilterQuery(e.target.value)}
          onClear={() => onSetFilterQuery('')}
          placeholder='Search nodes...'
          title={versionGraphTooltipsEnabled ? tooltipContent.search : undefined}
          containerClassName='h-6 flex-1'
          className='h-6 text-[10px] pl-5'
          size='xs'
        />

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
                : 'text-gray-500 hover:text-gray-400'
            )}
            title={versionGraphTooltipsEnabled ? resolveTypeTooltip(t) : undefined}
            onClick={() => onToggleFilterType(t)}
          >
            {t === 'base'
              ? 'Base'
              : t === 'generation'
                ? 'Gen'
                : t === 'composite'
                  ? 'Comp'
                  : 'Merge'}
          </button>
        ))}

        {/* Mask filter */}
        <button
          type='button'
          className={cn(
            'rounded px-1.5 py-0.5 text-[9px] font-medium',
            filterHasMask !== null
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-gray-500 hover:text-gray-400'
          )}
          title={versionGraphTooltipsEnabled ? tooltipContent.maskCycle : undefined}
          onClick={() => {
            // Cycle: null → true → false → null
            if (filterHasMask === null) onSetFilterHasMask(true);
            else if (filterHasMask === true) onSetFilterHasMask(false);
            else onSetFilterHasMask(null);
          }}
          aria-label={versionGraphTooltipsEnabled ? tooltipContent.maskCycle : undefined}>
          <Shield className='inline size-2.5' />
        </button>

        {/* Leaf-only filter */}
        <button
          type='button'
          className={cn(
            'rounded px-1.5 py-0.5 text-[9px] font-medium',
            filterLeafOnly
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'text-gray-500 hover:text-gray-400'
          )}
          title={versionGraphTooltipsEnabled ? tooltipContent.leafToggle : undefined}
          onClick={onToggleLeafOnly}
        >
          Leaf
        </button>

        {/* Clear filters */}
        {hasActiveFilters ? (
          <button
            type='button'
            className='rounded px-1 py-0.5 text-[9px] text-gray-500 hover:text-gray-400'
            title={versionGraphTooltipsEnabled ? tooltipContent.clear : undefined}
            onClick={onClearFilters}
            aria-label={versionGraphTooltipsEnabled ? tooltipContent.clear : undefined}>
            <X className='size-3' />
          </button>
        ) : null}
      </div>
    </div>
  );
}
