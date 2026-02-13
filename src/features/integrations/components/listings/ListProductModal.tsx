'use client';

import {
  ListingSettingsProvider,
  useListingSettingsContext,
} from '@/features/integrations/context/ListingSettingsContext';
import type { IntegrationWithConnections, IntegrationConnectionBasic } from '@/features/integrations/types/listings';
import type { ProductWithImages } from '@/features/products/types';
import { FormModal } from '@/shared/ui';

import { BaseListingSettings } from './BaseListingSettings';
import { ExportLogViewer } from './ExportLogViewer';
import { useListProductForm } from './hooks/useListProductForm';
import { IntegrationAccountSummary } from './IntegrationAccountSummary';
import { IntegrationSelection } from './list-product-modal/IntegrationSelection';
import { ListProductErrorPanel } from './list-product-modal/ListProductErrorPanel';
import { useImageRetryPresets } from './useImageRetryPresets';

type ListProductModalProps = {
  product: ProductWithImages;
  onClose: () => void;
  onSuccess: () => void;
  initialIntegrationId?: string | null;
  initialConnectionId?: string | null;
};

function ListProductModalContent({
  product,
  onClose,
  onSuccess,
  initialIntegrationId,
  initialConnectionId,
}: ListProductModalProps): React.JSX.Element {
  const {
    integrations,
    loadingIntegrations: loading,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
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

  const imageRetryPresets = useImageRetryPresets();

  const productName = product.name_en || product.name_pl || product.name_de || 'Unnamed Product';

  const selectedConnection = (selectedIntegration?.connections as IntegrationConnectionBasic[] || []).find(
    (connection: IntegrationConnectionBasic) => connection.id === selectedConnectionId
  );
  const connectionName = selectedConnection?.name;
  const hasPresetSelection = Boolean(initialIntegrationId && initialConnectionId);
  const integrationsWithConnections = integrations.filter(
    (i: IntegrationWithConnections) => i.connections.length > 0
  );

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
          selectedIntegration?.connections?.[0]?.id || null,
          null,
          product.id,
          onSuccess
        );
      }}
      isSaving={submitting}
      saveText={isBaseComIntegration ? 'Export to Base.com' : 'List Product'}
      cancelText='Cancel'
      size='md'
    >
      <div className='space-y-6'>
        {error && (
          <ListProductErrorPanel
            error={error}
            isBaseComIntegration={isBaseComIntegration}
            imageRetryPresets={imageRetryPresets}
            submitting={submitting}
            onRetry={(preset) => {
              void handleImageRetry(
                preset,
                isBaseComIntegration,
                selectedConnectionId,
                selectedIntegration?.connections?.[0]?.id || null,
                product.id,
                onSuccess
              );
            }}
          />
        )}

        {!loading && integrationsWithConnections.length > 0 ? (
          <div className='space-y-4'>
            {hasPresetSelection ? (
              <IntegrationAccountSummary integrationName={selectedIntegration?.name} connectionName={connectionName} />
            ) : (
              <IntegrationSelection />
            )}

            {isBaseComIntegration && selectedConnectionId && (
              <div className='pt-4 border-t border-border'>
                <BaseListingSettings />
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
    </FormModal>
  );
}

export function ListProductModal(props: ListProductModalProps): React.JSX.Element {
  return (
    <ListingSettingsProvider
      initialIntegrationId={props.initialIntegrationId ?? null}
      initialConnectionId={props.initialConnectionId ?? null}
    >
      <ListProductModalContent {...props} />
    </ListingSettingsProvider>
  );
}

export default ListProductModal;
