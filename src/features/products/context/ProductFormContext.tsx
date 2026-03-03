'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFormState } from 'react-hook-form';

import { useProductFormSubmit } from '@/features/products/hooks/useProductFormSubmit';
import {
  isEditingProductHydrated,
  warnNonHydratedEditProduct,
} from '@/features/products/hooks/editingProductHydration';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import { ProductParameterValue } from '@/shared/contracts/products';
import type { ProductWithImages, ProductDraft } from '@/shared/contracts/products';
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
          ? Object.entries(entry.valuesByLanguage).reduce(
            (acc: Record<string, string>, [lang, value]: [string, unknown]) => {
              const normalizedLang = normalizeComparableString(lang).toLowerCase();
              const normalizedValue = normalizeComparableString(value);
              if (!normalizedLang || !normalizedValue) return acc;
              acc[normalizedLang] = normalizedValue;
              return acc;
            },
              {} as Record<string, string>
          )
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
        ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
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
    typeof sizeValue === 'number' && Number.isFinite(sizeValue) ? String(sizeValue) : '0',
    normalizeComparableString(fileRecord['type']),
    typeof lastModifiedValue === 'number' && Number.isFinite(lastModifiedValue)
      ? String(lastModifiedValue)
      : '0',
  ].join(':');
};

const serializeComparableState = (value: NonFormComparableState): string => JSON.stringify(value);

export interface ProductFormContextType
  extends
    ProductFormCoreContextType,
    ProductFormMetadataContextType,
    ProductFormImageContextType,
    ProductFormParameterContextType,
    ProductFormStudioContextType,
    ProductFormSubmitContextType {}

export type ProductFormSubmitContextType = Pick<
  ProductFormCoreContextType,
  'handleSubmit' | 'ConfirmationModal'
>;

type ProductFormProviderConfigContextType = {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialCatalogId?: string;
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
  requireHydratedEditProduct?: boolean;
  nonFormDirtyTrackingLockedRef: { current: boolean };
};

export const ProductFormSubmitContext = createContext<ProductFormSubmitContextType | null>(null);
const ProductFormProviderConfigContext = createContext<ProductFormProviderConfigContextType | null>(
  null
);

export const useProductFormSubmitContext = (): ProductFormSubmitContextType => {
  const context = useContext(ProductFormSubmitContext);
  if (!context) {
    throw internalError(
      'useProductFormSubmitContext must be used within a ProductFormSubmitContext provider'
    );
  }
  return context;
};

const useProductFormProviderConfigContext = (): ProductFormProviderConfigContextType => {
  const context = useContext(ProductFormProviderConfigContext);
  if (!context) {
    throw internalError(
      'useProductFormProviderConfigContext must be used within a ProductFormProviderConfigContext provider'
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
  children,
}: {
  children: React.ReactNode;
}) {
  const { onSuccess, onEditSave, nonFormDirtyTrackingLockedRef, requireHydratedEditProduct } =
    useProductFormProviderConfigContext();
  const {
    methods,
    setHasUnsavedChanges,
    product,
    selectedNoteIds,
    setUploading,
    setUploadError,
    setUploadSuccess,
  } = useProductFormCore();
  const { selectedCatalogIds, selectedCategoryId, selectedTagIds, selectedProducerIds } =
    useProductFormMetadata();
  const { imageSlots, imageLinks, imageBase64s, refreshImagesFromProduct } = useProductFormImages();
  const { parameterValues } = useProductFormParameters();
  const { studioProjectId } = useProductFormStudio();

  const { handleSubmit, uploading, uploadError, uploadSuccess, ConfirmationModal } =
    useProductFormSubmit({
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
      requireHydratedEditProduct,
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

  const [nonFormBaselineKey, setNonFormBaselineKey] = useState<string>(nonFormComparableKey);

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

  const { isDirty } = useFormState({ control: methods.control });
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
    [handleSubmit, ConfirmationModal]
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
  requireHydratedEditProduct = false,
  initialSku,
  initialCatalogId,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
  requireSku?: boolean;
  requireHydratedEditProduct?: boolean;
  initialSku?: string;
  initialCatalogId?: string;
}): React.ReactNode {
  const nonFormDirtyTrackingLockedRef = useRef<boolean>(false);
  const providerConfigContextValue = useMemo(
    (): ProductFormProviderConfigContextType => ({
      product,
      draft,
      initialCatalogId,
      onSuccess,
      onEditSave,
      requireHydratedEditProduct,
      nonFormDirtyTrackingLockedRef,
    }),
    [product, draft, initialCatalogId, onSuccess, onEditSave, requireHydratedEditProduct]
  );

  return (
    <ProductFormCoreProvider
      product={product}
      draft={draft}
      requireSku={requireSku}
      initialSku={initialSku}
    >
      <ProductFormProviderConfigContext.Provider value={providerConfigContextValue}>
        <ProductFormSubProviders>{children}</ProductFormSubProviders>
      </ProductFormProviderConfigContext.Provider>
    </ProductFormCoreProvider>
  );
}

function ProductFormSubProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const { product, requireHydratedEditProduct, nonFormDirtyTrackingLockedRef } =
    useProductFormProviderConfigContext();
  const markNonFormInteraction = (): void => {
    nonFormDirtyTrackingLockedRef.current = true;
  };

  // Provider-level hydration guard: fires once on mount when a non-hydrated product
  // reaches this provider with requireHydratedEditProduct=true.
  // The ref prevents duplicate logs on re-renders.
  const hydratedWarnedRef = useRef(false);
  useEffect(() => {
    if (!requireHydratedEditProduct) return;
    if (!product) return;
    if (isEditingProductHydrated(product)) return;
    if (hydratedWarnedRef.current) return;
    hydratedWarnedRef.current = true;
    warnNonHydratedEditProduct(product);
  }, [requireHydratedEditProduct, product]);

  return (
    <ProductFormInteractionProvider onInteraction={markNonFormInteraction}>
      <ProductFormSubProvidersInner>{children}</ProductFormSubProvidersInner>
    </ProductFormInteractionProvider>
  );
}

function ProductFormSubProvidersInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { product, draft, initialCatalogId } = useProductFormProviderConfigContext();
  const onInteraction = useProductFormInteraction() || (() => {});
  const { uploading, uploadError, uploadSuccess } = useProductFormCore();

  return (
    <ProductFormMetadataProvider
      product={product}
      draft={draft}
      initialCatalogId={initialCatalogId}
      onInteraction={onInteraction}
    >
      <ProductFormParameterProviderWrapper
        onInteraction={onInteraction}
      >
        <ProductFormStudioProvider product={product}>
          <ProductFormImageProvider
            product={product}
            draft={draft}
            uploading={uploading}
            uploadError={uploadError}
            uploadSuccess={uploadSuccess}
            onInteraction={onInteraction}
          >
            <ProductFormSubmitController>
              {children}
            </ProductFormSubmitController>
          </ProductFormImageProvider>
        </ProductFormStudioProvider>
      </ProductFormParameterProviderWrapper>
    </ProductFormMetadataProvider>
  );
}

function ProductFormParameterProviderWrapper({
  children,
  onInteraction,
}: {
  children: React.ReactNode;
  onInteraction: () => void;
}) {
  const { product, draft } = useProductFormProviderConfigContext();
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
