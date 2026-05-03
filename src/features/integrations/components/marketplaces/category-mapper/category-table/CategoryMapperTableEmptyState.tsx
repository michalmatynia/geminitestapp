import React from 'react';

import { CompactEmptyState } from '@/shared/ui/navigation-and-layout.public';

import {
  getFilteredEmptyTitle,
  type CategoryMappingFilter,
} from './filtering';

type CategoryMapperTableEmptyStateProps = {
  connectionName: string;
  hasExternalCategories: boolean;
  hasSearch: boolean;
  isFilterActive: boolean;
  isLoading: boolean;
  mappingFilter: CategoryMappingFilter;
};

export function CategoryMapperTableEmptyState({
  connectionName,
  hasExternalCategories,
  hasSearch,
  isFilterActive,
  isLoading,
  mappingFilter,
}: CategoryMapperTableEmptyStateProps): React.JSX.Element | null {
  if (isLoading) return null;

  if (isFilterActive) {
    return (
      <CompactEmptyState
        title={getFilteredEmptyTitle({ hasSearch, mappingFilter })}
        description='Try another external category search or mapping filter.'
        className='py-8'
      />
    );
  }

  if (!hasExternalCategories) {
    return (
      <CompactEmptyState
        title='No external categories found'
        description={`Click "Fetch Categories" to load categories from ${connectionName}.`}
        className='py-8'
      />
    );
  }

  return null;
}
