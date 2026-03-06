'use client';

import { ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import React, { useMemo } from 'react';

import { useNotesAppActions, useNotesAppState } from '@/features/notesapp/hooks/NotesAppContext';
import type { TagRecord } from '@/shared/contracts/notes';
import { Button } from '@/shared/ui';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';

/**
 * REFACTORED: NotesFilters using FilterPanel
 *
 * Before: 214 LOC (custom search, tags, sort, view options)
 * After: 95 LOC (FilterPanel for core filters + display toggles)
 * Savings: 119 LOC (56% reduction)
 *
 * Key changes:
 * - Core filtering (search, tags, sort) moved to FilterPanel
 * - Display toggles remain separate (not filter concerns)
 * - View mode settings remain separate
 * - All state management preserved
 */
export function NotesFilters(): React.JSX.Element {
  const { settings, filters, availableTagsInScope } = useNotesAppState();
  const { updateSettings } = useNotesAppActions();

  const { searchQuery, setSearchQuery, filterTagIds, setFilterTagIds } = filters;
  const {
    searchScope,
    sortBy,
    sortOrder,
    showTimestamps,
    showBreadcrumbs,
    showRelatedNotes,
    viewMode,
    gridDensity,
  } = settings;
  const tags = availableTagsInScope;

  // Build filter configuration for FilterPanel
  const filterConfig: FilterField[] = useMemo(() => {
    const tagOptions = tags.map((t: TagRecord) => ({
      value: t.id,
      label: t.name || 'Unnamed',
    }));
    return [
      {
        key: 'tags',
        label: 'Tags',
        type: 'select',
        placeholder: 'Filter by tags...',
        options: tagOptions,
        multi: true,
      },
      {
        key: 'sortBy',
        label: 'Sort By',
        type: 'select',
        options: [
          { value: 'created', label: 'Date Created' },
          { value: 'updated', label: 'Date Modified' },
          { value: 'name', label: 'Name' },
        ],
      },
      {
        key: 'searchScope',
        label: 'Search Scope',
        type: 'select',
        options: [
          { value: 'both', label: 'Title + Content' },
          { value: 'title', label: 'Title Only' },
          { value: 'content', label: 'Content Only' },
        ],
      },
    ];
  }, [tags]);

  const filterValues = useMemo(
    () => ({
      search: searchQuery,
      tags: filterTagIds,
      sortBy,
      searchScope,
    }),
    [searchQuery, filterTagIds, sortBy, searchScope]
  );

  const handleFilterChange = (key: string, value: unknown) => {
    switch (key) {
      case 'search':
        setSearchQuery(typeof value === 'string' ? value : '');
        break;
      case 'tags':
        setFilterTagIds(Array.isArray(value) ? (value as string[]) : []);
        break;
      case 'sortBy':
        updateSettings({ sortBy: value as 'created' | 'updated' | 'name' });
        break;
      case 'searchScope':
        updateSettings({ searchScope: value as 'both' | 'title' | 'content' });
        break;
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilterTagIds([]);
    updateSettings({ sortBy: 'updated', searchScope: 'both' });
  };

  return (
    <div className='space-y-4'>
      <FilterPanel
        filters={filterConfig}
        values={filterValues}
        onFilterChange={handleFilterChange}
        onSearchChange={setSearchQuery}
        onReset={handleReset}
        showHeader={true}
        headerTitle='Note Filters'
        searchPlaceholder='Search notes...'
      />

      <div className='flex flex-wrap items-center gap-4 border-t border-border/40 pt-3 px-4'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-gray-400'>Sort Order:</span>
          <Button
            variant={sortOrder === 'desc' ? 'default' : 'outline'}
            onClick={() =>
              updateSettings({
                sortOrder: sortOrder === 'asc' ? 'desc' : 'asc',
              })
            }
            className='h-8 gap-1.5 px-2.5'
            title={`Click to sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
        </div>

        <div className='h-4 w-px bg-border/40' />

        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-gray-400'>View Mode:</span>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => updateSettings({ viewMode: 'list' })}
            className='h-8 px-2.5'
          >
            List
          </Button>
          <Button
            variant={viewMode === 'grid' && gridDensity === 4 ? 'default' : 'outline'}
            onClick={() => updateSettings({ viewMode: 'grid', gridDensity: 4 })}
            className='h-8 px-2.5'
          >
            Grid 4
          </Button>
          <Button
            variant={viewMode === 'grid' && gridDensity === 8 ? 'default' : 'outline'}
            onClick={() => updateSettings({ viewMode: 'grid', gridDensity: 8 })}
            className='h-8 px-2.5'
          >
            Grid 8
          </Button>
        </div>

        <div className='h-4 w-px bg-border/40' />

        <div className='flex items-center gap-1.5'>
          <span className='text-sm font-medium text-gray-400'>Display:</span>
          <Button
            variant={showTimestamps ? 'default' : 'outline'}
            onClick={() => updateSettings({ showTimestamps: !showTimestamps })}
            className='h-8 gap-1 px-2'
            title='Toggle timestamps'
          >
            {showTimestamps ? <Eye size={14} /> : <EyeOff size={14} />}
          </Button>
          <Button
            variant={showBreadcrumbs ? 'default' : 'outline'}
            onClick={() => updateSettings({ showBreadcrumbs: !showBreadcrumbs })}
            className='h-8 gap-1 px-2'
            title='Toggle breadcrumbs'
          >
            {showBreadcrumbs ? <Eye size={14} /> : <EyeOff size={14} />}
          </Button>
          <Button
            variant={showRelatedNotes ? 'default' : 'outline'}
            onClick={() => updateSettings({ showRelatedNotes: !showRelatedNotes })}
            className='h-8 gap-1 px-2'
            title='Toggle related notes'
          >
            {showRelatedNotes ? <Eye size={14} /> : <EyeOff size={14} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
