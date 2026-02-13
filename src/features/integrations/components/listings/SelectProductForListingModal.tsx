'use client';

import React from 'react';

import {
  ListingSettingsProvider,
  useListingSettingsContext,
} from '@/features/integrations/context/ListingSettingsContext';
import type { IntegrationWithConnections } from '@/features/integrations/types/listings';
import { useProductsWithCount } from '@/features/products/hooks/useProductsQuery';
import { FormModal } from '@/shared/ui';

import { useProductSelectionForm } from './hooks/useProductSelectionForm';
import { ProductListSection } from './select-product-modal/ProductListSection';
import { IntegrationSettingsSection } from './select-product-modal/IntegrationSettingsSection';

type SelectProductForListingModalProps = {
  onClose: () => void;
  onSuccess: () => void;
  initialIntegrationId?: string | null;
  initialConnectionId?: string | null;
};

function SelectProductForListingModalContent({
  onClose,
  onSuccess,
}: SelectProductForListingModalProps): React.JSX.Element {
  const {
    integrations,
    loadingIntegrations,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    setSelectedIntegrationId,
    setSelectedConnectionId,
    selectedInventoryId,
    selectedTemplateId,
    allowDuplicateSku,
  } = useListingSettingsContext();

  const {
    productSearch,
    setProductSearch,
    selectedProductId,
    setSelectedProductId,
    error,
    submitting,
    handleSubmit,
  } = useProductSelectionForm({
    selectedIntegrationId,
    selectedConnectionId,
    isBaseComIntegration,
    selectedInventoryId,
    selectedTemplateId,
    allowDuplicateSku,
  });

  const productsQuery = useProductsWithCount({
    pageSize: 10,
    search: productSearch,
  });

  const integrationsWithConnections = integrations.filter(
    (i: IntegrationWithConnections) => i.connections.length > 0
  );

  return (
    <FormModal
      open={true}
      onClose={onClose}
      title='List Product on Marketplace'
      onSave={() => {
        void handleSubmit(onSuccess);
      }}
      isSaving={submitting}
      saveText='List Product'
      size='xl'
    >
      <div className='grid gap-6 md:grid-cols-2'>
        <div className='space-y-4'>
          <ProductListSection
            isLoading={productsQuery.isLoading}
            products={productsQuery.products}
            selectedProductId={selectedProductId}
            onProductSelect={setSelectedProductId}
            productSearch={productSearch}
            onSearchChange={setProductSearch}
          />
        </div>

        <IntegrationSettingsSection
          loadingIntegrations={loadingIntegrations}
          integrations={integrationsWithConnections}
          selectedIntegrationId={selectedIntegrationId}
          selectedConnectionId={selectedConnectionId}
          selectedIntegration={selectedIntegration}
          isBaseComIntegration={isBaseComIntegration}
          error={error}
          onIntegrationChange={setSelectedIntegrationId}
          onConnectionChange={setSelectedConnectionId}
        />
      </div>
    </FormModal>
  );
}

export function SelectProductForListingModal(props: SelectProductForListingModalProps): React.JSX.Element {
  return (
    <ListingSettingsProvider
      initialIntegrationId={props.initialIntegrationId ?? null}
      initialConnectionId={props.initialConnectionId ?? null}
    >
      <SelectProductForListingModalContent {...props} />
    </ListingSettingsProvider>
  );
}

export default SelectProductForListingModal;
