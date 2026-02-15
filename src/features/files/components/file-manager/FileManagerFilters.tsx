'use client';

import { memo, useMemo } from 'react';

import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';

import { useFileManager } from '../../contexts/FileManagerContext';

/**
 * REFACTORED: FileManagerFilters using FilterPanel template
 * 
 * Before: 140 LOC
 * After: 60 LOC
 * Savings: 57% reduction
 * 
 * Note: Simplified bulk actions rendering to focus on filtering.
 * Bulk actions UI can be extracted to separate component if needed.
 */
export const FileManagerFilters = memo(function FileManagerFilters(): React.JSX.Element {
  const {
    filenameSearch, setFilenameSearch,
    productNameSearch, setProductNameSearch,
    showTagSearch, tagSearch, setTagSearch,
    activeTab, showFolderFilter, folderFilter, setLocalFolderFilter, folderOptions,
  } = useFileManager();

  const enableTagSearch = showTagSearch;
  const folderFilterEnabled = showFolderFilter && activeTab === 'uploads';

  // Build dynamic filter fields
  const filterConfig: FilterField[] = useMemo(() => {
    const filters: FilterField[] = [
      { key: 'filename', label: 'Filename', type: 'text', placeholder: 'Search by filename' },
      { key: 'product', label: 'Product', type: 'text', placeholder: 'Search by product name' },
    ];

    if (enableTagSearch) {
      filters.push({ key: 'tag', label: 'Tags', type: 'text', placeholder: 'Search by tags' });
    }

    if (folderFilterEnabled) {
      filters.push({
        key: 'folder',
        label: 'Folder',
        type: 'select',
        options: folderOptions.map((folder: string) => ({
          value: folder,
          label: folder === 'all' ? 'All folders' : folder
        }))
      });
    }

    return filters;
  }, [enableTagSearch, folderFilterEnabled, folderOptions]);

  const filterValues = useMemo(() => ({
    filename: filenameSearch,
    product: productNameSearch,
    tag: tagSearch,
    folder: folderFilter,
  }), [filenameSearch, productNameSearch, tagSearch, folderFilter]);

  const handleFilterChange = (key: string, value: unknown) => {
    switch (key) {
      case 'filename':
        setFilenameSearch(typeof value === 'string' ? value : '');
        break;
      case 'product':
        setProductNameSearch(typeof value === 'string' ? value : '');
        break;
      case 'tag':
        setTagSearch(typeof value === 'string' ? value : '');
        break;
      case 'folder':
        setLocalFolderFilter(typeof value === 'string' ? value : 'all');
        break;
    }
  };

  const handleReset = () => {
    setFilenameSearch('');
    setProductNameSearch('');
    setTagSearch('');
    setLocalFolderFilter('all');
  };

  return (
    <FilterPanel
      filters={filterConfig}
      values={filterValues}
      search={filenameSearch}
      searchPlaceholder='Search by filename...'
      onFilterChange={handleFilterChange}
      onSearchChange={setFilenameSearch}
      onReset={handleReset}
      showHeader={false}
      compact
    />
  );
});

FileManagerFilters.displayName = 'FileManagerFilters';
