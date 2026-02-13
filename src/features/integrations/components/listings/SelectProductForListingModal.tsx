'use client';

import React from 'react';

import {
  ListingSettingsProvider,
  useListingSettingsContext,
} from '@/features/integrations/context/ListingSettingsContext';
import { useProductsWithCount } from '@/features/products/hooks/useProductsQuery';
import { FormModal } from '@/shared/ui';

import { useProductSelectionForm } from './hooks/useProductSelectionForm';
import { SelectProductForListingModalProvider } from './select-product-modal/context/SelectProductForListingModalContext';
import { IntegrationSettingsSection } from './select-product-modal/IntegrationSettingsSection';
import { ProductListSection } from './select-product-modal/ProductListSection';

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
    selectedIntegrationId,
    selectedConnectionId,
    isBaseComIntegration,
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
      <SelectProductForListingModalProvider
        isLoadingProducts={productsQuery.isLoading}
        products={productsQuery.products}
        selectedProductId={selectedProductId}
        setSelectedProductId={setSelectedProductId}
        productSearch={productSearch}
        setProductSearch={setProductSearch}
        error={error}
      >
        <div className='grid gap-6 md:grid-cols-2'>
          <div className='space-y-4'>
            <ProductListSection />
          </div>

          <IntegrationSettingsSection />
        </div>
      </SelectProductForListingModalProvider>
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
