'use client';

import { memo, useMemo } from 'react';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/contracts/ui/panels';
import {
  useFileManagerConfig,
  useFileManagerData,
  useFileManagerSearch,
  useFileManagerUIState,
} from '../../contexts/FileManagerContext';

const buildFilters = (enableTagSearch: boolean, folderFilterEnabled: boolean, folderOptions: string[]): FilterField[] => {
  const filters: FilterField[] = [
    { key: 'filename', label: 'Filename', type: 'text', placeholder: 'Search by filename' },
    { key: 'product', label: 'Product', type: 'text', placeholder: 'Search by product name' },
  ];
  if (enableTagSearch) filters.push({ key: 'tag', label: 'Tags', type: 'text', placeholder: 'Search by tags' });
  if (folderFilterEnabled) {
    filters.push({
      key: 'folder',
      label: 'Folder',
      type: 'select',
      options: folderOptions.map((f) => ({ value: f, label: f === 'all' ? 'All folders' : f })),
    });
  }
  return filters;
};

export const FileManagerFilters = memo((): React.JSX.Element => {
  const { filenameSearch, setFilenameSearch, productNameSearch, setProductNameSearch, tagSearch, setTagSearch } = useFileManagerSearch();
  const { showTagSearch, showFolderFilter } = useFileManagerConfig();
  const { activeTab, setLocalFolderFilter } = useFileManagerUIState();
  const { folderFilter, folderOptions } = useFileManagerData();

  const filterConfig = useMemo(() => buildFilters(showTagSearch, showFolderFilter && activeTab === 'uploads', folderOptions), [showTagSearch, showFolderFilter, activeTab, folderOptions]);
  const filterValues = useMemo(() => ({ filename: filenameSearch, product: productNameSearch, tag: tagSearch, folder: folderFilter }), [filenameSearch, productNameSearch, tagSearch, folderFilter]);

  const handleFilterChange = (key: string, value: unknown): void => {
    const val = typeof value === 'string' ? value : '';
    if (key === 'filename') setFilenameSearch(val);
    else if (key === 'product') setProductNameSearch(val);
    else if (key === 'tag') setTagSearch(val);
    else if (key === 'folder') setLocalFolderFilter(val.length > 0 ? val : 'all');
  };

  const handleReset = (): void => {
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
