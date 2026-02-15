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
import { SelectProductForListingModalViewProvider, useSelectProductForListingModalView } from './select-product-modal/context/SelectProductForListingModalViewContext';
import { IntegrationSettingsSection } from './select-product-modal/IntegrationSettingsSection';
import { ProductListSection } from './select-product-modal/ProductListSection';
import type { ModalStateProps } from '@/shared/types/modal-props';

interface SelectProductForListingModalProps extends ModalStateProps {
  initialIntegrationId?: string | null;
  initialConnectionId?: string | null;
}

function SelectProductForListingModalContent(): React.JSX.Element {
  const { onClose, onSuccess } = useSelectProductForListingModalView();
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

export function SelectProductForListingModal(props: SelectProductForListingModalProps): React.JSX.Element | null {
  const {
    isOpen,
    initialIntegrationId,
    initialConnectionId,
    onClose,
    onSuccess,
  } = props;

  if (!isOpen) return null;

  return (
    <ListingSettingsProvider
      initialIntegrationId={initialIntegrationId ?? null}
      initialConnectionId={initialConnectionId ?? null}
    >
      <SelectProductForListingModalViewProvider
        value={{
          onClose,
          onSuccess: onSuccess ?? (() => {}),
        }}
      >
        <SelectProductForListingModalContent />
      </SelectProductForListingModalViewProvider>
    </ListingSettingsProvider>
  );
}

export default SelectProductForListingModal;
