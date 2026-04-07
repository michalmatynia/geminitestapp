'use client';

import { useState } from 'react';

import {
  isTraderaBrowserIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useListingBaseComSettings,
  useListingSelection,
} from '@/features/integrations/context/ListingSettingsContext';
import {
  useExportToBaseMutation,
  useCreateListingMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import {
  isTraderaBrowserAuthRequiredMessage,
  preflightTraderaQuickListSession,
} from '@/features/integrations/utils/tradera-browser-session';
import {
  isVintedBrowserAuthRequiredMessage,
  preflightVintedQuickListSession,
} from '@/features/integrations/utils/vinted-browser-session';
import { normalizeVintedDisplayText } from '@/features/integrations/utils/vinted-display';
import { selectProductForListingFormSchema } from '@/features/integrations/validations/listing-forms';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
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
  const { toast } = useToast();

  const {
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    isTraderaIntegration,
  } =
    useListingSelection();

  const { selectedInventoryId, selectedTemplateId, allowDuplicateSku } =
    useListingBaseComSettings();

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
        const isTraderaBrowserIntegration =
          isTraderaIntegration && isTraderaBrowserIntegrationSlug(selectedIntegration?.slug);
        const isVintedBrowserIntegration = isVintedIntegrationSlug(selectedIntegration?.slug);
        if (isTraderaBrowserIntegration && selectedConnectionId) {
          await preflightTraderaQuickListSession({
            integrationId: selectedIntegrationId,
            connectionId: selectedConnectionId,
            productId: selectedProductId ?? undefined,
          });
        }
        if (isVintedBrowserIntegration && selectedConnectionId) {
          const preflightResponse = await preflightVintedQuickListSession({
            integrationId: selectedIntegrationId,
            connectionId: selectedConnectionId,
            productId: selectedProductId ?? undefined,
          });
          if (!preflightResponse.ready) {
            throw new Error(
              'Vinted.pl login requires manual verification. Solve the browser challenge in the opened window and retry.'
            );
          }
        }
        await createListingMutation.mutateAsync({
          integrationId: selectedIntegrationId,
          connectionId: selectedConnectionId,
        });
      }
      onSuccess();
    } catch (err: unknown) {
      logClientCatch(err, { source: 'SelectProductForListingModal', action: 'submit' });
      const errorMessage = err instanceof Error ? err.message : 'Failed to list product';
      const isSelectedVintedIntegration = isVintedIntegrationSlug(selectedIntegration?.slug);
      const displayErrorMessage = isSelectedVintedIntegration
        ? normalizeVintedDisplayText(errorMessage)
        : errorMessage;
      const isSelectedTraderaBrowserIntegration =
        isTraderaIntegration && isTraderaBrowserIntegrationSlug(selectedIntegration?.slug);
      if (
        isSelectedVintedIntegration &&
        isVintedBrowserAuthRequiredMessage(displayErrorMessage)
      ) {
        toast(displayErrorMessage, { variant: 'error' });
      } else if (
        isSelectedTraderaBrowserIntegration &&
        isTraderaBrowserAuthRequiredMessage(displayErrorMessage)
      ) {
        toast(displayErrorMessage, { variant: 'error' });
      }
      setError(displayErrorMessage);
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
