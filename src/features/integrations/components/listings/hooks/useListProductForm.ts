import { useState } from 'react';

import type { ImageTransformOptionsDto as ImageTransformOptions, ImageRetryPresetDto as ImageRetryPreset } from '@/shared/contracts/integrations';
import {
  useExportToBaseMutation,
  useCreateListingMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import { listProductFormSchema } from '@/features/integrations/validations/listing-forms';
import { logClientError } from '@/features/observability';
import { useToast } from '@/shared/ui';
import { validateFormData } from '@/shared/validations/form-validation';

type UseListProductFormResult = {
  error: string | null;
  setError: (value: string | null) => void;
  exportLogs: CapturedLog[];
  setExportLogs: (value: CapturedLog[]) => void;
  logsOpen: boolean;
  setLogsOpen: (value: boolean) => void;
  submitting: boolean;
  handleSubmit: (
    selectedIntegrationId: string | null,
    selectedConnectionId: string | null,
    isBaseComIntegration: boolean,
    isTraderaIntegration: boolean,
    selectedInventoryId: string | null,
    selectedTemplateId: string | null,
    traderaDurationHours: number,
    traderaAutoRelistEnabled: boolean,
    traderaAutoRelistLeadMinutes: number,
    traderaTemplateId: string,
    productId: string,
    onSuccess: () => void
  ) => Promise<void>;
  handleImageRetry: (
    preset: ImageRetryPreset,
    isBaseComIntegration: boolean,
    selectedConnectionId: string | null,
    selectedInventoryId: string | null,
    productId: string,
    onSuccess: () => void
  ) => Promise<void>;
};

export function useListProductForm(productId: string): UseListProductFormResult {
  const [error, setError] = useState<string | null>(null);
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState<boolean>(false);
  const { toast } = useToast();

  const exportToBaseMutation = useExportToBaseMutation(productId);
  const createListingMutation = useCreateListingMutation(productId);

  const submitting = exportToBaseMutation.isPending || createListingMutation.isPending;

  const createExportRequestId = (): string =>
    `base-export-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const exportToBase = async (
    connectionId: string,
    inventoryId: string,
    options?: {
    imageBase64Mode?: 'base-only' | 'full-data-uri';
    imageTransform?: ImageTransformOptions | null;
  }): Promise<void> => {
    const exportData: ExportToBaseVariables = {
      connectionId,
      inventoryId,
      requestId: createExportRequestId(),
      exportImagesAsBase64: Boolean(options?.imageBase64Mode || options?.imageTransform),
    };
    if (options?.imageBase64Mode) exportData.imageBase64Mode = options.imageBase64Mode;
    if (options?.imageTransform) exportData.imageTransform = options.imageTransform;

    const payloadRes = await exportToBaseMutation.mutateAsync(exportData);
    if (payloadRes.logs) {
      setExportLogs(payloadRes.logs);
    }
  };

  const handleSubmit = async (
    selectedIntegrationId: string | null,
    selectedConnectionId: string | null,
    isBaseComIntegration: boolean,
    isTraderaIntegration: boolean,
    selectedInventoryId: string | null,
    selectedTemplateId: string | null,
    traderaDurationHours: number,
    traderaAutoRelistEnabled: boolean,
    traderaAutoRelistLeadMinutes: number,
    traderaTemplateId: string,
    productId: string,
    onSuccess: () => void
  ): Promise<void> => {
    const validation = validateFormData(
      listProductFormSchema,
      {
        selectedIntegrationId,
        selectedConnectionId,
        isBaseComIntegration,
        selectedInventoryId,
      },
      'Please review required listing settings.'
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    try {
      setError(null);
      setExportLogs([]);
      setLogsOpen(true);

      if (isBaseComIntegration) {
        const exportData: ExportToBaseVariables = {
          connectionId: selectedConnectionId || '',
          inventoryId: selectedInventoryId || '',
          requestId: createExportRequestId(),
          exportImagesAsBase64: false,
        };
        if (selectedTemplateId && selectedTemplateId !== 'none') {
          exportData.templateId = selectedTemplateId;
        }
        const payloadRes = await exportToBaseMutation.mutateAsync(exportData);
        if (payloadRes.logs) {
          setExportLogs(payloadRes.logs);
        }
        onSuccess();
      } else {
        const response = await createListingMutation.mutateAsync({
          integrationId: selectedIntegrationId!,
          connectionId: selectedConnectionId!,
          ...(isTraderaIntegration
            ? {
              durationHours: traderaDurationHours,
              autoRelistEnabled: traderaAutoRelistEnabled,
              autoRelistLeadMinutes: traderaAutoRelistLeadMinutes,
              templateId:
                  traderaTemplateId && traderaTemplateId !== 'none'
                    ? traderaTemplateId
                    : null,
            }
            : {}),
        });
        if (isTraderaIntegration) {
          const queue = (
            response as { queue?: { jobId?: string; name?: string } } | null
          )?.queue;
          toast(
            queue?.jobId
              ? `Tradera listing queued (job ${queue.jobId}).`
              : 'Tradera listing queued.',
            { variant: 'success' }
          );
        }
        onSuccess();
      }
    } catch (err: unknown) {
      logClientError(err, {
        context: {
          source: 'ListProductModal',
          action: 'submit',
          productId,
          integrationId: selectedIntegrationId,
        },
      });
      setError(err instanceof Error ? err.message : 'Failed to list product');
    }
  };

  const handleImageRetry = async (
    preset: ImageRetryPreset,
    isBaseComIntegration: boolean,
    selectedConnectionId: string | null,
    selectedInventoryId: string | null,
    productId: string,
    onSuccess: () => void
  ): Promise<void> => {
    if (!isBaseComIntegration || !selectedConnectionId || !selectedInventoryId) {
      return;
    }
    try {
      setError(null);
      setExportLogs([]);
      setLogsOpen(true);
      const exportOptions: {
        imageBase64Mode?: 'base-only' | 'full-data-uri';
        imageTransform?: ImageTransformOptions | null;
      } = {};
      if (preset.imageBase64Mode) exportOptions.imageBase64Mode = preset.imageBase64Mode;
      if (preset.transform) exportOptions.imageTransform = preset.transform;
      
      await exportToBase(
        selectedConnectionId || '',
        selectedInventoryId || '',
        exportOptions
      );
      onSuccess();
    } catch (err: unknown) {
      logClientError(err, {
        context: { source: 'ListProductModal', action: 'imageRetry', productId },
      });
      setError(err instanceof Error ? err.message : 'Failed to export product');
    }
  };

  return {
    error,
    setError,
    exportLogs,
    setExportLogs,
    logsOpen,
    setLogsOpen,
    submitting,
    handleSubmit,
    handleImageRetry,
  };
}
