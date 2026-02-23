'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FormProvider,
  useForm,
  Resolver,
} from 'react-hook-form';

import { PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY } from '@/features/products/constants';
import { useProductFormSubmit } from '@/features/products/hooks/useProductFormSubmit';
import { useProductImages } from '@/features/products/hooks/useProductImages';
import { useProductMetadata } from '@/features/products/hooks/useProductMetadata';
import { decodeSimpleParameterStorageId } from '@/features/products/utils/parameter-partition';
import {
  productCreateSchema,
  productUpdateSchema,
} from '@/features/products/validations/schemas';
import type { ImageFileSelectionDto as ImageFileSelection } from '@/shared/contracts/files';
import {
  ProductImageSlot,
} from '@/shared/contracts/products';
import type {
  ProductParameterValue,
} from '@/shared/contracts/products';
import type {
  ProductWithImages,
  ProductFormData,
  ProductDraft,
} from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import {
  ProductFormCoreContext,
  ProductFormCoreContextType,
  useProductFormCore,
} from './ProductFormCoreContext';
import {
  ProductFormImageContext,
  ProductFormImageContextType,
  useProductFormImages,
} from './ProductFormImageContext';
import {
  ProductFormMetadataContext,
  ProductFormMetadataContextType,
  useProductFormMetadata,
} from './ProductFormMetadataContext';
import {
  ProductFormParameterContext,
  ProductFormParameterContextType,
  useProductFormParameters,
} from './ProductFormParameterContext';
import {
  ProductFormStudioContext,
  ProductFormStudioContextType,
  useProductFormStudio,
} from './ProductFormStudioContext';

const PRODUCT_STUDIO_CONFIG_CACHE_TTL_MS = 30_000;

type ProductStudioConfigResponse = {
  config?: {
    projectId?: string | null;
  };
};

type ProductStudioConfigCacheEntry = {
  projectId: string | null;
  expiresAt: number;
};

const productStudioConfigCache = new Map<string, ProductStudioConfigCacheEntry>();
const productStudioConfigInFlight = new Map<string, Promise<string | null>>();

const normalizeStudioProjectId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const setCachedStudioProjectId = (productId: string, projectId: string | null): void => {
  productStudioConfigCache.set(productId, {
    projectId,
    expiresAt: Date.now() + PRODUCT_STUDIO_CONFIG_CACHE_TTL_MS,
  });
};

const loadStudioProjectId = async (productId: string): Promise<string | null> => {
  const cached = productStudioConfigCache.get(productId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.projectId;
  }

  const inFlight = productStudioConfigInFlight.get(productId);
  if (inFlight) {
    return inFlight;
  }

  const request = api
    .get<ProductStudioConfigResponse>(
      `/api/products/${encodeURIComponent(productId)}/studio`,
      {
        cache: 'no-store',
        logError: false,
      }
    )
    .then((response) => normalizeStudioProjectId(response.config?.projectId))
    .then((projectId) => {
      setCachedStudioProjectId(productId, projectId);
      return projectId;
    })
    .finally(() => {
      productStudioConfigInFlight.delete(productId);
    });

  productStudioConfigInFlight.set(productId, request);
  return request;
};

type ComparableParameterValue = {
  parameterId: string;
  value: string;
  valuesByLanguage?: Record<string, string>;
};

type NonFormComparableState = {
  selectedCatalogIds: string[];
  selectedCategoryId: string | null;
  selectedTagIds: string[];
  selectedProducerIds: string[];
  selectedNoteIds: string[];
  parameterValues: ComparableParameterValue[];
  imageSlots: string[];
  imageLinks: string[];
  imageBase64s: string[];
};

const normalizeComparableString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeComparableStringList = (values: ReadonlyArray<unknown>): string[] => {
  const unique = new Set<string>();
  values.forEach((value: unknown) => {
    const normalized = normalizeComparableString(value);
    if (!normalized) return;
    unique.add(normalized);
  });
  return Array.from(unique);
};

const normalizeComparableNullableString = (value: unknown): string | null => {
  const normalized = normalizeComparableString(value);
  return normalized || null;
};

const normalizeComparableParameterValues = (
  input: ProductParameterValue[]
): ComparableParameterValue[] => {
  return input
    .map((entry: ProductParameterValue): ComparableParameterValue => {
      const valuesByLanguage =
        entry.valuesByLanguage &&
        typeof entry.valuesByLanguage === 'object' &&
        !Array.isArray(entry.valuesByLanguage)
          ? Object.entries(entry.valuesByLanguage)
            .reduce((acc: Record<string, string>, [lang, value]: [string, unknown]) => {
              const normalizedLang = normalizeComparableString(lang).toLowerCase();
              const normalizedValue = normalizeComparableString(value);
              if (!normalizedLang || !normalizedValue) return acc;
              acc[normalizedLang] = normalizedValue;
              return acc;
            }, {} as Record<string, string>)
          : {};
      const directValue = normalizeComparableString(entry.value);
      const fallbackLocalizedValue =
        valuesByLanguage['default'] ||
        valuesByLanguage['en'] ||
        valuesByLanguage['pl'] ||
        valuesByLanguage['de'] ||
        Object.values(valuesByLanguage).find((value: string): boolean => value.length > 0) ||
        '';
      const normalizedParameterId = decodeSimpleParameterStorageId(
        normalizeComparableString(entry.parameterId)
      );
      return {
        parameterId: normalizedParameterId || '',
        value: directValue || fallbackLocalizedValue,
        ...(Object.keys(valuesByLanguage).length > 0
          ? { valuesByLanguage }
          : {}),
      };
    })
    .filter((entry: ComparableParameterValue): boolean => entry.parameterId.length > 0);
};

const toComparableImageSlot = (slot: ProductImageSlot | null): string => {
  if (!slot) return '';
  if (slot.type === 'existing') {
    return `existing:${normalizeComparableString(slot.data.id)}`;
  }
  const fileRecord =
    slot.data && typeof slot.data === 'object'
      ? (slot.data as Record<string, unknown>)
      : {};
  const sizeValue = fileRecord['size'];
  const lastModifiedValue = fileRecord['lastModified'];
  return [
    'file',
    normalizeComparableString(fileRecord['name']),
    typeof sizeValue === 'number' && Number.isFinite(sizeValue)
      ? String(sizeValue)
      : '0',
    normalizeComparableString(fileRecord['type']),
    typeof lastModifiedValue === 'number' && Number.isFinite(lastModifiedValue)
      ? String(lastModifiedValue)
      : '0',
  ].join(':');
};

const serializeComparableState = (value: NonFormComparableState): string =>
  JSON.stringify(value);

export interface ProductFormContextType
  extends ProductFormCoreContextType,
    ProductFormMetadataContextType,
    ProductFormImageContextType,
    ProductFormParameterContextType,
    ProductFormStudioContextType {}

export const ProductFormContext = createContext<ProductFormContextType | null>(
  null
);

export const useProductFormContext = (): ProductFormContextType => {
  const core = useProductFormCore();
  const metadata = useProductFormMetadata();
  const images = useProductFormImages();
  const parameters = useProductFormParameters();
  const studio = useProductFormStudio();

  return useMemo(
    () => ({
      ...core,
      ...metadata,
      ...images,
      ...parameters,
      ...studio,
    }),
    [core, metadata, images, parameters, studio]
  );
};

export function ProductFormProvider({
  children,
  product,
  draft,
  onSuccess,
  onEditSave,
  requireSku = true,
  initialSku,
  initialCatalogId,
}: {
  children: React.ReactNode;
  product?: ProductWithImages | undefined;
  draft?: ProductDraft | null | undefined;
  onSuccess?: ((info?: { queued?: boolean }) => void) | undefined;
  onEditSave?: ((saved: ProductWithImages) => void) | undefined;
  requireSku?: boolean | undefined;
  initialSku?: string | undefined;
  initialCatalogId?: string | undefined;
}): React.ReactNode {
  const formSchema = product || !requireSku ? productUpdateSchema : productCreateSchema;
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(formSchema) as Resolver<ProductFormData>,
    defaultValues: {
      name_en: product?.name_en || draft?.name_en || '',
      name_pl: product?.name_pl || draft?.name_pl || '',
      name_de: product?.name_de || draft?.name_de || '',
      price: product?.price ?? draft?.price ?? 0,
      sku: product?.sku || initialSku || draft?.sku || '',
      defaultPriceGroupId:
        product?.defaultPriceGroupId ?? draft?.defaultPriceGroupId ?? undefined,
      baseProductId: product?.baseProductId ?? draft?.baseProductId ?? undefined,
      ean: product?.ean || draft?.ean || '',
      gtin: product?.gtin || draft?.gtin || '',
      asin: product?.asin || draft?.asin || '',
      description_en: product?.description_en || draft?.description_en || '',
      description_pl: product?.description_pl || draft?.description_pl || '',
      description_de: product?.description_de || draft?.description_de || '',
      supplierName: product?.supplierName || draft?.supplierName || '',
      supplierLink: product?.supplierLink || draft?.supplierLink || '',
      priceComment: product?.priceComment || draft?.priceComment || '',
      stock: product?.stock ?? draft?.stock ?? 0,
      sizeLength: product?.sizeLength ?? draft?.sizeLength ?? 0,
      sizeWidth: product?.sizeWidth ?? draft?.sizeWidth ?? 0,
      weight: product?.weight ?? draft?.weight ?? 0,
      length: product?.length ?? draft?.length ?? 0,
    },
  });
  const {
    register,
    formState: { errors, isDirty },
    setValue,
    getValues,
    reset,
  } = methods;

  const [generationError, setGenerationError] = useState<string | null>(null);
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const defaultStudioProjectIdSettingRaw =
    settingsStore.get(PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY) ?? '';
  const defaultStudioProjectId = defaultStudioProjectIdSettingRaw.trim() || null;
  const [studioProjectId, setStudioProjectIdState] = useState<string | null>(
    null
  );
  const [studioConfigLoading, setStudioConfigLoading] = useState<boolean>(
    Boolean(product?.id)
  );
  const [studioConfigSaving, setStudioConfigSaving] = useState<boolean>(false);
  const studioConfigSaveRequestRef = useRef(0);
  const persistedStudioProjectRef = useRef<string | null>(null);
  const currentStudioProjectRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const productId = product?.id?.trim() ?? '';

    if (!productId) {
      const fallbackProjectId = defaultStudioProjectId;
      setStudioProjectIdState(fallbackProjectId);
      setStudioConfigLoading(false);
      setStudioConfigSaving(false);
      persistedStudioProjectRef.current = fallbackProjectId;
      currentStudioProjectRef.current = fallbackProjectId;
      return () => {
        cancelled = true;
      };
    }

    setStudioConfigLoading(true);
    void loadStudioProjectId(productId)
      .then((persistedProjectId) => {
        if (cancelled) return;
        const normalized = persistedProjectId ?? defaultStudioProjectId;
        setStudioProjectIdState(normalized);
        persistedStudioProjectRef.current = normalized;
        currentStudioProjectRef.current = normalized;
      })
      .catch(() => {
        if (cancelled) return;
        setStudioProjectIdState(defaultStudioProjectId);
        persistedStudioProjectRef.current = defaultStudioProjectId;
        currentStudioProjectRef.current = defaultStudioProjectId;
      })
      .finally(() => {
        if (cancelled) return;
        setStudioConfigLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [defaultStudioProjectId, product?.id]);

  const persistStudioConfig = (nextProjectId: string | null): void => {
    const productId = product?.id?.trim() ?? '';
    if (!productId) return;

    const requestId = ++studioConfigSaveRequestRef.current;
    setStudioConfigSaving(true);

    void api
      .put<{
        config?: {
          projectId?: string | null;
        };
      }>(
        `/api/products/${encodeURIComponent(productId)}/studio`,
        {
          projectId: nextProjectId,
        },
        { logError: false }
      )
      .then((response) => {
        if (studioConfigSaveRequestRef.current !== requestId) return;
        const persistedProjectId = normalizeStudioProjectId(response.config?.projectId);
        setCachedStudioProjectId(productId, persistedProjectId);
        persistedStudioProjectRef.current = persistedProjectId;
        currentStudioProjectRef.current = persistedProjectId;
        setStudioProjectIdState(persistedProjectId);
      })
      .catch(() => {
        if (studioConfigSaveRequestRef.current !== requestId) return;
        const fallbackProjectId = persistedStudioProjectRef.current;
        currentStudioProjectRef.current = fallbackProjectId;
        setStudioProjectIdState(fallbackProjectId);
        toast('Failed to autosave Product Studio settings.', {
          variant: 'error',
        });
      })
      .finally(() => {
        if (studioConfigSaveRequestRef.current !== requestId) return;
        setStudioConfigSaving(false);
      });
  };

  const setStudioProjectId = (projectId: string | null): void => {
    const normalized =
      typeof projectId === 'string' ? projectId.trim() : '';
    const nextProjectId = normalized || null;
    currentStudioProjectRef.current = nextProjectId;
    setStudioProjectIdState(nextProjectId);
    persistStudioConfig(nextProjectId);
  };

  const {
    imageSlots,
    imageLinks,
    imageBase64s,
    showFileManager,
    setShowFileManager,
    handleSlotImageChange,
    handleSlotFileSelect,
    handleSlotDisconnectImage,
    handleMultiImageChange,
    handleMultiFileSelect,
    swapImageSlots,
    setImageLinkAt,
    setImageBase64At,
    refreshFromProduct: refreshImages,
    setImagesReordering,
  } = useProductImages(product, draft?.imageLinks);

  const {
    catalogs,
    catalogsLoading,
    catalogsError,
    selectedCatalogIds,
    toggleCatalog,
    categories,
    categoriesLoading,
    selectedCategoryId,
    setCategoryId,
    tags,
    tagsLoading,
    selectedTagIds,
    toggleTag,
    producers,
    producersLoading,
    selectedProducerIds,
    toggleProducer,
    parameters,
    parametersLoading,
    filteredLanguages,
    filteredPriceGroups,
  } = useProductMetadata({
    product,
    initialCatalogId,
    initialCatalogIds:
      draft?.catalogIds && draft.catalogIds.length > 0
        ? draft.catalogIds
        : initialCatalogId
          ? [initialCatalogId]
          : undefined,
    initialCategoryId: draft?.categoryId ?? null,
    initialTagIds: draft?.tagIds,
    initialProducerIds: draft?.producerIds,
    setValue,
    getValues,
  });

  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(
    () => (Array.isArray(product?.noteIds) ? product.noteIds : [])
  );

  const nonFormDirtyTrackingLockedRef = useRef<boolean>(false);
  const lastEntityIdentityRef = useRef<string>('');
  const lastUploadSuccessRef = useRef<boolean>(false);

  const markNonFormInteraction = (): void => {
    nonFormDirtyTrackingLockedRef.current = true;
  };

  const toggleNote = (noteId: string): void => {
    const id = noteId.trim();
    if (!id) return;
    markNonFormInteraction();
    setSelectedNoteIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((n: string) => n !== id) : [...prev, id]
    );
  };

  const removeNote = (noteId: string): void => {
    const id = noteId.trim();
    if (!id) return;
    markNonFormInteraction();
    setSelectedNoteIds((prev: string[]) => prev.filter((n: string) => n !== id));
  };

  const trackedToggleCatalog = (catalogId: string): void => {
    markNonFormInteraction();
    toggleCatalog(catalogId);
  };

  const trackedSetCategoryId = (categoryId: string | null): void => {
    markNonFormInteraction();
    setCategoryId(categoryId);
  };

  const trackedToggleTag = (tagId: string): void => {
    markNonFormInteraction();
    toggleTag(tagId);
  };

  const trackedToggleProducer = (producerId: string): void => {
    markNonFormInteraction();
    toggleProducer(producerId);
  };

  const trackedHandleSlotImageChange = (file: File | null, index: number): void => {
    markNonFormInteraction();
    handleSlotImageChange(file, index);
  };

  const trackedHandleSlotFileSelect = (
    file: ImageFileSelection | null,
    index: number
  ): void => {
    markNonFormInteraction();
    handleSlotFileSelect(file, index);
  };

  const trackedHandleSlotDisconnectImage = async (index: number): Promise<void> => {
    markNonFormInteraction();
    await handleSlotDisconnectImage(index);
  };

  const trackedHandleMultiImageChange = (files: File[]): void => {
    markNonFormInteraction();
    handleMultiImageChange(files);
  };

  const trackedHandleMultiFileSelect = (files: ImageFileSelection[]): void => {
    markNonFormInteraction();
    handleMultiFileSelect(files);
  };

  const trackedSwapImageSlots = (fromIndex: number, toIndex: number): void => {
    markNonFormInteraction();
    swapImageSlots(fromIndex, toIndex);
  };

  const trackedSetImageLinkAt = (index: number, value: string): void => {
    markNonFormInteraction();
    setImageLinkAt(index, value);
  };

  const trackedSetImageBase64At = (index: number, value: string): void => {
    markNonFormInteraction();
    setImageBase64At(index, value);
  };

  const [parameterValues, setParameterValues] = useState<ProductParameterValue[]>(
    () => {
      if (!Array.isArray(product?.parameters ?? draft?.parameters)) return [];
      return (product?.parameters ?? draft?.parameters ?? []).map((entry: ProductParameterValue) => {
        const valuesByLanguage =
          entry?.valuesByLanguage &&
          typeof entry.valuesByLanguage === 'object' &&
          !Array.isArray(entry.valuesByLanguage)
            ? Object.entries(entry.valuesByLanguage).reduce(
              (acc: Record<string, string>, [lang, rawValue]: [string, unknown]) => {
                const normalizedLang = lang.trim().toLowerCase();
                if (!normalizedLang) return acc;
                const normalizedValue =
                  typeof rawValue === 'string' ? rawValue : '';
                acc[normalizedLang] = normalizedValue;
                return acc;
              },
              {} as Record<string, string>
            )
            : {};
        const directValue = typeof entry?.value === 'string' ? entry.value : '';
        const fallbackValue =
          directValue ||
          valuesByLanguage['default'] ||
          valuesByLanguage['en'] ||
          Object.values(valuesByLanguage).find(
            (value: string): boolean => typeof value === 'string' && value.length > 0
          ) ||
          '';

        return {
          parameterId: decodeSimpleParameterStorageId(
            typeof entry?.parameterId === 'string' ? entry.parameterId : ''
          ),
          value: fallbackValue,
          ...(Object.keys(valuesByLanguage).length > 0
            ? { valuesByLanguage }
            : {}),
        };
      });
    }
  );

  const addParameterValue = (): void => {
    markNonFormInteraction();
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => [
      ...prev,
      { parameterId: '', value: '' },
    ]);
  };

  const updateParameterId = (index: number, parameterId: string): void => {
    markNonFormInteraction();
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], parameterId };
      return next;
    });
  };

  const updateParameterValue = (index: number, value: string): void => {
    markNonFormInteraction();
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], value };
      return next;
    });
  };

  const updateParameterValueByLanguage = (
    index: number,
    languageCode: string,
    value: string
  ): void => {
    markNonFormInteraction();
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
      const next = [...prev];
      if (!next[index]) return prev;
      const normalizedLang = languageCode.trim().toLowerCase();
      if (!normalizedLang) return prev;
      const current = next[index];
      const currentValues =
        current.valuesByLanguage &&
        typeof current.valuesByLanguage === 'object' &&
        !Array.isArray(current.valuesByLanguage)
          ? { ...current.valuesByLanguage }
          : {};
      currentValues[normalizedLang] = value;
      next[index] = {
        ...current,
        valuesByLanguage: currentValues,
      };
      return next;
    });
  };

  const removeParameterValue = (index: number): void => {
    markNonFormInteraction();
    setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] =>
      prev.filter((_: ProductParameterValue, i: number): boolean => i !== index)
    );
  };

  const nonFormComparableKey = useMemo(() => {
    const comparableState: NonFormComparableState = {
      selectedCatalogIds: normalizeComparableStringList(selectedCatalogIds),
      selectedCategoryId: normalizeComparableNullableString(selectedCategoryId),
      selectedTagIds: normalizeComparableStringList(selectedTagIds),
      selectedProducerIds: normalizeComparableStringList(selectedProducerIds),
      selectedNoteIds: normalizeComparableStringList(selectedNoteIds),
      parameterValues: normalizeComparableParameterValues(parameterValues),
      imageSlots: imageSlots.map(toComparableImageSlot),
      imageLinks: imageLinks.map((value: string) => normalizeComparableString(value)),
      imageBase64s: imageBase64s.map((value: string) => normalizeComparableString(value)),
    };
    return serializeComparableState(comparableState);
  }, [
    imageBase64s,
    imageLinks,
    imageSlots,
    parameterValues,
    selectedCatalogIds,
    selectedCategoryId,
    selectedNoteIds,
    selectedProducerIds,
    selectedTagIds,
  ]);

  const [nonFormBaselineKey, setNonFormBaselineKey] = useState<string>(
    nonFormComparableKey
  );

  const entityIdentity = `${product?.id?.trim() ?? ''}:${draft?.id?.trim() ?? ''}`;

  useEffect(() => {
    if (lastEntityIdentityRef.current === entityIdentity) return;
    lastEntityIdentityRef.current = entityIdentity;
    nonFormDirtyTrackingLockedRef.current = false;
    setNonFormBaselineKey(nonFormComparableKey);
  }, [entityIdentity, nonFormComparableKey]);

  useEffect(() => {
    if (nonFormDirtyTrackingLockedRef.current) return;
    setNonFormBaselineKey((previous: string) =>
      previous === nonFormComparableKey ? previous : nonFormComparableKey
    );
  }, [nonFormComparableKey]);

  const {
    handleSubmit: submitHandler,
    uploading,
    uploadError,
    uploadSuccess,
    ConfirmationModal,
  } = useProductFormSubmit({
    product,
    methods,
    imageSlots,
    imageLinks,
    imageBase64s,
    selectedCatalogIds,
    selectedCategoryId,
    selectedTagIds,
    selectedProducerIds,
    selectedNoteIds,
    parameterValues,
    studioProjectId,
    refreshImages,
    onSuccess,
    onEditSave,
  });

  useEffect(() => {
    const becameSuccessful = uploadSuccess && !lastUploadSuccessRef.current;
    lastUploadSuccessRef.current = uploadSuccess;
    if (!becameSuccessful) return;

    reset(getValues());
    nonFormDirtyTrackingLockedRef.current = false;
    setNonFormBaselineKey(nonFormComparableKey);
  }, [getValues, nonFormComparableKey, reset, uploadSuccess]);

  const hasNonFormUnsavedChanges = nonFormComparableKey !== nonFormBaselineKey;
  const hasUnsavedChanges = isDirty || hasNonFormUnsavedChanges;

  const coreValue: ProductFormCoreContextType = useMemo(
    () => ({
      register,
      handleSubmit: submitHandler,
      hasUnsavedChanges,
      errors,
      setValue,
      getValues,
      selectedNoteIds,
      toggleNote,
      removeNote,
      generationError,
      setGenerationError,
      product,
      draft,
      ConfirmationModal,
    }),
    [
      register,
      submitHandler,
      hasUnsavedChanges,
      errors,
      setValue,
      getValues,
      selectedNoteIds,
      generationError,
      product,
      draft,
      ConfirmationModal,
    ]
  );

  const metadataValue: ProductFormMetadataContextType = useMemo(
    () => ({
      catalogs,
      catalogsLoading,
      catalogsError,
      selectedCatalogIds,
      toggleCatalog: trackedToggleCatalog,
      categories,
      categoriesLoading,
      selectedCategoryId,
      setCategoryId: trackedSetCategoryId,
      tags,
      tagsLoading,
      selectedTagIds,
      toggleTag: trackedToggleTag,
      producers,
      producersLoading,
      selectedProducerIds,
      toggleProducer: trackedToggleProducer,
      filteredLanguages,
      filteredPriceGroups,
    }),
    [
      catalogs,
      catalogsLoading,
      catalogsError,
      selectedCatalogIds,
      categories,
      categoriesLoading,
      selectedCategoryId,
      tags,
      tagsLoading,
      selectedTagIds,
      producers,
      producersLoading,
      selectedProducerIds,
      filteredLanguages,
      filteredPriceGroups,
    ]
  );

  const imageValue: ProductFormImageContextType = useMemo(
    () => ({
      imageSlots,
      imageLinks,
      imageBase64s,
      uploading,
      uploadError,
      uploadSuccess,
      showFileManager,
      setShowFileManager,
      handleSlotImageChange: trackedHandleSlotImageChange,
      handleSlotFileSelect: trackedHandleSlotFileSelect,
      handleSlotDisconnectImage: trackedHandleSlotDisconnectImage,
      handleMultiImageChange: trackedHandleMultiImageChange,
      handleMultiFileSelect: trackedHandleMultiFileSelect,
      swapImageSlots: trackedSwapImageSlots,
      setImageLinkAt: trackedSetImageLinkAt,
      setImageBase64At: trackedSetImageBase64At,
      setImagesReordering,
      refreshImagesFromProduct: refreshImages,
    }),
    [
      imageSlots,
      imageLinks,
      imageBase64s,
      uploading,
      uploadError,
      uploadSuccess,
      showFileManager,
      setImagesReordering,
      refreshImages,
    ]
  );

  const parameterValue: ProductFormParameterContextType = useMemo(
    () => ({
      parameters,
      parametersLoading,
      parameterValues,
      addParameterValue,
      updateParameterId,
      updateParameterValue,
      updateParameterValueByLanguage,
      removeParameterValue,
    }),
    [parameters, parametersLoading, parameterValues]
  );

  const studioValue: ProductFormStudioContextType = useMemo(
    () => ({
      studioProjectId,
      setStudioProjectId,
      studioConfigLoading,
      studioConfigSaving,
    }),
    [studioProjectId, studioConfigLoading, studioConfigSaving]
  );
  const legacyContextValue: ProductFormContextType = useMemo(
    () => ({
      ...coreValue,
      ...metadataValue,
      ...imageValue,
      ...parameterValue,
      ...studioValue,
    }),
    [coreValue, imageValue, metadataValue, parameterValue, studioValue]
  );

  return (
    <FormProvider {...methods}>
      <ProductFormContext.Provider value={legacyContextValue}>
        <ProductFormCoreContext.Provider value={coreValue}>
          <ProductFormMetadataContext.Provider value={metadataValue}>
            <ProductFormImageContext.Provider value={imageValue}>
              <ProductFormParameterContext.Provider value={parameterValue}>
                <ProductFormStudioContext.Provider value={studioValue}>
                  {children}
                </ProductFormStudioContext.Provider>
              </ProductFormParameterContext.Provider>
            </ProductFormImageContext.Provider>
          </ProductFormMetadataContext.Provider>
        </ProductFormCoreContext.Provider>
      </ProductFormContext.Provider>
    </FormProvider>
  );
}
