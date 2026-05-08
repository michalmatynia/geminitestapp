import type { ChangeEvent, RefObject } from 'react';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';

import type {
  ProductBatchEditRequest,
  ProductBatchEditResponse,
} from '@/shared/contracts/products/batch-edit';
import type { ProductSyncBulkResponse } from '@/shared/contracts/product-sync';
import type {
  ProductAdvancedFilterGroup,
  ProductAdvancedFilterPreset,
} from '@/shared/contracts/products/filters';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductScrapeProfileRuntimeRunController } from './useProductScrapeProfileRuntimeRun';

export type ProductSelectionPresetDialogMode = 'create' | 'edit';
export type ProductSelectionToast = (
  message: string,
  options?: { variant?: 'default' | 'success' | 'error' | 'warning' }
) => void;

export interface ProductSelectionBaseController {
  clearSelection: () => void;
  data: ProductWithImages[];
  getRowId: (product: ProductWithImages) => string;
  handleDeselectPage: () => void;
  handleSelectPage: () => void;
  loadingGlobal: boolean;
  onAddToMarketplace: () => void;
  onDeleteSelected: () => Promise<void>;
  onSelectAllGlobal: () => Promise<void>;
  rowSelection: RowSelectionState;
  selectedCount: number;
  setRowSelection: OnChangeFn<RowSelectionState>;
}

export interface ProductSelectionDialogController {
  batchEditProductIds: string[];
  bulkSyncResultProducts: ProductWithImages[];
  bulkSyncResults: ProductSyncBulkResponse | null;
  bulkSyncSetupProductIds: string[];
  bulkSyncSetupProducts: ProductWithImages[];
  closeBatchEdit: () => void;
  closeBulkSyncResults: () => void;
  closeBulkSyncSetup: () => void;
  closeMarketplaceCopyDebrand: () => void;
  closeParseActions: () => void;
  closeProductScan: () => void;
  closeScrapeProfiles: () => void;
  closeTraderaStatusCheck: () => void;
  isBatchEditOpen: boolean;
  isBulkSyncResultsOpen: boolean;
  isBulkSyncSetupOpen: boolean;
  isMarketplaceCopyDebrandOpen: boolean;
  isParseActionsOpen: boolean;
  isProductScanOpen: boolean;
  isScrapeProfilesOpen: boolean;
  isTraderaStatusCheckOpen: boolean;
  marketplaceCopyDebrandProductIds: string[];
  openBatchEdit: (productIds: string[]) => void;
  openBulkSyncSetup: (productIds: string[], products: ProductWithImages[]) => void;
  openMarketplaceCopyDebrand: (productIds: string[]) => void;
  openParseActions: () => void;
  openProductScan: (productIds: string[], products: ProductWithImages[]) => void;
  openScrapeProfiles: () => void;
  openTraderaStatusCheck: (productIds: string[], products: ProductWithImages[]) => void;
  productScanProductIds: string[];
  productScanProducts: ProductWithImages[];
  setBulkSyncResultsView: (
    response: ProductSyncBulkResponse,
    products: ProductWithImages[]
  ) => void;
  statusCheckProductIds: string[];
  statusCheckProducts: ProductWithImages[];
}

export interface ProductSelectionBulkController {
  handleBatchEditApplied: (response: ProductBatchEditResponse) => void;
  handleBulkBaseSync: () => void;
  handleCheckTraderaStatus: () => void;
  handleClearParsedMatches: () => void;
  handleConvertSelected: () => Promise<void>;
  handleFindParsedMatches: (
    productIds: string[],
    meta?: { matchedRowCount?: number }
  ) => void;
  handleOpenBatchEdit: () => void;
  handleOpenMarketplaceCopyDebrand: () => void;
  handleQuickExportTradera: () => Promise<void>;
  handleQuickExportVinted: () => Promise<void>;
  handleScanAmazonAsin: () => void;
  handleSetArchivedSelected: (archived: boolean) => Promise<void>;
  handleStartBulkBaseSync: (profileId: string) => Promise<void>;
  handleSubmitBatchEdit: (
    request: ProductBatchEditRequest
  ) => Promise<ProductBatchEditResponse>;
  handleSubmitMarketplaceCopyDebrand: (integrationId: string) => Promise<void>;
  isBatchEditingProductFields: boolean;
  isConvertingSelected: boolean;
  isQueueingMarketplaceCopyDebrandBatch: boolean;
  isRunningBulkBaseSync: boolean;
  isSettingSelectedArchivedState: boolean;
  isTraderaMassExportRunning: boolean;
  isVintedMassExportRunning: boolean;
}

export interface ProductSelectionPresetController {
  activeAdvancedFilterPresetId: string | null;
  activePreset: ProductAdvancedFilterPreset | null;
  advancedFilterPresets: ProductAdvancedFilterPreset[];
  closeImportDialog: () => void;
  closePresetDialog: () => void;
  currentAdvancedFilterGroup: ProductAdvancedFilterGroup | null;
  handleApplyPreset: (preset: ProductAdvancedFilterPreset) => void;
  handleCopyAllPresets: () => Promise<void>;
  handleCopyPreset: (preset: ProductAdvancedFilterPreset) => Promise<void>;
  handleDeletePreset: (preset: ProductAdvancedFilterPreset) => Promise<void>;
  handleExportAllPresets: () => void;
  handleExportSinglePreset: (preset: ProductAdvancedFilterPreset) => void;
  handleImportFromDialog: (value: string) => Promise<void>;
  handleImportFromFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSavePresetDialog: () => Promise<void>;
  importFileInputRef: RefObject<HTMLInputElement | null>;
  importingPresets: boolean;
  isImportDialogOpen: boolean;
  isPresetDialogOpen: boolean;
  openCreatePresetDialog: () => void;
  openEditPresetDialog: (preset: ProductAdvancedFilterPreset) => void;
  presetDialogMode: ProductSelectionPresetDialogMode;
  presetDialogSubmitLabel: string;
  presetFilterDraft: ProductAdvancedFilterGroup | null;
  presetName: string;
  savingPreset: boolean;
  setAdvancedFilterState: (value: string, presetId: string | null) => void;
  setImportDialogOpen: (isOpen: boolean) => void;
  setPresetFilterDraft: (filter: ProductAdvancedFilterGroup | null) => void;
  setPresetName: (name: string) => void;
}

export interface ProductSelectionActionsController {
  bulk: ProductSelectionBulkController;
  dialogs: ProductSelectionDialogController;
  includeArchived: boolean;
  parsedMatchProductIds: string[];
  presets: ProductSelectionPresetController;
  scrapeProfilesRuntime: ProductScrapeProfileRuntimeRunController;
  selection: ProductSelectionBaseController;
}
