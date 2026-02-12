'use client';

import { ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import React from 'react';

import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import type { TagRecord } from '@/shared/types/domain/notes';
import { Button, SearchInput, UnifiedSelect, MultiSelect, Tag, FiltersContainer } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { buildBreadcrumbPath } from '../utils';


export function NotesFilters(): React.JSX.Element {
  const {
    settings,
    updateSettings,
    filters,
    folderTree,
    availableTagsInScope,
  } = useNotesAppContext();

  const {
    searchQuery,
    setSearchQuery,
    filterTagIds,
    setFilterTagIds,
    highlightTagId,
  } = filters;

  const selectedFolderId = settings.selectedFolderId;
  const searchScope = settings.searchScope;
  const sortBy = settings.sortBy;
  const sortOrder = settings.sortOrder;
  const showTimestamps = settings.showTimestamps;
  const showBreadcrumbs = settings.showBreadcrumbs;
  const showRelatedNotes = settings.showRelatedNotes;
  const viewMode = settings.viewMode;
  const gridDensity = settings.gridDensity;
  const tags = availableTagsInScope;

  const hasActiveFilters = Boolean(
    searchQuery || filterTagIds.length > 0 || sortBy !== 'updated' || sortOrder !== 'desc'
  );

  const handleReset = (): void => {
    setSearchQuery('');
    setFilterTagIds([]);
    updateSettings({ sortBy: 'updated', sortOrder: 'desc' });
  };

  return (
    <FiltersContainer
      title='Note Filters'
      hasActiveFilters={hasActiveFilters}
      onReset={handleReset}
      className='flex-1'
    >
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <div className='space-y-1.5'>
          <label className='text-[11px] font-medium text-gray-400'>Search</label>
          <SearchInput
            placeholder={
              selectedFolderId
                ? `Search in ${
                  buildBreadcrumbPath(selectedFolderId, null, folderTree).pop()?.name ||
                    'Folder'
                }...`
                : 'Search in All Notes...'
            }
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            className='h-9 bg-gray-800/40'
          />
        </div>

        <div className='space-y-1.5'>
          <label className='text-[11px] font-medium text-gray-400'>Tags</label>
          <div className='flex flex-col gap-2'>
            <MultiSelect
              options={tags.map((t: TagRecord) => ({ value: t.id, label: t.name }))}
              selected={filterTagIds}
              onChange={setFilterTagIds}
              placeholder='Filter by Tag...'
              searchPlaceholder='Search tags...'
              className='w-full'
            />
            {filterTagIds.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {filterTagIds.map((tagId: string) => {
                  const tag = tags.find((t: TagRecord) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Tag
                      key={tag.id}
                      label={tag.name}
                      onRemove={(): void =>
                        setFilterTagIds(filterTagIds.filter((id: string) => id !== tag.id))
                      }
                      className={cn(
                        'bg-blue-500/20 text-blue-200 border-blue-500/30',
                        highlightTagId === tag.id && 'ring-2 ring-blue-300/70'
                      )}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className='space-y-1.5'>
          <label className='text-[11px] font-medium text-gray-400'>Sort & View</label>
          <div className='flex flex-wrap gap-2'>
            <UnifiedSelect
              value={sortBy}
              onValueChange={(val: string) => updateSettings({ sortBy: val as 'created' | 'updated' | 'name' })}
              options={[
                { value: 'created', label: 'Date Created' },
                { value: 'updated', label: 'Date Modified' },
                { value: 'name', label: 'Name' },
              ]}
              triggerClassName='h-9 w-32 bg-gray-800/40'
              ariaLabel='Sort by'
            />
            <Button
              variant='outline'
              onClick={(): void =>
                updateSettings({
                  sortOrder: sortOrder === 'asc' ? 'desc' : 'asc',
                })
              }
              className='h-9 rounded px-2 bg-gray-800/40 text-gray-400'
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            </Button>
            <UnifiedSelect
              value={viewMode === 'list' ? 'list' : `grid-${gridDensity}`}
              onValueChange={(val: string) => {
                if (val === 'list') {
                  updateSettings({ viewMode: 'list' });
                } else if (val === 'grid-4') {
                  updateSettings({ viewMode: 'grid', gridDensity: 4 });
                } else if (val === 'grid-8') {
                  updateSettings({ viewMode: 'grid', gridDensity: 8 });
                }
              }}
              options={[
                { value: 'list', label: 'List' },
                { value: 'grid-4', label: 'Grid (4)' },
                { value: 'grid-8', label: 'Grid (8)' },
              ]}
              triggerClassName='h-9 w-28 bg-gray-800/40'
              ariaLabel='View mode'
            />
          </div>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-4 border-t border-border/40 pt-3 mt-1'>
        <div className='flex items-center gap-2'>
          <span className='text-[11px] font-medium text-gray-500 uppercase tracking-wider'>Scope:</span>
          <UnifiedSelect
            value={searchScope}
            onValueChange={(val: string) => updateSettings({ searchScope: val as 'both' | 'title' | 'content' })}
            options={[
              { value: 'both', label: 'Title + Content' },
              { value: 'title', label: 'Title Only' },
              { value: 'content', label: 'Content Only' },
            ]}
            triggerClassName='h-7 w-36 text-[10px] bg-gray-800/40 border-border/60'
          />
        </div>

        <div className='h-4 w-px bg-border/40' />

        <div className='flex items-center gap-2'>
          <span className='text-[11px] font-medium text-gray-500 uppercase tracking-wider'>Display:</span>
          <div className='flex items-center gap-1.5'>
            <Button
              variant={showTimestamps ? 'default' : 'outline'}
              onClick={(): void => updateSettings({ showTimestamps: !showTimestamps })}
              className='h-7 gap-1 px-2 py-0 text-[10px]'
              title='Toggle timestamps'
            >
              {showTimestamps ? <Eye size={12} /> : <EyeOff size={12} />}
              Dates
            </Button>
            <Button
              variant={showBreadcrumbs ? 'default' : 'outline'}
              onClick={(): void => updateSettings({ showBreadcrumbs: !showBreadcrumbs })}
              className='h-7 gap-1 px-2 py-0 text-[10px]'
              title='Toggle breadcrumbs'
            >
              {showBreadcrumbs ? <Eye size={12} /> : <EyeOff size={12} />}
              Path
            </Button>
            <Button
              variant={showRelatedNotes ? 'default' : 'outline'}
              onClick={(): void => updateSettings({ showRelatedNotes: !showRelatedNotes })}
              className='h-7 gap-1 px-2 py-0 text-[10px]'
              title='Toggle related notes'
            >
              {showRelatedNotes ? <Eye size={12} /> : <EyeOff size={12} />}
              Links
            </Button>
          </div>
        </div>
      </div>
    </FiltersContainer>
  );
}
