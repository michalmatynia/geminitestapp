'use client';

import {
  Archive,
  Copy,
  Download,
  FileUp,
  Image as ImageIcon,
  Search,
  Pencil,
  Save,
  Send,
  SlidersHorizontal,
  Store,
  Trash2,
  Upload,
  X,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react';

import {
  AdvancedFilterBuilder,
  findPresetById,
  parseAdvancedFilterPayload,
} from '@/features/products/components/list/advanced-filter';
import {
  useProductListFiltersContext,
  useProductListSelectionContext,
} from '@/features/products/context/ProductListContext';
import { TraderaStatusCheckModal } from '@/features/integrations/product-integrations-adapter';
import {
  useBulkSetProductsArchivedState,
  useBulkConvertImagesToBase64,
  useBulkEditProductFields,
} from '@/features/products/hooks/useProductsMutations';
import { useBulkProductBaseSyncMutation } from '@/features/product-sync/hooks/useProductBaseSync';
import { useTraderaMassQuickExport } from '@/features/products/hooks/product-list/useTraderaMassQuickExport';
import { useVintedMassQuickExport } from '@/features/products/hooks/product-list/useVintedMassQuickExport';
import { ProductScanModal } from '@/features/products/components/list/ProductScanModal';
import { ProductBatchEditModal } from '@/features/products/components/list/ProductBatchEditModal';
import { ProductBulkSyncResultsModal } from '@/features/products/components/list/ProductBulkSyncResultsModal';
import { ProductBulkSyncSetupModal } from '@/features/products/components/list/ProductBulkSyncSetupModal';
import type {
  ProductBatchEditRequest,
  ProductBatchEditResponse,
} from '@/shared/contracts/products/batch-edit';
import type { ProductSyncBulkResponse } from '@/shared/contracts/product-sync';
import {
  productAdvancedFilterGroupSchema,
  type ProductAdvancedFilterGroup,
  type ProductAdvancedFilterPreset,
} from '@/shared/contracts/products/filters';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ActionMenu } from '@/shared/ui/ActionMenu';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { SelectionBar } from '@/shared/ui/selection-bar';
import { JSONImportModal } from '@/shared/ui/templates/modals/JSONImportModal';
import { useToast } from '@/shared/ui/toast';

import {
  buildPresetBundle,
  createAdvancedPreset,
  downloadJsonFile,
  hasPresetNameConflict,
  mapImportedPresets,
  normalizePresetName,
  parsePresetImportPayload,
  slugifyPresetFilename,
  writeToClipboard,
} from './product-filters-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const ProductSelectionActions = memo(() => {
  const {
    data,
    rowSelection,
    setRowSelection,
    onSelectAllGlobal,
    loadingGlobal,
    onDeleteSelected,
    onAddToMarketplace,
  } = useProductListSelectionContext();
  const {
    advancedFilter,
    activeAdvancedFilterPresetId,
    advancedFilterPresets,
    includeArchived,
    setAdvancedFilterPresets,
    setAdvancedFilterState,
  } = useProductListFiltersContext();
  const { toast } = useToast();
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [presetDialogMode, setPresetDialogMode] = useState<'create' | 'edit'>('create');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetFilterDraft, setPresetFilterDraft] = useState<ProductAdvancedFilterGroup | null>(
    null
  );
  const [savingPreset, setSavingPreset] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importingPresets, setImportingPresets] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: convertSelectedToBase64, isPending: isConvertingSelected } =
    useBulkConvertImagesToBase64();
  const { mutateAsync: setSelectedProductsArchivedState, isPending: isSettingSelectedArchivedState } =
    useBulkSetProductsArchivedState();
  const { mutateAsync: batchEditProductFields, isPending: isBatchEditingProductFields } =
    useBulkEditProductFields();
  const { mutateAsync: runBulkBaseSync, isPending: isRunningBulkBaseSync } =
    useBulkProductBaseSyncMutation();
  const { execute: executeTraderaMassExport, isRunning: isTraderaMassExportRunning } =
    useTraderaMassQuickExport();
  const { execute: executeVintedMassExport, isRunning: isVintedMassExportRunning } =
    useVintedMassQuickExport();
  const [isTraderaStatusCheckOpen, setIsTraderaStatusCheckOpen] = useState(false);
  const [statusCheckProductIds, setStatusCheckProductIds] = useState<string[]>([]);
  const [isProductScanOpen, setIsProductScanOpen] = useState(false);
  const [productScanProductIds, setProductScanProductIds] = useState<string[]>([]);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [batchEditProductIds, setBatchEditProductIds] = useState<string[]>([]);
  const [bulkSyncResults, setBulkSyncResults] = useState<ProductSyncBulkResponse | null>(null);
  const [bulkSyncResultProducts, setBulkSyncResultProducts] = useState<typeof data>([]);
  const [isBulkSyncResultsOpen, setIsBulkSyncResultsOpen] = useState(false);
  const [isBulkSyncSetupOpen, setIsBulkSyncSetupOpen] = useState(false);
  const [bulkSyncSetupProductIds, setBulkSyncSetupProductIds] = useState<string[]>([]);
  const [bulkSyncSetupProducts, setBulkSyncSetupProducts] = useState<typeof data>([]);
  const currentAdvancedFilterGroup = useMemo(
    () => parseAdvancedFilterPayload(advancedFilter),
    [advancedFilter]
  );
  const activePreset = useMemo(() => {
    if (!activeAdvancedFilterPresetId) return null;
    return findPresetById(advancedFilterPresets, activeAdvancedFilterPresetId);
  }, [activeAdvancedFilterPresetId, advancedFilterPresets]);
  const presetDialogSubmitLabel = useMemo(() => {
    if (savingPreset) return 'Saving...';
    if (presetDialogMode === 'edit') return 'Update Preset';
    return 'Save Preset';
  }, [presetDialogMode, savingPreset]);

  const getRowId = useCallback((p: ProductWithImages) => p.id, []);
  const handleConvertSelected = useCallback(async (): Promise<void> => {
    const selectedProductIds = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);
    if (selectedProductIds.length === 0) {
      toast('Please select products to convert.', { variant: 'error' });
      return;
    }

    try {
      await convertSelectedToBase64(selectedProductIds);
      toast('Base64 images generated for selected products.', { variant: 'success' });
      setRowSelection({});
    } catch (error) {
      logClientError(error);
      toast(
        error instanceof Error ? error.message : 'An error occurred during base64 conversion.',
        {
          variant: 'error',
        }
      );
    }
  }, [convertSelectedToBase64, rowSelection, setRowSelection, toast]);

  const handleQuickExportTradera = useCallback(async (): Promise<void> => {
    const selectedProductIds = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);
    if (selectedProductIds.length === 0) {
      toast('Please select products to export.', { variant: 'error' });
      return;
    }
    await executeTraderaMassExport(selectedProductIds);
  }, [executeTraderaMassExport, rowSelection, toast]);

  const handleQuickExportVinted = useCallback(async (): Promise<void> => {
    const selectedProductIds = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);
    if (selectedProductIds.length === 0) {
      toast('Please select products to export.', { variant: 'error' });
      return;
    }
    await executeVintedMassExport(selectedProductIds);
  }, [executeVintedMassExport, rowSelection, toast]);

  const handleSetArchivedSelected = useCallback(async (archived: boolean): Promise<void> => {
    const selectedProductIds = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);
    if (selectedProductIds.length === 0) {
      toast(`Please select products to ${archived ? 'archive' : 'unarchive'}.`, {
        variant: 'error',
      });
      return;
    }

    try {
      const result = await setSelectedProductsArchivedState({
        productIds: selectedProductIds,
        archived,
      });
      toast(
        archived
          ? `Archived ${result.updated} product${result.updated === 1 ? '' : 's'}.`
          : `Removed ${result.updated} product${result.updated === 1 ? '' : 's'} from archive.`,
        {
          variant: 'success',
        }
      );
      setRowSelection({});
    } catch (error) {
      logClientError(error);
      toast(
        error instanceof Error
          ? error.message
          : archived
            ? 'Failed to archive selected products.'
            : 'Failed to remove selected products from archive.',
        {
          variant: 'error',
        }
      );
    }
  }, [rowSelection, setRowSelection, setSelectedProductsArchivedState, toast]);

  const [statusCheckProducts, setStatusCheckProducts] = useState<typeof data>([]);
  const [productScanProducts, setProductScanProducts] = useState<typeof data>([]);

  const handleCheckTraderaStatus = useCallback((): void => {
    const selectedProductIds = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);
    if (selectedProductIds.length === 0) {
      toast('Please select products to check.', { variant: 'error' });
      return;
    }
    // Snapshot selected products at open time so re-fetches of the list don't affect the modal.
    const selectedSet = new Set(selectedProductIds);
    setStatusCheckProductIds(selectedProductIds);
    setStatusCheckProducts(data.filter((p) => selectedSet.has(p.id)));
    setIsTraderaStatusCheckOpen(true);
  }, [data, rowSelection, toast]);

  const handleBulkBaseSync = useCallback((): void => {
    const selectedProductIds = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);
    if (selectedProductIds.length === 0) {
      toast('Please select products to sync.', { variant: 'error' });
      return;
    }

    const selectedSet = new Set(selectedProductIds);
    const snapshotProducts = data.filter((product) => selectedSet.has(product.id));
    setBulkSyncSetupProductIds(selectedProductIds);
    setBulkSyncSetupProducts(snapshotProducts);
    setIsBulkSyncSetupOpen(true);
  }, [data, rowSelection, toast]);

  const handleStartBulkBaseSync = useCallback(
    async (profileId: string): Promise<void> => {
      if (bulkSyncSetupProductIds.length === 0) return;
      try {
        const response = await runBulkBaseSync({
          productIds: bulkSyncSetupProductIds,
          profileId,
        });
        setBulkSyncResults(response);
        setBulkSyncResultProducts(bulkSyncSetupProducts);
        setIsBulkSyncSetupOpen(false);
        setIsBulkSyncResultsOpen(true);
        setRowSelection({});
      } catch (error) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to sync products with Base.com.', {
          variant: 'error',
        });
      }
    },
    [bulkSyncSetupProductIds, bulkSyncSetupProducts, runBulkBaseSync, setRowSelection, toast]
  );

  const handleScanAmazonAsin = useCallback((): void => {
    const selectedProductIds = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);
    if (selectedProductIds.length === 0) {
      toast('Please select products to scan.', { variant: 'error' });
      return;
    }

    const selectedSet = new Set(selectedProductIds);
    setProductScanProductIds(selectedProductIds);
    setProductScanProducts(data.filter((product) => selectedSet.has(product.id)));
    setIsProductScanOpen(true);
  }, [data, rowSelection, toast]);

  const handleOpenBatchEdit = useCallback((): void => {
    const selectedProductIds = Object.keys(rowSelection).filter((id: string) => rowSelection[id]);
    if (selectedProductIds.length === 0) {
      toast('Please select products to edit.', { variant: 'error' });
      return;
    }
    setBatchEditProductIds(selectedProductIds);
    setIsBatchEditOpen(true);
  }, [rowSelection, toast]);

  const handleSubmitBatchEdit = useCallback(
    async (request: ProductBatchEditRequest): Promise<ProductBatchEditResponse> =>
      batchEditProductFields(request),
    [batchEditProductFields]
  );

  const handleBatchEditApplied = useCallback(
    (response: ProductBatchEditResponse): void => {
      if (response.failed === 0) {
        setRowSelection({});
        setIsBatchEditOpen(false);
      }
    },
    [setRowSelection]
  );

  const selectedCount = useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]).length,
    [rowSelection]
  );

  const handleSelectPage = useCallback(() => {
    const newSelection = { ...rowSelection };
    data.forEach((item) => {
      newSelection[item.id] = true;
    });
    setRowSelection(newSelection);
  }, [data, rowSelection, setRowSelection]);

  const handleDeselectPage = useCallback(() => {
    const newSelection = { ...rowSelection };
    data.forEach((item) => {
      delete newSelection[item.id];
    });
    setRowSelection(newSelection);
  }, [data, rowSelection, setRowSelection]);

  const closePresetDialog = (): void => {
    setIsPresetDialogOpen(false);
    setEditingPresetId(null);
    setPresetName('');
    setPresetFilterDraft(null);
    setSavingPreset(false);
  };

  const openCreatePresetDialog = (): void => {
    if (!currentAdvancedFilterGroup) {
      toast('Apply an advanced filter before saving a preset.', { variant: 'error' });
      return;
    }
    setPresetDialogMode('create');
    setEditingPresetId(null);
    setPresetName('');
    setPresetFilterDraft(null);
    setIsPresetDialogOpen(true);
  };

  const openEditPresetDialog = (preset: ProductAdvancedFilterPreset): void => {
    setPresetDialogMode('edit');
    setEditingPresetId(preset.id);
    setPresetName(preset.name);
    setPresetFilterDraft(
      JSON.parse(JSON.stringify(preset.filter)) as ProductAdvancedFilterGroup
    );
    setIsPresetDialogOpen(true);
  };

  const applyPreset = useCallback(
    (preset: ProductAdvancedFilterPreset, notify = true): void => {
      setAdvancedFilterState(JSON.stringify(preset.filter), preset.id);
      if (notify) {
        toast(`Applied preset "${preset.name}".`, { variant: 'success' });
      }
    },
    [setAdvancedFilterState, toast]
  );

  const handleApplyPreset = useCallback(
    (preset: ProductAdvancedFilterPreset): void => {
      applyPreset(preset, true);
    },
    [applyPreset]
  );

  const handleDeletePreset = useCallback(
    async (preset: ProductAdvancedFilterPreset): Promise<void> => {
      try {
        const nextPresets = advancedFilterPresets.filter(
          (entry: ProductAdvancedFilterPreset) => entry.id !== preset.id
        );
        await setAdvancedFilterPresets(nextPresets);
        if (activeAdvancedFilterPresetId === preset.id) {
          setAdvancedFilterState('', null);
        }
        toast(`Deleted preset "${preset.name}".`, { variant: 'success' });
      } catch (error) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to delete preset.', {
          variant: 'error',
        });
      }
    },
    [
      activeAdvancedFilterPresetId,
      advancedFilterPresets,
      setAdvancedFilterPresets,
      setAdvancedFilterState,
      toast,
    ]
  );

  const closeImportDialog = (): void => {
    setIsImportDialogOpen(false);
    setImportingPresets(false);
  };

  const importPresets = useCallback(
    async (payload: unknown): Promise<void> => {
      const parsedPresets = parsePresetImportPayload(payload);
      if (!parsedPresets || parsedPresets.length === 0) {
        throw new Error(
          'Invalid preset payload. Provide a preset object, preset list, or bundle JSON.'
        );
      }

      const mergedImportedPresets = mapImportedPresets(advancedFilterPresets, parsedPresets);
      const nextPresets = [...advancedFilterPresets, ...mergedImportedPresets];
      await setAdvancedFilterPresets(nextPresets);
      toast(`Imported ${mergedImportedPresets.length} preset(s).`, { variant: 'success' });
    },
    [advancedFilterPresets, setAdvancedFilterPresets, toast]
  );

  const handleExportAllPresets = (): void => {
    if (advancedFilterPresets.length === 0) {
      toast('No presets to export.', { variant: 'error' });
      return;
    }
    downloadJsonFile(
      'advanced-filter-presets.bundle.json',
      buildPresetBundle(advancedFilterPresets)
    );
  };

  const handleExportSinglePreset = (preset: ProductAdvancedFilterPreset): void => {
    downloadJsonFile(`advanced-filter-preset-${slugifyPresetFilename(preset.name)}.json`, preset);
  };

  const handleCopyAllPresets = useCallback(async (): Promise<void> => {
    if (advancedFilterPresets.length === 0) {
      toast('No presets to copy.', { variant: 'error' });
      return;
    }
    try {
      await writeToClipboard(JSON.stringify(buildPresetBundle(advancedFilterPresets), null, 2));
      toast('Copied all presets JSON to clipboard.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to copy presets JSON.', {
        variant: 'error',
      });
    }
  }, [advancedFilterPresets, toast]);

  const handleCopyPreset = useCallback(
    async (preset: ProductAdvancedFilterPreset): Promise<void> => {
      try {
        await writeToClipboard(JSON.stringify(preset, null, 2));
        toast(`Copied preset "${preset.name}" JSON to clipboard.`, { variant: 'success' });
      } catch (error) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to copy preset JSON.', {
          variant: 'error',
        });
      }
    },
    [toast]
  );

  const handleImportFromDialog = async (value: string): Promise<void> => {
    if (!value.trim()) {
      toast('Paste JSON to import.', { variant: 'error' });
      return;
    }

    try {
      setImportingPresets(true);
      const parsedPayload: unknown = JSON.parse(value);
      await importPresets(parsedPayload);
      closeImportDialog();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to import presets.', {
        variant: 'error',
      });
    } finally {
      setImportingPresets(false);
    }
  };

  const handleImportFromFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        const parsedPayload: unknown = JSON.parse(content);
        await importPresets(parsedPayload);
      } catch (error) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to import presets from file.', {
          variant: 'error',
        });
      } finally {
        if (event.target) event.target.value = '';
      }
    },
    [importPresets]
  );

  const handleSavePresetDialog = async (): Promise<void> => {
    const trimmedName = normalizePresetName(presetName);
    if (!trimmedName) {
      toast('Preset name is required.', { variant: 'error' });
      return;
    }

    try {
      setSavingPreset(true);
      if (presetDialogMode === 'create') {
        if (!currentAdvancedFilterGroup) {
          toast('Current advanced filter is invalid.', { variant: 'error' });
          return;
        }
        if (hasPresetNameConflict(advancedFilterPresets, trimmedName)) {
          toast('Preset name already exists. Choose a unique name.', {
            variant: 'error',
          });
          return;
        }
        const preset = createAdvancedPreset(trimmedName, currentAdvancedFilterGroup);
        await setAdvancedFilterPresets([...advancedFilterPresets, preset]);
        toast(`Saved preset "${trimmedName}".`, { variant: 'success' });
      } else {
        if (editingPresetId === null || editingPresetId.trim().length === 0) {
          toast('Preset to edit was not found.', { variant: 'error' });
          return;
        }
        const editingPreset = findPresetById(advancedFilterPresets, editingPresetId);
        if (editingPreset === null) {
          toast('Preset to edit was not found.', { variant: 'error' });
          return;
        }
        if (presetFilterDraft === null) {
          toast('Preset filter is required.', { variant: 'error' });
          return;
        }
        if (hasPresetNameConflict(advancedFilterPresets, trimmedName, editingPresetId)) {
          toast('Preset name already exists. Choose a unique name.', {
            variant: 'error',
          });
          return;
        }
        const parsedFilter = productAdvancedFilterGroupSchema.safeParse(presetFilterDraft);
        if (!parsedFilter.success) {
          toast(
            parsedFilter.error.issues[0]?.message ?? 'Preset filter has invalid rules.',
            { variant: 'error' }
          );
          return;
        }
        const now = new Date().toISOString();
        const nextPresets = advancedFilterPresets.map((preset: ProductAdvancedFilterPreset) =>
          preset.id === editingPresetId
            ? { ...preset, name: trimmedName, filter: parsedFilter.data, updatedAt: now }
            : preset
        );
        await setAdvancedFilterPresets(nextPresets);
        if (activeAdvancedFilterPresetId === editingPresetId) {
          setAdvancedFilterState(JSON.stringify(parsedFilter.data), editingPresetId);
        }
        toast(`Updated preset "${trimmedName}".`, { variant: 'success' });
      }

      closePresetDialog();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save preset.', {
        variant: 'error',
      });
    } finally {
      setSavingPreset(false);
    }
  };

  return (
    <>
      <SelectionBar
        data={data}
        getRowId={getRowId}
        selectedCount={selectedCount}
        onSelectPage={handleSelectPage}
        onDeselectPage={handleDeselectPage}
        onDeselectAll={() => setRowSelection({})}
        onSelectAllGlobal={onSelectAllGlobal}
        loadingGlobal={loadingGlobal}
        onDeleteSelected={onDeleteSelected}
        className='border-t pt-3'
        label='Products'
        actions={
          <>
            <DropdownMenuItem
              onClick={() => {
                if (onAddToMarketplace) onAddToMarketplace();
              }}
              className='cursor-pointer gap-2'
            >
              <Store className='h-4 w-4' />
              Add to Marketplace
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void handleSetArchivedSelected(true);
              }}
              className='cursor-pointer gap-2'
              disabled={isSettingSelectedArchivedState || selectedCount === 0}
            >
              <Archive className='h-4 w-4' />
              {isSettingSelectedArchivedState ? 'Updating archive state...' : 'Send to Archive'}
            </DropdownMenuItem>
            {includeArchived ? (
              <DropdownMenuItem
                onClick={() => {
                  void handleSetArchivedSelected(false);
                }}
                className='cursor-pointer gap-2'
                disabled={isSettingSelectedArchivedState || selectedCount === 0}
              >
                <Archive className='h-4 w-4' />
                {isSettingSelectedArchivedState ? 'Updating archive state...' : 'Remove from Archive'}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={() => {
                void handleQuickExportTradera();
              }}
              className='cursor-pointer gap-2'
              disabled={isTraderaMassExportRunning || selectedCount === 0}
            >
              <Send className='h-4 w-4' />
              {isTraderaMassExportRunning ? 'Exporting to Tradera...' : 'Quick Export to Tradera'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void handleQuickExportVinted();
              }}
              className='cursor-pointer gap-2'
              disabled={isVintedMassExportRunning || selectedCount === 0}
            >
              <Send className='h-4 w-4' />
              {isVintedMassExportRunning ? 'Exporting to Vinted...' : 'Quick Export to Vinted'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCheckTraderaStatus}
              className='cursor-pointer gap-2'
              disabled={selectedCount === 0}
            >
              <Activity className='h-4 w-4' />
              Check Tradera Listing Status
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleScanAmazonAsin}
              className='cursor-pointer gap-2'
              disabled={selectedCount === 0}
            >
              <Search className='h-4 w-4' />
              Scan Amazon ASIN
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleOpenBatchEdit}
              className='cursor-pointer gap-2'
              disabled={isBatchEditingProductFields || selectedCount === 0}
            >
              <Pencil className='h-4 w-4' />
              {isBatchEditingProductFields ? 'Editing product fields...' : 'Edit Product Fields'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void handleBulkBaseSync();
              }}
              className='cursor-pointer gap-2'
              disabled={isRunningBulkBaseSync || selectedCount === 0}
            >
              <RefreshCw className='h-4 w-4' />
              {isRunningBulkBaseSync ? 'Syncing with Base.com...' : 'Sync with Base.com'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                void handleConvertSelected();
              }}
              className='cursor-pointer gap-2'
              disabled={isConvertingSelected}
            >
              <ImageIcon className='h-4 w-4' />
              {isConvertingSelected ? 'Converting selected...' : 'Convert selected products'}
            </DropdownMenuItem>
          </>
        }
        rightActions={
          <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto'>
            {activePreset ? (
              <Chip
                label={activePreset.name}
                active
                onClick={() => setAdvancedFilterState('', null)}
                icon={X}
                className='h-8 max-w-[240px] w-full sm:w-auto'
              />
            ) : null}
            <ActionMenu
              triggerId='product-filter-presets-menu'
              align='end'
              className='w-80 max-w-[calc(100vw-2rem)]'
              trigger={
                <div className='flex items-center gap-2'>
                  <SlidersHorizontal className='h-3.5 w-3.5' />
                  <span className='text-xs font-medium'>Filter Presets</span>
                </div>
              }
              triggerClassName='h-8 w-full px-3 border border-border/60 bg-card/30 hover:bg-card/50 text-gray-300 hover:text-white sm:w-auto'
              variant='outline'
              size='sm'
            >
              <DropdownMenuLabel>Advanced Filter Presets</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={openCreatePresetDialog}
                disabled={!currentAdvancedFilterGroup}
                className='cursor-pointer gap-2'
              >
                <Save className='h-4 w-4' />
                Save Current Filter
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportAllPresets}
                disabled={advancedFilterPresets.length === 0}
                className='cursor-pointer gap-2'
              >
                <Download className='h-4 w-4' />
                Export All Presets
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void handleCopyAllPresets();
                }}
                disabled={advancedFilterPresets.length === 0}
                className='cursor-pointer gap-2'
              >
                <Copy className='h-4 w-4' />
                Copy All Presets JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsImportDialogOpen(true)}
                className='cursor-pointer gap-2'
              >
                <Upload className='h-4 w-4' />
                Import From Pasted JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => importFileInputRef.current?.click()}
                className='cursor-pointer gap-2'
              >
                <FileUp className='h-4 w-4' />
                Import From File
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {advancedFilterPresets.length === 0 ? (
                <DropdownMenuItem disabled>No presets saved</DropdownMenuItem>
              ) : (
                advancedFilterPresets.map((preset: ProductAdvancedFilterPreset) => (
                  <div
                    key={preset.id}
                    role='group'
                    aria-label={`Preset ${preset.name}`}
                    className='flex items-center gap-1 rounded-sm px-1 py-0.5'
                  >
                    <DropdownMenuItem
                      onClick={() => handleApplyPreset(preset)}
                      className='min-w-0 flex-1 cursor-pointer gap-2 px-2'
                      title={`Apply preset ${preset.name}`}
                    >
                      <span className='truncate'>{preset.name}</span>
                      {activeAdvancedFilterPresetId === preset.id ? (
                        <span className='ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary'>
                          Applied
                        </span>
                      ) : null}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      aria-label={`Export preset ${preset.name}`}
                      title='Export JSON'
                      onClick={() => handleExportSinglePreset(preset)}
                      className='h-8 w-8 cursor-pointer justify-center p-0'
                    >
                      <Download className='h-3.5 w-3.5' aria-hidden='true' />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      aria-label={`Copy preset ${preset.name}`}
                      title='Copy JSON'
                      onClick={() => {
                        void handleCopyPreset(preset);
                      }}
                      className='h-8 w-8 cursor-pointer justify-center p-0'
                    >
                      <Copy className='h-3.5 w-3.5' aria-hidden='true' />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      aria-label={`Edit preset ${preset.name}`}
                      title='Edit preset'
                      onClick={() => openEditPresetDialog(preset)}
                      className='h-8 w-8 cursor-pointer justify-center p-0'
                    >
                      <Pencil className='h-3.5 w-3.5' aria-hidden='true' />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      aria-label={`Delete preset ${preset.name}`}
                      title='Delete preset'
                      onClick={() => {
                        void handleDeletePreset(preset);
                      }}
                      className='h-8 w-8 cursor-pointer justify-center p-0 text-destructive focus:bg-destructive/10 focus:text-destructive'
                    >
                      <Trash2 className='h-3.5 w-3.5' aria-hidden='true' />
                    </DropdownMenuItem>
                  </div>
                ))
              )}
            </ActionMenu>
          </div>
        }
      />

      <AppModal
        isOpen={isPresetDialogOpen}
        onClose={closePresetDialog}
        title={presetDialogMode === 'edit' ? 'Edit Filter Preset' : 'Save Filter Preset'}
        subtitle={
          presetDialogMode === 'edit'
            ? 'Update the preset name and advanced filter rules.'
            : 'Presets store advanced filter sequences.'
        }
        size={presetDialogMode === 'edit' ? 'xl' : 'sm'}
        footer={
          <>
            <Button type='button' variant='outline' onClick={closePresetDialog}>
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => {
                void handleSavePresetDialog();
              }}
              disabled={savingPreset}
            >
              {presetDialogSubmitLabel}
            </Button>
          </>
        }
      >
        <div className='space-y-4'>
          <Input
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder='Preset name'
            aria-label='Preset name'
            className='h-8'
            title='Preset name'
          />
          {presetDialogMode === 'edit' && presetFilterDraft ? (
            <AdvancedFilterBuilder
              group={presetFilterDraft}
              onChange={setPresetFilterDraft}
            />
          ) : null}
        </div>
      </AppModal>

      <JSONImportModal
        isOpen={isImportDialogOpen}
        onClose={closeImportDialog}
        title='Import Filter Presets'
        subtitle='Paste preset JSON or a preset bundle to merge into your saved presets.'
        onImport={handleImportFromDialog}
        isLoading={importingPresets}
        confirmText='Import Presets'
        placeholder='Paste preset JSON here...'
      />

      <input
        ref={importFileInputRef}
        type='file'
        accept='application/json,.json'
        className='hidden'
        aria-label='Import presets file'
        onChange={(event) => {
          void handleImportFromFile(event);
        }}
      />

      <TraderaStatusCheckModal
        isOpen={isTraderaStatusCheckOpen}
        onClose={() => setIsTraderaStatusCheckOpen(false)}
        productIds={statusCheckProductIds}
        products={statusCheckProducts}
      />
      <ProductScanModal
        isOpen={isProductScanOpen}
        onClose={() => setIsProductScanOpen(false)}
        productIds={productScanProductIds}
        products={productScanProducts}
      />
      <ProductBatchEditModal
        isOpen={isBatchEditOpen}
        onClose={() => {
          if (isBatchEditingProductFields) return;
          setIsBatchEditOpen(false);
        }}
        productIds={batchEditProductIds}
        isSubmitting={isBatchEditingProductFields}
        onSubmit={handleSubmitBatchEdit}
        onApplied={handleBatchEditApplied}
      />
      <ProductBulkSyncSetupModal
        isOpen={isBulkSyncSetupOpen}
        onClose={() => {
          if (isRunningBulkBaseSync) return;
          setIsBulkSyncSetupOpen(false);
        }}
        selectedCount={bulkSyncSetupProductIds.length}
        isRunning={isRunningBulkBaseSync}
        onStart={(profileId) => {
          void handleStartBulkBaseSync(profileId);
        }}
      />
      <ProductBulkSyncResultsModal
        isOpen={isBulkSyncResultsOpen}
        onClose={() => setIsBulkSyncResultsOpen(false)}
        response={bulkSyncResults}
        products={bulkSyncResultProducts}
      />
    </>
  );
});

ProductSelectionActions.displayName = 'ProductSelectionActions';
