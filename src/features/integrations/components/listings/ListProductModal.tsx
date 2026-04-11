'use client';

import { useEffect, useRef } from 'react';

import {
  useListingSelection,
} from '@/features/integrations/context/ListingSettingsContext';
import type { ImageRetryPreset } from '@/shared/contracts/integrations/base';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { EntityModalProps } from '@/shared/contracts/ui/modals';
import { FormModal } from '@/shared/ui/forms-and-actions.public';

import { ExportLogsPanel } from './ExportLogsPanel';
import { useListProductForm } from './hooks/useListProductForm';
import { IntegrationAccountSummary } from './IntegrationAccountSummary';
import { IntegrationSpecificListingSettings } from './IntegrationSpecificListingSettings';
import { ListingSettingsModalProvider } from './ListingSettingsModalProvider';
import { ListProductModalFormProvider } from './list-product-modal/context/ListProductModalFormContext';
import {
  ListProductModalViewProvider,
  useListProductModalViewContext,
} from './list-product-modal/context/ListProductModalViewContext';
import { resolveConnectedIntegrations } from './integration-selector-options';
import { IntegrationSelection } from './list-product-modal/IntegrationSelection';
import { ListProductErrorPanel } from './list-product-modal/ListProductErrorPanel';
import { resolveListProductModalCopy } from './product-listings-copy';
import {
  resolveIntegrationDisplayName,
  resolveProductListingsProductName,
} from './product-listings-labels';

interface ListProductModalProps extends EntityModalProps<ProductWithImages> {
  initialIntegrationId?: string | null;
  initialConnectionId?: string | null;
  autoSubmitOnOpen?: boolean;
}

function ListProductModalContent(): React.JSX.Element {
  const { product, onClose, onSuccess, hasPresetSelection, autoSubmitOnOpen } =
    useListProductModalViewContext();
  const {
    integrations,
    loadingIntegrations: loading,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    isTraderaIntegration,
  } = useListingSelection();

  const {
    error,
    exportLogs,
    submitting,
    authRequired,
    authRequiredMarketplace,
    loggingIn,
    handleSubmit,
    handleMarketplaceLogin,
    handleImageRetry,
  } = useListProductForm(product.id, product.categoryId);

  const productName = resolveProductListingsProductName(product);
  const selectedIntegrationName = resolveIntegrationDisplayName(
    selectedIntegration?.name,
    selectedIntegration?.slug
  );
  const { modalTitle, saveText } = resolveListProductModalCopy({
    productName,
    isBaseComIntegration,
    isTraderaIntegration,
    selectedIntegrationName,
    selectedIntegrationSlug: selectedIntegration?.slug,
  });
  const autoSubmitAttemptedRef = useRef(false);

  const integrationsWithConnections = resolveConnectedIntegrations(integrations);
  const retryImageExport = (preset: ImageRetryPreset): void => {
    void handleImageRetry(preset, onSuccess);
  };

  useEffect(() => {
    if (!autoSubmitOnOpen || autoSubmitAttemptedRef.current) return;
    if (loading || !selectedConnectionId) return;

    autoSubmitAttemptedRef.current = true;
    void handleSubmit(onSuccess);
  }, [autoSubmitOnOpen, handleSubmit, loading, onSuccess, selectedConnectionId]);

  return (
    <FormModal
      open={true}
      onClose={onClose}
      title={modalTitle}
      onSave={() => {
        void handleSubmit(onSuccess);
      }}
      isSaving={submitting}
      saveText={saveText}
      cancelText='Cancel'
      size='md'
    >
      <ListProductModalFormProvider
        value={{
          error,
          submitting,
          onRetryImageExport: retryImageExport,
          authRequired,
          authRequiredMarketplace,
          loggingIn,
          onMarketplaceLogin: () => {
            void handleMarketplaceLogin(onSuccess);
          },
          onRetrySubmit: () => {
            void handleSubmit(onSuccess);
          },
        }}
      >
        <div className='space-y-6'>
          {error && <ListProductErrorPanel />}

          {!loading && integrationsWithConnections.length > 0 ? (
            <div className='space-y-4'>
              {hasPresetSelection ? <IntegrationAccountSummary /> : <IntegrationSelection />}
              <IntegrationSpecificListingSettings />
            </div>
          ) : (
            <IntegrationSelection />
          )}

          <ExportLogsPanel logs={exportLogs} />
        </div>
      </ListProductModalFormProvider>
    </FormModal>
  );
}

export function ListProductModal(props: ListProductModalProps): React.JSX.Element | null {
  const {
    isOpen = true,
    initialIntegrationId,
    initialConnectionId,
    autoSubmitOnOpen = false,
    item: product,
    onClose,
    onSuccess,
  } = props;

  if (!product || !isOpen) return null;

  return (
    <ListingSettingsModalProvider
      initialIntegrationId={initialIntegrationId}
      initialConnectionId={initialConnectionId}
    >
      <ListProductModalViewProvider
        value={{
          product,
          onClose,
          onSuccess: onSuccess ?? (() => {}),
          hasPresetSelection: Boolean(initialIntegrationId && initialConnectionId),
          autoSubmitOnOpen,
        }}
      >
        <ListProductModalContent />
      </ListProductModalViewProvider>
    </ListingSettingsModalProvider>
  );
}

export default ListProductModal;
