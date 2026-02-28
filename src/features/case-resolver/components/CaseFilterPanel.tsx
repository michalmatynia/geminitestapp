'use client';

import React, { useMemo } from 'react';
import {
  type CaseHierarchyFilter,
  useAdminCaseResolverCases,
  type CaseLockedFilter,
  type CaseFileTypeFilter,
  type CaseReferencesFilter,
  type CaseSearchScope,
  type CaseSentFilter,
  type CaseStatusFilter,
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
    caseFilterStatus,
    setCaseFilterStatus,
    caseFilterLocked,
    setCaseFilterLocked,
    caseFilterSent,
    setCaseFilterSent,
    caseFilterHierarchy,
    setCaseFilterHierarchy,
    caseFilterReferences,
    setCaseFilterReferences,
    caseSearchScope,
    setCaseSearchScope,
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
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All statuses' },
          { value: 'pending', label: 'Pending' },
          { value: 'completed', label: 'Completed' },
        ],
        width: '180px',
      },
      {
        key: 'locked',
        label: 'Lock State',
        type: 'select',
        options: [
          { value: 'all', label: 'All lock states' },
          { value: 'unlocked', label: 'Unlocked' },
          { value: 'locked', label: 'Locked' },
        ],
        width: '180px',
      },
      {
        key: 'sent',
        label: 'Sent State',
        type: 'select',
        options: [
          { value: 'all', label: 'All sent states' },
          { value: 'not_sent', label: 'Not sent' },
          { value: 'sent', label: 'Sent' },
        ],
        width: '180px',
      },
      {
        key: 'hierarchy',
        label: 'Hierarchy',
        type: 'select',
        options: [
          { value: 'all', label: 'All cases' },
          { value: 'root', label: 'Root cases' },
          { value: 'child', label: 'Child cases' },
        ],
        width: '180px',
      },
      {
        key: 'references',
        label: 'References',
        type: 'select',
        options: [
          { value: 'all', label: 'All cases' },
          { value: 'with_references', label: 'With references' },
          { value: 'without_references', label: 'Without references' },
        ],
        width: '200px',
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
    ],
    [
      caseCategoryFilterOptions,
      caseIdentifierFilterOptions,
      caseTagFilterOptions,
      folderFilterOptions,
    ]
  );

  const caseFilterValues = useMemo(
    () => ({
      fileType: caseFileTypeFilter,
      folder: caseFilterFolder,
      status: caseFilterStatus,
      locked: caseFilterLocked,
      sent: caseFilterSent,
      hierarchy: caseFilterHierarchy,
      references: caseFilterReferences,
      tagIds: caseFilterTagIds,
      caseIdentifierIds: caseFilterCaseIdentifierIds,
      categoryIds: caseFilterCategoryIds,
      searchScope: caseSearchScope,
    }),
    [
      caseFileTypeFilter,
      caseFilterCaseIdentifierIds,
      caseFilterFolder,
      caseFilterHierarchy,
      caseFilterLocked,
      caseFilterReferences,
      caseFilterSent,
      caseFilterStatus,
      caseFilterTagIds,
      caseFilterCategoryIds,
      caseSearchScope,
    ]
  );

  const handleCaseFilterChange = (key: string, value: unknown): void => {
    switch (key) {
      case 'fileType':
        setCaseFileTypeFilter(value as CaseFileTypeFilter);
        break;
      case 'folder':
        setCaseFilterFolder(value as string);
        break;
      case 'status':
        setCaseFilterStatus(value as CaseStatusFilter);
        break;
      case 'locked':
        setCaseFilterLocked(value as CaseLockedFilter);
        break;
      case 'sent':
        setCaseFilterSent(value as CaseSentFilter);
        break;
      case 'hierarchy':
        setCaseFilterHierarchy(value as CaseHierarchyFilter);
        break;
      case 'references':
        setCaseFilterReferences(value as CaseReferencesFilter);
        break;
      case 'tagIds':
        setCaseFilterTagIds(value as string[]);
        break;
      case 'caseIdentifierIds':
        setCaseFilterCaseIdentifierIds(value as string[]);
        break;
      case 'categoryIds':
        setCaseFilterCategoryIds(value as string[]);
        break;
      case 'searchScope':
        setCaseSearchScope(value as CaseSearchScope);
        break;
    }
  };

  const handleResetCaseFilters = (): void => {
    setCaseSearchQuery('');
    setCaseFileTypeFilter('all');
    setCaseFilterFolder('__all__');
    setCaseFilterStatus('all');
    setCaseFilterLocked('all');
    setCaseFilterSent('all');
    setCaseFilterHierarchy('all');
    setCaseFilterReferences('all');
    setCaseFilterTagIds([]);
    setCaseFilterCaseIdentifierIds([]);
    setCaseFilterCategoryIds([]);
    setCaseSearchScope('all');
  };

  return (
    <FilterPanel
      key={`case-resolver-filters-${caseFilterPanelDefaultExpanded ? 'expanded' : 'collapsed'}`}
      filters={caseFilterConfig}
      values={caseFilterValues}
      search={caseSearchQuery}
      searchPlaceholder='Search (supports quotes and field prefixes: name:, folder:, tag:, identifier:, category:, status:, locked:, sent:, parent:, refs:, text:).'
      onFilterChange={handleCaseFilterChange}
      onSearchChange={setCaseSearchQuery}
      onReset={handleResetCaseFilters}
      showHeader={false}
      collapsible
      defaultExpanded={caseFilterPanelDefaultExpanded}
    />
  );
}
