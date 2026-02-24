'use client';

import React, { useMemo } from 'react';
import { 
  useAdminCaseResolverCases,
  type CaseFileTypeFilter,
  type CaseSearchScope,
  type CaseSortKey
} from '../context/AdminCaseResolverCasesContext';
import { useAdminCaseResolverCasesState } from '../hooks/useAdminCaseResolverCasesState';
import { FilterPanel } from '@/shared/ui';
import type { FilterField } from '@/shared/ui/templates/panels';

export function CaseFilterPanel(): React.JSX.Element {
  const {
    caseSearchQuery,
    setCaseSearchQuery,
    caseFileTypeFilter,
    setCaseFileTypeFilter,
    caseFilterFolder,
    setCaseFilterFolder,
    caseFilterTagIds,
    setCaseFilterTagIds,
    caseFilterCaseIdentifierIds,
    setCaseFilterCaseIdentifierIds,
    caseFilterCategoryIds,
    setCaseFilterCategoryIds,
    caseSearchScope,
    setCaseSearchScope,
    caseSortBy,
    setCaseSortBy,
    caseFilterPanelDefaultExpanded,
  } = useAdminCaseResolverCases();

  const {
    folderFilterOptions,
    caseTagFilterOptions,
    caseIdentifierFilterOptions,
    caseCategoryFilterOptions,
  } = useAdminCaseResolverCasesState();

  const caseFilterConfig = useMemo<FilterField[]>(
    () => [
      {
        key: 'fileType',
        label: 'File Type',
        type: 'select',
        options: [
          { value: 'all', label: 'All case types' },
          { value: 'case', label: 'Case' },
        ],
        width: '180px',
      },
      {
        key: 'folder',
        label: 'Folder',
        type: 'select',
        options: folderFilterOptions,
        width: '220px',
      },
      {
        key: 'tagIds',
        label: 'Tags',
        type: 'select',
        options: caseTagFilterOptions,
        multi: true,
        width: '280px',
      },
      {
        key: 'caseIdentifierIds',
        label: 'Case Identifiers',
        type: 'select',
        options: caseIdentifierFilterOptions,
        multi: true,
        width: '280px',
      },
      {
        key: 'categoryIds',
        label: 'Categories',
        type: 'select',
        options: caseCategoryFilterOptions,
        multi: true,
        width: '280px',
      },
      {
        key: 'searchScope',
        label: 'Search Scope',
        type: 'select',
        options: [
          { value: 'all', label: 'All fields + Descendant content' },
          { value: 'name', label: 'Name only' },
          { value: 'folder', label: 'Folder only' },
          { value: 'content', label: 'Content only' },
        ],
        width: '220px',
      },
      {
        key: 'sortBy',
        label: 'Sort By',
        type: 'select',
        options: [
          { value: 'updated', label: 'Date modified' },
          { value: 'created', label: 'Date created' },
          { value: 'name', label: 'Name' },
        ],
        width: '180px',
      },
    ],
    [
      caseCategoryFilterOptions,
      caseIdentifierFilterOptions,
      caseTagFilterOptions,
      folderFilterOptions,
    ],
  );

  const caseFilterValues = useMemo(
    () => ({
      fileType: caseFileTypeFilter,
      folder: caseFilterFolder,
      tagIds: caseFilterTagIds,
      caseIdentifierIds: caseFilterCaseIdentifierIds,
      categoryIds: caseFilterCategoryIds,
      searchScope: caseSearchScope,
      sortBy: caseSortBy,
    }),
    [
      caseFileTypeFilter,
      caseFilterCaseIdentifierIds,
      caseFilterFolder,
      caseFilterTagIds,
      caseFilterCategoryIds,
      caseSearchScope,
      caseSortBy,
    ],
  );

  const handleCaseFilterChange = (key: string, value: unknown): void => {
    switch (key) {
      case 'fileType': setCaseFileTypeFilter(value as CaseFileTypeFilter); break;
      case 'folder': setCaseFilterFolder(value as string); break;
      case 'tagIds': setCaseFilterTagIds(value as string[]); break;
      case 'caseIdentifierIds': setCaseFilterCaseIdentifierIds(value as string[]); break;
      case 'categoryIds': setCaseFilterCategoryIds(value as string[]); break;
      case 'searchScope': setCaseSearchScope(value as CaseSearchScope); break;
      case 'sortBy': setCaseSortBy(value as CaseSortKey); break;
    }
  };

  const handleResetCaseFilters = (): void => {
    setCaseSearchQuery('');
    setCaseFileTypeFilter('all');
    setCaseFilterFolder('__all__');
    setCaseFilterTagIds([]);
    setCaseFilterCaseIdentifierIds([]);
    setCaseFilterCategoryIds([]);
    setCaseSearchScope('all');
    setCaseSortBy('updated');
  };

  return (
    <FilterPanel
      key={`case-resolver-filters-${caseFilterPanelDefaultExpanded ? 'expanded' : 'collapsed'}`}
      filters={caseFilterConfig}
      values={caseFilterValues}
      search={caseSearchQuery}
      searchPlaceholder='Search (supports quotes and field prefixes: name:, folder:, tag:, identifier:, category:, status:, text:).'
      onFilterChange={handleCaseFilterChange}
      onSearchChange={setCaseSearchQuery}
      onReset={handleResetCaseFilters}
      showHeader={false}
      collapsible
      defaultExpanded={caseFilterPanelDefaultExpanded}
    />
  );
}
