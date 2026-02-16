'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  BaseSyntheticEvent,
} from 'react';
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormGetValues,
  FieldErrors,
  FormProvider,
  useForm,
  Resolver,
} from 'react-hook-form';

import { PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY } from '@/features/products/constants';
import { useProductFormSubmit } from '@/features/products/hooks/useProductFormSubmit';
import { useProductImages } from '@/features/products/hooks/useProductImages';
import { useProductMetadata } from '@/features/products/hooks/useProductMetadata';
import type {
  CatalogRecord,
  ProductWithImages,
  PriceGroupWithDetails,
  ProductFormData,
  ProductDraft,
} from '@/features/products/types';
import type { ProductCategory, ProductTag, ProductParameter, ProductParameterValue, Producer } from '@/features/products/types';
import {
  ProductImageSlot,
} from '@/features/products/types/products-ui';
import {
  productCreateSchema,
  productUpdateSchema,
} from '@/features/products/validations/schemas';
import { internalError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import type { ImageFileSelection } from '@/shared/types/domain/files';
import type { Language } from '@/shared/types/domain/internationalization';
import { useToast } from '@/shared/ui';

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

export interface ProductFormContextType {
  register: UseFormRegister<ProductFormData>;
  handleSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  errors: FieldErrors<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  getValues: UseFormGetValues<ProductFormData>;
  imageSlots: (ProductImageSlot | null)[];
  imageLinks: string[];
  imageBase64s: string[];
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleSlotImageChange: (file: File | null, index: number) => void;
  handleSlotFileSelect: (file: ImageFileSelection | null, index: number) => void;
  handleSlotDisconnectImage: (index: number) => Promise<void>;
  handleMultiImageChange: (files: File[]) => void;
  handleMultiFileSelect: (files: ImageFileSelection[]) => void;
  swapImageSlots: (fromIndex: number, toIndex: number) => void;
  setImageLinkAt: (index: number, value: string) => void;
  setImageBase64At: (index: number, value: string) => void;
  setImagesReordering: (reordering: boolean) => void;
  catalogs: CatalogRecord[];
  catalogsLoading: boolean;
  catalogsError: string | null;
  selectedCatalogIds: string[];
  toggleCatalog: (catalogId: string) => void;
  categories: ProductCategory[];
  categoriesLoading: boolean;
  selectedCategoryId: string | null;
  setCategoryId: (categoryId: string | null) => void;
  tags: ProductTag[];
  tagsLoading: boolean;
  selectedTagIds: string[];
  toggleTag: (tagId: string) => void;
  producers: Producer[];
  producersLoading: boolean;
  selectedProducerIds: string[];
  toggleProducer: (producerId: string) => void;
  selectedNoteIds: string[];
  toggleNote: (noteId: string) => void;
  removeNote: (noteId: string) => void;
  parameters: ProductParameter[];
  parametersLoading: boolean;
  parameterValues: ProductParameterValue[];
  addParameterValue: () => void;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
  removeParameterValue: (index: number) => void;
  filteredLanguages: Language[];
  filteredPriceGroups: PriceGroupWithDetails[];
  generationError: string | null;
  setGenerationError: (error: string | null) => void;
  studioProjectId: string | null;
  setStudioProjectId: (projectId: string | null) => void;
  studioConfigLoading: boolean;
  studioConfigSaving: boolean;
  refreshImagesFromProduct: (savedProduct: ProductWithImages) => void;
  product?: ProductWithImages | undefined;
  draft?: ProductDraft | null | undefined;
}

export const ProductFormContext = createContext<ProductFormContextType | null>(
  null
);

export const useProductFormContext = (): ProductFormContextType => {
  const context = useContext(ProductFormContext);
  if (!context) {
    throw internalError(
      'useProductFormContext must be used within a ProductFormProvider'
    );
  }
  return context;
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
    formState: { errors },
    setValue,
    getValues,
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
      const fallbackProjectId = currentStudioProjectRef.current ?? defaultStudioProjectId;
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

  const toggleNote = (noteId: string): void => {
    const id = noteId.trim();
    if (!id) return;
    setSelectedNoteIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((n: string) => n !== id) : [...prev, id]
    );
  };

  const removeNote = (noteId: string): void => {
    const id = noteId.trim();
    if (!id) return;
    setSelectedNoteIds((prev: string[]) => prev.filter((n: string) => n !== id));
  };

  const normalizeParameterValues = (
    input?: ProductParameterValue[] | null
  ): ProductParameterValue[] => {
    if (!Array.isArray(input)) return [];
    return input.map((entry: ProductParameterValue) => ({
      parameterId: typeof entry?.parameterId === 'string' ? entry.parameterId : '',
      value: typeof entry?.value === 'string' ? entry.value : '',
      ...(entry?.valuesByLanguage &&
      typeof entry.valuesByLanguage === 'object' &&
      !Array.isArray(entry.valuesByLanguage)
        ? { valuesByLanguage: entry.valuesByLanguage }
        : {}),
    }));
  };

  const [parameterValues, setParameterValues] = useState<ProductParameterValue[]>(
    () => normalizeParameterValues(product?.parameters ?? draft?.parameters ?? [])
  );

  const { handleSubmit: submitHandler, uploading, uploadError, uploadSuccess } = useProductFormSubmit({
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

  return (
    <FormProvider {...methods}>
      <ProductFormContext.Provider
        value={{
          register,
          handleSubmit: submitHandler,
          errors,
          setValue,
          getValues,
          imageSlots,
          imageLinks,
          imageBase64s,
          uploading,
          uploadError,
          uploadSuccess,
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
          setImagesReordering,
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
          selectedNoteIds,
          toggleNote,
          removeNote,
          parameters,
          parametersLoading,
          parameterValues,
          addParameterValue: (): void =>
            setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => [...prev, { parameterId: '', value: '' }]),
          updateParameterId: (index: number, parameterId: string): void =>
            setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
              const next = [...prev];
              if (!next[index]) return prev;
              next[index] = { ...next[index], parameterId };
              return next;
            }),
          updateParameterValue: (index: number, value: string): void =>
            setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
              const next = [...prev];
              if (!next[index]) return prev;
              next[index] = { ...next[index], value };
              return next;
            }),
          removeParameterValue: (index: number): void =>
            setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => prev.filter((_: ProductParameterValue, i: number): boolean => i !== index)),
          filteredLanguages,
          filteredPriceGroups,
          generationError,
          setGenerationError,
          studioProjectId,
          setStudioProjectId,
          studioConfigLoading,
          studioConfigSaving,
          refreshImagesFromProduct: refreshImages,
          product,
          draft,
        }}
      >
        {children}
      </ProductFormContext.Provider>
    </FormProvider>
  );
}
