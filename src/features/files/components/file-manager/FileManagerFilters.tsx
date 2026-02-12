'use client';

import { Input, UnifiedSelect, Button, FiltersContainer } from '@/shared/ui';

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
  const showBulkActionsBar = mode === 'select' && selectionMode === 'multiple' && showBulkActions;

  const hasActiveFilters = Boolean(
    filenameSearch || productNameSearch || tagSearch || folderFilter !== 'all'
  );

  const handleReset = (): void => {
    setFilenameSearch('');
    setProductNameSearch('');
    setTagSearch('');
    setLocalFolderFilter('all');
  };

  return (
    <FiltersContainer
      title='File Filters'
      hasActiveFilters={hasActiveFilters}
      onReset={handleReset}
      gridClassName='md:grid-cols-2 lg:grid-cols-4'
    >
      <div className='space-y-1.5'>
        <label className='text-[11px] font-medium text-gray-400'>Filename</label>
        <Input
          placeholder='Search by filename'
          value={filenameSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilenameSearch(e.target.value)}
          className='h-9 bg-gray-800/40'
        />
      </div>
      <div className='space-y-1.5'>
        <label className='text-[11px] font-medium text-gray-400'>Product</label>
        <Input
          placeholder='Search by product name'
          value={productNameSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductNameSearch(e.target.value)}
          className='h-9 bg-gray-800/40'
        />
      </div>
      {enableTagSearch && (
        <div className='space-y-1.5'>
          <label className='text-[11px] font-medium text-gray-400'>Tags</label>
          <Input
            placeholder='Search by tags'
            value={tagSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagSearch(e.target.value)}
            className='h-9 bg-gray-800/40'
          />
        </div>
      )}
      {folderFilterEnabled && (
        <div className='space-y-1.5'>
          <label className='text-[11px] font-medium text-gray-400'>Folder</label>
          <UnifiedSelect
            value={folderFilter}
            onValueChange={setLocalFolderFilter}
            options={folderOptions.map((folder: string) => ({
              value: folder,
              label: folder === 'all' ? 'All folders' : folder
            }))}
            placeholder='All folders'
            triggerClassName='h-9'
          />
        </div>
      )}

      {showBulkActionsBar && (
        <div className='col-span-full flex items-center gap-2 border-t border-border/40 pt-3 mt-1'>
          <span className='text-xs text-gray-500 mr-2'>Selection:</span>
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

      {(folderFilterEnabled || (enableTagSearch && tagOptions.length > 0)) && (
        <div className='col-span-full space-y-2 mt-2'>
          {folderFilterEnabled && (
            <div className='flex flex-wrap gap-2'>
              {folderOptions.map((folder: string) => (
                <Button
                  key={folder}
                  type='button'
                  variant='ghost'
                  onClick={() => setLocalFolderFilter(folder)}
                  className={`h-auto rounded-full border px-3 py-1 text-[10px] font-medium transition ${
                    folderFilter === folder
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-border/40 bg-gray-900/40 text-gray-400 hover:border-border/60 hover:bg-gray-800/60'
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
                  onClick={() => setTagSearch(tag)}
                  className='h-auto rounded-full border border-border/40 bg-gray-900/40 px-2.5 py-0.5 text-[10px] text-gray-400 hover:border-border/60 hover:bg-gray-800/60'
                >
                  #{tag}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </FiltersContainer>
  );
}

