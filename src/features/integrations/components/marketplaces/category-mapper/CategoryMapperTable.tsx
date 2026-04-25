'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Search, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import {
  useCategoryMapperActions,
  useCategoryMapperConfig,
  useCategoryMapperData,
  useCategoryMapperUIState,
} from '@/features/integrations/context/CategoryMapperContext';
import { StandardDataTablePanel, GenericMapperStats } from '@/shared/ui/templates.public';
import { CompactEmptyState } from '@/shared/ui/navigation-and-layout.public';
import { Alert, Button, Input } from '@/shared/ui/primitives.public';

import { CategoryMapperNameCell } from './category-table/CategoryMapperNameCell';
import { CategoryMapperSelectCell } from './category-table/CategoryMapperSelectCell';
import { CategoryMapperTableHeaderActions } from './category-table/CategoryMapperTableHeaderActions';
import { type CategoryRow } from './category-table/utils';
import { CategoryMapperCatalogSelector } from './CategoryMapperCatalogSelector';

const normalizeCategorySearchValue = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const buildCategorySearchHaystack = (row: CategoryRow): string =>
  normalizeCategorySearchValue(
    [row.name, row.path, row.externalId].filter(Boolean).join(' ')
  );

const getCategorySearchTerms = (query: string): string[] =>
  normalizeCategorySearchValue(query).split(' ').filter(Boolean);

const filterCategoryTree = (rows: CategoryRow[], terms: string[]): CategoryRow[] => {
  if (terms.length === 0) {
    return rows;
  }

  return rows.flatMap((row: CategoryRow): CategoryRow[] => {
    const filteredSubRows = row.subRows ? filterCategoryTree(row.subRows, terms) : undefined;
    const matches = terms.every((term: string) => buildCategorySearchHaystack(row).includes(term));

    if (!matches && (!filteredSubRows || filteredSubRows.length === 0)) {
      return [];
    }

    return [
      {
        ...row,
        subRows: filteredSubRows && filteredSubRows.length > 0 ? filteredSubRows : undefined,
      },
    ];
  });
};

const collectExpandedCategoryIds = (rows: CategoryRow[], ids = new Set<string>()): Set<string> => {
  for (const row of rows) {
    if (row.subRows && row.subRows.length > 0) {
      ids.add(row.id);
      collectExpandedCategoryIds(row.subRows, ids);
    }
  }
  return ids;
};

export function CategoryMapperTable(): React.JSX.Element {
  const { connectionName, integrationSlug } = useCategoryMapperConfig();
  const {
    externalCategoriesLoading,
    mappingsLoading,
    externalCategories,
    internalCategoriesLoading,
    selectedCatalogId,
    internalCategoryOptions,
    categoryTree,
  } = useCategoryMapperData();
  const {
    pendingMappings,
    expandedIds,
    toggleExpand,
    lastFetchResult,
    lastFetchWarning,
    traderaCategoryFetchBrowserMode,
    setTraderaCategoryFetchBrowserMode,
    staleMappings,
    nonLeafMappings,
    stats,
  } = useCategoryMapperUIState();
  const {
    getMappingForExternal,
    handleMappingChange,
    handleFetchExternalCategories,
    handleAutoMatchByName,
    handleSave,
    fetchMutation,
    saveMutation,
  } = useCategoryMapperActions();

  const [externalCategorySearchQuery, setExternalCategorySearchQuery] = useState('');
  const isFetchPending = fetchMutation.isPending;
  const isSavePending = saveMutation.isPending;
  const pendingCount = pendingMappings.size;
  const normalizedIntegrationSlug = (integrationSlug ?? '').trim().toLowerCase();
  const isTraderaConnection = normalizedIntegrationSlug === 'tradera';
  const persistedFetchSource = useMemo(() => {
    for (const category of externalCategories) {
      const source =
        typeof category.metadata?.['categoryFetchSource'] === 'string'
          ? category.metadata['categoryFetchSource'].trim()
          : '';
      if (source) {
        return source;
      }
    }
    return null;
  }, [externalCategories]);
  const derivedCategoryStats = useMemo(() => {
    let rootCount = 0;
    let withParentCount = 0;
    let maxDepth = 0;

    for (const category of externalCategories) {
      const parentExternalId =
        typeof category.parentExternalId === 'string' ? category.parentExternalId.trim() : '';
      if (parentExternalId && parentExternalId !== '0' && parentExternalId.toLowerCase() !== 'null') {
        withParentCount += 1;
      } else {
        rootCount += 1;
      }
      maxDepth = Math.max(maxDepth, category.depth ?? 0);
    }

    return {
      rootCount,
      withParentCount,
      maxDepth,
    };
  }, [externalCategories]);
  const lastFetchSource = lastFetchResult?.source?.trim() || null;
  const activeFetchSource = persistedFetchSource ?? lastFetchSource;
  const activeFetchStats =
    persistedFetchSource
      ? derivedCategoryStats
      : (lastFetchResult?.categoryStats ?? null);
  const activeCategoryCount = persistedFetchSource
    ? externalCategories.length
    : typeof lastFetchResult?.total === 'number'
      ? lastFetchResult.total
      : (lastFetchResult?.fetched ?? 0);
  const usedTraderaPublicFallback =
    isTraderaConnection && activeFetchSource === 'Tradera public taxonomy pages';
  const fetchedShallowTraderaTree =
    usedTraderaPublicFallback && (activeFetchStats?.maxDepth ?? 0) <= 1;
  const shallowTraderaFallbackGuidance = useMemo((): string | null => {
    if (!fetchedShallowTraderaTree) {
      return null;
    }

    return 'These stored Tradera categories came from the retired public taxonomy-page fallback and only reached shallow levels. Refetch categories to replace them with the listing form picker tree.';
  }, [fetchedShallowTraderaTree, normalizedIntegrationSlug]);
  const preservedCategoryCount =
    externalCategories.length > 0
      ? externalCategories.length
      : (lastFetchWarning?.existingTotal ?? 0);
  const preservedMaxDepth =
    externalCategories.length > 0
      ? derivedCategoryStats.maxDepth
      : (lastFetchWarning?.existingMaxDepth ?? 0);
  const isAutoMatchDisabled =
    isFetchPending ||
    isSavePending ||
    externalCategoriesLoading ||
    mappingsLoading ||
    internalCategoriesLoading ||
    !selectedCatalogId ||
    externalCategories.length === 0 ||
    internalCategoryOptions.length === 0;

  const columns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'External Category',
        cell: ({ row }) => {
          const mappingKey = row.original.externalId;
          const currentMapping = getMappingForExternal(mappingKey);
          const hasPendingChange = pendingMappings.has(mappingKey);

          return (
            <CategoryMapperNameCell
              name={row.original.name}
              path={row.original.path}
              statusHint={
                isTraderaConnection && row.original.isLeaf === false
                  ? 'Parent category, choose a leaf child instead'
                  : null
              }
              depth={row.depth}
              canExpand={row.getCanExpand()}
              isExpanded={row.getIsExpanded()}
              onToggleExpand={() => toggleExpand(row.original.id)}
              isMapped={Boolean(currentMapping)}
              hasPendingChange={hasPendingChange}
            />
          );
        },
      },
      {
        id: 'mapping',
        header: 'Internal Category',
        cell: ({ row }) => {
          const mappingKey = row.original.externalId;
          const currentMapping = getMappingForExternal(mappingKey);

          return (
            <CategoryMapperSelectCell
              value={currentMapping}
              onChange={(value) => handleMappingChange(mappingKey, value)}
              options={internalCategoryOptions}
              disabled={
                internalCategoriesLoading ||
                !selectedCatalogId ||
                (isTraderaConnection && row.original.isLeaf === false)
              }
            />
          );
        },
      },
    ],
    [
      getMappingForExternal,
      pendingMappings,
      toggleExpand,
      handleMappingChange,
      internalCategoriesLoading,
      isTraderaConnection,
      selectedCatalogId,
      internalCategoryOptions,
    ]
  );

  const isLoading = externalCategoriesLoading || mappingsLoading;
  const isExternalCategorySearchInputFilled = externalCategorySearchQuery.trim().length > 0;
  const externalCategorySearchTerms = useMemo(
    () => getCategorySearchTerms(externalCategorySearchQuery),
    [externalCategorySearchQuery]
  );
  const isExternalCategorySearchActive = externalCategorySearchTerms.length > 0;
  const filteredCategoryTree = useMemo(
    () => filterCategoryTree(categoryTree, externalCategorySearchTerms),
    [categoryTree, externalCategorySearchTerms]
  );
  const expandedState = useMemo(
    () =>
      Object.fromEntries(
        Array.from(
          isExternalCategorySearchActive
            ? collectExpandedCategoryIds(filteredCategoryTree)
            : expandedIds
        ).map((id) => [id, true])
      ),
    [expandedIds, filteredCategoryTree, isExternalCategorySearchActive]
  );
  const shouldShowSearchEmptyState =
    !isLoading && isExternalCategorySearchActive && filteredCategoryTree.length === 0;
  const shouldShowUnfetchedEmptyState = !isLoading && externalCategories.length === 0;
  let emptyState: React.ReactNode | undefined;
  if (shouldShowSearchEmptyState) {
    emptyState = (
      <CompactEmptyState
        title='No matching external categories'
        description='Try another external category search.'
        className='py-8'
      />
    );
  } else if (shouldShowUnfetchedEmptyState) {
    emptyState = (
      <CompactEmptyState
        title='No external categories found'
        description={`Click "Fetch Categories" to load categories from ${connectionName}.`}
        className='py-8'
      />
    );
  }

  return (
    <StandardDataTablePanel
      title='Marketplace Categories'
      description={`Connection: ${connectionName}`}
      headerActions={
        <CategoryMapperTableHeaderActions
          onFetch={() => void handleFetchExternalCategories()}
          isFetching={isFetchPending}
          showBrowserModeControl={isTraderaConnection}
          browserMode={traderaCategoryFetchBrowserMode}
          onBrowserModeChange={setTraderaCategoryFetchBrowserMode}
          onAutoMatchByName={handleAutoMatchByName}
          autoMatchDisabled={isAutoMatchDisabled}
          onSave={() => void handleSave()}
          isSaving={isSavePending}
          pendingCount={pendingCount}
        />
      }
      filters={
        <div className='mb-2 flex flex-col gap-2 sm:flex-row sm:items-center'>
          <div className='min-w-0 sm:w-72'>
            <CategoryMapperCatalogSelector />
          </div>
          <div className='relative min-w-0 flex-1'>
            <Search
              className='pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground'
              aria-hidden='true'
            />
            <Input
              value={externalCategorySearchQuery}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setExternalCategorySearchQuery(event.target.value)
              }
              placeholder='Search external categories...'
              aria-label='Search external categories'
              size='sm'
              className='h-8 pl-8 pr-9'
            />
            {isExternalCategorySearchInputFilled ? (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-md'
                aria-label='Clear external category search'
                title='Clear external category search'
                onClick={() => setExternalCategorySearchQuery('')}
              >
                <X className='h-3.5 w-3.5' aria-hidden='true' />
              </Button>
            ) : null}
          </div>
        </div>
      }
      alerts={
        <div className='space-y-3'>
          <GenericMapperStats
            total={stats.total}
            mapped={stats.mapped}
            unmapped={stats.unmapped}
            pending={stats.pending}
            itemLabel='Categories'
          />
          {lastFetchWarning ? (
            <Alert variant='warning' className='text-xs'>
              <div className='space-y-2'>
                <div>{lastFetchWarning.message}</div>
                <div>
                  Stored categories kept: {preservedCategoryCount}. Current max depth:{' '}
                  {preservedMaxDepth}. Rejected fetch max depth:{' '}
                  {lastFetchWarning.fetchedMaxDepth ?? 0}.
                </div>
                {externalCategories.length > 0 ? (
                  <div>
                    Current loaded tree roots: {derivedCategoryStats.rootCount}. Categories with
                    parents: {derivedCategoryStats.withParentCount}.
                  </div>
                ) : null}
              </div>
            </Alert>
          ) : null}
          {activeFetchSource && activeFetchStats ? (
            <Alert
              variant={usedTraderaPublicFallback ? 'warning' : 'info'}
              className='text-xs'
            >
              <div className='space-y-2'>
                <div>
                  Category source: {activeFetchSource}. Loaded {activeCategoryCount} categories.
                </div>
                <div>
                  Roots: {activeFetchStats.rootCount}. Categories with parents:{' '}
                  {activeFetchStats.withParentCount}. Max depth: {activeFetchStats.maxDepth}.
                </div>
                {shallowTraderaFallbackGuidance ? (
                  <div>
                    {shallowTraderaFallbackGuidance}
                  </div>
                ) : null}
              </div>
            </Alert>
          ) : null}
          {stats.stale > 0 ? (
            <Alert variant='warning' className='text-xs'>
              <div className='space-y-2'>
                <div>
                  {stats.stale === 1
                    ? '1 saved mapping points to a missing marketplace category. Fetch categories and remap it before listing.'
                    : `${stats.stale} saved mappings point to missing marketplace categories. Fetch categories and remap them before listing.`}
                </div>
                <div className='space-y-1'>
                  {staleMappings.slice(0, 3).map((mapping) => (
                    <div key={mapping.externalCategoryId} className='font-mono text-[11px]'>
                      {mapping.externalCategoryPath && mapping.externalCategoryPath !== mapping.externalCategoryName
                        ? mapping.externalCategoryPath
                        : mapping.externalCategoryName}
                      {mapping.internalCategoryLabel ? ` -> ${mapping.internalCategoryLabel}` : ''}
                    </div>
                  ))}
                  {staleMappings.length > 3 ? (
                    <div className='text-[11px] text-yellow-200/90'>
                      +{staleMappings.length - 3} more stale mapping{staleMappings.length - 3 === 1 ? '' : 's'}
                    </div>
                  ) : null}
                </div>
              </div>
            </Alert>
          ) : null}
          {isTraderaConnection && stats.nonLeaf > 0 ? (
            <Alert variant='warning' className='text-xs'>
              <div className='space-y-2'>
                <div>
                  {stats.nonLeaf === 1
                    ? '1 saved Tradera mapping points to a parent category that still has child categories. Remap it to the deepest Tradera category before listing.'
                    : `${stats.nonLeaf} saved Tradera mappings point to parent categories that still have child categories. Remap them to the deepest Tradera categories before listing.`}
                </div>
                <div className='space-y-1'>
                  {nonLeafMappings.slice(0, 3).map((mapping) => (
                    <div key={mapping.externalCategoryId} className='font-mono text-[11px]'>
                      {mapping.externalCategoryPath && mapping.externalCategoryPath !== mapping.externalCategoryName
                        ? mapping.externalCategoryPath
                        : mapping.externalCategoryName}
                      {mapping.internalCategoryLabel ? ` -> ${mapping.internalCategoryLabel}` : ''}
                    </div>
                  ))}
                  {nonLeafMappings.length > 3 ? (
                    <div className='text-[11px] text-yellow-200/90'>
                      +{nonLeafMappings.length - 3} more non-leaf mapping
                      {nonLeafMappings.length - 3 === 1 ? '' : 's'}
                    </div>
                  ) : null}
                </div>
              </div>
            </Alert>
          ) : null}
        </div>
      }
      isLoading={isLoading}
      emptyState={emptyState}
      variant='flat'
      columns={columns}
      data={filteredCategoryTree}
      expanded={expandedState}
      onExpandedChange={() => {}}
      getRowId={(row: CategoryRow) => row.id}
      getSubRows={(row: CategoryRow) => row.subRows}
      maxHeight='60vh'
      stickyHeader
    />
  );
}
