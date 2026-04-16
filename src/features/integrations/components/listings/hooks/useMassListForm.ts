'use client';

import { useState, useCallback, useRef } from 'react';

import {
  isTraderaBrowserIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useListingBaseComSettings,
  useListingSelection,
} from '@/features/integrations/context/ListingSettingsContext';
import {
  useUpdateDefaultTraderaConnection,
  useUpdateDefaultVintedConnection,
} from '@/features/integrations/hooks/useIntegrationMutations';
import {
  useGenericExportToBaseMutation,
  useGenericCreateListingMutation,
  type ExportToBaseVariables,
} from '@/features/integrations/hooks/useProductListingMutations';
import type { CapturedLog } from '@/features/integrations/services/exports/log-capture';
import {
  ensureTraderaBrowserSession,
  isTraderaBrowserAuthRequiredMessage,
  preflightTraderaQuickListSession,
} from '@/features/integrations/utils/tradera-browser-session';
import {
  ensureVintedBrowserSession,
  isVintedBrowserAuthRequiredMessage,
  preflightVintedQuickListSession,
} from '@/features/integrations/utils/vinted-browser-session';
import {
  BASE_EXPORT_MISSING_CATEGORY_MESSAGE,
  getBaseExportPreflightError,
} from '@/features/integrations/utils/baseExportPreflight';
import { normalizeVintedDisplayText } from '@/features/integrations/utils/vinted-display';
import { massListProductFormSchema } from '@/features/integrations/validations/listing-forms';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { validateFormData } from '@/shared/validations/form-validation';

import { useMassListProductModalViewContext } from '../mass-list-modal/context/MassListProductModalViewContext';

type MarketplaceRecoveryTarget = 'tradera' | 'vinted';

export function useMassListForm() {
  const { productIds, products, integrationId, connectionId, onSuccess } =
    useMassListProductModalViewContext();

  const {
    selectedConnectionId,
    selectedIntegration,
    isBaseComIntegration,
    isTraderaIntegration,
  } = useListingSelection();

  const { selectedInventoryId, selectedTemplateId, allowDuplicateSku } =
    useListingBaseComSettings();

  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    errors: number;
  } | null>(null);
  const [exportLogs, setExportLogs] = useState<CapturedLog[]>([]);
  const [authRequired, setAuthRequired] = useState(false);
  const [authRequiredMarketplace, setAuthRequiredMarketplace] = useState<
    MarketplaceRecoveryTarget | null
  >(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [resumeIndex, setResumeIndex] = useState(0);
  const persistedPreferredConnectionRef = useRef(false);

  const exportMutation = useGenericExportToBaseMutation();
  const createListingMutation = useGenericCreateListingMutation();
  const updateDefaultTraderaConnectionMutation = useUpdateDefaultTraderaConnection();
  const updateDefaultVintedConnectionMutation = useUpdateDefaultVintedConnection();
  const createExportRequestId = (productId: string, index: number): string =>
    `base-export-${productId}-${index}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  const isSelectedTraderaBrowserIntegration =
    isTraderaIntegration && isTraderaBrowserIntegrationSlug(selectedIntegration?.slug);
  const isSelectedVintedIntegration = isVintedIntegrationSlug(selectedIntegration?.slug);

  const resolveAuthRequiredMarketplace = useCallback(
    (message: string): MarketplaceRecoveryTarget | null => {
      if (isSelectedVintedIntegration && isVintedBrowserAuthRequiredMessage(message)) {
        return 'vinted';
      }
      if (
        isSelectedTraderaBrowserIntegration &&
        isTraderaBrowserAuthRequiredMessage(message)
      ) {
        return 'tradera';
      }
      return null;
    },
    [isSelectedTraderaBrowserIntegration, isSelectedVintedIntegration]
  );

  const persistPreferredConnection = useCallback(
    async (productId: string): Promise<void> => {
      if (persistedPreferredConnectionRef.current || !connectionId) {
        return;
      }

      if (isSelectedTraderaBrowserIntegration) {
        persistedPreferredConnectionRef.current = true;
        try {
          await updateDefaultTraderaConnectionMutation.mutateAsync({ connectionId });
        } catch (preferenceError: unknown) {
          logClientCatch(preferenceError, {
            source: 'MassListProductModal',
            action: 'persistDefaultTraderaConnection',
            productId,
            integrationId,
            connectionId,
            level: 'warn',
          });
        }
        return;
      }

      if (isSelectedVintedIntegration) {
        persistedPreferredConnectionRef.current = true;
        try {
          await updateDefaultVintedConnectionMutation.mutateAsync({ connectionId });
        } catch (preferenceError: unknown) {
          logClientCatch(preferenceError, {
            source: 'MassListProductModal',
            action: 'persistDefaultVintedConnection',
            productId,
            integrationId,
            connectionId,
            level: 'warn',
          });
        }
      }
    },
    [
      connectionId,
      integrationId,
      isSelectedTraderaBrowserIntegration,
      isSelectedVintedIntegration,
      updateDefaultTraderaConnectionMutation,
      updateDefaultVintedConnectionMutation,
    ]
  );

  const runMarketplacePreflight = useCallback(
    async (productId: string): Promise<void> => {
      if (isSelectedTraderaBrowserIntegration && connectionId) {
        await preflightTraderaQuickListSession({
          integrationId,
          connectionId,
          productId,
        });
        return;
      }

      if (isSelectedVintedIntegration && connectionId) {
        const preflightResponse = await preflightVintedQuickListSession({
          integrationId,
          connectionId,
          productId,
        });
        if (!preflightResponse.ready) {
          throw new Error(
            'Vinted.pl login requires manual verification. Solve the browser challenge in the opened window and retry.'
          );
        }
      }
    },
    [
      connectionId,
      integrationId,
      isSelectedTraderaBrowserIntegration,
      isSelectedVintedIntegration,
    ]
  );

  const runBatch = useCallback(
    async (options?: {
      startIndex?: number;
      initialErrors?: number;
      resetState?: boolean;
    }): Promise<void> => {
      const startIndex = options?.startIndex ?? 0;
      let errors = options?.initialErrors ?? 0;
      const shouldResetState = options?.resetState ?? startIndex === 0;
      const allLogs: CapturedLog[] = shouldResetState ? [] : [...exportLogs];

      setError(null);
      setAuthRequired(false);
      setAuthRequiredMarketplace(null);

      if (shouldResetState) {
        setProgress({ current: 0, total: productIds.length, errors });
        setExportLogs([]);
        if (startIndex === 0) {
          persistedPreferredConnectionRef.current = false;
          setResumeIndex(0);
        }
      } else {
        setProgress(
          (prev) =>
            prev ?? {
              current: startIndex,
              total: productIds.length,
              errors,
            }
        );
      }

      for (let i = startIndex; i < productIds.length; i++) {
        const productId = productIds[i];
        if (!productId) continue;
        setProgress((prev) =>
          prev
            ? { ...prev, current: i + 1, errors }
            : { current: i + 1, total: productIds.length, errors }
        );

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
            await runMarketplacePreflight(productId);
            await createListingMutation.mutateAsync({
              productId,
              integrationId,
              connectionId,
            });
            await persistPreferredConnection(productId);
          }
        } catch (e: unknown) {
          logClientCatch(e, {
            source: 'MassListProductModal',
            action: 'listProduct',
            productId,
            integrationId,
          });
          const errorMessage = e instanceof Error ? e.message : 'Failed to list product';
          const displayErrorMessage = isSelectedVintedIntegration
            ? normalizeVintedDisplayText(errorMessage)
            : errorMessage;
          const marketplace = resolveAuthRequiredMarketplace(displayErrorMessage);
          if (marketplace) {
            setError(displayErrorMessage);
            setAuthRequired(true);
            setAuthRequiredMarketplace(marketplace);
            setResumeIndex(i);
            setProgress((prev) =>
              prev
                ? { ...prev, errors }
                : { current: i + 1, total: productIds.length, errors }
            );
            return;
          }

          errors++;
          setProgress((prev) =>
            prev
              ? { ...prev, errors }
              : { current: i + 1, total: productIds.length, errors }
          );
        }
      }

      setResumeIndex(0);
      if (errors === 0) {
        onSuccess();
      } else {
        setError(`Completed with ${errors} errors.`);
        setTimeout(() => onSuccess(), 2000);
      }
    },
    [
      allowDuplicateSku,
      connectionId,
      createListingMutation,
      exportLogs,
      exportMutation,
      integrationId,
      isBaseComIntegration,
      onSuccess,
      persistPreferredConnection,
      productIds,
      resolveAuthRequiredMarketplace,
      runMarketplacePreflight,
      selectedConnectionId,
      selectedInventoryId,
      selectedTemplateId,
    ]
  );

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

    if (isBaseComIntegration) {
      const selectedProductIds = new Set(productIds);
      const hasMissingCategory = products.some(
        (product) =>
          selectedProductIds.has(product.id) &&
          Boolean(getBaseExportPreflightError(product.categoryId))
      );
      if (hasMissingCategory) {
        setError(BASE_EXPORT_MISSING_CATEGORY_MESSAGE);
        return;
      }
    }

    const shouldResume = authRequired && !isBaseComIntegration;
    await runBatch({
      startIndex: shouldResume ? resumeIndex : 0,
      initialErrors: shouldResume ? progress?.errors ?? 0 : 0,
      resetState: !shouldResume,
    });
  }, [
    authRequired,
    isBaseComIntegration,
    progress?.errors,
    productIds,
    products,
    resumeIndex,
    runBatch,
    selectedInventoryId,
  ]);

  const handleMarketplaceLogin = useCallback(async (): Promise<void> => {
    const marketplace: MarketplaceRecoveryTarget | null =
      authRequiredMarketplace ??
      (isSelectedTraderaBrowserIntegration
        ? 'tradera'
        : isSelectedVintedIntegration
          ? 'vinted'
          : null);

    if (!marketplace || !connectionId) {
      return;
    }

    try {
      setLoggingIn(true);
      setError(null);

      if (marketplace === 'tradera') {
        await ensureTraderaBrowserSession({
          integrationId,
          connectionId,
        });
      } else {
        const response = await ensureVintedBrowserSession({
          integrationId,
          connectionId,
        });
        if (!response.savedSession) {
          setError(
            'Vinted.pl login session could not be saved. Complete login verification and retry.'
          );
          setAuthRequired(true);
          setAuthRequiredMarketplace('vinted');
          return;
        }
      }

      await runBatch({
        startIndex: resumeIndex,
        initialErrors: progress?.errors ?? 0,
        resetState: false,
      });
    } catch (err: unknown) {
      logClientCatch(err, {
        source: 'MassListProductModal',
        action: marketplace === 'vinted' ? 'vintedLogin' : 'traderaLogin',
        integrationId,
        connectionId,
      });

      const errorMessage =
        err instanceof Error
          ? err.message
          : marketplace === 'vinted'
            ? 'Failed to open Vinted.pl login'
            : 'Failed to open Tradera login';
      const displayErrorMessage =
        marketplace === 'vinted' ? normalizeVintedDisplayText(errorMessage) : errorMessage;
      setError(displayErrorMessage);

      const nextMarketplace = resolveAuthRequiredMarketplace(displayErrorMessage);
      if (nextMarketplace) {
        setAuthRequired(true);
        setAuthRequiredMarketplace(nextMarketplace);
      } else {
        setAuthRequired(false);
        setAuthRequiredMarketplace(null);
      }
    } finally {
      setLoggingIn(false);
    }
  }, [
    authRequiredMarketplace,
    connectionId,
    integrationId,
    isSelectedTraderaBrowserIntegration,
    isSelectedVintedIntegration,
    progress?.errors,
    resolveAuthRequiredMarketplace,
    resumeIndex,
    runBatch,
  ]);

  const submitting =
    exportMutation.isPending ||
    createListingMutation.isPending ||
    updateDefaultTraderaConnectionMutation.isPending ||
    updateDefaultVintedConnectionMutation.isPending;

  return {
    error,
    setError,
    progress,
    setProgress,
    exportLogs,
    setExportLogs,
    authRequired,
    authRequiredMarketplace,
    loggingIn,
    handleSubmit,
    handleMarketplaceLogin,
    submitting,
  };
}
