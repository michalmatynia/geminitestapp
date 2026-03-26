'use client';
import { UseQueryResult } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  useDraft,
  useCreateDraftMutation,
  useUpdateDraftMutation,
} from '@/features/drafter/hooks/useDraftQueries';
import { draftSubmitSchema } from '@/features/drafter/validations/draft-form';
import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import {
  getCategoriesFlat,
  getParameters,
  getTags,
  ProductImagesTabContent,
  ProductImagesTabProvider,
  useCatalogs,
  useProductImages,
  useProducers,
} from '@/features/products/forms/public';
import type {
  ProductCategory,
  ProductTag,
  ProductParameter,
  ProductParameterValue,
  CreateProductDraftInput,
} from '@/shared/contracts/products';
import { type ProductDraftOpenFormTab } from '@/shared/contracts/products';
import { IconSelector } from '@/shared/lib/icons';
import { createMultiQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  AppModal,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
  LoadingState,
  Card,
} from '@/shared/ui';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { validateFormData } from '@/shared/validations/form-validation';

import { DraftCreatorFormProvider } from './DraftCreatorFormContext';
import { DraftCreatorDetailsTab, DraftCreatorParametersTab } from './DraftCreatorFormFields';
import { useOptionalDrafterActions, useOptionalDrafterState } from '../context/DrafterContext';

const DEFAULT_ICON_COLOR = '#60a5fa';
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const TOTAL_IMAGE_SLOTS = 15;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert image to data URL.'));
    reader.readAsDataURL(file);
  });

const normalizeIconColor = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) return null;
  return trimmed.toLowerCase();
};

const readQueryData = <T,>(queries: readonly UseQueryResult<T[], Error>[]): T[] =>
  queries.flatMap((query: UseQueryResult<T[], Error>): T[] => query.data ?? []);

const hasLoadingQuery = <T,>(queries: readonly UseQueryResult<T[], Error>[]): boolean =>
  queries.some((query: UseQueryResult<T[], Error>): boolean => query.isLoading);

export function DraftCreator({
  draftId: propDraftId,
  onSaveSuccess: propOnSaveSuccess,
  active: propActive,
  onActiveChange,
}: {
  draftId?: string | null;
  onSaveSuccess?: () => void;
  active?: boolean;
  onActiveChange?: (value: boolean) => void;
  onCancel?: () => void;
} = {}): React.JSX.Element {
  const { toast } = useToast();
  const stateContext = useOptionalDrafterState();
  const actionsContext = useOptionalDrafterActions();

  const draftId = propDraftId !== undefined ? propDraftId : (stateContext?.editingDraftId ?? null);
  const handleSaveSuccess =
    propOnSaveSuccess ?? actionsContext?.handleSaveSuccess ?? ((): void => {});
  const formRef = stateContext?.formRef;

  // Queries
  const { data: catalogs = [] } = useCatalogs();
  const { data: producers = [], isLoading: producersLoading } = useProducers();
  const draftQuery = useDraft(draftId);
  const createDraftMutation = useCreateDraftMutation();
  const updateDraftMutation = useUpdateDraftMutation();

  // Form fields
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [identifierType, setIdentifierType] = useState<'ean' | 'gtin' | 'asin'>('ean');
  const [ean, setEan] = useState<string>('');
  const [gtin, setGtin] = useState<string>('');
  const [asin, setAsin] = useState<string>('');
  const [nameEn, setNameEn] = useState<string>('');
  const [namePl, setNamePl] = useState<string>('');
  const [nameDe, setNameDe] = useState<string>('');
  const [descEn, setDescEn] = useState<string>('');
  const [descPl, setDescPl] = useState<string>('');
  const [descDe, setDescDe] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [sizeLength, setSizeLength] = useState<string>('');
  const [sizeWidth, setSizeWidth] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierLink, setSupplierLink] = useState<string>('');
  const [priceComment, setPriceComment] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  const [baseProductId, setBaseProductId] = useState<string>('');
  const [activeState, setActiveState] = useState<boolean>(true);
  const [validatorEnabled, setValidatorEnabled] = useState<boolean>(true);
  const [formatterEnabled, setFormatterEnabled] = useState<boolean>(false);
  const [icon, setIcon] = useState<string | null>(null);
  const [iconColorMode, setIconColorMode] = useState<'theme' | 'custom'>('theme');
  const [iconColor, setIconColor] = useState<string>(DEFAULT_ICON_COLOR);
  const [openProductFormTab, setOpenProductFormTab] = useState<ProductDraftOpenFormTab>('general');
  const [isIconLibraryOpen, setIsIconLibraryOpen] = useState(false);

  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedProducerIds, setSelectedProducerIds] = useState<string[]>([]);
  const [parameterValues, setParameterValues] = useState<ProductParameterValue[]>([]);

  // Metadata queries based on selected catalogs
  const categoryQueries = createMultiQueryV2({
    queries: selectedCatalogIds.map((id: string) => {
      const queryKey = normalizeQueryKey(QUERY_KEYS.products.metadata.categories(id));
      return {
        queryKey,
        queryFn: () => getCategoriesFlat(id),
        meta: {
          source: 'drafter.components.DraftCreator.categories',
          operation: 'list',
          resource: 'products.metadata.categories',
          description: 'Loads products metadata categories.',
          domain: 'products',
          queryKey,
          tags: ['products', 'metadata', 'categories', 'multi'],
        },
      };
    }),
  });

  const tagQueries = createMultiQueryV2({
    queries: selectedCatalogIds.map((id: string) => {
      const queryKey = normalizeQueryKey(QUERY_KEYS.products.metadata.tags(id));
      return {
        queryKey,
        queryFn: () => getTags(id),
        meta: {
          source: 'drafter.components.DraftCreator.tags',
          operation: 'list',
          resource: 'products.metadata.tags',
          description: 'Loads products metadata tags.',
          domain: 'products',
          queryKey,
          tags: ['products', 'metadata', 'tags', 'multi'],
        },
      };
    }),
  });

  const parameterQueries = createMultiQueryV2({
    queries: selectedCatalogIds.map((id: string) => {
      const queryKey = normalizeQueryKey(QUERY_KEYS.products.metadata.parameters(id));
      return {
        queryKey,
        queryFn: () => getParameters(id),
        meta: {
          source: 'drafter.components.DraftCreator.parameters',
          operation: 'list',
          resource: 'products.metadata.parameters',
          description: 'Loads products metadata parameters.',
          domain: 'products',
          queryKey,
          tags: ['products', 'metadata', 'parameters', 'multi'],
        },
      };
    }),
  });

  const categoryQueryResults = categoryQueries as readonly UseQueryResult<
    ProductCategory[],
    Error
  >[];
  const tagQueryResults = tagQueries as readonly UseQueryResult<ProductTag[], Error>[];
  const parameterQueryResults = parameterQueries as readonly UseQueryResult<
    ProductParameter[],
    Error
  >[];

  const categories = useMemo(
    (): ProductCategory[] => readQueryData(categoryQueryResults),
    [categoryQueryResults]
  );
  const tags = useMemo((): ProductTag[] => readQueryData(tagQueryResults), [tagQueryResults]);
  const parameters = useMemo(
    (): ProductParameter[] => readQueryData(parameterQueryResults),
    [parameterQueryResults]
  );
  const parametersLoading = useMemo(
    (): boolean => hasLoadingQuery(parameterQueryResults),
    [parameterQueryResults]
  );
  const active = propActive ?? activeState;

  const {
    imageSlots,
    imageLinks,
    imageBase64s,
    handleSlotImageChange,
    setImageLinkAt,
    setImageBase64At,
    showFileManager,
    setShowFileManager,
    handleSlotDisconnectImage,
    handleMultiFileSelect,
    swapImageSlots,
    setImagesReordering,
  } = useProductImages(undefined, []);

  const setActive = (value: boolean): void => {
    setActiveState(value);
    onActiveChange?.(value);
  };

  const applyDraftImageState = useCallback(
    (incomingLinks: string[] | null | undefined): void => {
      for (let i = 0; i < TOTAL_IMAGE_SLOTS; i += 1) {
        handleSlotImageChange(null, i);
        setImageLinkAt(i, '');
        setImageBase64At(i, '');
      }

      const normalizedLinks = Array.isArray(incomingLinks) ? incomingLinks : [];
      normalizedLinks
        .slice(0, TOTAL_IMAGE_SLOTS)
        .forEach((rawValue: string, index: number): void => {
          const value = typeof rawValue === 'string' ? rawValue.trim() : '';
          if (!value) return;
          if (value.startsWith('data:')) {
            setImageBase64At(index, value);
          } else {
            setImageLinkAt(index, value);
          }
        });
    },
    [handleSlotImageChange, setImageBase64At, setImageLinkAt]
  );

  const serializeDraftImageLinks = useCallback(async (): Promise<string[]> => {
    const serialized: string[] = [];

    for (let i = 0; i < TOTAL_IMAGE_SLOTS; i += 1) {
      const base64Value = imageBase64s[i]?.trim();
      if (base64Value) {
        serialized.push(base64Value);
        continue;
      }

      const linkValue = imageLinks[i]?.trim();
      if (linkValue) {
        serialized.push(linkValue);
        continue;
      }

      const slot = imageSlots[i];
      if (!slot) continue;

      if (slot.type === 'existing') {
        const filePath = slot.data?.filepath?.trim();
        if (filePath) serialized.push(filePath);
        continue;
      }

      try {
        const dataUrl = await fileToDataUrl(slot.data as File);
        if (dataUrl) serialized.push(dataUrl);
      } catch (error) {
        logClientCatch(error, {
          source: 'DraftCreator',
          action: 'serializeDraftImage',
          draftId,
          slotIndex: i,
        });
      }
    }

    return serialized;
  }, [draftId, imageBase64s, imageLinks, imageSlots]);

  // Sync form with draft data
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (draftQuery.data) {
      const draft = draftQuery.data;
      timer = setTimeout((): void => {
        setName(draft.name);
        setDescription(draft.description || '');
        setSku(draft.sku || '');
        setEan(draft.ean || '');
        setGtin(draft.gtin || '');
        setAsin(draft.asin || '');
        if (draft.asin) setIdentifierType('asin');
        else if (draft.gtin) setIdentifierType('gtin');
        else setIdentifierType('ean');
        setNameEn(draft.name_en || '');
        setNamePl(draft.name_pl || '');
        setNameDe(draft.name_de || '');
        setDescEn(draft.description_en || '');
        setDescPl(draft.description_pl || '');
        setDescDe(draft.description_de || '');
        setWeight(draft.weight?.toString() || '');
        setSizeLength(draft.sizeLength?.toString() || '');
        setSizeWidth(draft.sizeWidth?.toString() || '');
        setLength(draft.length?.toString() || '');
        setPrice(draft.price?.toString() || '');
        setSupplierName(draft.supplierName || '');
        setSupplierLink(draft.supplierLink || '');
        setPriceComment(draft.priceComment || '');
        setStock(draft.stock?.toString() || '');
        setBaseProductId(draft.baseProductId || '');
        setActive(draft.active ?? true);
        const nextValidatorEnabled = draft.validatorEnabled ?? true;
        setValidatorEnabled(nextValidatorEnabled);
        setFormatterEnabled(nextValidatorEnabled ? (draft.formatterEnabled ?? false) : false);
        setIcon(draft.icon || null);
        setIconColorMode(draft.iconColorMode === 'custom' ? 'custom' : 'theme');
        setIconColor(normalizeIconColor(draft.iconColor) || DEFAULT_ICON_COLOR);
        setOpenProductFormTab(draft.openProductFormTab ?? 'general');
        applyDraftImageState(draft.imageLinks || []);
        setSelectedCatalogIds(draft.catalogIds || []);
        setSelectedCategoryId(draft.categoryId ?? null);
        setSelectedTagIds(draft.tagIds || []);
        setSelectedProducerIds(draft.producerIds || []);
        setParameterValues(draft.parameters || []);
      }, 0);
    } else if (!draftId) {
      timer = setTimeout((): void => {
        setName('');
        setDescription('');
        setSku('');
        setEan('');
        setGtin('');
        setAsin('');
        setNameEn('');
        setNamePl('');
        setNameDe('');
        setDescEn('');
        setDescPl('');
        setDescDe('');
        setWeight('');
        setSizeLength('');
        setSizeWidth('');
        setLength('');
        setPrice('');
        setSupplierName('');
        setSupplierLink('');
        setPriceComment('');
        setStock('');
        setBaseProductId('');
        setActive(true);
        setValidatorEnabled(true);
        setFormatterEnabled(false);
        setIcon(null);
        setIconColorMode('theme');
        setIconColor(DEFAULT_ICON_COLOR);
        setOpenProductFormTab('general');
        applyDraftImageState([]);
        setSelectedCatalogIds([]);
        setSelectedCategoryId(null);
        setSelectedTagIds([]);
        setSelectedProducerIds([]);
        setParameterValues([]);
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [applyDraftImageState, draftQuery.data, draftId]);

  const handleSave = async (): Promise<void> => {
    const validation = validateFormData(
      draftSubmitSchema,
      { name, iconColorMode, iconColor, openProductFormTab },
      'Draft form is invalid.'
    );
    if (!validation.success) {
      toast(validation.firstError, { variant: 'error' });
      return;
    }

    try {
      const normalizedIconColor = normalizeIconColor(iconColor);
      const serializedImageLinks = await serializeDraftImageLinks();
      const input: CreateProductDraftInput = {
        name: name.trim(),
        description: description.trim() || null,
        sku: sku.trim() || null,
        ean: ean.trim() || null,
        gtin: gtin.trim() || null,
        asin: asin.trim() || null,
        name_en: nameEn.trim() || null,
        name_pl: namePl.trim() || null,
        name_de: nameDe.trim() || null,
        description_en: descEn.trim() || null,
        description_pl: descPl.trim() || null,
        description_de: descDe.trim() || null,
        weight: weight ? parseFloat(weight) : null,
        sizeLength: sizeLength ? parseFloat(sizeLength) : null,
        sizeWidth: sizeWidth ? parseFloat(sizeWidth) : null,
        length: length ? parseFloat(length) : null,
        price: price ? parseFloat(price) : null,
        supplierName: supplierName.trim() || null,
        supplierLink: supplierLink.trim() || null,
        priceComment: priceComment.trim() || null,
        stock: stock ? parseInt(stock, 10) : null,
        catalogIds: selectedCatalogIds,
        categoryId: selectedCategoryId ?? null,
        tagIds: selectedTagIds,
        producerIds: selectedProducerIds,
        parameters: parameterValues
          .map(
            (entry: ProductParameterValue): { parameterId: string | undefined; value: string } => ({
              parameterId: entry.parameterId?.trim(),
              value: typeof entry.value === 'string' ? entry.value.trim() : '',
            })
          )
          .filter(
            (entry: {
              parameterId: string | undefined;
              value: string;
            }): entry is { parameterId: string; value: string } => !!entry.parameterId
          ),
        active,
        validatorEnabled,
        formatterEnabled: validatorEnabled ? formatterEnabled : false,
        icon,
        iconColorMode,
        iconColor: iconColorMode === 'custom' ? normalizedIconColor || DEFAULT_ICON_COLOR : null,
        openProductFormTab,
        imageLinks: serializedImageLinks,
        baseProductId: baseProductId.trim() || null,
      };

      if (draftId) {
        await updateDraftMutation.mutateAsync({ id: draftId, data: input });
      } else {
        await createDraftMutation.mutateAsync(input);
      }

      toast(draftId ? 'Draft updated successfully' : 'Draft created successfully', {
        variant: 'success',
      });
      handleSaveSuccess();
    } catch (error) {
      logClientCatch(error, { source: 'DraftCreator', action: 'saveDraft', draftId });
      toast('Failed to save draft', { variant: 'error' });
    }
  };

  const addParameterValue = (): void => {
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => [
      ...prev,
      { parameterId: '', value: '' },
    ]);
  };

  const updateParameterId = (index: number, parameterId: string): void => {
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
      const next: ProductParameterValue[] = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], parameterId };
      return next;
    });
  };

  const updateParameterValue = (index: number, value: string): void => {
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
      const next: ProductParameterValue[] = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], value };
      return next;
    });
  };

  const removeParameterValue = (index: number): void => {
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] =>
      prev.filter((_, i: number): boolean => i !== index)
    );
  };

  const resolvedIconColor = normalizeIconColor(iconColor) || DEFAULT_ICON_COLOR;
  const handleSelectIcon = (nextIcon: string | null): void => {
    setIcon(nextIcon);
    setIsIconLibraryOpen(false);
  };

  const imageManagerController = useMemo<ProductImageManagerController>(
    () => ({
      imageSlots,
      imageLinks,
      imageBase64s,
      setImageLinkAt,
      setImageBase64At,
      handleSlotImageChange,
      handleSlotDisconnectImage,
      setShowFileManager,
      swapImageSlots,
      setImagesReordering,
      uploadError: null,
    }),
    [
      imageSlots,
      imageLinks,
      imageBase64s,
      setImageLinkAt,
      setImageBase64At,
      handleSlotImageChange,
      handleSlotDisconnectImage,
      setShowFileManager,
      swapImageSlots,
      setImagesReordering,
    ]
  );

  const formContextValue = useMemo(
    () => ({
      name,
      setName,
      description,
      setDescription,
      validatorEnabled,
      setValidatorEnabled,
      formatterEnabled,
      setFormatterEnabled,
      icon,
      setIcon,
      iconColorMode,
      setIconColorMode,
      iconColor,
      setIconColor,
      openProductFormTab,
      setOpenProductFormTab,
      resolvedIconColor,
      openIconLibrary: (): void => setIsIconLibraryOpen(true),
      sku,
      setSku,
      identifierType,
      setIdentifierType,
      ean,
      setEan,
      gtin,
      setGtin,
      asin,
      setAsin,
      weight,
      setWeight,
      sizeLength,
      setSizeLength,
      sizeWidth,
      setSizeWidth,
      length,
      setLength,
      nameEn,
      setNameEn,
      namePl,
      setNamePl,
      nameDe,
      setNameDe,
      descEn,
      setDescEn,
      descPl,
      setDescPl,
      descDe,
      setDescDe,
      price,
      setPrice,
      stock,
      setStock,
      supplierName,
      setSupplierName,
      supplierLink,
      setSupplierLink,
      priceComment,
      setPriceComment,
      baseProductId,
      setBaseProductId,
      catalogs,
      selectedCatalogIds,
      setSelectedCatalogIds,
      categories,
      categoryLoading: hasLoadingQuery(categoryQueryResults),
      selectedCategoryId,
      setSelectedCategoryId,
      tags,
      tagLoading: hasLoadingQuery(tagQueryResults),
      selectedTagIds,
      setSelectedTagIds,
      producers,
      producersLoading,
      selectedProducerIds,
      setSelectedProducerIds,
      showFileManager,
      setShowFileManager,
      handleMultiFileSelect,
      imageManagerController,
      parameters,
      parametersLoading,
      parameterValues,
      addParameterValue,
      updateParameterId,
      updateParameterValue,
      removeParameterValue,
    }),
    [
      name,
      description,
      validatorEnabled,
      formatterEnabled,
      icon,
      iconColorMode,
      iconColor,
      openProductFormTab,
      resolvedIconColor,
      sku,
      identifierType,
      ean,
      gtin,
      asin,
      weight,
      sizeLength,
      sizeWidth,
      length,
      nameEn,
      namePl,
      nameDe,
      descEn,
      descPl,
      descDe,
      price,
      stock,
      supplierName,
      supplierLink,
      priceComment,
      baseProductId,
      catalogs,
      selectedCatalogIds,
      categories,
      categoryQueries,
      selectedCategoryId,
      tags,
      tagQueries,
      selectedTagIds,
      producers,
      producersLoading,
      selectedProducerIds,
      showFileManager,
      setShowFileManager,
      handleMultiFileSelect,
      imageManagerController,
      parameters,
      parametersLoading,
      parameterValues,
      addParameterValue,
      updateParameterId,
      updateParameterValue,
      removeParameterValue,
    ]
  );

  if (draftQuery.isLoading) {
    return (
      <Card
        variant='subtle'
        padding='lg'
        className='flex items-center justify-center min-h-[400px]'
      >
        <LoadingState message='Loading draft configuration...' />
      </Card>
    );
  }

  return (
    <>
      <DraftCreatorFormProvider value={formContextValue}>
        <form
          ref={formRef}
          onSubmit={(e: React.FormEvent): void => {
            e.preventDefault();
            void handleSave();
          }}
          className='space-y-6'
        >
          <div className='space-y-6'>
            <Tabs defaultValue='details' className='w-full'>
              <TabsList className='mb-6' aria-label='Draft creator tabs'>
                <TabsTrigger value='details'>Details</TabsTrigger>
                <TabsTrigger value='images'>Images</TabsTrigger>
                <TabsTrigger value='parameters'>Parameters</TabsTrigger>
              </TabsList>
              <TabsContent value='details' className='mt-0 space-y-6'>
                <DraftCreatorDetailsTab />
              </TabsContent>
              <TabsContent value='images' className='mt-0 space-y-4'>
                <ProductImagesTabProvider
                  value={{
                    showFileManager,
                    onShowFileManager: setShowFileManager,
                    onSelectFiles: handleMultiFileSelect,
                    inlineFileManager: true,
                    imageManagerController,
                  }}
                >
                  <ProductImagesTabContent />
                </ProductImagesTabProvider>
              </TabsContent>
              <TabsContent value='parameters' className='mt-0 space-y-4'>
                <DraftCreatorParametersTab />
              </TabsContent>
            </Tabs>
          </div>
        </form>
      </DraftCreatorFormProvider>

      <AppModal
        open={isIconLibraryOpen}
        onClose={(): void => setIsIconLibraryOpen(false)}
        title='Choose Icon'
        size='xl'
        className='md:min-w-[72rem] max-w-[80rem]'
        bodyClassName='h-[76vh]'
      >
        <IconSelector
          value={icon}
          onChange={handleSelectIcon}
          columns={12}
          showSearch
          helperText='Search and pick an icon. Selecting an icon applies it immediately.'
        />
      </AppModal>
    </>
  );
}
