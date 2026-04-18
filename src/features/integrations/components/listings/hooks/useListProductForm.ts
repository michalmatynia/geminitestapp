'use client';

import { useState } from 'react';

import {
  isTraderaBrowserIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useListingBaseComSettings,
  useListingSelection,
  useListingTraderaSettings,
} from '@/features/integrations/context/ListingSettingsContext';
import { useUpdateDefaultTraderaConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import { useUpdateDefaultVintedConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import {
  useExportToBaseMutation,
  useCreateListingMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import {
  ensureTraderaBrowserSession,
  isTraderaBrowserAuthRequiredMessage,
  preflightTraderaQuickListSession,
  TRADERA_BROWSER_MANUAL_VERIFICATION_MESSAGE,
  TRADERA_BROWSER_SESSION_SAVE_FAILURE_MESSAGE,
} from '@/features/integrations/utils/tradera-browser-session';
import {
  ensureVintedBrowserSession,
  isVintedBrowserAuthRequiredMessage,
  preflightVintedQuickListSession,
} from '@/features/integrations/utils/vinted-browser-session';
import { normalizeVintedDisplayText } from '@/features/integrations/utils/vinted-display';
import { getBaseExportPreflightError } from '@/features/integrations/utils/baseExportPreflight';
import { listProductFormSchema } from '@/features/integrations/validations/listing-forms';
import type { ImageTransformOptions, ImageRetryPreset } from '@/shared/contracts/integrations/base';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { validateFormData } from '@/shared/validations/form-validation';

type UseListProductFormResult = {
  error: string | null;
  setError: (value: string | null) => void;
  exportLogs: CapturedLog[];
  setExportLogs: (value: CapturedLog[]) => void;
  logsOpen: boolean;
  setLogsOpen: (value: boolean) => void;
  submitting: boolean;
  authRequired: boolean;
  authRequiredMarketplace: 'tradera' | 'vinted' | null;
  loggingIn: boolean;
  handleSubmit: (onSuccess: () => void) => Promise<void>;
  handleMarketplaceLogin: (onSuccess: () => void) => Promise<void>;
  handleImageRetry: (preset: ImageRetryPreset, onSuccess: () => void) => Promise<void>;
};

export function useListProductForm(
  productId: string,
  productCategoryId: string | null
): UseListProductFormResult {
  const [error, setError] = useState<string | null>(null);
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [logsOpen, setLogsOpen] = useState<boolean>(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [authRequiredMarketplace, setAuthRequiredMarketplace] = useState<
    'tradera' | 'vinted' | null
  >(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const { toast } = useToast();

  const {
    selectedIntegrationId,
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    isTraderaIntegration,
  } = useListingSelection();

  const { selectedInventoryId, selectedTemplateId } = useListingBaseComSettings();

  const {
    selectedTraderaDurationHours,
    selectedTraderaAutoRelistEnabled,
    selectedTraderaAutoRelistLeadMinutes,
    selectedTraderaTemplateId,
  } = useListingTraderaSettings();

  const exportToBaseMutation = useExportToBaseMutation(productId);
  const createListingMutation = useCreateListingMutation(productId);
  const updateDefaultTraderaConnectionMutation = useUpdateDefaultTraderaConnection();
  const updateDefaultVintedConnectionMutation = useUpdateDefaultVintedConnection();

  const submitting =
    exportToBaseMutation.isPending ||
    createListingMutation.isPending ||
    updateDefaultTraderaConnectionMutation.isPending ||
    updateDefaultVintedConnectionMutation.isPending;

  const createExportRequestId = (): string =>
    `base-export-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const exportToBase = async (
    connectionId: string,
    inventoryId: string,
    options?: {
      imageBase64Mode?: 'base-only' | 'full-data-uri';
      imageTransform?: ImageTransformOptions | null;
    }
  ): Promise<void> => {
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

  const handleSubmit = async (onSuccess: () => void): Promise<void> => {
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
      if (isBaseComIntegration) {
        const preflightError = getBaseExportPreflightError(productCategoryId);
        if (preflightError) {
          setError(preflightError);
          return;
        }
      }

      setError(null);
      setAuthRequired(false);
      setAuthRequiredMarketplace(null);
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
        const isTraderaBrowserIntegration =
          isTraderaIntegration && isTraderaBrowserIntegrationSlug(selectedIntegration?.slug);
        const isVintedBrowserIntegration = isVintedIntegrationSlug(selectedIntegration?.slug);
        if (isTraderaBrowserIntegration && selectedConnectionId) {
          const preflightResponse = await preflightTraderaQuickListSession({
            integrationId: selectedIntegrationId,
            connectionId: selectedConnectionId,
            productId,
          });
          if (!preflightResponse.ready) {
            throw new Error(TRADERA_BROWSER_MANUAL_VERIFICATION_MESSAGE);
          }
        }
        if (isVintedBrowserIntegration && selectedConnectionId) {
          const preflightResponse = await preflightVintedQuickListSession({
            integrationId: selectedIntegrationId,
            connectionId: selectedConnectionId,
            productId,
          });
          if (!preflightResponse.ready) {
            throw new Error(
              'Vinted.pl login requires manual verification. Solve the browser challenge in the opened window and retry.'
            );
          }
        }

        const response = await createListingMutation.mutateAsync({
          integrationId: selectedIntegrationId,
          connectionId: selectedConnectionId,
          ...(isTraderaIntegration
            ? {
              durationHours: selectedTraderaDurationHours,
              autoRelistEnabled: selectedTraderaAutoRelistEnabled,
              autoRelistLeadMinutes: selectedTraderaAutoRelistLeadMinutes,
              templateId:
                  selectedTraderaTemplateId && selectedTraderaTemplateId !== 'none'
                    ? selectedTraderaTemplateId
                    : null,
            }
            : {}),
        });
        if (isTraderaIntegration) {
          if (
            isTraderaBrowserIntegration &&
            selectedConnectionId
          ) {
            try {
              await updateDefaultTraderaConnectionMutation.mutateAsync({
                connectionId: selectedConnectionId,
              });
            } catch (preferenceError: unknown) {
              logClientCatch(preferenceError, {
                source: 'ListProductModal',
                action: 'persistDefaultTraderaConnection',
                productId,
                integrationId: selectedIntegrationId,
                connectionId: selectedConnectionId,
                level: 'warn',
              });
            }
          }
          const queue = response.queue;
          toast(
            queue?.jobId
              ? `Tradera listing queued (job ${queue.jobId}).`
              : 'Tradera listing queued.',
            { variant: 'success' }
          );
        } else if (isVintedIntegrationSlug(selectedIntegration?.slug) && selectedConnectionId) {
          try {
            await updateDefaultVintedConnectionMutation.mutateAsync({
              connectionId: selectedConnectionId,
            });
          } catch (preferenceError: unknown) {
            logClientCatch(preferenceError, {
              source: 'ListProductModal',
              action: 'persistDefaultVintedConnection',
              productId,
              integrationId: selectedIntegrationId,
              connectionId: selectedConnectionId,
              level: 'warn',
            });
          }
          const queue = response.queue;
          toast(
            queue?.jobId
              ? `Vinted.pl listing queued (job ${queue.jobId}).`
              : 'Vinted.pl listing queued.',
            { variant: 'success' }
          );
        }
        onSuccess();
      }
    } catch (err: unknown) {
      logClientCatch(err, {
        source: 'ListProductModal',
        action: 'submit',
        productId,
        integrationId: selectedIntegrationId,
      });
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
        setAuthRequired(true);
        setAuthRequiredMarketplace('vinted');
      } else if (
        isSelectedTraderaBrowserIntegration &&
        isTraderaBrowserAuthRequiredMessage(displayErrorMessage)
      ) {
        setAuthRequired(true);
        setAuthRequiredMarketplace('tradera');
      }
      setError(displayErrorMessage);
    }
  };

  const handleImageRetry = async (
    preset: ImageRetryPreset,
    onSuccess: () => void
  ): Promise<void> => {
    if (!isBaseComIntegration || !selectedConnectionId || !selectedInventoryId) {
      return;
    }
    try {
      const preflightError = getBaseExportPreflightError(productCategoryId);
      if (preflightError) {
        setError(preflightError);
        return;
      }

      setError(null);
      setExportLogs([]);
      setLogsOpen(true);
      const exportOptions: {
        imageBase64Mode?: 'base-only' | 'full-data-uri';
        imageTransform?: ImageTransformOptions | null;
      } = {};
      if (preset.imageBase64Mode) exportOptions.imageBase64Mode = preset.imageBase64Mode;
      if (preset.transform) exportOptions.imageTransform = preset.transform;

      await exportToBase(selectedConnectionId || '', selectedInventoryId || '', exportOptions);
      onSuccess();
    } catch (err: unknown) {
      logClientCatch(err, { source: 'ListProductModal', action: 'imageRetry', productId });
      setError(err instanceof Error ? err.message : 'Failed to export product');
    }
  };

  const handleMarketplaceLogin = async (onSuccess: () => void): Promise<void> => {
    const isTraderaBrowserIntegration =
      isTraderaIntegration && isTraderaBrowserIntegrationSlug(selectedIntegration?.slug);
    const isVintedBrowserIntegration = isVintedIntegrationSlug(selectedIntegration?.slug);
    const marketplace =
      authRequiredMarketplace ??
      (isTraderaBrowserIntegration ? 'tradera' : isVintedBrowserIntegration ? 'vinted' : null);
    if (!marketplace) {
      setError('The selected marketplace no longer supports browser login recovery. Reopen listing settings and retry.');
      return;
    }
    if (!selectedIntegrationId || !selectedConnectionId) {
      setError(
        marketplace === 'vinted'
          ? 'Vinted.pl connection is no longer selected. Reopen listing settings and retry.'
          : 'Tradera connection is no longer selected. Reopen listing settings and retry.'
      );
      setAuthRequired(true);
      setAuthRequiredMarketplace(marketplace);
      return;
    }
    try {
      setLoggingIn(true);
      setError(null);
      if (marketplace === 'tradera') {
        const response = await ensureTraderaBrowserSession({
          integrationId: selectedIntegrationId,
          connectionId: selectedConnectionId,
        });
        if (!response.savedSession) {
          setError(TRADERA_BROWSER_SESSION_SAVE_FAILURE_MESSAGE);
          setAuthRequired(true);
          setAuthRequiredMarketplace('tradera');
          return;
        }
        toast('Tradera login session refreshed.', { variant: 'success' });
      } else {
        const response = await ensureVintedBrowserSession({
          integrationId: selectedIntegrationId,
          connectionId: selectedConnectionId,
        });
        if (!response.savedSession) {
          setError(
            'Vinted.pl login session could not be saved. Complete login verification and retry.'
          );
          setAuthRequired(true);
          setAuthRequiredMarketplace('vinted');
          return;
        }
        toast('Vinted.pl login session refreshed.', { variant: 'success' });
      }
      setAuthRequired(false);
      setAuthRequiredMarketplace(null);
      await handleSubmit(onSuccess);
    } catch (err: unknown) {
      logClientCatch(err, {
        source: 'ListProductModal',
        action: marketplace === 'vinted' ? 'vintedLogin' : 'traderaLogin',
        productId,
        integrationId: selectedIntegrationId,
        connectionId: selectedConnectionId,
      });
      const errorMessage =
        err instanceof Error
          ? err.message
          : marketplace === 'vinted'
            ? 'Failed to open Vinted.pl login'
            : 'Failed to open Tradera login';
      setError(
        marketplace === 'vinted' ? normalizeVintedDisplayText(errorMessage) : errorMessage
      );
    } finally {
      setLoggingIn(false);
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
    authRequired,
    authRequiredMarketplace,
    loggingIn,
    handleSubmit,
    handleMarketplaceLogin,
    handleImageRetry,
  };
}
