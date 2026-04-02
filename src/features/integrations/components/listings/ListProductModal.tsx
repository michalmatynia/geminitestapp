import { useEffect, useRef } from 'react';

import {
  ListingSettingsProvider,
  useListingSelection,
} from '@/features/integrations/context/ListingSettingsContext';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations';
import type { ImageRetryPreset } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { FormModal } from '@/shared/ui';

import { BaseListingSettings } from './BaseListingSettings';
import { ExportLogViewer } from './ExportLogViewer';
import { useListProductForm } from './hooks/useListProductForm';
import { IntegrationAccountSummary } from './IntegrationAccountSummary';
import { ListProductModalFormProvider } from './list-product-modal/context/ListProductModalFormContext';
import {
  ListProductModalViewProvider,
  useListProductModalViewContext,
} from './list-product-modal/context/ListProductModalViewContext';
import { IntegrationSelection } from './list-product-modal/IntegrationSelection';
import { ListProductErrorPanel } from './list-product-modal/ListProductErrorPanel';
import { TraderaListingSettings } from './TraderaListingSettings';

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

  const { error, exportLogs, submitting, handleSubmit, handleImageRetry } = useListProductForm(
    product.id
  );

  const productName = product.name_en || product.name_pl || product.name_de || 'Unnamed Product';
  const selectedIntegrationName = selectedIntegration?.name?.trim() || null;
  const modalTitle = isBaseComIntegration
    ? `Export to Base.com - ${productName}`
    : isTraderaIntegration
      ? `List on Tradera - ${productName}`
      : selectedIntegrationName
        ? `List on ${selectedIntegrationName} - ${productName}`
        : `List Product - ${productName}`;
  const saveText = isBaseComIntegration
    ? 'Export to Base.com'
    : isTraderaIntegration
      ? 'List on Tradera'
      : 'List Product';
  const autoSubmitAttemptedRef = useRef(false);

  const integrationsWithConnections = integrations.filter(
    (i: IntegrationWithConnections) => i.connections.length > 0
  );
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
        }}
      >
        <div className='space-y-6'>
          {error && <ListProductErrorPanel />}

          {!loading && integrationsWithConnections.length > 0 ? (
            <div className='space-y-4'>
              {hasPresetSelection ? <IntegrationAccountSummary /> : <IntegrationSelection />}

              {isBaseComIntegration && selectedConnectionId && (
                <div className='pt-4 border-t border-border'>
                  <BaseListingSettings />
                </div>
              )}
              {isTraderaIntegration && selectedConnectionId && (
                <div className='pt-4 border-t border-border'>
                  <TraderaListingSettings />
                </div>
              )}
            </div>
          ) : (
            <IntegrationSelection />
          )}

          {exportLogs.length > 0 && (
            <div className='mt-4 border-t border pt-4'>
              <ExportLogViewer />
            </div>
          )}
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
    <ListingSettingsProvider
      initialIntegrationId={initialIntegrationId ?? null}
      initialConnectionId={initialConnectionId ?? null}
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
    </ListingSettingsProvider>
  );
}

export default ListProductModal;
