'use client';

import React from 'react';

import { Input, UnifiedSelect, Button } from '@/shared/ui';

import { useFileManager } from '../../contexts/FileManagerContext';

export function FileManagerFilters(): React.JSX.Element {
  const {
    filenameSearch, setFilenameSearch,
    productNameSearch, setProductNameSearch,
    showTagSearch, showBulkActions, tagSearch, setTagSearch,
    activeTab, showFolderFilter, folderFilter, setLocalFolderFilter, folderOptions,
    mode, selectionMode, handleSelectAll, handleClearSelection, handleDeleteSelected,
    tagOptions,
  } = useFileManager();

  const enableTagSearch = showTagSearch || showBulkActions;
  const folderFilterEnabled = showFolderFilter && activeTab === 'uploads';

  return (
    <div className='space-y-4 mb-4'>
      <div className='flex flex-wrap gap-3'>
        <Input
          type='text'
          placeholder='Search by filename'
          value={filenameSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setFilenameSearch(e.target.value)}
          className='w-full md:w-64 p-2 bg-gray-800 rounded'
        />
        <Input
          type='text'
          placeholder='Search by product name'
          value={productNameSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setProductNameSearch(e.target.value)}
          className='w-full md:w-64 p-2 bg-gray-800 rounded'
        />
        {enableTagSearch && (
          <Input
            type='text'
            placeholder='Search by tags (comma-separated)'
            value={tagSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setTagSearch(e.target.value)}
            className='w-full md:w-64 p-2 bg-gray-800 rounded'
          />
        )}
        {folderFilterEnabled && (
          <UnifiedSelect
            value={folderFilter}
            onValueChange={(value: string): void => setLocalFolderFilter(value)}
            options={folderOptions.map((folder: string) => ({
              value: folder,
              label: folder === 'all' ? 'All folders' : folder
            }))}
            placeholder='All folders'
            className='w-full md:w-48'
            triggerClassName='text-sm'
          />
        )}
        {mode === 'select' && selectionMode === 'multiple' && showBulkActions && (
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={handleSelectAll}>
              Select all
            </Button>
            <Button variant='outline' size='sm' onClick={handleClearSelection}>
              Clear
            </Button>
            <Button variant='destructive' size='sm' onClick={(): void => { void handleDeleteSelected(); }}>
              Delete selected
            </Button>
          </div>
        )}
      </div>

      {(folderFilterEnabled || (enableTagSearch && tagOptions.length > 0)) && (
        <div className='space-y-2'>
          {folderFilterEnabled && (
            <div className='flex flex-wrap gap-2'>
              {folderOptions.map((folder: string) => (
                <Button
                  key={folder}
                  type='button'
                  variant='ghost'
                  onClick={(): void => setLocalFolderFilter(folder)}
                  className={`h-auto rounded-full border px-3 py-1 text-[11px] font-medium transition hover:bg-blue-500/20 ${
                    folderFilter === folder
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-border/40 bg-gray-900/40 text-gray-400 hover:border-border/60'
                  }`}
                >
                  {folder === 'all' ? 'All folders' : folder}
                </Button>
              ))}
            </div>
          )}
          {enableTagSearch && tagOptions.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {tagOptions.slice(0, 20).map((tag: string) => (
                <Button
                  key={tag}
                  type='button'
                  variant='ghost'
                  onClick={(): void => setTagSearch(tag)}
                  className='h-auto rounded-full border border-border/40 bg-gray-900/40 px-2.5 py-0.5 text-[10px] text-gray-400 hover:border-border/60 hover:bg-gray-800/60'
                >
                  #{tag}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
