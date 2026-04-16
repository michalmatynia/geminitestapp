'use client';

// ProductFormContext: high-level composition of form-related contexts used by
// the product editor. Wires together Core, Metadata, Image, Parameter and
// CustomField contexts so nested form tabs can access shared helpers and
// the current editing product snapshot.

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFormState } from 'react-hook-form';

import {
  isEditingProductHydrated,
  warnNonHydratedEditProduct,
} from '@/features/products/hooks/editingProductHydration';
import { useProductFormSubmit } from '@/features/products/hooks/useProductFormSubmit';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { internalError } from '@/shared/errors/app-error';

import {
  ProductFormCoreProvider,
  useProductFormCoreActions,
  useProductFormCoreState,
} from './ProductFormCoreContext';
import { ProductFormImageProvider, useProductFormImages } from './ProductFormImageContext';
import { ProductFormMetadataProvider, useProductFormMetadata } from './ProductFormMetadataContext';
import {
  ProductFormCustomFieldProvider,
  useProductFormCustomFields,
} from './ProductFormCustomFieldContext';
import {
  ProductFormParameterProvider,
  useProductFormParameters,
} from './ProductFormParameterContext';
import { ProductFormStudioProvider, useProductFormStudio } from './ProductFormStudioContext';
import { serializeNonFormComparableState } from './ProductFormContext.dirty-tracking';

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
  const { customFieldValues } = useProductFormCustomFields();
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
      customFieldValues,
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

  const nonFormComparableKey = useMemo(
    () =>
      serializeNonFormComparableState({
        selectedCatalogIds,
        selectedCategoryId,
        selectedTagIds,
        selectedProducerIds,
        selectedNoteIds,
        customFieldValues,
        parameterValues,
        imageSlots,
        imageLinks,
        imageBase64s,
      }),
    [
      imageBase64s,
      imageLinks,
      imageSlots,
    customFieldValues,
    parameterValues,
    selectedCatalogIds,
      selectedCategoryId,
      selectedNoteIds,
      selectedProducerIds,
      selectedTagIds,
    ]
  );

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
      <ProductFormCustomFieldProviderWrapper onInteraction={onInteraction}>
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
      </ProductFormCustomFieldProviderWrapper>
    </ProductFormMetadataProvider>
  );
}

function ProductFormCustomFieldProviderWrapper(props: {
  children: React.ReactNode;
  onInteraction: () => void;
}) {
  const { children, onInteraction } = props;

  const { product, draft } = useProductFormProviderConfigContext();
  return (
    <ProductFormCustomFieldProvider product={product} draft={draft} onInteraction={onInteraction}>
      {children}
    </ProductFormCustomFieldProvider>
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
