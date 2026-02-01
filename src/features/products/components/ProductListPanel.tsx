"use client";
import { Profiler, ProfilerOnRenderCallback, memo, useMemo } from "react";

import { DataTable, Button, ListPanel } from "@/shared/ui";
import dynamic from "next/dynamic";



import type { ColumnDef, RowSelectionState, OnChangeFn } from "@tanstack/react-table";
import type { ProductDraft } from "@/features/products/types/drafts";
import type { Catalog } from "@/features/products/types";
import type { PriceGroupWithDetails, ProductWithImages } from "@/features/products/types";

const ProductListHeader = dynamic(
  () =>
    import("@/features/products/components/list/ProductListHeader").then(
      (mod: { ProductListHeader: React.ComponentType<Record<string, unknown>> }) => mod.ProductListHeader
    ),
  { ssr: false }
);

const ProductFilters = dynamic(
  () =>
    import("@/features/products/components/list/ProductFilters").then(
      (mod: { ProductFilters: React.ComponentType<Record<string, unknown>> }) => mod.ProductFilters
    ),
  { ssr: false }
);

const ProductSelectionActions = dynamic(
  () =>
    import("@/features/products/components/list/ProductFilters").then(
      (mod: { ProductSelectionActions: React.ComponentType<Record<string, unknown>> }) => mod.ProductSelectionActions
    ),
  { ssr: false }
);

export type ProductListPanelProps = {
  onCreateProduct: () => void;
  onCreateFromDraft: (draftId: string) => void;
  activeDrafts: ProductDraft[];
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  nameLocale: "name_en" | "name_pl" | "name_de";
  setNameLocale: (locale: "name_en" | "name_pl" | "name_de") => void;
  languageOptions: Array<{ value: "name_en" | "name_pl" | "name_de"; label: string }>;
  currencyCode: string;
  setCurrencyCode: (code: string) => void;
  currencyOptions: string[];
  catalogFilter: string;
  setCatalogFilter: (filter: string) => void;
  catalogs: Catalog[];
  loadError: string | null;
  actionError: string | null;
  onDismissActionError: () => void;
  search: string;
  setSearch: (value: string) => void;
  sku: string;
  setSku: (value: string) => void;
  minPrice: number | undefined;
  setMinPrice: (value: number | undefined) => void;
  maxPrice: number | undefined;
  setMaxPrice: (value: number | undefined) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  data: ProductWithImages[];
  rowSelection: RowSelectionState;
  setRowSelection: OnChangeFn<RowSelectionState>;
  onSelectAllGlobal: () => Promise<void>;
  loadingGlobal: boolean;
  onDeleteSelected: () => Promise<void>;
  onAddToMarketplace: () => void;
  handleProductsTableRender: ProfilerOnRenderCallback;
  tableColumns: ColumnDef<ProductWithImages>[];
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  productNameKey: "name_en" | "name_pl" | "name_de";
  priceGroups: PriceGroupWithDetails[];
  onProductNameClick: (row: ProductWithImages) => void;
  onProductEditClick: (row: ProductWithImages) => void;
  onIntegrationsClick: (row: ProductWithImages) => void;
  onExportSettingsClick: (row: ProductWithImages) => void;
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  getRowId: (row: ProductWithImages) => string | number;
  isLoading: boolean;
  skeletonRows: React.ReactNode;
};

export const ProductListPanel = memo(function ProductListPanel({
  onCreateProduct,
  onCreateFromDraft,
  activeDrafts,
  page,
  totalPages,
  setPage,
  pageSize,
  setPageSize,
  nameLocale,
  setNameLocale,
  languageOptions,
  currencyCode,
  setCurrencyCode,
  currencyOptions,
  catalogFilter,
  setCatalogFilter,
  catalogs,
  loadError,
  actionError,
  onDismissActionError,
  search,
  setSearch,
  sku,
  setSku,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  data,
  rowSelection,
  setRowSelection,
  onSelectAllGlobal,
  loadingGlobal,
  onDeleteSelected,
  onAddToMarketplace,
  handleProductsTableRender,
  tableColumns,
  setRefreshTrigger,
  productNameKey,
  priceGroups,
  onProductNameClick,
  onProductEditClick,
  onIntegrationsClick,
  onExportSettingsClick,
  integrationBadgeIds,
  integrationBadgeStatuses,
  getRowId,
  isLoading,
  skeletonRows,
}: ProductListPanelProps) {
  const headerProps = useMemo(
    () => ({
      onCreateProduct,
      onCreateFromDraft,
      activeDrafts,
      page,
      totalPages,
      setPage,
      pageSize,
      setPageSize,
      nameLocale,
      setNameLocale,
      languageOptions,
      currencyCode,
      setCurrencyCode,
      currencyOptions,
      catalogFilter,
      setCatalogFilter,
      catalogs,
    }),
    [
      onCreateProduct,
      onCreateFromDraft,
      activeDrafts,
      page,
      totalPages,
      setPage,
      pageSize,
      setPageSize,
      nameLocale,
      setNameLocale,
      languageOptions,
      currencyCode,
      setCurrencyCode,
      currencyOptions,
      catalogFilter,
      setCatalogFilter,
      catalogs,
    ]
  );

  const filtersProps = useMemo(
    () => ({
      search,
      setSearch,
      sku,
      setSku,
      minPrice,
      setMinPrice,
      maxPrice,
      setMaxPrice,
      startDate,
      setStartDate,
      endDate,
      setEndDate,
    }),
    [
      search,
      setSearch,
      sku,
      setSku,
      minPrice,
      setMinPrice,
      maxPrice,
      setMaxPrice,
      startDate,
      setStartDate,
      endDate,
      setEndDate,
    ]
  );

  const tableProps = useMemo(
    () => ({
      columns: tableColumns,
      data,
      setRefreshTrigger,
      productNameKey,
      currencyCode,
      priceGroups,
      onProductNameClick,
      onProductEditClick,
      onIntegrationsClick,
      onExportSettingsClick,
      integrationBadgeIds,
      integrationBadgeStatuses,
      getRowId,
      rowSelection,
      onRowSelectionChange: setRowSelection,
      isLoading,
      skeletonRows,
    }),
    [
      tableColumns,
      data,
      setRefreshTrigger,
      productNameKey,
      currencyCode,
      priceGroups,
      onProductNameClick,
      onProductEditClick,
      onIntegrationsClick,
      onExportSettingsClick,
      integrationBadgeIds,
      integrationBadgeStatuses,
      getRowId,
      rowSelection,
      setRowSelection,
      isLoading,
      skeletonRows,
    ]
  );

  const alerts = useMemo(() => {
    if (!loadError && !actionError) return null;
    return (
      <>
        {loadError && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {loadError}
          </div>
        )}
        {actionError && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {actionError}
            <Button
              onClick={onDismissActionError}
              className="ml-4 bg-transparent text-red-200 hover:bg-red-500/20"
            >
              Dismiss
            </Button>
          </div>
        )}
      </>
    );
  }, [actionError, loadError, onDismissActionError]);

  return (
    <ListPanel
      header={<ProductListHeader {...headerProps} />}
      alerts={alerts}
      filters={<ProductFilters {...filtersProps} />}
      actions={
        <ProductSelectionActions
          data={data}
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          onSelectAllGlobal={onSelectAllGlobal}
          loadingGlobal={loadingGlobal}
          onDeleteSelected={onDeleteSelected}
          onAddToMarketplace={onAddToMarketplace}
        />
      }
    >
      <Profiler id="ProductsTable" onRender={handleProductsTableRender}>
        <DataTable {...tableProps} />
      </Profiler>
    </ListPanel>
  );
});
