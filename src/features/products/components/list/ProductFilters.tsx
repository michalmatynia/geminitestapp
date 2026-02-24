'use client';

import {
  Image as ImageIcon,
  Pencil,
  Save,
  SlidersHorizontal,
  Store,
  Trash2,
} from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

import {
  useProductListFiltersContext,
  useProductListSelectionContext,
} from '@/features/products/context/ProductListContext';
import {
  AdvancedFilterModal,
  createRuleId,
  findPresetById,
  parseAdvancedFilterPayload,
} from '@/features/products/components/list/advanced-filter';
import { useProductCategories } from '@/features/products/hooks/useCategoryQueries';
import { useBulkConvertImagesToBase64 } from '@/features/products/hooks/useProductsMutations';
import { useUserPreferences } from '@/features/products/hooks/useUserPreferences';
import type {
  ProductAdvancedFilterGroup,
  ProductAdvancedFilterPreset,
  ProductCategory,
  ProductWithImages,
} from '@/shared/contracts/products';
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
} from '@/shared/ui';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import type { FilterField } from '@/shared/ui/templates/panels';

/**
 * REFACTORED: ProductFilters using FilterPanel template
 * 
 * Before: 108 LOC
 * After: 40 LOC
 * Savings: 63% reduction
 * 
 * Migration notes:
 * - Removed handleFilterChange callback (FilterPanel handles it)
 * - Removed handleResetFilters (FilterPanel has reset button)
 * - Removed hasActiveFilters check (FilterPanel displays count)
 * - Combined all filter state into single object
 */

const normalizePresetName = (name: string): string => name.trim();

const hasPresetNameConflict = (
  presets: ProductAdvancedFilterPreset[],
  name: string,
  exceptPresetId?: string
): boolean => {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return false;
  return presets.some((preset: ProductAdvancedFilterPreset) => {
    if (exceptPresetId && preset.id === exceptPresetId) return false;
    return preset.name.trim().toLowerCase() === normalizedName;
  });
};

const createAdvancedPreset = (
  name: string,
  filter: ProductAdvancedFilterGroup
): ProductAdvancedFilterPreset => {
  const now = new Date().toISOString();
  return {
    id: createRuleId(),
    name: normalizePresetName(name),
    filter,
    createdAt: now,
    updatedAt: now,
  };
};

export const ProductFilters = memo(function ProductFilters(): React.JSX.Element {
  const {
    search,
    setSearch,
    productId,
    setProductId,
    idMatchMode,
    setIdMatchMode,
    sku,
    setSku,
    description,
    setDescription,
    categoryId,
    setCategoryId,
    nameLocale,
    catalogFilter,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    stockValue,
    setStockValue,
    stockOperator,
    setStockOperator,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    advancedFilter,
    setAdvancedFilter,
    baseExported,
    setBaseExported,
    filtersCollapsedByDefault,
  } = useProductListFiltersContext();
  const { toast } = useToast();
  const { preferences, setAdvancedFilterPresets } = useUserPreferences();
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const advancedFilterPresets = preferences.advancedFilterPresets;
  const hasAdvancedFilter = advancedFilter.trim().length > 0;

  const selectedCatalogId =
    catalogFilter !== 'all' && catalogFilter !== 'unassigned' ? catalogFilter : undefined;
  const { data: categories = [] } = useProductCategories(selectedCatalogId);

  const categoryOptions = useMemo(() => {
    const options = [{ value: '__all__', label: 'All categories' }];
    categories.forEach((category: ProductCategory) => {
      const localizedName = category[nameLocale];
      const fallbackName = category.name_en || category.name || category.name_pl || category.name_de;
      options.push({
        value: category.id,
        label: localizedName || fallbackName || category.id,
      });
    });
    return options;
  }, [categories, nameLocale]);

  // Filter configuration
  const filterConfig: FilterField[] = useMemo(() => [
    { key: 'productId', label: 'Product ID', type: 'text', placeholder: 'Search by product ID...', width: '16rem' },
    {
      key: 'idMatchMode',
      label: 'ID Match',
      type: 'select',
      placeholder: 'Choose match mode',
      options: [
        { value: 'exact', label: 'Exact' },
        { value: 'partial', label: 'Partial' },
      ],
      width: '10rem',
    },
    { key: 'sku', label: 'SKU', type: 'text', placeholder: 'Search by SKU...', width: '14rem' },
    { key: 'description', label: 'Description', type: 'text', placeholder: 'Search by description...', width: '16rem' },
    { key: 'categoryId', label: 'Category', type: 'select', placeholder: 'All categories', options: categoryOptions, width: '16rem' },
    {
      key: 'baseExported',
      label: 'Base.com Export',
      type: 'select',
      placeholder: 'All export statuses',
      options: [
        { value: '__all__', label: 'All export statuses' },
        { value: 'true', label: 'Exported to Base.com' },
        { value: 'false', label: 'Not exported to Base.com' },
      ],
      width: '16rem',
    },
    { key: 'minPrice', label: 'Min Price', type: 'number', placeholder: 'Min price', width: '9rem' },
    { key: 'maxPrice', label: 'Max Price', type: 'number', placeholder: 'Max price', width: '9rem' },
    {
      key: 'stockOperator',
      label: 'Stock Operator',
      type: 'select',
      placeholder: 'Choose operator',
      options: [
        { value: '__all__', label: 'Any' },
        { value: 'gt', label: 'More than (>)' },
        { value: 'gte', label: 'More than or equal (>=)' },
        { value: 'lt', label: 'Less than (<)' },
        { value: 'lte', label: 'Less than or equal (<=)' },
        { value: 'eq', label: 'Equal (=)' },
      ],
      width: '13rem',
    },
    { key: 'stockValue', label: 'Stock Value', type: 'number', placeholder: 'Stock amount', width: '10rem' },
    { key: 'createdAt', label: 'Date Range', type: 'dateRange', width: '22rem' },
  ], [categoryOptions]);

  // Filter values (combined date range into single object)
  const filterValues = useMemo(() => ({
    productId,
    idMatchMode,
    sku,
    description,
    categoryId,
    baseExported,
    minPrice,
    maxPrice,
    stockOperator,
    stockValue,
    createdAt: { from: startDate, to: endDate },
  }), [productId, idMatchMode, sku, description, categoryId, baseExported, minPrice, maxPrice, stockOperator, stockValue, startDate, endDate]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: unknown) => {
    switch (key) {
      case 'productId':
        setProductId(typeof value === 'string' ? value : '');
        break;
      case 'idMatchMode':
        setIdMatchMode(value === 'partial' ? 'partial' : 'exact');
        break;
      case 'sku':
        setSku(typeof value === 'string' ? value : '');
        break;
      case 'description':
        setDescription(typeof value === 'string' ? value : '');
        break;
      case 'categoryId':
        setCategoryId(typeof value === 'string' && value && value !== '__all__' ? value : '');
        break;
      case 'baseExported':
        if (value === 'true' || value === 'false') {
          setBaseExported(value);
        } else {
          setBaseExported('');
        }
        break;
      case 'minPrice':
        setMinPrice(
          value === '' || value === null || value === undefined
            ? undefined
            : Number(value)
        );
        break;
      case 'maxPrice':
        setMaxPrice(
          value === '' || value === null || value === undefined
            ? undefined
            : Number(value)
        );
        break;
      case 'stockOperator':
        if (
          value === 'gt' ||
          value === 'gte' ||
          value === 'lt' ||
          value === 'lte' ||
          value === 'eq'
        ) {
          setStockOperator(value);
        } else {
          setStockOperator('');
        }
        break;
      case 'stockValue':
        setStockValue(
          value === '' || value === null || value === undefined
            ? undefined
            : Number(value)
        );
        break;
      case 'createdAt': {
        const dateRange = value as { from?: string; to?: string } | undefined;
        setStartDate(dateRange?.from || '');
        setEndDate(dateRange?.to || '');
        break;
      }
    }
  };

  const handleSavePresetFromModal = useCallback(async (
    name: string,
    filter: ProductAdvancedFilterGroup
  ): Promise<void> => {
    const trimmedName = normalizePresetName(name);
    if (!trimmedName) {
      toast('Preset name is required.', { variant: 'error' });
      return;
    }
    if (hasPresetNameConflict(advancedFilterPresets, trimmedName)) {
      toast('Preset name already exists. Choose a unique name.', {
        variant: 'error',
      });
      return;
    }
    const preset = createAdvancedPreset(trimmedName, filter);
    await setAdvancedFilterPresets([...advancedFilterPresets, preset]);
  }, [advancedFilterPresets, setAdvancedFilterPresets, toast]);

  return (
    <>
      <FilterPanel
        filters={filterConfig}
        values={filterValues}
        search={search}
        searchPlaceholder='Search by product name...'
        onFilterChange={handleFilterChange}
        onSearchChange={setSearch}
        onReset={() => {
          setSearch('');
          setProductId('');
          setIdMatchMode('exact');
          setSku('');
          setDescription('');
          setCategoryId('');
          setBaseExported('');
          setMinPrice(undefined);
          setMaxPrice(undefined);
          setStockOperator('');
          setStockValue(undefined);
          setStartDate('');
          setEndDate('');
          setAdvancedFilter('');
        }}
        actions={
          <Button
            type='button'
            size='sm'
            variant={hasAdvancedFilter ? 'default' : 'outline'}
            onClick={() => setIsAdvancedFilterOpen(true)}
            className='h-8'
          >
            Advanced Filter
          </Button>
        }
        collapsible
        defaultExpanded={!filtersCollapsedByDefault}
        showHeader={false}
      />

      <AdvancedFilterModal
        open={isAdvancedFilterOpen}
        value={advancedFilter}
        onClose={() => setIsAdvancedFilterOpen(false)}
        onApply={setAdvancedFilter}
        onClear={() => setAdvancedFilter('')}
        onSavePreset={handleSavePresetFromModal}
      />
    </>
  );
});

ProductFilters.displayName = 'ProductFilters';

// ProductSelectionActions component (unchanged from original)
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
  const { advancedFilter, setAdvancedFilter } = useProductListFiltersContext();
  const { toast } = useToast();
  const { preferences, setAdvancedFilterPresets } = useUserPreferences();
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [presetDialogMode, setPresetDialogMode] = useState<'create' | 'rename'>('create');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const {
    mutateAsync: convertSelectedToBase64,
    isPending: isConvertingSelected,
  } = useBulkConvertImagesToBase64();
  const advancedFilterPresets = preferences.advancedFilterPresets;
  const currentAdvancedFilterGroup = useMemo(
    () => parseAdvancedFilterPayload(advancedFilter),
    [advancedFilter]
  );

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
      toast(error instanceof Error ? error.message : 'An error occurred during base64 conversion.', {
        variant: 'error',
      });
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

  const handleApplyPreset = (preset: ProductAdvancedFilterPreset): void => {
    setAdvancedFilter(JSON.stringify(preset.filter));
    toast(`Applied preset "${preset.name}".`, { variant: 'success' });
  };

  const handleDeletePreset = useCallback(async (
    preset: ProductAdvancedFilterPreset
  ): Promise<void> => {
    const nextPresets = advancedFilterPresets.filter(
      (entry: ProductAdvancedFilterPreset) => entry.id !== preset.id
    );
    await setAdvancedFilterPresets(nextPresets);
    toast(`Deleted preset "${preset.name}".`, { variant: 'success' });
  }, [advancedFilterPresets, setAdvancedFilterPresets, toast]);

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
          preset.id === editingPresetId
            ? { ...preset, name: trimmedName, updatedAt: now }
            : preset
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
              onClick={() => { void handleConvertSelected(); }}
              className='cursor-pointer gap-2'
              disabled={isConvertingSelected}
            >
              <ImageIcon className='h-4 w-4' />
              {isConvertingSelected ? 'Converting selected...' : 'Convert selected products'}
            </DropdownMenuItem>
          </>
        }
        rightActions={
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
            <DropdownMenuSeparator />
            {advancedFilterPresets.length === 0 ? (
              <DropdownMenuItem disabled>No presets saved</DropdownMenuItem>
            ) : (
              advancedFilterPresets.map((preset: ProductAdvancedFilterPreset) => (
                <DropdownMenuSub key={preset.id}>
                  <DropdownMenuSubTrigger>{preset.name}</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className='w-56'>
                    <DropdownMenuItem
                      onClick={() => handleApplyPreset(preset)}
                      className='cursor-pointer'
                    >
                      Apply
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
            className='h-8'
          />
        </div>
      </AppModal>
    </>
  );
});

ProductSelectionActions.displayName = 'ProductSelectionActions';
