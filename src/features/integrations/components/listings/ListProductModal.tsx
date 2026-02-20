'use client';

import {
  ListingSettingsProvider,
  useListingSettingsContext,
} from '@/features/integrations/context/ListingSettingsContext';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations';
import type { ImageRetryPresetDto as ImageRetryPreset } from '@/shared/contracts/integrations';
import type { ProductWithImagesDto as ProductWithImages } from '@/shared/contracts/products';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { FormModal } from '@/shared/ui';

import { BaseListingSettings } from './BaseListingSettings';
import { ExportLogViewer } from './ExportLogViewer';
import { useListProductForm } from './hooks/useListProductForm';
import { IntegrationAccountSummary } from './IntegrationAccountSummary';
import { ListProductModalFormProvider } from './list-product-modal/context/ListProductModalFormContext';
import { ListProductModalViewProvider, useListProductModalViewContext } from './list-product-modal/context/ListProductModalViewContext';
import { IntegrationSelection } from './list-product-modal/IntegrationSelection';
import { ListProductErrorPanel } from './list-product-modal/ListProductErrorPanel';
import { TraderaListingSettings } from './TraderaListingSettings';

interface ListProductModalProps extends EntityModalProps<ProductWithImages> {
  initialIntegrationId?: string | null;
  initialConnectionId?: string | null;
}

function ListProductModalContent(): React.JSX.Element {
  const {
    product,
    onClose,
    onSuccess,
    hasPresetSelection,
  } = useListProductModalViewContext();
  const {
    integrations,
    loadingIntegrations: loading,
    selectedIntegrationId,
    selectedConnectionId,
    isBaseComIntegration,
    selectedInventoryId,
    selectedTemplateId,
    isTraderaIntegration,
    selectedTraderaDurationHours,
    selectedTraderaAutoRelistEnabled,
    selectedTraderaAutoRelistLeadMinutes,
    selectedTraderaTemplateId,
  } = useListingSettingsContext();

  const {
    error,
    exportLogs,
    logsOpen,
    setLogsOpen,
    submitting,
    handleSubmit,
    handleImageRetry,
  } = useListProductForm(product.id);

  const productName = product.name_en || product.name_pl || product.name_de || 'Unnamed Product';

  const integrationsWithConnections = integrations.filter(
    (i: IntegrationWithConnections) => i.connections.length > 0
  );
  const retryImageExport = (preset: ImageRetryPreset): void => {
    void handleImageRetry(
      preset,
      isBaseComIntegration,
      selectedConnectionId,
      selectedInventoryId || null,
      product.id,
      onSuccess
    );
  };

  return (
    <FormModal
      open={true}
      onClose={onClose}
      title={`List Product - ${productName}`}
      onSave={() => {
        void handleSubmit(
          selectedIntegrationId,
          selectedConnectionId,
          isBaseComIntegration,
          isTraderaIntegration,
          selectedInventoryId || null,
          selectedTemplateId || null,
          selectedTraderaDurationHours,
          selectedTraderaAutoRelistEnabled,
          selectedTraderaAutoRelistLeadMinutes,
          selectedTraderaTemplateId,
          product.id,
          onSuccess
        );
      }}
      isSaving={submitting}
      saveText={isBaseComIntegration ? 'Export to Base.com' : 'List Product'}
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
              {hasPresetSelection ? (
                <IntegrationAccountSummary />
              ) : (
                <IntegrationSelection />
              )}

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
              <ExportLogViewer isOpen={logsOpen} onToggle={setLogsOpen} logs={exportLogs} />
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
        }}
      >
        <ListProductModalContent />
      </ListProductModalViewProvider>
    </ListingSettingsProvider>
  );
}

export default ListProductModal;
