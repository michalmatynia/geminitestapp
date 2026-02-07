'use client';

import { createContext, useContext, ReactNode, ProfilerOnRenderCallback } from 'react';

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

export const useProductListContext = () => {
  const context = useContext(ProductListContext);
  if (!context) {
    throw new Error('useProductListContext must be used within a ProductListProvider');
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
  return (
    <ProductListContext.Provider value={value}>
      {children}
    </ProductListContext.Provider>
  );
}
