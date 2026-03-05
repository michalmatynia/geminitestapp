import { useState } from 'react';

import {
  useListingBaseComSettings,
  useListingSelection,
} from '@/features/integrations/context/ListingSettingsContext';
import {
  useExportToBaseMutation,
  useCreateListingMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import { selectProductForListingFormSchema } from '@/features/integrations/validations/listing-forms';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { validateFormData } from '@/shared/validations/form-validation';

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

export function useProductSelectionForm(): UseProductSelectionFormResult {
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    selectedIntegrationId,
    selectedConnectionId,
    isBaseComIntegration,
  } = useListingSelection();

  const {
    selectedInventoryId,
    selectedTemplateId,
    allowDuplicateSku,
  } = useListingBaseComSettings();

  const exportToBaseMutation = useExportToBaseMutation(selectedProductId || '');
  const createListingMutation = useCreateListingMutation(selectedProductId || '');

  const submitting = exportToBaseMutation.isPending || createListingMutation.isPending;
  const createExportRequestId = (): string =>
    `base-export-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
      'Please review required listing settings.'
    );
    if (!validation.success) {
      setError(validation.firstError);
      return;
    }

    try {
      setError(null);
      if (isBaseComIntegration) {
        const exportData: ExportToBaseVariables = {
          connectionId: selectedConnectionId,
          inventoryId: selectedInventoryId,
          allowDuplicateSku,
          requestId: createExportRequestId(),
        };
        if (selectedTemplateId && selectedTemplateId !== 'none') {
          exportData.templateId = selectedTemplateId;
        }
        await exportToBaseMutation.mutateAsync(exportData);
      } else {
        await createListingMutation.mutateAsync({
          integrationId: selectedIntegrationId,
          connectionId: selectedConnectionId,
        });
      }
      onSuccess();
    } catch (err: unknown) {
      logClientError(err, {
        context: { source: 'SelectProductForListingModal', action: 'submit' },
      });
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
