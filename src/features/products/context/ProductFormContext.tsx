'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useProductFormSubmit } from '@/features/products/hooks/useProductFormSubmit';
import { decodeSimpleParameterStorageId } from '@/features/products/utils/parameter-partition';
import {
  ProductParameterValue,
} from '@/shared/contracts/products';
import type {
  ProductWithImages,
  ProductDraft,
} from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';

import {
  ProductFormCoreContextType,
  ProductFormCoreProvider,
  useProductFormCore,
} from './ProductFormCoreContext';
import {
  ProductFormImageContextType,
  ProductFormImageProvider,
  useProductFormImages,
} from './ProductFormImageContext';
import {
  ProductFormMetadataContextType,
  ProductFormMetadataProvider,
  useProductFormMetadata,
} from './ProductFormMetadataContext';
import {
  ProductFormParameterContextType,
  ProductFormParameterProvider,
  useProductFormParameters,
} from './ProductFormParameterContext';
import {
  ProductFormStudioContextType,
  ProductFormStudioProvider,
  useProductFormStudio,
} from './ProductFormStudioContext';

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

const toComparableImageSlot = (slot: unknown): string => {
  if (!slot || typeof slot !== 'object') return '';
  const slotRecord = slot as { type?: unknown; data?: unknown };
  if (slotRecord.type === 'existing') {
    const existingRecord =
      slotRecord.data && typeof slotRecord.data === 'object'
        ? (slotRecord.data as Record<string, unknown>)
        : {};
    return `existing:${normalizeComparableString(existingRecord['id'])}`;
  }
  const fileRecord =
    slotRecord.data && typeof slotRecord.data === 'object'
      ? (slotRecord.data as Record<string, unknown>)
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
    ProductFormStudioContextType,
    ProductFormSubmitContextType {}

export type ProductFormSubmitContextType = Pick<
  ProductFormCoreContextType,
  'handleSubmit' | 'ConfirmationModal'
>;

export const ProductFormSubmitContext =
  createContext<ProductFormSubmitContextType | null>(null);

export const useProductFormSubmitContext = (): ProductFormSubmitContextType => {
  const context = useContext(ProductFormSubmitContext);
  if (!context) {
    throw internalError(
      'useProductFormSubmitContext must be used within a ProductFormSubmitContext provider'
    );
  }
  return context;
};

export const useProductFormContext = (): ProductFormContextType => {
  const core = useProductFormCore();
  const metadata = useProductFormMetadata();
  const images = useProductFormImages();
  const parameters = useProductFormParameters();
  const studio = useProductFormStudio();
  const submit = useProductFormSubmitContext();

  return useMemo(
    () => ({
      ...core,
      ...metadata,
      ...images,
      ...parameters,
      ...studio,
      ...submit,
    }),
    [core, metadata, images, parameters, studio, submit]
  );
};

function ProductFormSubmitController({
  onSuccess,
  onEditSave,
  children,
  nonFormDirtyTrackingLockedRef,
}: {
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
  children: React.ReactNode;
  nonFormDirtyTrackingLockedRef: { current: boolean };
}) {
  const {
    methods,
    setHasUnsavedChanges,
    product,
    selectedNoteIds,
    setUploading,
    setUploadError,
    setUploadSuccess,
  } = useProductFormCore();
  const {
    selectedCatalogIds,
    selectedCategoryId,
    selectedTagIds,
    selectedProducerIds,
  } = useProductFormMetadata();
  const {
    imageSlots,
    imageLinks,
    imageBase64s,
    refreshImagesFromProduct,
  } = useProductFormImages();
  const { parameterValues } = useProductFormParameters();
  const { studioProjectId } = useProductFormStudio();

  const {
    handleSubmit,
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
    refreshImages: refreshImagesFromProduct,
    onSuccess,
    onEditSave,
  });

  useEffect(() => {
    setUploading(uploading);
  }, [uploading, setUploading]);

  useEffect(() => {
    setUploadError(uploadError);
  }, [uploadError, setUploadError]);

  useEffect(() => {
    setUploadSuccess(uploadSuccess);
  }, [uploadSuccess, setUploadSuccess]);

  // Dirty tracking
  const lastEntityIdentityRef = useRef<string>('');
  const lastUploadSuccessRef = useRef<boolean>(false);

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

  const entityIdentity = `${product?.id?.trim() ?? ''}`;

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

  useEffect(() => {
    const becameSuccessful = uploadSuccess && !lastUploadSuccessRef.current;
    lastUploadSuccessRef.current = uploadSuccess;
    if (!becameSuccessful) return;

    methods.reset(methods.getValues());
    nonFormDirtyTrackingLockedRef.current = false;
    setNonFormBaselineKey(nonFormComparableKey);
  }, [methods, nonFormComparableKey, uploadSuccess]);

  const isDirty = methods.formState.isDirty;
  const hasNonFormUnsavedChanges = nonFormComparableKey !== nonFormBaselineKey;
  const hasUnsavedChanges = isDirty || hasNonFormUnsavedChanges;

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  const submitContextValue = useMemo(
    () => ({
      handleSubmit,
      ConfirmationModal,
    }),
    [
      handleSubmit,
      ConfirmationModal,
    ]
  );

  return (
    <ProductFormSubmitContext.Provider value={submitContextValue}>
      {children}
    </ProductFormSubmitContext.Provider>
  );
}

// Internal provider to pass markNonFormInteraction to sub-providers
const ProductFormInteractionContext = createContext<(() => void) | null>(null);

function ProductFormInteractionProvider({
  onInteraction,
  children,
}: {
  onInteraction: () => void;
  children: React.ReactNode;
}) {
  return (
    <ProductFormInteractionContext.Provider value={onInteraction}>
      {children}
    </ProductFormInteractionContext.Provider>
  );
}

function useProductFormInteraction() {
  return useContext(ProductFormInteractionContext);
}

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
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
  requireSku?: boolean;
  initialSku?: string;
  initialCatalogId?: string;
}): React.ReactNode {
  return (
    <ProductFormCoreProvider
      product={product}
      draft={draft}
      requireSku={requireSku}
      initialSku={initialSku}
    >
      <ProductFormSubProviders
        product={product}
        draft={draft}
        initialCatalogId={initialCatalogId}
        onSuccess={onSuccess}
        onEditSave={onEditSave}
      >
        {children}
      </ProductFormSubProviders>
    </ProductFormCoreProvider>
  );
}

function ProductFormSubProviders({
  children,
  product,
  draft,
  initialCatalogId,
  onSuccess,
  onEditSave,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialCatalogId?: string;
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
}) {
  const nonFormDirtyTrackingLockedRef = useRef<boolean>(false);
  const markNonFormInteraction = (): void => {
    nonFormDirtyTrackingLockedRef.current = true;
  };

  return (
    <ProductFormInteractionProvider onInteraction={markNonFormInteraction}>
      <ProductFormSubProvidersInner
        product={product}
        draft={draft}
        initialCatalogId={initialCatalogId}
        onSuccess={onSuccess}
        onEditSave={onEditSave}
        nonFormDirtyTrackingLockedRef={nonFormDirtyTrackingLockedRef}
      >
        {children}
      </ProductFormSubProvidersInner>
    </ProductFormInteractionProvider>
  );
}

function ProductFormSubProvidersInner({
  children,
  product,
  draft,
  initialCatalogId,
  onSuccess,
  onEditSave,
  nonFormDirtyTrackingLockedRef,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialCatalogId?: string;
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
  nonFormDirtyTrackingLockedRef: { current: boolean };
}) {
  const onInteraction = useProductFormInteraction() || (() => {});
  const { uploading, uploadError, uploadSuccess } = useProductFormCore();
  
  return (
    <ProductFormMetadataProvider
      product={product}
      draft={draft}
      initialCatalogId={initialCatalogId}
      onInteraction={onInteraction}
    >
      <ProductFormParameterProviderWrapper product={product} draft={draft} onInteraction={onInteraction}>
        <ProductFormStudioProvider product={product}>
          <ProductFormImageProvider
            product={product}
            draft={draft}
            uploading={uploading}
            uploadError={uploadError}
            uploadSuccess={uploadSuccess}
            onInteraction={onInteraction}
          >
            <ProductFormSubmitController
              onSuccess={onSuccess}
              onEditSave={onEditSave}
              nonFormDirtyTrackingLockedRef={nonFormDirtyTrackingLockedRef}
            >
              {children}
            </ProductFormSubmitController>
          </ProductFormImageProvider>
        </ProductFormStudioProvider>
      </ProductFormParameterProviderWrapper>
    </ProductFormMetadataProvider>
  );
}

function ProductFormParameterProviderWrapper({ children, product, draft, onInteraction }: { children: React.ReactNode, product?: ProductWithImages, draft?: ProductDraft | null, onInteraction: () => void }) {
  const { selectedCatalogIds } = useProductFormMetadata();
  return (
    <ProductFormParameterProvider
      product={product}
      draft={draft}
      selectedCatalogIds={selectedCatalogIds}
      onInteraction={onInteraction}
    >
      {children}
    </ProductFormParameterProvider>
  );
}
