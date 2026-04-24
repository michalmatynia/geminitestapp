'use client';

import React from 'react';

import {
  useProductListSelectionContext,
  useProductListModalsContext,
} from '@/features/products/context/ProductListContext';
import { resolveProductListingsIntegrationScope } from '@/features/integrations/utils/product-listings-recovery';
import { isEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  ListProductModal,
  MassListProductModal,
  ProductListingsModal,
} from '@/features/integrations/product-integrations-adapter';

import { ProductEditorModal } from './ProductEditorModal';
import { ProductIntegrationSelectionModal } from './ProductIntegrationSelectionModal';

function ProductCreateModalWrapper(): React.JSX.Element {
  const {
    isCreateOpen, initialSku, createDraft, initialCatalogId,
    onCloseCreate, onCreateSuccess
  } = useProductListModalsContext();

  const providerKey = createDraft !== null ? `create:${createDraft.id}` : 'create';
  
  return (
    <ProductEditorModal
      isOpen={isCreateOpen}
      onClose={onCloseCreate}
      title='Create Product'
      subtitle={createDraft !== null ? `Using draft template: ${createDraft.name}` : undefined}
      saveText='Create'
      submitButtonText='Create'
      providerKey={providerKey}
      draft={createDraft}
      onSuccess={onCreateSuccess}
      initialSku={initialSku}
      initialCatalogId={initialCatalogId ?? undefined}
      validationInstanceScopeOverride={createDraft !== null ? 'draft_template' : 'product_create'}
    />
  );
}

function ProductEditModalWrapper(): React.JSX.Element {
  const {
    editingProduct, isEditHydrating, onCloseEdit, onEditSuccess, onEditSave
  } = useProductListModalsContext();

  const isEditOpen = editingProduct !== null;
  const hydratedEditingProduct = (editingProduct !== null && isEditingProductHydrated(editingProduct)) ? editingProduct : null;
  const editProviderKey = (editingProduct !== null)
    ? ['edit', editingProduct.id, hydratedEditingProduct !== null ? 'h' : 'p'].join(':')
    : 'edit';

  return (
    <ProductEditorModal
      isOpen={isEditOpen}
      onClose={onCloseEdit}
      title='Edit Product'
      subtitle={isEditHydrating ? 'Loading full product details…' : undefined}
      saveText='Update'
      submitButtonText='Update'
      providerKey={editProviderKey}
      product={hydratedEditingProduct ?? editingProduct ?? undefined}
      onSuccess={onEditSuccess}
      onEditSave={onEditSave}
      requireHydratedEditProduct
      validationInstanceScopeOverride='product_edit'
      showSkeleton={false}
      isSaveDisabledOverride={isEditHydrating}
    />
  );
}

function ProductListModalWrapper(): React.JSX.Element | null {
  const {
    integrationsProduct, showListProductModal, onCloseListProduct,
    onListProductSuccess, listProductPreset
  } = useProductListModalsContext();

  if (integrationsProduct === null) return null;
  if (showListProductModal === false) return null;

  let initialIntegrationId: string | null = null;
  let initialConnectionId: string | null = null;
  let autoSubmitOnOpen = false;

  if (listProductPreset !== null) {
    initialIntegrationId = listProductPreset.integrationId;
    initialConnectionId = listProductPreset.connectionId;
    autoSubmitOnOpen = listProductPreset.autoSubmit === true;
  }

  return (
    <ListProductModal
      isOpen={true}
      item={integrationsProduct}
      onClose={onCloseListProduct}
      onSuccess={onListProductSuccess}
      initialIntegrationId={initialIntegrationId}
      initialConnectionId={initialConnectionId}
      autoSubmitOnOpen={autoSubmitOnOpen}
    />
  );
}

function ProductListingsModalWrapper(): React.JSX.Element | null {
  const {
    integrationsProduct, integrationsRecoveryContext, integrationsFilterIntegrationSlug,
    onCloseIntegrations, onStartListing, showListProductModal, onListingsUpdated
  } = useProductListModalsContext();

  if (integrationsProduct === null || showListProductModal === true) return null;

  const effectiveFilterSlug = resolveProductListingsIntegrationScope({
    filterIntegrationSlug: integrationsFilterIntegrationSlug,
    recoveryContext: integrationsRecoveryContext,
  });

  return (
    <ProductListingsModal
      isOpen={true}
      item={integrationsProduct}
      onClose={onCloseIntegrations}
      onStartListing={onStartListing}
      onListingsUpdated={onListingsUpdated}
      filterIntegrationSlug={effectiveFilterSlug}
      recoveryContext={integrationsRecoveryContext}
    />
  );
}

function ProductExportSettingsModalWrapper(): React.JSX.Element | null {
  const { exportSettingsProduct, onCloseExportSettings, onListingsUpdated } = useProductListModalsContext();
  if (exportSettingsProduct === null) return null;
  return (
    <ProductListingsModal
      isOpen={true}
      item={exportSettingsProduct}
      onClose={onCloseExportSettings}
      filterIntegrationSlug='baselinker'
      onListingsUpdated={onListingsUpdated}
    />
  );
}

function ProductMassListModalWrapper(): React.JSX.Element | null {
  const { data } = useProductListSelectionContext();
  const {
    massListIntegration, massListProductIds, onCloseMassList, onMassListSuccess
  } = useProductListModalsContext();

  const selectedProducts = React.useMemo(() => {
    if (massListProductIds.length === 0) return [];
    const productById = new Map(data.map((p) => [p.id, p]));
    return massListProductIds
      .map((id) => productById.get(id))
      .filter((p): p is ProductWithImages => p !== undefined);
  }, [data, massListProductIds]);

  if (massListIntegration === null || massListProductIds.length === 0) return null;

  return (
    <MassListProductModal
      isOpen={true}
      onSuccess={onMassListSuccess}
      integrationId={massListIntegration.integrationId}
      connectionId={massListIntegration.connectionId}
      item={massListProductIds}
      products={selectedProducts}
      onClose={onCloseMassList}
    />
  );
}

export function ProductModals(): React.JSX.Element {
  const {
    showIntegrationModal, onCloseIntegrationModal, onSelectIntegrationFromModal
  } = useProductListModalsContext();

  return (
    <>
      <ProductCreateModalWrapper />
      <ProductEditModalWrapper />
      <ProductListModalWrapper />
      <ProductListingsModalWrapper />
      <ProductExportSettingsModalWrapper />
      <ProductMassListModalWrapper />
      {showIntegrationModal === true && (
        <ProductIntegrationSelectionModal
          isOpen={true}
          onClose={onCloseIntegrationModal}
          onSelect={onSelectIntegrationFromModal}
        />
      )}
    </>
  );
}
