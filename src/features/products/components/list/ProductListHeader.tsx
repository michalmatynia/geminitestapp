'use client';
'use no memo';

import { memo, useEffect, useMemo, type JSX, type ReactNode } from 'react';

import {
  useProductListFiltersContext,
  useProductListHeaderActionsContext,
} from '@/features/products/context/ProductListContext';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import { useAdminLayoutActions, useAdminLayoutState } from '@/shared/providers/AdminLayoutProvider';

import {
  ALL_CATALOGS_OPTION,
  ProductListCreateActions,
  ProductListHeaderLayout,
  ProductListPaginationControl,
  UNASSIGNED_CATALOG_OPTION,
  resolveFiltersContent,
} from './ProductListHeader.parts';
import { ProductListSelectorsAndTriggers } from './ProductListHeader.selectors';

interface ProductListHeaderProps {
  showHeader?: boolean;
  filtersContent?: ReactNode;
}

type ProductListHeaderActions = ReturnType<typeof useProductListHeaderActionsContext>;
type ProductListFilters = ReturnType<typeof useProductListFiltersContext>;

function ProductListHeaderView({
  catalogFilterOptions,
  currencySelectOptions,
  filters,
  headerActions,
  isMenuHidden,
  resolvedFiltersContent,
  setIsMenuHidden,
  showHeader,
}: {
  catalogFilterOptions: Array<LabeledOptionDto<string>>;
  currencySelectOptions: Array<LabeledOptionDto<string>>;
  filters: ProductListFilters;
  headerActions: ProductListHeaderActions;
  isMenuHidden: boolean;
  resolvedFiltersContent: ReactNode;
  setIsMenuHidden: (isHidden: boolean) => void;
  showHeader: boolean;
}): JSX.Element {
  const createActions = (
    <ProductListCreateActions
      activeDrafts={headerActions.activeDrafts}
      onCreateFromDraft={headerActions.onCreateFromDraft}
      onCreateProduct={headerActions.onCreateProduct}
    />
  );
  const pagination = <ProductListPaginationControl {...filters} />;
  const selectorsAndTriggers = (
    <ProductListSelectorsAndTriggers
      catalogFilter={filters.catalogFilter}
      catalogFilterOptions={catalogFilterOptions}
      currencyCode={filters.currencyCode}
      currencySelectOptions={currencySelectOptions}
      languageOptions={filters.languageOptions}
      nameLocale={filters.nameLocale}
      setCatalogFilter={filters.setCatalogFilter}
      setCurrencyCode={filters.setCurrencyCode}
      setNameLocale={filters.setNameLocale}
      triggerButtonsReady={headerActions.triggerButtonsReady !== false}
    />
  );

  return (
    <ProductListHeaderLayout
      createActions={createActions}
      filtersContent={resolvedFiltersContent}
      isMenuHidden={isMenuHidden}
      pagination={pagination}
      selectorsAndTriggers={selectorsAndTriggers}
      setIsMenuHidden={setIsMenuHidden}
      showHeader={showHeader}
    />
  );
}

export const ProductListHeader = memo(({
  showHeader = true,
  filtersContent,
}: ProductListHeaderProps): JSX.Element => {
  const { isMenuHidden } = useAdminLayoutState();
  const { setIsMenuHidden } = useAdminLayoutActions();
  const headerActions = useProductListHeaderActionsContext();
  const filters = useProductListFiltersContext();
  const catalogFilterOptions = useMemo(
    (): Array<LabeledOptionDto<string>> => [
      ALL_CATALOGS_OPTION,
      UNASSIGNED_CATALOG_OPTION,
      ...filters.catalogs.map((catalog: Catalog) => ({ value: catalog.id, label: catalog.name })),
    ],
    [filters.catalogs]
  );
  const currencySelectOptions = useMemo(
    (): Array<LabeledOptionDto<string>> =>
      filters.currencyOptions.map((code: string) => ({ value: code, label: code })),
    [filters.currencyOptions]
  );
  const resolvedFiltersContent = useMemo(
    (): ReactNode => resolveFiltersContent(filtersContent),
    [filtersContent]
  );

  useEffect(() => {
    return (): void => {
      setIsMenuHidden(false);
    };
  }, [setIsMenuHidden]);

  return (
    <ProductListHeaderView
      catalogFilterOptions={catalogFilterOptions}
      currencySelectOptions={currencySelectOptions}
      filters={filters}
      headerActions={headerActions}
      isMenuHidden={isMenuHidden}
      resolvedFiltersContent={resolvedFiltersContent}
      setIsMenuHidden={setIsMenuHidden}
      showHeader={showHeader}
    />
  );
});
