'use client';

import { useState } from 'react';

import {
  ListingSettingsProvider,
  useListingSettingsContext,
} from '@/features/integrations/context/ListingSettingsContext';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import { logClientError } from '@/features/observability';
import { FormModal } from '@/shared/ui';

import { BaseListingSettings } from './BaseListingSettings';
import { ExportLogViewer } from './ExportLogViewer';
import { IntegrationAccountSummary } from './IntegrationAccountSummary';
import { useGenericExportToBaseMutation, useGenericCreateListingMutation, type ExportToBaseVariables } from '../../hooks/useProductListingMutations';

type MassListProductModalProps = {
  productIds: string[];
  integrationId: string;
  connectionId: string;
  onClose: () => void;
  onSuccess: () => void;
};

function MassListProductModalContent({
  productIds,
  integrationId: initialIntegrationId,
  connectionId: initialConnectionId,
  onClose,
  onSuccess,
}: MassListProductModalProps): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; errors: number } | null>(null);

  // Consume from context
  const {
    loadingIntegrations: loading,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    selectedInventoryId,
    selectedTemplateId,
    allowDuplicateSku,
  } = useListingSettingsContext();
  
  // Export logging - for mass operations, store all logs
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);

  const exportMutation = useGenericExportToBaseMutation();
  const createListingMutation = useGenericCreateListingMutation();

  const connectionName = (selectedIntegration?.connections as Array<{ id: string; name: string }>)?.find(
    (c: { id: string; name: string }) => c.id === selectedConnectionId
  )?.name || '';

  const handleSubmit = async (): Promise<void> => {
    if (isBaseComIntegration && !selectedInventoryId) {
      setError('Please select a Base.com inventory');
      return;
    }

    setError(null);
    setProgress({ current: 0, total: productIds.length, errors: 0 });
    setExportLogs([]);
    setLogsOpen(true);

    let errors = 0;
    const allLogs: CapturedLog[] = [];
    
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      if (!productId) continue;
      setProgress((prev: { current: number; total: number; errors: number } | null) => prev ? { ...prev, current: i + 1 } : null);
        
      try {
        if (isBaseComIntegration) {
          const exportData: ExportToBaseVariables & { productId: string } = {
            productId,
            connectionId: selectedConnectionId || '',
            inventoryId: selectedInventoryId || '',
            allowDuplicateSku,
          };
          if (selectedTemplateId && selectedTemplateId !== 'none') exportData.templateId = selectedTemplateId;
                
          const result = await exportMutation.mutateAsync(exportData);
        
          if (result.logs) {
            allLogs.push(...result.logs);
            setExportLogs([...allLogs]);
          }
        } else {
          await createListingMutation.mutateAsync({
            productId,
            integrationId: initialIntegrationId,
            connectionId: initialConnectionId,
          });
        }
      } catch (e: unknown) {
        logClientError(e, { context: { source: 'MassListProductModal', action: 'listProduct', productId, integrationId: initialIntegrationId } });
        errors++;
      }
        
      setProgress((prev: { current: number; total: number; errors: number } | null) => prev ? { ...prev, errors } : null);
    }

    if (errors === 0) {
      onSuccess();
    } else {
      setError(`Completed with ${errors} errors.`);
      setTimeout(() => onSuccess(), 2000); 
    }
  };

  const submitting = exportMutation.isPending || createListingMutation.isPending;

  return (
    <FormModal
      isOpen={true}
      onClose={onClose}
      title={`List ${productIds.length} Products to ${selectedIntegration?.name || 'Marketplace'}`}
      onSave={(): void => { void handleSubmit(); }}
      isSaving={submitting}
      saveText={isBaseComIntegration ? 'Export to Base.com' : 'List Products'}
      cancelText="Cancel"
      size="md"
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {submitting && progress && (
          <div className="space-y-2">
            <p className="text-sm text-gray-300">Processing {progress.current} of {progress.total}...</p>
            <div className="h-2 w-full rounded-full bg-gray-800">
              <div 
                className="h-full rounded-full bg-primary transition-all duration-300" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            {progress.errors > 0 && <p className="text-xs text-red-400">{progress.errors} failures so far</p>}
          </div>
        )}

        {!submitting && (
          <>
            <IntegrationAccountSummary 
              integrationName={selectedIntegration?.name}
              connectionName={connectionName}
            />

            {loading ? (
              <p className="text-sm text-gray-400">Loading details...</p>
            ) : (
              <>
                {isBaseComIntegration && (
                  <BaseListingSettings />
                )}
              </>
            )}
          </>
        )}
        {exportLogs.length > 0 && (
          <div className="mt-4 border-t border pt-4">
            <ExportLogViewer
              logs={exportLogs}
              isOpen={logsOpen}
              onToggle={setLogsOpen}
            />
          </div>
        )}
      </div>
    </FormModal>
  );
}

export function MassListProductModal(props: MassListProductModalProps): React.JSX.Element {
  return (
    <ListingSettingsProvider
      initialIntegrationId={props.integrationId}
      initialConnectionId={props.connectionId}
    >
      <MassListProductModalContent {...props} />
    </ListingSettingsProvider>
  );
}

export default MassListProductModal;
