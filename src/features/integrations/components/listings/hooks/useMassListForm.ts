import { useState, useCallback } from 'react';

import {
  useGenericExportToBaseMutation,
  useGenericCreateListingMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import { massListProductFormSchema } from '@/features/integrations/validations/listing-forms';
import { logClientError } from '@/features/observability';
import { validateFormData } from '@/shared/validations/form-validation';

export interface UseMassListFormProps {
  productIds: string[];
  integrationId: string;
  connectionId: string;
  isBaseComIntegration: boolean;
  selectedConnectionId: string | null;
  selectedInventoryId: string | null;
  selectedTemplateId: string | null;
  allowDuplicateSku: boolean;
  onSuccess: () => void;
}

export function useMassListForm({
  productIds,
  integrationId,
  connectionId,
  isBaseComIntegration,
  selectedConnectionId,
  selectedInventoryId,
  selectedTemplateId,
  allowDuplicateSku,
  onSuccess,
}: UseMassListFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; errors: number } | null>(null);
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);

  const exportMutation = useGenericExportToBaseMutation();
  const createListingMutation = useGenericCreateListingMutation();
  const createExportRequestId = (productId: string, index: number): string =>
    `base-export-${productId}-${index}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  const handleSubmit = useCallback(async (): Promise<void> => {
    const validation = validateFormData(
      massListProductFormSchema,
      {
        isBaseComIntegration,
        selectedInventoryId,
      },
      'Please review required listing settings.'
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    setError(null);
    setProgress({ current: 0, total: productIds.length, errors: 0 });
    setExportLogs([]);

    let errors = 0;
    const allLogs: CapturedLog[] = [];

    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      if (!productId) continue;
      setProgress((prev) => (prev ? { ...prev, current: i + 1 } : null));

      try {
        if (isBaseComIntegration) {
          const exportData: ExportToBaseVariables & { productId: string } = {
            productId,
            connectionId: selectedConnectionId || '',
            inventoryId: selectedInventoryId || '',
            allowDuplicateSku,
            requestId: createExportRequestId(productId, i),
          };
          if (selectedTemplateId && selectedTemplateId !== 'none') {
            exportData.templateId = selectedTemplateId;
          }

          const result = await exportMutation.mutateAsync(exportData);
          if (result.logs) {
            allLogs.push(...result.logs);
            setExportLogs([...allLogs]);
          }
        } else {
          await createListingMutation.mutateAsync({
            productId,
            integrationId,
            connectionId,
          });
        }
      } catch (e: unknown) {
        logClientError(e, {
          context: { source: 'MassListProductModal', action: 'listProduct', productId, integrationId },
        });
        errors++;
      }

      setProgress((prev) => (prev ? { ...prev, errors } : null));
    }

    if (errors === 0) {
      onSuccess();
    } else {
      setError(`Completed with ${errors} errors.`);
      setTimeout(() => onSuccess(), 2000);
    }
  }, [
    productIds,
    integrationId,
    connectionId,
    isBaseComIntegration,
    selectedConnectionId,
    selectedInventoryId,
    selectedTemplateId,
    allowDuplicateSku,
    exportMutation,
    createListingMutation,
    onSuccess,
  ]);

  const submitting = exportMutation.isPending || createListingMutation.isPending;

  return {
    error,
    setError,
    progress,
    setProgress,
    exportLogs,
    setExportLogs,
    handleSubmit,
    submitting,
  };
}
