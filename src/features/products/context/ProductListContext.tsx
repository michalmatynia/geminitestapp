'use client';

import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
  ProfilerOnRenderCallback,
} from 'react';

import type { Catalog, PriceGroupWithDetails, ProductWithImages } from '@/features/products/types';
import type { ProductDraft } from '@/features/products/types/drafts';

import type { ColumnDef, RowSelectionState, OnChangeFn } from '@tanstack/react-table';

export interface ProductListContextType {
  // Actions
  onCreateProduct: () => void;
  onCreateFromDraft: (draftId: string) => void;
  activeDrafts: ProductDraft[];
  
  // Pagination
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  
  // Preferences/Localization
  nameLocale: 'name_en' | 'name_pl' | 'name_de';
  setNameLocale: (locale: 'name_en' | 'name_pl' | 'name_de') => void;
  languageOptions: Array<{ value: 'name_en' | 'name_pl' | 'name_de'; label: string }>;
  currencyCode: string;
  setCurrencyCode: (code: string) => void;
  currencyOptions: string[];
  
  // Filters
  catalogFilter: string;
  setCatalogFilter: (filter: string) => void;
  catalogs: Catalog[];
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
  
  // Data State
  data: ProductWithImages[];
  isLoading: boolean;
  loadError: string | null;
  actionError: string | null;
  onDismissActionError: () => void;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  
  // Selection
  rowSelection: RowSelectionState;
  setRowSelection: OnChangeFn<RowSelectionState>;
  onSelectAllGlobal: () => Promise<void>;
  loadingGlobal: boolean;
  onDeleteSelected: () => Promise<void>;
  onAddToMarketplace: () => void;
  
  // Table Configuration
  handleProductsTableRender: ProfilerOnRenderCallback;
  tableColumns: ColumnDef<ProductWithImages>[];
  getRowId: (row: ProductWithImages) => string;
  skeletonRows: ReactNode;
  
  // Row Handlers
  productNameKey: 'name_en' | 'name_pl' | 'name_de';
  priceGroups: PriceGroupWithDetails[];
  onProductNameClick: (row: ProductWithImages) => void;
  onProductEditClick: (row: ProductWithImages) => void;
  onProductDeleteClick: (row: ProductWithImages) => void;
  onIntegrationsClick: (row: ProductWithImages) => void;
  onExportSettingsClick: (row: ProductWithImages) => void;
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  queuedProductIds: Set<string>;

  // Modal State
  isCreateOpen: boolean;
  initialSku: string;
  createDraft: ProductDraft | null;
  initialCatalogId: string | null;
  onCloseCreate: () => void;
  onCreateSuccess: (info?: { queued?: boolean }) => void;
  editingProduct: ProductWithImages | null;
  onCloseEdit: () => void;
  onEditSuccess: (info?: { queued?: boolean }) => void;
  onEditSave: (saved: ProductWithImages) => void;
  integrationsProduct: ProductWithImages | null;
  onCloseIntegrations: () => void;
  onStartListing: (integrationId: string, connectionId: string) => void;
  showListProductModal: boolean;
  onCloseListProduct: () => void;
  onListProductSuccess: () => void;
  listProductPreset: { integrationId: string; connectionId: string } | null;
  exportSettingsProduct: ProductWithImages | null;
  onCloseExportSettings: () => void;
  onListingsUpdated: () => void;
  massListIntegration: { integrationId: string; connectionId: string } | null;
  massListProductIds: string[];
  onCloseMassList: () => void;
  onMassListSuccess: () => void;
}

export const ProductListContext = createContext<ProductListContextType | null>(null);

export interface ProductListFiltersContextType {
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  nameLocale: 'name_en' | 'name_pl' | 'name_de';
  setNameLocale: (locale: 'name_en' | 'name_pl' | 'name_de') => void;
  languageOptions: Array<{ value: 'name_en' | 'name_pl' | 'name_de'; label: string }>;
  currencyCode: string;
  setCurrencyCode: (code: string) => void;
  currencyOptions: string[];
  catalogFilter: string;
  setCatalogFilter: (filter: string) => void;
  catalogs: Catalog[];
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
}

export interface ProductListSelectionContextType {
  data: ProductWithImages[];
  rowSelection: RowSelectionState;
  setRowSelection: OnChangeFn<RowSelectionState>;
  onSelectAllGlobal: () => Promise<void>;
  loadingGlobal: boolean;
  onDeleteSelected: () => Promise<void>;
  onAddToMarketplace: () => void;
}

export interface ProductListTableContextType {
  loadError: string | null;
  actionError: string | null;
  onDismissActionError: () => void;
  data: ProductWithImages[];
  rowSelection: RowSelectionState;
  setRowSelection: OnChangeFn<RowSelectionState>;
  handleProductsTableRender: ProfilerOnRenderCallback;
  tableColumns: ColumnDef<ProductWithImages>[];
  getRowId: (row: ProductWithImages) => string;
  isLoading: boolean;
  skeletonRows: ReactNode;
}

export interface ProductListActionsContextType {
  onCreateProduct: () => void;
  onCreateFromDraft: (draftId: string) => void;
  activeDrafts: ProductDraft[];
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  productNameKey: 'name_en' | 'name_pl' | 'name_de';
  priceGroups: PriceGroupWithDetails[];
  currencyCode: string;
  onProductNameClick: (row: ProductWithImages) => void;
  onProductEditClick: (row: ProductWithImages) => void;
  onProductDeleteClick: (row: ProductWithImages) => void;
  onIntegrationsClick: (row: ProductWithImages) => void;
  onExportSettingsClick: (row: ProductWithImages) => void;
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  queuedProductIds: Set<string>;
}

export interface ProductListModalsContextType {
  isCreateOpen: boolean;
  initialSku: string;
  createDraft: ProductDraft | null;
  initialCatalogId: string | null;
  onCloseCreate: () => void;
  onCreateSuccess: (info?: { queued?: boolean }) => void;
  editingProduct: ProductWithImages | null;
  onCloseEdit: () => void;
  onEditSuccess: (info?: { queued?: boolean }) => void;
  onEditSave: (saved: ProductWithImages) => void;
  integrationsProduct: ProductWithImages | null;
  onCloseIntegrations: () => void;
  onStartListing: (integrationId: string, connectionId: string) => void;
  showListProductModal: boolean;
  onCloseListProduct: () => void;
  onListProductSuccess: () => void;
  listProductPreset: { integrationId: string; connectionId: string } | null;
  exportSettingsProduct: ProductWithImages | null;
  onCloseExportSettings: () => void;
  onListingsUpdated: () => void;
  massListIntegration: { integrationId: string; connectionId: string } | null;
  massListProductIds: string[];
  onCloseMassList: () => void;
  onMassListSuccess: () => void;
}

const ProductListFiltersContext =
  createContext<ProductListFiltersContextType | null>(null);
const ProductListSelectionContext =
  createContext<ProductListSelectionContextType | null>(null);
const ProductListTableContext =
  createContext<ProductListTableContextType | null>(null);
const ProductListActionsContext =
  createContext<ProductListActionsContextType | null>(null);
const ProductListModalsContext =
  createContext<ProductListModalsContextType | null>(null);

export const useProductListContext = () => {
  const context = useContext(ProductListContext);
  if (!context) {
    throw new Error('useProductListContext must be used within a ProductListProvider');
  }
  return context;
};

export const useProductListFiltersContext = (): ProductListFiltersContextType => {
  const context = useContext(ProductListFiltersContext);
  if (!context) {
    throw new Error(
      'useProductListFiltersContext must be used within a ProductListProvider'
    );
  }
  return context;
};

export const useProductListSelectionContext =
  (): ProductListSelectionContextType => {
    const context = useContext(ProductListSelectionContext);
    if (!context) {
      throw new Error(
        'useProductListSelectionContext must be used within a ProductListProvider'
      );
    }
    return context;
  };

export const useProductListTableContext = (): ProductListTableContextType => {
  const context = useContext(ProductListTableContext);
  if (!context) {
    throw new Error(
      'useProductListTableContext must be used within a ProductListProvider'
    );
  }
  return context;
};

export const useProductListActionsContext = (): ProductListActionsContextType => {
  const context = useContext(ProductListActionsContext);
  if (!context) {
    throw new Error(
      'useProductListActionsContext must be used within a ProductListProvider'
    );
  }
  return context;
};

export const useProductListModalsContext = (): ProductListModalsContextType => {
  const context = useContext(ProductListModalsContext);
  if (!context) {
    throw new Error(
      'useProductListModalsContext must be used within a ProductListProvider'
    );
  }
  return context;
};

export function ProductListProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ProductListContextType;
}) {
  const filtersValue = useMemo<ProductListFiltersContextType>(
    () => ({
      page: value.page,
      totalPages: value.totalPages,
      setPage: value.setPage,
      pageSize: value.pageSize,
      setPageSize: value.setPageSize,
      nameLocale: value.nameLocale,
      setNameLocale: value.setNameLocale,
      languageOptions: value.languageOptions,
      currencyCode: value.currencyCode,
      setCurrencyCode: value.setCurrencyCode,
      currencyOptions: value.currencyOptions,
      catalogFilter: value.catalogFilter,
      setCatalogFilter: value.setCatalogFilter,
      catalogs: value.catalogs,
      search: value.search,
      setSearch: value.setSearch,
      sku: value.sku,
      setSku: value.setSku,
      minPrice: value.minPrice,
      setMinPrice: value.setMinPrice,
      maxPrice: value.maxPrice,
      setMaxPrice: value.setMaxPrice,
      startDate: value.startDate,
      setStartDate: value.setStartDate,
      endDate: value.endDate,
      setEndDate: value.setEndDate,
    }),
    [value]
  );

  const selectionValue = useMemo<ProductListSelectionContextType>(
    () => ({
      data: value.data,
      rowSelection: value.rowSelection,
      setRowSelection: value.setRowSelection,
      onSelectAllGlobal: value.onSelectAllGlobal,
      loadingGlobal: value.loadingGlobal,
      onDeleteSelected: value.onDeleteSelected,
      onAddToMarketplace: value.onAddToMarketplace,
    }),
    [value]
  );

  const tableValue = useMemo<ProductListTableContextType>(
    () => ({
      loadError: value.loadError,
      actionError: value.actionError,
      onDismissActionError: value.onDismissActionError,
      data: value.data,
      rowSelection: value.rowSelection,
      setRowSelection: value.setRowSelection,
      handleProductsTableRender: value.handleProductsTableRender,
      tableColumns: value.tableColumns,
      getRowId: value.getRowId,
      isLoading: value.isLoading,
      skeletonRows: value.skeletonRows,
    }),
    [value]
  );

  const actionsValue = useMemo<ProductListActionsContextType>(
    () => ({
      onCreateProduct: value.onCreateProduct,
      onCreateFromDraft: value.onCreateFromDraft,
      activeDrafts: value.activeDrafts,
      setRefreshTrigger: value.setRefreshTrigger,
      productNameKey: value.productNameKey,
      priceGroups: value.priceGroups,
      currencyCode: value.currencyCode,
      onProductNameClick: value.onProductNameClick,
      onProductEditClick: value.onProductEditClick,
      onProductDeleteClick: value.onProductDeleteClick,
      onIntegrationsClick: value.onIntegrationsClick,
      onExportSettingsClick: value.onExportSettingsClick,
      integrationBadgeIds: value.integrationBadgeIds,
      integrationBadgeStatuses: value.integrationBadgeStatuses,
      queuedProductIds: value.queuedProductIds,
    }),
    [value]
  );

  const modalsValue = useMemo<ProductListModalsContextType>(
    () => ({
      isCreateOpen: value.isCreateOpen,
      initialSku: value.initialSku,
      createDraft: value.createDraft,
      initialCatalogId: value.initialCatalogId,
      onCloseCreate: value.onCloseCreate,
      onCreateSuccess: value.onCreateSuccess,
      editingProduct: value.editingProduct,
      onCloseEdit: value.onCloseEdit,
      onEditSuccess: value.onEditSuccess,
      onEditSave: value.onEditSave,
      integrationsProduct: value.integrationsProduct,
      onCloseIntegrations: value.onCloseIntegrations,
      onStartListing: value.onStartListing,
      showListProductModal: value.showListProductModal,
      onCloseListProduct: value.onCloseListProduct,
      onListProductSuccess: value.onListProductSuccess,
      listProductPreset: value.listProductPreset,
      exportSettingsProduct: value.exportSettingsProduct,
      onCloseExportSettings: value.onCloseExportSettings,
      onListingsUpdated: value.onListingsUpdated,
      massListIntegration: value.massListIntegration,
      massListProductIds: value.massListProductIds,
      onCloseMassList: value.onCloseMassList,
      onMassListSuccess: value.onMassListSuccess,
    }),
    [value]
  );

  return (
    <ProductListContext.Provider value={value}>
      <ProductListFiltersContext.Provider value={filtersValue}>
        <ProductListSelectionContext.Provider value={selectionValue}>
          <ProductListTableContext.Provider value={tableValue}>
            <ProductListActionsContext.Provider value={actionsValue}>
              <ProductListModalsContext.Provider value={modalsValue}>
                {children}
              </ProductListModalsContext.Provider>
            </ProductListActionsContext.Provider>
          </ProductListTableContext.Provider>
        </ProductListSelectionContext.Provider>
      </ProductListFiltersContext.Provider>
    </ProductListContext.Provider>
  );
}
