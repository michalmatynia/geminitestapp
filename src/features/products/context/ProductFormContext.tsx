'use client';

// ProductFormContext: high-level composition of form-related contexts used by
// the product editor. Wires together Core, Metadata, Image, Parameter and
// CustomField contexts so nested form tabs can access shared helpers and
// the current editing product snapshot.

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';

import {
  isEditingProductHydrated,
  warnNonHydratedEditProduct,
} from '@/features/products/hooks/editingProductHydration';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';

import {
  ProductFormCoreProvider,
  useProductFormCoreState,
} from './ProductFormCoreContext';
import { ProductFormImageProvider } from './ProductFormImageContext';
import { ProductFormMetadataProvider, useProductFormMetadata } from './ProductFormMetadataContext';
import { ProductFormCustomFieldProvider } from './ProductFormCustomFieldContext';
import { ProductFormParameterProvider } from './ProductFormParameterContext';
import { ProductFormStudioProvider } from './ProductFormStudioContext';
import {
  ProductFormProviderConfigContext,
  ProductFormProviderRuntimeContext,
  useProductFormProviderConfigContext,
  type ProductFormProviderConfigContextType,
} from './ProductFormProviderConfigContext';
import { ProductFormSubmitController } from './ProductFormSubmitContext';

export { ProductFormProviderRuntimeContext } from './ProductFormProviderConfigContext';
export {
  ProductFormSubmitContext,
  useProductFormSubmitContext,
  type ProductFormSubmitContextType,
} from './ProductFormSubmitContext';

// Internal provider to pass markNonFormInteraction to sub-providers
const ProductFormInteractionContext = createContext<(() => void) | null>(null);

type ProductFormProviderProps = {
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
};

function ProductFormInteractionProvider(props: {
  onInteraction: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const { onInteraction, children } = props;

  return (
    <ProductFormInteractionContext.Provider value={onInteraction}>
      {children}
    </ProductFormInteractionContext.Provider>
  );
}

function useProductFormInteraction(): (() => void) | null {
  return useContext(ProductFormInteractionContext);
}

export function ProductFormProvider(props: ProductFormProviderProps): React.ReactNode {
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

function ProductFormSubProviders(props: { children: React.ReactNode }): React.JSX.Element {
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

  const hydratedWarnedRef = useRef<boolean>(false);
  useEffect((): void => {
    if (requireHydratedEditProduct !== true) return;
    if (product === undefined) return;
    if (isEditingProductHydrated(product)) return;
    if (suppressNonHydratedEditWarning === true) return;
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

function ProductFormSubProvidersInner(props: { children: React.ReactNode }): React.JSX.Element {
  const { children } = props;

  const { product, draft, initialCatalogId } = useProductFormProviderConfigContext();
  const onInteraction = useProductFormInteraction() ?? (() => {});
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
}): React.JSX.Element {
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
}): React.JSX.Element {
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
