import { useState } from 'react';

import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import type { ImageTransformOptions, ImageRetryPreset } from '@/features/data-import-export';
import {
  useExportToBaseMutation,
  useCreateListingMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import { logClientError } from '@/features/observability';
import { validateFormData } from '@/shared/validations/form-validation';
import { listProductFormSchema } from '@/features/integrations/validations/listing-forms';

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
    selectedInventoryId: string | null,
    selectedTemplateId: string | null,
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

  const exportToBaseMutation = useExportToBaseMutation(productId);
  const createListingMutation = useCreateListingMutation(productId);

  const submitting = exportToBaseMutation.isPending || createListingMutation.isPending;

  const exportToBase = async (options?: {
    imageBase64Mode?: 'base-only' | 'full-data-uri';
    imageTransform?: ImageTransformOptions | null;
  }): Promise<void> => {
    const exportData: ExportToBaseVariables = {
      connectionId: '',
      inventoryId: '',
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
    selectedInventoryId: string | null,
    selectedTemplateId: string | null,
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
        await createListingMutation.mutateAsync({
          integrationId: selectedIntegrationId,
          connectionId: selectedConnectionId,
        });
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
      await exportToBase({
        imageBase64Mode: preset.imageBase64Mode,
        imageTransform: preset.transform,
      });
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
