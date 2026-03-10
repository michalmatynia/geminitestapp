import type {
  Catalog,
  PriceGroupWithDetails,
  ProductDraft,
  ProductWithImages,
} from '@/shared/contracts/products';

import type { ColumnDef, OnChangeFn, Row, RowSelectionState } from '@tanstack/react-table';
import type { ReactNode, ProfilerOnRenderCallback } from 'react';



export interface ProductListContextType {
  onCreateProduct: () => void;
  onCreateFromDraft: (draftId: string) => void;
  activeDrafts: ProductDraft[];
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
  filtersCollapsedByDefault: boolean;
  catalogFilter: string;
  setCatalogFilter: (filter: string) => void;
  catalogs: Catalog[];
  search: string;
  setSearch: (value: string) => void;
  productId: string;
  setProductId: (value: string) => void;
  idMatchMode: 'exact' | 'partial';
  setIdMatchMode: (value: 'exact' | 'partial') => void;
  sku: string;
  setSku: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  categoryId: string;
  setCategoryId: (value: string) => void;
  minPrice: number | undefined;
  setMinPrice: (value: number | undefined) => void;
  maxPrice: number | undefined;
  setMaxPrice: (value: number | undefined) => void;
  stockValue: number | undefined;
  setStockValue: (value: number | undefined) => void;
  stockOperator: '' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  setStockOperator: (value: '' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq') => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  advancedFilter: string;
  activeAdvancedFilterPresetId: string | null;
  setAdvancedFilter: (value: string) => void;
  setAdvancedFilterState: (value: string, presetId: string | null) => void;
  baseExported: '' | 'true' | 'false';
  setBaseExported: (value: '' | 'true' | 'false') => void;
  data: ProductWithImages[];
  isLoading: boolean;
  loadError: string | null;
  actionError: string | null;
  onDismissActionError: () => void;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  rowSelection: RowSelectionState;
  setRowSelection: OnChangeFn<RowSelectionState>;
  onSelectAllGlobal: () => Promise<void>;
  loadingGlobal: boolean;
  onDeleteSelected: () => Promise<void>;
  onAddToMarketplace: () => void;
  handleProductsTableRender: ProfilerOnRenderCallback;
  tableColumns: ColumnDef<ProductWithImages>[];
  getRowClassName?: ((row: Row<ProductWithImages>) => string | undefined) | undefined;
  getRowId: (row: ProductWithImages) => string;
  skeletonRows: ReactNode;
  maxHeight?: string | number | undefined;
  stickyHeader?: boolean | undefined;
  productNameKey: 'name_en' | 'name_pl' | 'name_de';
  priceGroups: PriceGroupWithDetails[];
  onPrefetchProductDetail: (productId: string) => void;
  onProductNameClick: (row: ProductWithImages) => void;
  onProductEditClick: (row: ProductWithImages) => void;
  onProductDeleteClick: (row: ProductWithImages) => void;
  onDuplicateProduct: (row: ProductWithImages) => void;
  onIntegrationsClick: (row: ProductWithImages) => void;
  onExportSettingsClick: (row: ProductWithImages) => void;
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  traderaBadgeIds: Set<string>;
  traderaBadgeStatuses: Map<string, string>;
  queuedProductIds: Set<string>;
  categoryNameById: ReadonlyMap<string, string>;
  thumbnailSource: 'file' | 'link' | 'base64';
  imageExternalBaseUrl: string | null;
  isCreateOpen: boolean;
  isPromptOpen: boolean;
  setIsPromptOpen: (open: boolean) => void;
  handleConfirmSku: (sku: string) => Promise<void>;
  initialSku: string;
  createDraft: ProductDraft | null;
  initialCatalogId: string | null;
  onCloseCreate: () => void;
  onCreateSuccess: (info?: { queued?: boolean }) => void;
  editingProduct: ProductWithImages | null;
  isEditHydrating: boolean;
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
  showIntegrationModal: boolean;
  onCloseIntegrationModal: () => void;
  onSelectIntegrationFromModal: (integrationId: string, connectionId: string) => void;
}

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
  filtersCollapsedByDefault: boolean;
  catalogFilter: string;
  setCatalogFilter: (filter: string) => void;
  catalogs: Catalog[];
  search: string;
  setSearch: (value: string) => void;
  productId: string;
  setProductId: (value: string) => void;
  idMatchMode: 'exact' | 'partial';
  setIdMatchMode: (value: 'exact' | 'partial') => void;
  sku: string;
  setSku: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  categoryId: string;
  setCategoryId: (value: string) => void;
  minPrice: number | undefined;
  setMinPrice: (value: number | undefined) => void;
  maxPrice: number | undefined;
  setMaxPrice: (value: number | undefined) => void;
  stockValue: number | undefined;
  setStockValue: (value: number | undefined) => void;
  stockOperator: '' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  setStockOperator: (value: '' | 'gt' | 'gte' | 'lt' | 'lte' | 'eq') => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  advancedFilter: string;
  activeAdvancedFilterPresetId: string | null;
  setAdvancedFilter: (value: string) => void;
  setAdvancedFilterState: (value: string, presetId: string | null) => void;
  baseExported: '' | 'true' | 'false';
  setBaseExported: (value: '' | 'true' | 'false') => void;
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
  data: ProductWithImages[];
  rowSelection: RowSelectionState;
  setRowSelection: OnChangeFn<RowSelectionState>;
  handleProductsTableRender: ProfilerOnRenderCallback;
  tableColumns: ColumnDef<ProductWithImages>[];
  getRowClassName?: ((row: Row<ProductWithImages>) => string | undefined) | undefined;
  getRowId: (row: ProductWithImages) => string;
  isLoading: boolean;
  skeletonRows: ReactNode;
  maxHeight?: string | number | undefined;
  stickyHeader?: boolean | undefined;
}

export interface ProductListAlertsContextType {
  loadError: string | null;
  actionError: string | null;
  onDismissActionError: () => void;
}

export interface ProductListActionsContextType {
  onCreateProduct: () => void;
  onCreateFromDraft: (draftId: string) => void;
  activeDrafts: ProductDraft[];
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>;
  productNameKey: 'name_en' | 'name_pl' | 'name_de';
  priceGroups: PriceGroupWithDetails[];
  currencyCode: string;
  onPrefetchProductDetail: (productId: string) => void;
  onProductNameClick: (row: ProductWithImages) => void;
  onProductEditClick: (row: ProductWithImages) => void;
  onProductDeleteClick: (row: ProductWithImages) => void;
  onDuplicateProduct: (row: ProductWithImages) => void;
  onIntegrationsClick: (row: ProductWithImages) => void;
  onExportSettingsClick: (row: ProductWithImages) => void;
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  traderaBadgeIds: Set<string>;
  traderaBadgeStatuses: Map<string, string>;
  queuedProductIds: Set<string>;
  categoryNameById: ReadonlyMap<string, string>;
  thumbnailSource: 'file' | 'link' | 'base64';
  imageExternalBaseUrl: string | null;
}

export interface ProductListHeaderActionsContextType {
  onCreateProduct: () => void;
  onCreateFromDraft: (draftId: string) => void;
  activeDrafts: ProductDraft[];
}

export interface ProductListRowActionsContextType {
  onPrefetchProductDetail: (productId: string) => void;
  onProductNameClick: (row: ProductWithImages) => void;
  onProductEditClick: (row: ProductWithImages) => void;
  onProductDeleteClick: (row: ProductWithImages) => void;
  onDuplicateProduct: (row: ProductWithImages) => void;
  onIntegrationsClick: (row: ProductWithImages) => void;
  onExportSettingsClick: (row: ProductWithImages) => void;
}

export interface ProductListRowVisualsContextType {
  productNameKey: 'name_en' | 'name_pl' | 'name_de';
  priceGroups: PriceGroupWithDetails[];
  currencyCode: string;
  integrationBadgeIds: Set<string>;
  integrationBadgeStatuses: Map<string, string>;
  traderaBadgeIds: Set<string>;
  traderaBadgeStatuses: Map<string, string>;
  queuedProductIds: Set<string>;
  categoryNameById: ReadonlyMap<string, string>;
  thumbnailSource: 'file' | 'link' | 'base64';
  imageExternalBaseUrl: string | null;
}

export interface ProductListModalsContextType {
  isCreateOpen: boolean;
  isPromptOpen: boolean;
  setIsPromptOpen: (open: boolean) => void;
  handleConfirmSku: (sku: string) => Promise<void>;
  initialSku: string;
  createDraft: ProductDraft | null;
  initialCatalogId: string | null;
  onCloseCreate: () => void;
  onCreateSuccess: (info?: { queued?: boolean }) => void;
  editingProduct: ProductWithImages | null;
  isEditHydrating: boolean;
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
  showIntegrationModal: boolean;
  onCloseIntegrationModal: () => void;
  onSelectIntegrationFromModal: (integrationId: string, connectionId: string) => void;
}
