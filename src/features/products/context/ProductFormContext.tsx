'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFormState } from 'react-hook-form';

import {
  isEditingProductHydrated,
  warnNonHydratedEditProduct,
} from '@/features/products/hooks/editingProductHydration';
import { useProductFormSubmit } from '@/features/products/hooks/useProductFormSubmit';
import { ProductParameterValue } from '@/shared/contracts/products';
import type { ProductWithImages, ProductDraft } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import {
  normalizeParameterValuesByLanguage,
  resolveStoredParameterValue,
} from '@/shared/lib/products/utils/parameter-values';

import {
  ProductFormCoreProvider,
  useProductFormCoreActions,
  useProductFormCoreState,
} from './ProductFormCoreContext';
import { ProductFormImageProvider, useProductFormImages } from './ProductFormImageContext';
import { ProductFormMetadataProvider, useProductFormMetadata } from './ProductFormMetadataContext';
import {
  ProductFormParameterProvider,
  useProductFormParameters,
} from './ProductFormParameterContext';
import { ProductFormStudioProvider, useProductFormStudio } from './ProductFormStudioContext';

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
      const valuesByLanguage = normalizeParameterValuesByLanguage(entry.valuesByLanguage);
      const directValue = normalizeComparableString(entry.value);
      const normalizedParameterId = decodeSimpleParameterStorageId(
        normalizeComparableString(entry.parameterId)
      );
      return {
        parameterId: normalizedParameterId || '',
        value: resolveStoredParameterValue(valuesByLanguage, directValue),
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

export type ProductFormSubmitContextType = {
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  ConfirmationModal: React.ComponentType;
};

type ProductFormProviderConfigContextType = {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialCatalogId?: string;
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
  requireHydratedEditProduct?: boolean;
  suppressNonHydratedEditWarning?: boolean;
  nonFormDirtyTrackingLockedRef: { current: boolean };
};

type ProductFormProviderRuntimeValue = {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
};

export const ProductFormSubmitContext = createContext<ProductFormSubmitContextType | null>(null);
export const ProductFormProviderRuntimeContext =
  createContext<ProductFormProviderRuntimeValue | null>(null);
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

function ProductFormSubmitController(props: { children: React.ReactNode }) {
  const { children } = props;

  const { onSuccess, onEditSave, nonFormDirtyTrackingLockedRef, requireHydratedEditProduct } =
    useProductFormProviderConfigContext();
  const {
    methods,
    product,
    selectedNoteIds,
  } = useProductFormCoreState();
  const {
    setHasUnsavedChanges,
    setHandleSubmit,
    setConfirmationModal,
    setUploading,
    setUploadError,
    setUploadSuccess,
  } = useProductFormCoreActions();
  const { selectedCatalogIds, selectedCategoryId, selectedTagIds, selectedProducerIds } =
    useProductFormMetadata();
  const { imageSlots, imageLinks, imageBase64s, refreshImagesFromProduct } = useProductFormImages();
  const { parameterValues } = useProductFormParameters();
  const { studioProjectId } = useProductFormStudio();

  const {
    handleSubmit: submitHandleSubmit,
    uploading,
    uploadError,
    uploadSuccess,
    ConfirmationModal: submitConfirmationModal,
  } =
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

  useEffect(() => {
    setHandleSubmit(submitHandleSubmit);

    return (): void => {
      setHandleSubmit(async () => {});
    };
  }, [submitHandleSubmit, setHandleSubmit]);

  useEffect(() => {
    setConfirmationModal(submitConfirmationModal);

    return (): void => {
      setConfirmationModal(() => null);
    };
  }, [submitConfirmationModal, setConfirmationModal]);

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
      handleSubmit: submitHandleSubmit,
      ConfirmationModal: submitConfirmationModal,
    }),
    [submitHandleSubmit, submitConfirmationModal]
  );

  return (
    <ProductFormSubmitContext.Provider value={submitContextValue}>
      {children}
    </ProductFormSubmitContext.Provider>
  );
}

// Internal provider to pass markNonFormInteraction to sub-providers
const ProductFormInteractionContext = createContext<(() => void) | null>(null);

function ProductFormInteractionProvider(props: {
  onInteraction: () => void;
  children: React.ReactNode;
}) {
  const { onInteraction, children } = props;

  return (
    <ProductFormInteractionContext.Provider value={onInteraction}>
      {children}
    </ProductFormInteractionContext.Provider>
  );
}

function useProductFormInteraction() {
  return useContext(ProductFormInteractionContext);
}

export function ProductFormProvider(props: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
  requireSku?: boolean;
  requireHydratedEditProduct?: boolean;
  suppressNonHydratedEditWarning?: boolean;
  initialSku?: string;
  initialCatalogId?: string;
  validatorSessionKey?: string;
}): React.ReactNode {
  const {
    children,
    product,
    draft,
    onSuccess,
    onEditSave,
    requireSku = true,
    requireHydratedEditProduct = false,
    suppressNonHydratedEditWarning = false,
    initialSku,
    initialCatalogId,
    validatorSessionKey,
  } = props;

  const runtime = useContext(ProductFormProviderRuntimeContext);
  const resolvedProduct = product ?? runtime?.product;
  const resolvedDraft = draft ?? runtime?.draft;
  const nonFormDirtyTrackingLockedRef = useRef<boolean>(false);
  const providerConfigContextValue = useMemo(
    (): ProductFormProviderConfigContextType => ({
      product: resolvedProduct,
      draft: resolvedDraft,
      initialCatalogId,
      onSuccess,
      onEditSave,
      requireHydratedEditProduct,
      suppressNonHydratedEditWarning,
      nonFormDirtyTrackingLockedRef,
    }),
    [
      initialCatalogId,
      onEditSave,
      onSuccess,
      requireHydratedEditProduct,
      suppressNonHydratedEditWarning,
      resolvedDraft,
      resolvedProduct,
    ]
  );

  return (
    <ProductFormCoreProvider
      product={resolvedProduct}
      draft={resolvedDraft}
      requireSku={requireSku}
      initialSku={initialSku}
      validatorSessionKey={validatorSessionKey}
    >
      <ProductFormProviderConfigContext.Provider value={providerConfigContextValue}>
        <ProductFormSubProviders>{children}</ProductFormSubProviders>
      </ProductFormProviderConfigContext.Provider>
    </ProductFormCoreProvider>
  );
}

function ProductFormSubProviders(props: { children: React.ReactNode }) {
  const { children } = props;

  const {
    product,
    requireHydratedEditProduct,
    suppressNonHydratedEditWarning,
    nonFormDirtyTrackingLockedRef,
  } =
    useProductFormProviderConfigContext();
  const markNonFormInteraction = (): void => {
    nonFormDirtyTrackingLockedRef.current = true;
  };

  const hydratedWarnedRef = useRef(false);
  useEffect(() => {
    if (!requireHydratedEditProduct) return;
    if (!product) return;
    if (isEditingProductHydrated(product)) return;
    if (suppressNonHydratedEditWarning) return;
    if (hydratedWarnedRef.current) return;
    hydratedWarnedRef.current = true;
    warnNonHydratedEditProduct(product);
  }, [product, requireHydratedEditProduct, suppressNonHydratedEditWarning]);

  return (
    <ProductFormInteractionProvider onInteraction={markNonFormInteraction}>
      <ProductFormSubProvidersInner>{children}</ProductFormSubProvidersInner>
    </ProductFormInteractionProvider>
  );
}

function ProductFormSubProvidersInner(props: { children: React.ReactNode }) {
  const { children } = props;

  const { product, draft, initialCatalogId } = useProductFormProviderConfigContext();
  const onInteraction = useProductFormInteraction() || (() => {});
  const { uploading, uploadError, uploadSuccess } = useProductFormCoreState();

  return (
    <ProductFormMetadataProvider
      product={product}
      draft={draft}
      initialCatalogId={initialCatalogId}
      onInteraction={onInteraction}
    >
      <ProductFormParameterProviderWrapper onInteraction={onInteraction}>
        <ProductFormStudioProvider product={product}>
          <ProductFormImageProvider
            product={product}
            draft={draft}
            uploading={uploading}
            uploadError={uploadError}
            uploadSuccess={uploadSuccess}
            onInteraction={onInteraction}
          >
            <ProductFormSubmitController>{children}</ProductFormSubmitController>
          </ProductFormImageProvider>
        </ProductFormStudioProvider>
      </ProductFormParameterProviderWrapper>
    </ProductFormMetadataProvider>
  );
}

function ProductFormParameterProviderWrapper(props: {
  children: React.ReactNode;
  onInteraction: () => void;
}) {
  const { children, onInteraction } = props;

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
