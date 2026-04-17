'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useDraft,
  useCreateDraftMutation,
  useUpdateDraftMutation,
} from '@/features/drafter/hooks/useDraftQueries';
import { useProductImages, useCatalogs, useProducers } from '@/features/products/forms.public';
import type { ProductDraft, ProductDraftOpenFormTab, ProductParameterValue } from '@/shared/contracts/products';
import { useDraftMetadata } from './useDraftMetadata';

const DEFAULT_ICON_COLOR = '#60a5fa';

export const useDraftCreatorForm = (
  draftId: string | null,
  handleSaveSuccess: () => void,
  propActive?: boolean,
  onActiveChange?: (v: boolean) => void
) => {
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

  const metadata = useDraftMetadata(selectedCatalogIds);

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

  const setActive = useCallback((value: boolean): void => {
    setActiveState(value);
    onActiveChange?.(value);
  }, [onActiveChange]);

  const applyDraftImageState = useCallback(
    (incomingLinks: string[] | null | undefined): void => {
      const TOTAL_SLOTS = 15;
      for (let i = 0; i < TOTAL_SLOTS; i += 1) {
        handleSlotImageChange(null, i);
        setImageLinkAt(i, '');
        setImageBase64At(i, '');
      }

      const normalizedLinks = Array.isArray(incomingLinks) ? incomingLinks : [];
      normalizedLinks
        .slice(0, TOTAL_SLOTS)
        .forEach((rawValue: string, index: number): void => {
          const value = typeof rawValue === 'string' ? rawValue.trim() : '';
          if (value === '') return;
          if (value.startsWith('data:')) {
            setImageBase64At(index, value);
          } else {
            setImageLinkAt(index, value);
          }
        });
    },
    [handleSlotImageChange, setImageBase64At, setImageLinkAt]
  );

  const syncFormWithDraft = useCallback((draft: ProductDraft): void => {
    setName(draft.name);
    setDescription(draft.description ?? '');
    setSku(draft.sku ?? '');
    setEan(draft.ean ?? '');
    setGtin(draft.gtin ?? '');
    setAsin(draft.asin ?? '');
    if (draft.asin !== null && draft.asin !== '') setIdentifierType('asin');
    else if (draft.gtin !== null && draft.gtin !== '') setIdentifierType('gtin');
    else setIdentifierType('ean');
    setNameEn(draft.name_en ?? '');
    setNamePl(draft.name_pl ?? '');
    setNameDe(draft.name_de ?? '');
    setDescEn(draft.description_en ?? '');
    setDescPl(draft.description_pl ?? '');
    setDescDe(draft.description_de ?? '');
    setWeight(draft.weight?.toString() ?? '');
    setSizeLength(draft.sizeLength?.toString() ?? '');
    setSizeWidth(draft.sizeWidth?.toString() ?? '');
    setLength(draft.length?.toString() ?? '');
    setPrice(draft.price?.toString() ?? '');
    setSupplierName(draft.supplierName ?? '');
    setSupplierLink(draft.supplierLink ?? '');
    setPriceComment(draft.priceComment ?? '');
    setStock(draft.stock?.toString() ?? '');
    setBaseProductId(draft.baseProductId ?? '');
    setActive(draft.active ?? true);
    setValidatorEnabled(draft.validatorEnabled ?? true);
    setFormatterEnabled(draft.validatorEnabled ? (draft.formatterEnabled ?? false) : false);
    setIcon(draft.icon ?? null);
    setIconColorMode(draft.iconColorMode === 'custom' ? 'custom' : 'theme');
    setIconColor(draft.iconColor ?? DEFAULT_ICON_COLOR);
    setOpenProductFormTab(draft.openProductFormTab ?? 'general');
    applyDraftImageState(draft.imageLinks ?? []);
    setSelectedCatalogIds(draft.catalogIds ?? []);
    setSelectedCategoryId(draft.categoryId ?? null);
    setSelectedTagIds(draft.tagIds ?? []);
    setSelectedProducerIds(draft.producerIds ?? []);
    setParameterValues(draft.parameters ?? []);
  }, [setActive, applyDraftImageState]);

  const resetForm = useCallback((): void => {
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
  }, [setActive, applyDraftImageState]);

  useEffect(() => {
    if (draftQuery.data) {
      syncFormWithDraft(draftQuery.data);
    } else if (draftId === null) {
      resetForm();
    }
  }, [syncFormWithDraft, resetForm, draftQuery.data, draftId]);

  return {
    state: {
      name, setName, description, setDescription, sku, setSku, identifierType, setIdentifierType,
      ean, setEan, gtin, setGtin, asin, setAsin, nameEn, setNameEn, namePl, setNamePl, nameDe, setNameDe,
      descEn, setDescEn, descPl, setDescPl, descDe, setDescDe, weight, setWeight, sizeLength, setSizeLength,
      sizeWidth, setSizeWidth, length, setLength, price, setPrice, supplierName, setSupplierName,
      supplierLink, setSupplierLink, priceComment, setPriceComment, stock, setStock, baseProductId, setBaseProductId,
      active, setActive, validatorEnabled, setValidatorEnabled, formatterEnabled, setFormatterEnabled,
      icon, setIcon, iconColorMode, setIconColorMode, iconColor, setIconColor,
      openProductFormTab, setOpenProductFormTab, isIconLibraryOpen, setIsIconLibraryOpen,
      selectedCatalogIds, setSelectedCatalogIds, selectedCategoryId, setSelectedCategoryId,
      selectedTagIds, setSelectedTagIds, selectedProducerIds, setSelectedProducerIds, parameterValues, setParameterValues,
    },
    queries: { catalogs, producers, producersLoading, draftQuery, createDraftMutation, updateDraftMutation },
    metadata,
    images: {
      imageSlots, imageLinks, imageBase64s, setImageLinkAt, setImageBase64At, handleSlotImageChange,
      handleSlotDisconnectImage, showFileManager, setShowFileManager, handleMultiFileSelect,
      swapImageSlots, setImagesReordering,
    },
    actions: { handleSave: async () => {}, handleSaveSuccess }
  };
};
