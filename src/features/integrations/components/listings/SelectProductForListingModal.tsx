'use client';

import React, { useState } from 'react';

import {
  ListingSettingsProvider,
  useListingSettingsContext,
} from '@/features/integrations/context/ListingSettingsContext';
import {
  useExportToBaseMutation,
  useCreateListingMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import type { IntegrationConnectionBasic, IntegrationWithConnections } from '@/features/integrations/types/listings';
import { selectProductForListingFormSchema } from '@/features/integrations/validations/listing-forms';
import { logClientError } from '@/features/observability';
import { useProductsWithCount } from '@/features/products/hooks/useProductsQuery';
import type { ProductWithImages } from '@/features/products/types';
import {
  UnifiedSelect,
  SectionPanel,
  FormModal,
  SearchInput,
  FormSection,
  FormField,
} from '@/shared/ui';
import { validateFormData } from '@/shared/validations/form-validation';

import { BaseListingSettings } from './BaseListingSettings';

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

  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const productsQuery = useProductsWithCount({
    pageSize: 10,
    search: productSearch,
  });

  const exportToBaseMutation = useExportToBaseMutation(selectedProductId || '');
  const createListingMutation = useCreateListingMutation(selectedProductId || '');
  
  const submitting = exportToBaseMutation.isPending || createListingMutation.isPending;

  const handleSubmit = async (): Promise<void> => {
    const validation = validateFormData(
      selectProductForListingFormSchema,
      {
        selectedProductId,
        selectedIntegrationId,
        selectedConnectionId,
        isBaseComIntegration,
        selectedInventoryId,
      },
      'Please review required listing settings.',
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    try {
      setError(null);
      if (isBaseComIntegration) {
        const exportData: ExportToBaseVariables = {
          connectionId: selectedConnectionId,
          inventoryId: selectedInventoryId,
          allowDuplicateSku,
        };
        if (selectedTemplateId && selectedTemplateId !== 'none') exportData.templateId = selectedTemplateId;
        await exportToBaseMutation.mutateAsync(exportData);
      } else {
        await createListingMutation.mutateAsync({
          integrationId: selectedIntegrationId,
          connectionId: selectedConnectionId,
        });
      }
      onSuccess();
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'SelectProductForListingModal', action: 'submit' } });
      setError(err instanceof Error ? err.message : 'Failed to list product');
    }
  };

  const integrationsWithConnections = integrations.filter(
    (i: IntegrationWithConnections) => i.connections.length > 0
  );

  return (
    <FormModal
      open={true}
      onClose={onClose}
      title='List Product on Marketplace'
      onSave={() => { void handleSubmit(); }}
      isSaving={submitting}
      saveText='List Product'
      size='xl'
    >
      <div className='grid gap-6 md:grid-cols-2'>
        <div className='space-y-4'>
          <FormSection title='1. Select Product' variant='subtle' className='p-4 space-y-4'>
            <SearchInput
              placeholder='Search products...'
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onClear={() => setProductSearch('')}
            />
            
            <div className='space-y-2 max-h-[400px] overflow-y-auto rounded-md border border-border mt-4'>
              {productsQuery.isLoading ? (
                <p className='p-4 text-center text-xs text-gray-500'>Loading products...</p>
              ) : (productsQuery.products || []).length === 0 ? (
                <p className='p-4 text-center text-xs text-gray-500'>No products found.</p>
              ) : (
                (productsQuery.products || []).map((product: ProductWithImages) => (
                  <button
                    key={product.id}
                    type='button'
                    onClick={() => setSelectedProductId(product.id)}
                    className={`w-full flex items-center justify-between p-3 text-left transition-colors border-b border-border last:border-0 ${
                      selectedProductId === product.id 
                        ? 'bg-primary/10 border-l-2 border-l-primary' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div>
                      <p className='text-sm font-medium text-white line-clamp-1'>
                        {product.name_en || product.name_pl || 'Unnamed Product'}
                      </p>
                      <p className='text-xs text-gray-500'>SKU: {product.sku || '—'}</p>
                    </div>
                    {selectedProductId === product.id && (
                      <div className='size-2 rounded-full bg-primary' />
                    )}
                  </button>
                ))
              )}
            </div>
          </FormSection>
        </div>

        <div className='space-y-4'>
          <FormSection title='2. Integration Settings' variant='subtle' className='p-4 space-y-4'>
            {loadingIntegrations ? (
              <p className='text-xs text-gray-500'>Loading integrations...</p>
            ) : (
              <>
                <FormField label='Marketplace'>
                  <UnifiedSelect
                    value={selectedIntegrationId}
                    onValueChange={setSelectedIntegrationId}
                    options={integrationsWithConnections.map(i => ({ value: i.id, label: i.name }))}
                    placeholder='Select marketplace...'
                  />
                </FormField>

                {selectedIntegration && (
                  <FormField label='Account'>
                    <UnifiedSelect
                      value={selectedConnectionId}
                      onValueChange={setSelectedConnectionId}
                      options={selectedIntegration.connections.map((c: IntegrationConnectionBasic) => ({ value: c.id, label: c.name }))}
                      placeholder='Select account...'
                    />
                  </FormField>
                )}

                {isBaseComIntegration && selectedConnectionId && (
                  <div className='pt-4 border-t border-border'>
                    <BaseListingSettings />
                  </div>
                )}
              </>
            )}
          </FormSection>

          {error && (
            <SectionPanel variant='subtle-compact' className='border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200'>
              {error}
            </SectionPanel>
          )}
        </div>
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
