'use client';

import {
  Copy,
  Download,
  FileUp,
  Image as ImageIcon,
  Pencil,
  Save,
  SlidersHorizontal,
  Store,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { memo, useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react';

import {
  findPresetById,
  parseAdvancedFilterPayload,
} from '@/features/products/components/list/advanced-filter';
import {
  useProductListFiltersContext,
  useProductListSelectionContext,
} from '@/features/products/context/ProductListContext';
import { useBulkConvertImagesToBase64 } from '@/features/products/hooks/useProductsMutations';
import { useUserPreferences } from '@/features/products/hooks/useUserPreferences';
import type { ProductAdvancedFilterPreset, ProductWithImages } from '@/shared/contracts/products';
import {
  ActionMenu,
  AppModal,
  Button,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  Input,
  SelectionBar,
  useToast,
  JSONImportModal,
  Chip,
} from '@/shared/ui';

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

export const ProductSelectionActions = memo(function ProductSelectionActions() {
  const {
    data,
    rowSelection,
    setRowSelection,
    onSelectAllGlobal,
    loadingGlobal,
    onDeleteSelected,
    onAddToMarketplace,
  } = useProductListSelectionContext();
  const { advancedFilter, activeAdvancedFilterPresetId, setAdvancedFilterState } =
    useProductListFiltersContext();
  const { toast } = useToast();
  const { preferences, setAdvancedFilterPresets } = useUserPreferences();
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [presetDialogMode, setPresetDialogMode] = useState<'create' | 'rename'>('create');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importingPresets, setImportingPresets] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: convertSelectedToBase64, isPending: isConvertingSelected } =
    useBulkConvertImagesToBase64();
  const advancedFilterPresets = preferences.advancedFilterPresets;
  const currentAdvancedFilterGroup = useMemo(
    () => parseAdvancedFilterPayload(advancedFilter),
    [advancedFilter]
  );
  const activePreset = useMemo(() => {
    if (!activeAdvancedFilterPresetId) return null;
    return findPresetById(advancedFilterPresets, activeAdvancedFilterPresetId);
  }, [activeAdvancedFilterPresetId, advancedFilterPresets]);

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
      toast(
        error instanceof Error ? error.message : 'An error occurred during base64 conversion.',
        {
          variant: 'error',
        }
      );
    }
  }, [convertSelectedToBase64, rowSelection, setRowSelection, toast]);

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
    setIsPresetDialogOpen(true);
  };

  const openRenamePresetDialog = (preset: ProductAdvancedFilterPreset): void => {
    setPresetDialogMode('rename');
    setEditingPresetId(preset.id);
    setPresetName(preset.name);
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
      const nextPresets = advancedFilterPresets.filter(
        (entry: ProductAdvancedFilterPreset) => entry.id !== preset.id
      );
      await setAdvancedFilterPresets(nextPresets);
      if (activeAdvancedFilterPresetId === preset.id) {
        setAdvancedFilterState('', null);
      }
      toast(`Deleted preset "${preset.name}".`, { variant: 'success' });
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
        if (!editingPresetId) {
          toast('Preset to rename was not found.', { variant: 'error' });
          return;
        }
        const editingPreset = findPresetById(advancedFilterPresets, editingPresetId);
        if (!editingPreset) {
          toast('Preset to rename was not found.', { variant: 'error' });
          return;
        }
        if (hasPresetNameConflict(advancedFilterPresets, trimmedName, editingPresetId)) {
          toast('Preset name already exists. Choose a unique name.', {
            variant: 'error',
          });
          return;
        }
        const now = new Date().toISOString();
        const nextPresets = advancedFilterPresets.map((preset: ProductAdvancedFilterPreset) =>
          preset.id === editingPresetId ? { ...preset, name: trimmedName, updatedAt: now } : preset
        );
        await setAdvancedFilterPresets(nextPresets);
        toast(`Renamed preset to "${trimmedName}".`, { variant: 'success' });
      }

      closePresetDialog();
    } catch (error) {
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
          <div className='flex items-center gap-2'>
            {activePreset ? (
              <Chip
                label={activePreset.name}
                active
                onClick={() => setAdvancedFilterState('', null)}
                icon={X}
                className='h-8 max-w-[240px]'
              />
            ) : null}
            <ActionMenu
              align='end'
              className='w-64'
              trigger={
                <div className='flex items-center gap-2'>
                  <SlidersHorizontal className='h-3.5 w-3.5' />
                  <span className='text-xs font-medium'>Filter Presets</span>
                </div>
              }
              triggerClassName='h-8 px-3 border border-border/60 bg-card/30 hover:bg-card/50 text-gray-300 hover:text-white'
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
                  <DropdownMenuSub key={preset.id}>
                    <DropdownMenuSubTrigger
                      className='cursor-pointer'
                      onClick={() => applyPreset(preset, false)}
                    >
                      <span className='truncate'>{preset.name}</span>
                      {activeAdvancedFilterPresetId === preset.id ? (
                        <span className='ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary'>
                          Applied
                        </span>
                      ) : null}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className='w-56'>
                      <DropdownMenuItem
                        onClick={() => handleApplyPreset(preset)}
                        className='cursor-pointer'
                      >
                        Apply
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportSinglePreset(preset)}
                        className='cursor-pointer gap-2'
                      >
                        <Download className='h-3.5 w-3.5' />
                        Export JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          void handleCopyPreset(preset);
                        }}
                        className='cursor-pointer gap-2'
                      >
                        <Copy className='h-3.5 w-3.5' />
                        Copy JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openRenamePresetDialog(preset)}
                        className='cursor-pointer gap-2'
                      >
                        <Pencil className='h-3.5 w-3.5' />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          void handleDeletePreset(preset);
                        }}
                        className='cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))
              )}
            </ActionMenu>
          </div>
        }
      />

      <AppModal
        isOpen={isPresetDialogOpen}
        onClose={closePresetDialog}
        title={presetDialogMode === 'rename' ? 'Rename Preset' : 'Save Filter Preset'}
        subtitle='Presets store advanced filter sequences.'
        size='sm'
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
              {savingPreset ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <div className='space-y-2'>
          <Input
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder='Preset name'
            aria-label='Preset name'
            className='h-8'
           title="Preset name"/>
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
    </>
  );
});

ProductSelectionActions.displayName = 'ProductSelectionActions';
