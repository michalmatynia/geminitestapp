'use client';
import { useState } from 'react';

import type {
  ImageRetryPreset,
  ImageTransformOptions,
} from '@/features/data-import-export';
import {
  useExportToBaseMutation,
  useCreateListingMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import type { IntegrationWithConnections, IntegrationConnectionBasic } from '@/features/integrations/types/listings';
import { logClientError } from '@/features/observability';
import { ProductWithImages } from '@/features/products/types';
import { Button, UnifiedSelect, Label, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, SectionPanel, FormModal } from '@/shared/ui';

import { BaseListingSettings } from './BaseListingSettings';
import { ExportLogViewer } from './ExportLogViewer';
import { useBaseComSettings } from './hooks/useBaseComSettings';
import { useIntegrationSelection } from './hooks/useIntegrationSelection';
import { IntegrationAccountSummary } from './IntegrationAccountSummary';
import { useImageRetryPresets } from './useImageRetryPresets';
import { isImageExportError } from './utils';




type ListProductModalProps = {
  product: ProductWithImages;
  onClose: () => void;
  onSuccess: () => void;
  initialIntegrationId?: string | null;
  initialConnectionId?: string | null;
};

export function ListProductModal({
  product,
  onClose,
  onSuccess,
  initialIntegrationId,
  initialConnectionId,
}: ListProductModalProps): React.JSX.Element {
  // Integration & connection selection
  const {
    integrations,
    loading,
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    setSelectedIntegrationId,
    setSelectedConnectionId,
  } = useIntegrationSelection(initialIntegrationId, initialConnectionId);

  // Base.com specific settings
  const {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    inventories,
    selectedInventoryId,
    setSelectedInventoryId,
    loadingInventories,
    allowDuplicateSku,
    setAllowDuplicateSku,
  } = useBaseComSettings(isBaseComIntegration, selectedConnectionId);

  // Mutations
  const exportToBaseMutation = useExportToBaseMutation(product.id);
  const createListingMutation = useCreateListingMutation(product.id);

  // Export logging
  const [error, setError] = useState<string | null>(null);
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState<boolean>(false);
  const imageRetryPresets = useImageRetryPresets();

  const productName =
    product.name_en || product.name_pl || product.name_de || 'Unnamed Product';

  const selectedConnection = (selectedIntegration?.connections as IntegrationConnectionBasic[] || []).find(
    (connection: IntegrationConnectionBasic) => connection.id === selectedConnectionId
  );
  const connectionName = selectedConnection?.name;
  const hasPresetSelection = Boolean(initialIntegrationId && initialConnectionId);

  const submitting = exportToBaseMutation.isPending || createListingMutation.isPending;

  const exportToBase = async (options?: {
        imageBase64Mode?: 'base-only' | 'full-data-uri';
        imageTransform?: ImageTransformOptions | null;
      }): Promise<void> => {
    const exportData: ExportToBaseVariables = {
      connectionId: selectedConnectionId || '',
      inventoryId: selectedInventoryId || '',
      exportImagesAsBase64: Boolean(options?.imageBase64Mode || options?.imageTransform)
    };
    if (selectedTemplateId && selectedTemplateId !== 'none') exportData.templateId = selectedTemplateId;
    if (options?.imageBase64Mode) exportData.imageBase64Mode = options.imageBase64Mode;
    if (options?.imageTransform) exportData.imageTransform = options.imageTransform;
        
    const payloadRes = await exportToBaseMutation.mutateAsync(exportData);
    if (payloadRes.logs) {
      setExportLogs(payloadRes.logs);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!selectedIntegrationId || !selectedConnectionId) {
      setError('Please select both a marketplace and an account');
      return;
    }

    if (isBaseComIntegration && !selectedInventoryId) {
      setError('Please select a Base.com inventory');
      return;
    }

    try {
      setError(null);
      setExportLogs([]);
      setLogsOpen(true);

      // For Base.com, use export endpoint
      if (isBaseComIntegration) {
        await exportToBase();
        onSuccess();
      } else {
        // For other integrations, use regular listing endpoint
        await createListingMutation.mutateAsync({
          integrationId: selectedIntegrationId,
          connectionId: selectedConnectionId,
        });

        onSuccess();
      }
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'ListProductModal', action: 'submit', productId: product.id, integrationId: selectedIntegrationId } });
      setError(err instanceof Error ? err.message : 'Failed to list product');
    }
  };

  const handleImageRetry = async (preset: ImageRetryPreset): Promise<void> => {
    if (!isBaseComIntegration || !selectedConnectionId || !selectedInventoryId) {
      return;
    }
    try {
      setError(null);
      setExportLogs([]);
      setLogsOpen(true);
      await exportToBase({
        imageBase64Mode: preset.imageBase64Mode,
        imageTransform: preset.transform,
      });
      onSuccess();
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'ListProductModal', action: 'imageRetry', productId: product.id } });
      setError(err instanceof Error ? err.message : 'Failed to export product');
    }
  };

  const integrationsWithConnections = integrations.filter(
    (i: IntegrationWithConnections) => i.connections.length > 0
  );

  return (
    <FormModal
      isOpen={true}
      onClose={onClose}
      title={`List Product - ${productName}`}
      onSave={(): void => { void handleSubmit(); }}
      isSaving={submitting}
      saveText={isBaseComIntegration ? 'Export to Base.com' : 'List Product'}
      cancelText="Cancel"
      size="md"
    >
      <div className="space-y-6">
        {error && (
          <SectionPanel variant="subtle-compact" className="border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            <div className="flex flex-col gap-3">
              <span>{error}</span>
              {isBaseComIntegration && isImageExportError(error) ? (
                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-red-500/20 text-red-100 hover:bg-red-500/30"
                        disabled={submitting}
                      >
                        Retry image export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-card border-border">
                      {imageRetryPresets.map((preset: ImageRetryPreset) => (
                        <DropdownMenuItem
                          key={preset.id}
                          onSelect={(): void => { void handleImageRetry(preset); }}
                          className="text-gray-200 focus:bg-gray-800/70"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm">{preset.label}</span>
                            <span className="text-xs text-gray-400">
                              {preset.description}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-xs text-red-200/80">
                    Applies JPEG resize/compression and retries automatically.
                  </span>
                </div>
              ) : null}
            </div>
          </SectionPanel>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading integrations...</p>
        ) : integrationsWithConnections.length === 0 ? (
          <SectionPanel variant="subtle" className="border-yellow-500/40 bg-yellow-500/10 p-6 text-center">
            <p className="text-sm text-yellow-200">
              No integrations with configured accounts found.
            </p>
            <p className="mt-2 text-xs text-yellow-300/70">
              Please set up an integration with at least one account first.
            </p>
          </SectionPanel>
        ) : (
          <>
            {hasPresetSelection ? (
              <IntegrationAccountSummary 
                integrationName={selectedIntegration?.name}
                connectionName={connectionName}
              />
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="integration">Marketplace / Integration</Label>
                  <UnifiedSelect
                    value={selectedIntegrationId}
                    onValueChange={setSelectedIntegrationId}
                    options={integrationsWithConnections
                      .filter((integration: IntegrationWithConnections): boolean => !!integration.id)
                      .map((integration: IntegrationWithConnections) => ({
                        value: integration.id,
                        label: integration.name
                      }))}
                    placeholder="Select a marketplace..."
                  />
                </div>

                {selectedIntegration && (
                  <div className="space-y-2">
                    <Label htmlFor="connection">Account</Label>
                    <UnifiedSelect
                      value={selectedConnectionId}
                      onValueChange={setSelectedConnectionId}
                      options={selectedIntegration.connections
                        .filter((connection: IntegrationConnectionBasic): boolean => !!connection.id)
                        .map((connection: IntegrationConnectionBasic) => ({
                          value: connection.id,
                          label: connection.name
                        }))}
                      placeholder="Select an account..."
                    />
                    <p className="text-xs text-gray-500">
                      Choose which account to use for listing this product on{' '}
                      {selectedIntegration.name}.
                    </p>
                  </div>
                )}
              </>
            )}

            {isBaseComIntegration && selectedConnectionId && (
              <BaseListingSettings
                inventories={inventories}
                selectedInventoryId={selectedInventoryId}
                onInventoryIdChange={setSelectedInventoryId}
                loadingInventories={loadingInventories}
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onTemplateIdChange={setSelectedTemplateId}
                allowDuplicateSku={allowDuplicateSku}
                onAllowDuplicateSkuChange={setAllowDuplicateSku}
              />
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

export default ListProductModal;
