'use client';
'use no memo';

import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { BaseActiveTemplatePreferenceResponse, BaseDefaultConnectionPreferenceResponse, BaseDefaultInventoryPreferenceResponse } from '@/shared/contracts/integrations/preferences';
import type { BaseImportInventoriesPayload, BaseImportInventoriesResponse } from '@/shared/contracts/integrations/import-export';
import type { BaseProductLinkExistingPayload, BaseProductLinkExistingResponse, BaseProductSkuCheckPayload, BaseProductSkuCheckResponse } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { ApiError, api } from '@/shared/lib/api-client';
import {
  type IntegrationWithConnections,
  isBaseIntegrationSlug,
  useGenericExportToBaseMutation,
  createBaseRecoveryContext,
  fetchIntegrationsWithConnections,
  fetchPreferredBaseConnection,
  integrationSelectionQueryKeys,
  getBaseExportPreflightError,
} from '@/features/integrations/product-integrations-adapter';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import {
  subscribeToTrackedAiPathRun,
  type TrackedAiPathRunSnapshot,
} from '@/shared/lib/ai-paths/client-run-tracker';
import {
  resolveTriggerButtonRunFeedbackPresentation,
  type TriggerButtonRunFeedbackStatus,
} from '@/shared/lib/ai-paths/trigger-button-run-feedback';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { invalidateProductListingsAndBadges } from '@/shared/lib/query-invalidation';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { InsetPanel } from '@/shared/ui/InsetPanel';
import { useToast } from '@/shared/ui/toast';

import { cn } from '@/shared/utils/ui-utils';

import {
  FAILURE_STATUSES,
  SUCCESS_STATUSES,
  getMarketplaceButtonClass,
  normalizeMarketplaceStatus,
} from '../product-column-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const INTEGRATION_SELECTION_STALE_TIME_MS = 5 * 60 * 1000;
const defaultExportInventoryQueryKey = QUERY_KEYS.integrations.defaultExportInventory();
const oneClickExportInFlight = new Set<string>();
const BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY = 'base-quick-export-feedback';
const ACTIVE_EXPORT_FEEDBACK_TTL_MS = 15 * 60 * 1000;
const TERMINAL_EXPORT_FEEDBACK_TTL_MS = 30 * 60 * 1000;

const normalizeInventoryId = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveFallbackInventoryId = (
  inventories: BaseImportInventoriesResponse['inventories'] | null | undefined
): string => {
  const normalizedInventories = (Array.isArray(inventories) ? inventories : [])
    .map((entry) => ({
      id: normalizeInventoryId(entry.id),
      isDefault: entry.is_default === true,
    }))
    .filter((entry) => entry.id.length > 0);

  const defaultInventory = normalizedInventories.find((entry) => entry.isDefault === true);
  if (defaultInventory !== undefined && defaultInventory.id !== '') return defaultInventory.id;
  if (normalizedInventories.length === 1) {
    const first = normalizedInventories[0];
    return first !== undefined ? first.id : '';
  }
  return '';
};

const resolveBaseConnectionCandidates = (
  integrations: IntegrationWithConnections[] | null | undefined
): string[] => {
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const integration of Array.isArray(integrations) ? integrations : []) {
    if (integration === null || isBaseIntegrationSlug(integration.slug) === false) continue;
    for (const connection of Array.isArray(integration.connections) ? integration.connections : []) {
      const connectionId = (connection?.id ?? '').trim();
      if (connectionId === '' || seen.has(connectionId) === true) continue;
      seen.add(connectionId);
      candidates.push(connectionId);
    }
  }

  return candidates;
};

const readApiErrorPayload = (error: unknown): Record<string, unknown> | null => {
  if (!(error instanceof ApiError)) return null;
  if (error.payload === null || error.payload === undefined || typeof error.payload !== 'object' || Array.isArray(error.payload)) {
    return null;
  }
  return error.payload as Record<string, unknown>;
};

const readApiErrorCode = (error: unknown): string | null => {
  const payload = readApiErrorPayload(error);
  const code = payload?.['code'];
  return typeof code === 'string' ? code : null;
};

const readApiErrorDetails = (error: unknown): Record<string, unknown> | null => {
  const payload = readApiErrorPayload(error);
  const details = payload?.['details'];
  if (details === null || details === undefined || typeof details !== 'object' || Array.isArray(details)) return null;
  return details as Record<string, unknown>;
};

const readBaseApiErrorCode = (error: unknown): string | null => {
  const details = readApiErrorDetails(error);
  const errorCode = details?.['errorCode'];
  return typeof errorCode === 'string' ? errorCode : null;
};

const shouldIgnoreInventoryLookupError = (
  error: unknown,
  configuredInventoryId: string
): boolean => {
  if (configuredInventoryId === '') return false;

  const baseErrorCode = readBaseApiErrorCode(error);
  if (baseErrorCode === 'ERROR_USER_ACCOUNT_BLOCKED') return false;
  if (baseErrorCode === 'ERROR_UNKNOWN_METHOD') return true;

  const apiErrorCode = readApiErrorCode(error);
  if (apiErrorCode === 'TIMEOUT' || apiErrorCode === 'SERVICE_UNAVAILABLE') return true;
  if (apiErrorCode === 'INTEGRATION_ERROR' || apiErrorCode === 'API_KEY_INVALID') return false;
  if (apiErrorCode === 'UNAUTHORIZED' || apiErrorCode === 'FORBIDDEN') return false;

  if (error instanceof ApiError) {
    return error.status >= 500;
  }

  return true;
};

type QuickExportContext = {
  connectionId: string;
  inventoryId: string;
  templateId: string;
};

type ExistingSkuDecisionState = QuickExportContext & {
  sku: string;
  existingProductId: string | null;
};

type PersistedBaseQuickExportFeedback = {
  productId: string;
  runId: string | null;
  status: TriggerButtonRunFeedbackStatus;
  errorMessage?: string | null;
  expiresAt: number;
};

const TERMINAL_EXPORT_RUN_STATUSES = new Set<TriggerButtonRunFeedbackStatus>([
  'completed',
  'failed',
  'canceled',
]);

const canUseSessionStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const resolveExportFeedbackTtlMs = (status: TriggerButtonRunFeedbackStatus): number =>
  TERMINAL_EXPORT_RUN_STATUSES.has(status)
    ? TERMINAL_EXPORT_FEEDBACK_TTL_MS
    : ACTIVE_EXPORT_FEEDBACK_TTL_MS;

const readPersistedBaseQuickExportFeedbackMap = (): Record<string, PersistedBaseQuickExportFeedback> => {
  if (canUseSessionStorage() === false) return {};
  try {
    const raw = window.sessionStorage.getItem(BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY);
    if (raw === null || raw === '') return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const next: Record<string, PersistedBaseQuickExportFeedback> = {};
    const now = Date.now();

    Object.entries(parsed as Record<string, unknown>).forEach(([productId, value]) => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return;
      const record = value as Record<string, unknown>;
      const statusValue = record['status'];
      const status =
        typeof statusValue === 'string'
          ? (statusValue as TriggerButtonRunFeedbackStatus)
          : null;
      const expiresAtValue = record['expiresAt'];
      const expiresAt =
        typeof expiresAtValue === 'number' && Number.isFinite(expiresAtValue)
          ? expiresAtValue
          : 0;
      if (status === null || expiresAt <= now) return;
      next[productId] = {
        productId,
        runId: typeof record['runId'] === 'string' && record['runId'].trim().length > 0
          ? record['runId'].trim()
          : null,
        status,
        errorMessage:
          typeof record['errorMessage'] === 'string' && record['errorMessage'].trim().length > 0
            ? record['errorMessage'].trim()
            : null,
        expiresAt,
      };
    });

    return next;
  } catch {
    return {};
  }
};

const writePersistedBaseQuickExportFeedbackMap = (
  nextMap: Record<string, PersistedBaseQuickExportFeedback>
): void => {
  if (canUseSessionStorage() === false) return;
  try {
    if (Object.keys(nextMap).length === 0) {
      window.sessionStorage.removeItem(BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(BASE_QUICK_EXPORT_FEEDBACK_STORAGE_KEY, JSON.stringify(nextMap));
  } catch {
    // Best-effort UI persistence only.
  }
};

const readPersistedBaseQuickExportFeedback = (
  productId: string
): PersistedBaseQuickExportFeedback | null => {
  const nextMap = readPersistedBaseQuickExportFeedbackMap();
  const record = nextMap[productId];
  writePersistedBaseQuickExportFeedbackMap(nextMap);
  return record !== undefined ? record : null;
};

const persistBaseQuickExportFeedback = (
  productId: string,
  runId: string | null,
  status: TriggerButtonRunFeedbackStatus,
  errorMessage?: string | null
): void => {
  if (productId.trim() === '') return;
  const nextMap = readPersistedBaseQuickExportFeedbackMap();
  nextMap[productId] = {
    productId,
    runId,
    status,
    errorMessage:
      typeof errorMessage === 'string' && errorMessage.trim().length > 0
        ? errorMessage.trim()
        : null,
    expiresAt: Date.now() + resolveExportFeedbackTtlMs(status),
  };
  writePersistedBaseQuickExportFeedbackMap(nextMap);
};

const clearPersistedBaseQuickExportFeedback = (productId: string): void => {
  if (productId.trim() === '') return;
  const nextMap = readPersistedBaseQuickExportFeedbackMap();
  if (!(productId in nextMap)) return;
  delete nextMap[productId];
  writePersistedBaseQuickExportFeedbackMap(nextMap);
};

export function BaseQuickExportButton(props: {
  product: ProductWithImages;
  status: string;
  prefetchListings: () => void;
  showMarketplaceBadge: boolean;
  onOpenIntegrations?: ((recoveryContext?: ProductListingsRecoveryContext) => void) | undefined;
}): React.JSX.Element {
  const {
    product,
    status,
    prefetchListings,
    showMarketplaceBadge,
    onOpenIntegrations,
  } = props;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const quickExportMutation = useGenericExportToBaseMutation();
  const quickExportLockRef = useRef(false);
  const trackedExportRunIdRef = useRef<string | null>(null);
  const trackedExportRunUnsubscribeRef = useRef<(() => void) | null>(null);
  const [quickExportLocked, setQuickExportLocked] = useState(false);
  const [existingSkuDecision, setExistingSkuDecision] = useState<ExistingSkuDecisionState | null>(
    null
  );
  const [linkExistingPending, setLinkExistingPending] = useState(false);
  const [trackedExportRunStatus, setTrackedExportRunStatus] =
    useState<TriggerButtonRunFeedbackStatus | null>(null);
  const [trackedExportRunContextId, setTrackedExportRunContextId] = useState<string | null>(null);
  const [trackedExportRunErrorMessage, setTrackedExportRunErrorMessage] = useState<string | null>(
    null
  );

  const stopTrackingExportRun = useCallback((): void => {
    trackedExportRunUnsubscribeRef.current?.();
    trackedExportRunUnsubscribeRef.current = null;
    trackedExportRunIdRef.current = null;
  }, []);

  const setTrackedExportStatus = useCallback(
    (
      newStatus: TriggerButtonRunFeedbackStatus | null,
      options?: { runId?: string | null; errorMessage?: string | null }
    ): void => {
      setTrackedExportRunStatus(newStatus);
      if (newStatus === null) {
        setTrackedExportRunContextId(null);
        setTrackedExportRunErrorMessage(null);
        clearPersistedBaseQuickExportFeedback(product.id);
        return;
      }
      const normalizedRunId = (options?.runId?.trim() ?? '') !== '' ? options!.runId!.trim() : null;
      setTrackedExportRunContextId(normalizedRunId);
      const normalizedErrorMessage =
        typeof options?.errorMessage === 'string' && options.errorMessage.trim().length > 0
          ? options.errorMessage.trim()
          : null;
      setTrackedExportRunErrorMessage(normalizedErrorMessage);
      persistBaseQuickExportFeedback(
        product.id,
        normalizedRunId,
        newStatus,
        normalizedErrorMessage
      );
    },
    [product.id]
  );

  useEffect(
    () => () => {
      stopTrackingExportRun();
    },
    [stopTrackingExportRun]
  );

  const handleTrackedExportRunSnapshot = useCallback(
    (runId: string, snapshot: TrackedAiPathRunSnapshot): void => {
      if (trackedExportRunIdRef.current !== runId) return;
      if (snapshot.trackingState === 'stopped' && !TERMINAL_EXPORT_RUN_STATUSES.has(snapshot.status)) {
        // Tracking ended without a terminal status (timeout or poll failure).
        // Clear state so the button falls back to the server-backed badge instead of hanging yellow.
        stopTrackingExportRun();
        setTrackedExportStatus(null);
        return;
      }
      setTrackedExportStatus(snapshot.status, {
        runId,
        errorMessage: snapshot.errorMessage,
      });
      if (
        snapshot.trackingState === 'stopped' ||
        TERMINAL_EXPORT_RUN_STATUSES.has(snapshot.status)
      ) {
        stopTrackingExportRun();
      }
    },
    [setTrackedExportStatus, stopTrackingExportRun]
  );

  const startTrackingExportRun = useCallback(
    (runId: string, initialStatus: TriggerButtonRunFeedbackStatus): void => {
      const normalizedRunId = runId.trim();
      if (normalizedRunId === '') {
        setTrackedExportStatus(initialStatus, { runId: null });
        return;
      }

      if (trackedExportRunIdRef.current !== normalizedRunId) {
        stopTrackingExportRun();
        trackedExportRunIdRef.current = normalizedRunId;
      }

      setTrackedExportStatus(initialStatus, { runId: normalizedRunId });
      if (TERMINAL_EXPORT_RUN_STATUSES.has(initialStatus)) {
        stopTrackingExportRun();
        return;
      }
      trackedExportRunUnsubscribeRef.current = subscribeToTrackedAiPathRun(
        normalizedRunId,
        (snapshot: TrackedAiPathRunSnapshot): void => {
          handleTrackedExportRunSnapshot(normalizedRunId, snapshot);
        },
        {
          initialSnapshot: {
            runId: normalizedRunId,
            status: initialStatus === 'waiting' ? 'queued' : initialStatus,
            entityId: product.id,
            entityType: 'product',
          },
        }
      );
    },
    [handleTrackedExportRunSnapshot, product.id, setTrackedExportStatus, stopTrackingExportRun]
  );

  useEffect(() => {
    const persistedFeedback = readPersistedBaseQuickExportFeedback(product.id);
    if (persistedFeedback === null) {
      return;
    }

    trackedExportRunIdRef.current = persistedFeedback.runId;
    setTrackedExportRunStatus(persistedFeedback.status);
    setTrackedExportRunContextId(persistedFeedback.runId);
    setTrackedExportRunErrorMessage(persistedFeedback.errorMessage ?? null);
    if (
      persistedFeedback.runId !== null &&
      TERMINAL_EXPORT_RUN_STATUSES.has(persistedFeedback.status) === false
    ) {
      startTrackingExportRun(persistedFeedback.runId, persistedFeedback.status);
    }
  }, [product.id, startTrackingExportRun]);

  useEffect(() => {
    if (showMarketplaceBadge === false) return;
    if (trackedExportRunStatus === null) return;
    if (TERMINAL_EXPORT_RUN_STATUSES.has(trackedExportRunStatus) === false) return;

    // Once the list runtime confirms the product is exported, the server-backed
    // listing badge becomes the source of truth and stale terminal client-run
    // feedback should no longer override the button tone.
    stopTrackingExportRun();
    setTrackedExportStatus(null);
  }, [setTrackedExportStatus, showMarketplaceBadge, stopTrackingExportRun, trackedExportRunStatus]);

  const resolveQuickExportContext = async (): Promise<QuickExportContext | null> => {
    try {
      const [preferredConnection, defaultInventory, integrationsWithConnections] =
        await Promise.all([
        fetchQueryV2<BaseDefaultConnectionPreferenceResponse>(queryClient, {
          queryKey: normalizeQueryKey(integrationSelectionQueryKeys.defaultConnection),
          queryFn: async () => await fetchPreferredBaseConnection(),
          staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
          meta: {
            source: 'products.columns.buttons.BaseQuickExport.resolveContext.preferredConnection',
            operation: 'detail',
            resource: 'integrations.default-connection',
            domain: 'integrations',
            queryKey: normalizeQueryKey(integrationSelectionQueryKeys.defaultConnection),
            tags: ['integrations', 'default-connection', 'fetch'],
            description: 'Loads integrations default connection.'},
        })(),
        fetchQueryV2<BaseDefaultInventoryPreferenceResponse>(queryClient, {
          queryKey: normalizeQueryKey(defaultExportInventoryQueryKey),
          queryFn: async () =>
            await api.get<BaseDefaultInventoryPreferenceResponse>(
              '/api/v2/integrations/exports/base/default-inventory'
            ),
          staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
          meta: {
            source: 'products.columns.buttons.BaseQuickExport.resolveContext.defaultInventory',
            operation: 'detail',
            resource: 'integrations.default-inventory',
            domain: 'integrations',
            queryKey: normalizeQueryKey(defaultExportInventoryQueryKey),
            tags: ['integrations', 'default-inventory', 'fetch'],
            description: 'Loads integrations default inventory.'},
        })(),
        fetchQueryV2<IntegrationWithConnections[]>(queryClient, {
          queryKey: normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
          queryFn: async () => await fetchIntegrationsWithConnections(),
          staleTime: INTEGRATION_SELECTION_STALE_TIME_MS,
          meta: {
            source: 'products.columns.buttons.BaseQuickExport.resolveContext.integrationsWithConnections',
            operation: 'list',
            resource: 'integrations.with-connections',
            domain: 'integrations',
            queryKey: normalizeQueryKey(integrationSelectionQueryKeys.withConnections),
            tags: ['integrations', 'with-connections', 'fetch'],
            description: 'Loads integrations with connections for one-click export fallback.',
          },
        })().catch(() => [] as IntegrationWithConnections[]),
        ]);

      const preferredConnectionId = (preferredConnection?.connectionId?.trim() ?? '');
      const availableBaseConnectionIds = resolveBaseConnectionCandidates(integrationsWithConnections);
      let connectionId = preferredConnectionId;

      if (connectionId === '') {
        connectionId =
          availableBaseConnectionIds.length === 1 ? availableBaseConnectionIds[0] ?? '' : '';
      } else if (
        availableBaseConnectionIds.length > 0 &&
        availableBaseConnectionIds.includes(connectionId) === false
      ) {
        connectionId =
          availableBaseConnectionIds.length === 1 ? availableBaseConnectionIds[0] ?? '' : '';
      }

      if (connectionId === '') {
        toast('Set a default Base.com connection first.', { variant: 'error' });
        return null;
      }

      if (connectionId !== preferredConnectionId) {
        void api
          .post<BaseDefaultConnectionPreferenceResponse>(
            '/api/v2/integrations/exports/base/default-connection',
            { connectionId }
          )
          .catch(() => undefined);
      }

      const configuredInventoryId = normalizeInventoryId(defaultInventory?.inventoryId);
      let fallbackInventoryId = '';
      let availableInventoryIds = new Set<string>();

      try {
        const inventoriesResponse = await api.post<BaseImportInventoriesResponse>(
          '/api/v2/integrations/imports/base',
          {
            action: 'inventories',
            connectionId,
          } satisfies BaseImportInventoriesPayload
        );
        fallbackInventoryId = resolveFallbackInventoryId(inventoriesResponse.inventories);
        availableInventoryIds = new Set(
          (Array.isArray(inventoriesResponse.inventories) ? inventoriesResponse.inventories : [])
            .map((entry) => normalizeInventoryId(entry.id))
            .filter((value) => value.length > 0)
        );
      } catch (error) {
        if (shouldIgnoreInventoryLookupError(error, configuredInventoryId) === false) {
          throw error;
        }
      }

      let inventoryId = configuredInventoryId;

      if (inventoryId === '') {
        inventoryId = fallbackInventoryId;
      } else if (availableInventoryIds.size > 0 && availableInventoryIds.has(inventoryId) === false) {
        inventoryId = fallbackInventoryId;
      }

      if (inventoryId === '') {
        const message = configuredInventoryId !== ''
          ? 'Configured Base.com inventory is not available for this connection. Open Export Settings and select a valid inventory.'
          : 'Specific Base.com inventory is not configured. Open Export Settings and set inventory.';
        toast(message, { variant: 'error' });
        return null;
      }

      if (inventoryId !== configuredInventoryId) {
        void api
          .post<BaseDefaultInventoryPreferenceResponse>(
            '/api/v2/integrations/exports/base/default-inventory',
            { inventoryId }
          )
          .catch(() => undefined);
      }

      let templateId = '';
      try {
        const scopedTemplate = await api.get<BaseActiveTemplatePreferenceResponse>(
          `/api/v2/integrations/exports/base/active-template?connectionId=${encodeURIComponent(connectionId)}&inventoryId=${encodeURIComponent(inventoryId)}`
        );
        templateId = scopedTemplate?.templateId?.trim() ?? '';
      } catch {
        // Best-effort only. Export can proceed without a scoped template.
      }

      return {
        connectionId,
        inventoryId,
        templateId,
      };
    } catch (error) {
      logClientError(error);
      toast(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Failed to load Base.com export defaults.',
        { variant: 'error' }
      );
      return null;
    }
  };

  const runQuickExportMutation = async (context: QuickExportContext): Promise<void> => {
    const payload: {
      productId: string;
      connectionId: string;
      inventoryId: string;
      templateId?: string;
      requestId?: string;
    } = {
      productId: product.id,
      connectionId: context.connectionId,
      inventoryId: context.inventoryId,
      requestId: `one-click:${product.id}:${context.connectionId}:${context.inventoryId}:${Math.floor(Date.now() / 30000)}`,
    };

    if (context.templateId !== '') {
      payload.templateId = context.templateId;
    }

    try {
      const response = await quickExportMutation.mutateAsync(payload);
      const normalizedRunId = response?.runId?.trim() ?? '';
      const initialRunStatus: TriggerButtonRunFeedbackStatus =
        response?.status === 'completed' || response?.status === 'failed'
          ? response.status
          : 'queued';

      if (normalizedRunId !== '') {
        startTrackingExportRun(normalizedRunId, initialRunStatus);
      } else if ((response?.status ?? null) !== null) {
        setTrackedExportStatus(initialRunStatus, { runId: null });
      }

      prefetchListings();
      toast(
        response?.status === 'queued'
          ? 'Base.com export queued.'
          : 'Base.com export started.',
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to export to Base.com.';
      toast(message, { variant: 'error' });
    }
  };

  const runQuickExport = async (): Promise<void> => {
    const preflightError = getBaseExportPreflightError(product.categoryId);
    if (preflightError !== null) {
      toast(preflightError, { variant: 'error' });
      return;
    }

    if (
      quickExportLockRef.current === true ||
      quickExportMutation.isPending === true ||
      oneClickExportInFlight.has(product.id) === true
    ) {
      return;
    }

    quickExportLockRef.current = true;
    setQuickExportLocked(true);
    oneClickExportInFlight.add(product.id);

    try {
      const context = await resolveQuickExportContext();
      if (context === null) {
        quickExportLockRef.current = false;
        setQuickExportLocked(false);
        oneClickExportInFlight.delete(product.id);
        return;
      }

      if (showMarketplaceBadge === false) {
        const sku = (product.sku ?? '').trim();
        if (sku !== '') {
          let skuCheck: BaseProductSkuCheckResponse;
          try {
            skuCheck = await api.post<BaseProductSkuCheckResponse>(
              `/api/v2/integrations/products/${product.id}/base/sku-check`,
              {
                connectionId: context.connectionId,
                inventoryId: context.inventoryId,
              } satisfies BaseProductSkuCheckPayload
            );
          } catch (error) {
            logClientError(error);
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to verify SKU in Base.com. Export was not started.';
            toast(message, { variant: 'error' });
            quickExportLockRef.current = false;
            setQuickExportLocked(false);
            oneClickExportInFlight.delete(product.id);
            return;
          }

          if (skuCheck.exists === true) {
            setExistingSkuDecision({
              ...context,
              sku: (skuCheck.sku ?? sku).trim() !== '' ? skuCheck.sku!.trim() : sku,
              existingProductId: (skuCheck.existingProductId?.trim() ?? '') !== '' ? skuCheck.existingProductId!.trim() : null,
            });
            quickExportLockRef.current = false;
            setQuickExportLocked(false);
            oneClickExportInFlight.delete(product.id);
            return;
          }
        }
      }

      await runQuickExportMutation(context);
      quickExportLockRef.current = false;
      setQuickExportLocked(false);
      oneClickExportInFlight.delete(product.id);
    } catch (error) {
      quickExportLockRef.current = false;
      setQuickExportLocked(false);
      oneClickExportInFlight.delete(product.id);
      throw error;
    }
  };

  const handleCloseDecisionModal = (): void => {
    if (linkExistingPending === true) return;
    setExistingSkuDecision(null);
  };

  const handleSetupNewConnection = (): void => {
    setExistingSkuDecision(null);
    if (onOpenIntegrations !== undefined) {
      onOpenIntegrations();
      return;
    }
    toast('Open integrations to set up a new Base.com connection.', {
      variant: 'info',
    });
  };

  const handleLinkExistingProduct = async (): Promise<void> => {
    if (existingSkuDecision === null) return;
    if (linkExistingPending === true) return;

    const externalListingId = (existingSkuDecision.existingProductId?.trim() ?? '');
    if (externalListingId === '') {
      toast('Existing Base.com product ID is missing. Use "Set up new connection" instead.', {
        variant: 'error',
      });
      return;
    }

    setLinkExistingPending(true);
    try {
      await api.post<BaseProductLinkExistingResponse>(
        `/api/v2/integrations/products/${product.id}/base/link-existing`,
        {
          connectionId: existingSkuDecision.connectionId,
          inventoryId: existingSkuDecision.inventoryId,
          externalListingId,
        } satisfies BaseProductLinkExistingPayload
      );

      prefetchListings();
      await invalidateProductListingsAndBadges(queryClient, product.id);
      setExistingSkuDecision(null);
      toast('Linked to existing Base.com product.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to link product to existing Base.com listing.';
      toast(message, { variant: 'error' });
    } finally {
      setLinkExistingPending(false);
    }
  };

  const label = 'One-click export to Base.com';

  const trackedExportPresentation = trackedExportRunStatus !== null
    ? resolveTriggerButtonRunFeedbackPresentation(trackedExportRunStatus)
    : null;
  const trackedExportInFlight =
    trackedExportRunStatus !== null && TERMINAL_EXPORT_RUN_STATUSES.has(trackedExportRunStatus) === false;
  const quickExportPending = quickExportMutation.isPending === true || quickExportLocked === true || trackedExportInFlight === true;
  const resolvedButtonStatus = trackedExportRunStatus ?? status;
  const normalizedResolvedButtonStatus = normalizeMarketplaceStatus(resolvedButtonStatus);
  const isFailureState = FAILURE_STATUSES.has(normalizedResolvedButtonStatus);
  const shouldManageExistingListing =
    isFailureState === false &&
    (showMarketplaceBadge === true || SUCCESS_STATUSES.has(normalizedResolvedButtonStatus));
  const shouldUseFilledMarketplaceTone = showMarketplaceBadge === true || trackedExportRunStatus !== null;

  let resolvedLabel = label;
  if (isFailureState === true) {
    resolvedLabel = `Open Base.com recovery options (${resolvedButtonStatus}).`;
  } else if (shouldManageExistingListing === true) {
    resolvedLabel = `Manage Base.com listing (${resolvedButtonStatus}).`;
  } else if (trackedExportPresentation !== null) {
    resolvedLabel = `Base.com export ${trackedExportPresentation.label.toLowerCase()}.`;
  }

  const recoveryContext: ProductListingsRecoveryContext | undefined = isFailureState === true
    ? createBaseRecoveryContext({
      status: resolvedButtonStatus,
      runId: trackedExportRunContextId,
      failureReason: trackedExportRunErrorMessage,
    })
    : undefined;

  return (
    <>
      <Button
        type='button'
        disabled={quickExportPending}
        onClick={(): void => {
          if (isFailureState === true) {
            if (onOpenIntegrations !== undefined) {
              onOpenIntegrations(recoveryContext);
            }
            return;
          }
          if (shouldManageExistingListing === true) {
            if (onOpenIntegrations !== undefined) {
              onOpenIntegrations();
            }
            return;
          }
          runQuickExport().catch((error: unknown) => {
            logClientError(error);
          });
        }}
        onMouseEnter={prefetchListings}
        onFocus={prefetchListings}
        variant='ghost'
        size='icon'
        aria-label={resolvedLabel}
        title={resolvedLabel}
        className={cn(
          'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
          showMarketplaceBadge === false && quickExportPending === true && 'cursor-not-allowed opacity-60',
          getMarketplaceButtonClass(resolvedButtonStatus, shouldUseFilledMarketplaceTone, 'base')
        )}
      >
        <span
          aria-hidden='true'
          className='text-[9px] font-black uppercase leading-none tracking-tight'
        >
          {quickExportPending === true ? '...' : 'BL'}
        </span>
      </Button>

      <AppModal
        open={existingSkuDecision !== null}
        onOpenChange={(open) => {
          if (open === false) handleCloseDecisionModal();
        }}
        onClose={handleCloseDecisionModal}
        title='SKU already exists in Base.com'
        subtitle='Choose whether to link this product or start a new connection flow.'
        size='sm'
      >
        <div className='space-y-4'>
          <p className='text-sm text-gray-300'>
            SKU <span className='font-mono text-white'>{existingSkuDecision?.sku ?? '—'}</span>{' '}
            already exists in the selected Base.com inventory.
          </p>

          <InsetPanel radius='compact' padding='sm' className='text-xs text-gray-300'>
            Existing Base product ID:{' '}
            <span className='font-mono text-white'>
              {existingSkuDecision?.existingProductId ?? 'Unavailable'}
            </span>
          </InsetPanel>

          {existingSkuDecision?.existingProductId === null || existingSkuDecision?.existingProductId === undefined || existingSkuDecision.existingProductId === '' ? (
            <p className='text-xs text-amber-300'>
              Could not resolve existing Base.com product ID. Linking is disabled. Use "Set up new
              connection".
            </p>
          ) : null}

          <div className='flex items-center justify-end gap-2 border-t border-border/60 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={handleCloseDecisionModal}
              disabled={linkExistingPending}
            >
              Cancel
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={handleSetupNewConnection}
              disabled={linkExistingPending}
            >
              Set up new connection
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                handleLinkExistingProduct().catch((error: unknown) => {
                  logClientError(error);
                });
              }}
              disabled={linkExistingPending === true || (existingSkuDecision?.existingProductId ?? '') === ''}
            >
              {linkExistingPending === true ? 'Linking...' : 'Link existing product'}
            </Button>
          </div>
        </div>
      </AppModal>
    </>
  );
}
