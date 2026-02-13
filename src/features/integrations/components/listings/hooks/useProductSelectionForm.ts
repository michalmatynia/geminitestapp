import { useState } from 'react';

import {
  useExportToBaseMutation,
  useCreateListingMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import { logClientError } from '@/features/observability';
import { validateFormData } from '@/shared/validations/form-validation';
import { selectProductForListingFormSchema } from '@/features/integrations/validations/listing-forms';

type UseProductSelectionFormProps = {
  selectedIntegrationId: string | null;
  selectedConnectionId: string | null;
  isBaseComIntegration: boolean;
  selectedInventoryId: string | null;
  selectedTemplateId: string | null;
  allowDuplicateSku: boolean;
};

type UseProductSelectionFormResult = {
  productSearch: string;
  setProductSearch: (value: string) => void;
  selectedProductId: string | null;
  setSelectedProductId: (value: string | null) => void;
  error: string | null;
  setError: (value: string | null) => void;
  submitting: boolean;
  handleSubmit: (onSuccess: () => void) => Promise<void>;
};

export function useProductSelectionForm({
  selectedIntegrationId,
  selectedConnectionId,
  isBaseComIntegration,
  selectedInventoryId,
  selectedTemplateId,
  allowDuplicateSku,
}: UseProductSelectionFormProps): UseProductSelectionFormResult {
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportToBaseMutation = useExportToBaseMutation(selectedProductId || '');
  const createListingMutation = useCreateListingMutation(selectedProductId || '');

  const submitting = exportToBaseMutation.isPending || createListingMutation.isPending;

  const handleSubmit = async (onSuccess: () => void): Promise<void> => {
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
          connectionId: selectedConnectionId!,
          inventoryId: selectedInventoryId!,
          allowDuplicateSku,
        };
        if (selectedTemplateId && selectedTemplateId !== 'none') {
          exportData.templateId = selectedTemplateId;
        }
        await exportToBaseMutation.mutateAsync(exportData);
      } else {
        await createListingMutation.mutateAsync({
          integrationId: selectedIntegrationId!,
          connectionId: selectedConnectionId!,
        });
      }
      onSuccess();
    } catch (err: unknown) {
      logClientError(err, { context: { source: 'SelectProductForListingModal', action: 'submit' } });
      setError(err instanceof Error ? err.message : 'Failed to list product');
    }
  };

  return {
    productSearch,
    setProductSearch,
    selectedProductId,
    setSelectedProductId,
    error,
    setError,
    submitting,
    handleSubmit,
  };
}
