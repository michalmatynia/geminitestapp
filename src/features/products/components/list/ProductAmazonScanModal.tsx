'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  useDefault1688Connection,
  useIntegrationsWithConnections,
} from '@/features/integrations/hooks/useIntegrationQueries';
import { useTestConnection } from '@/features/integrations/hooks/useIntegrationMutations';
import { ProductScanAmazonExtractedFieldsPanel } from '@/features/products/components/scans/ProductScanAmazonExtractedFieldsPanel';
import { ProductScan1688ApplyPanel } from '@/features/products/components/scans/ProductScan1688ApplyPanel';
import {
  hasProductScanAmazonDetails,
  resolveAmazonScanRecommendationReason,
  resolveRejectedAmazonCandidateBreakdown,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import {
  buildProductScan1688SectionId,
  ProductScan1688Details,
  resolveProductScan1688RecommendationSignal,
  resolveProductScan1688ApplyPolicySummary,
  resolve1688ScanRecommendationReason,
} from '@/features/products/components/scans/ProductScan1688Details';
import {
  buildProductScanArtifactHref,
  ProductScanDiagnostics,
  resolveProductScanDiagnosticFailureSummary,
  resolveProductScanDiagnostics,
} from '@/features/products/components/scans/ProductScanDiagnostics';
import {
  ProductFormCustomFieldContext,
} from '@/features/products/context/ProductFormCustomFieldContext';
import {
  ProductFormCoreActionsContext,
  ProductFormCoreStateContext,
} from '@/features/products/context/ProductFormCoreContext';
import { ProductFormImageContext } from '@/features/products/context/ProductFormImageContext';
import { ProductFormParameterContext } from '@/features/products/context/ProductFormParameterContext';
import {
  ProductScanSteps,
  resolveProductScanActiveStepSummary,
  resolveProductScanContinuationSummary,
  resolveProductScanEvaluationPolicySummary,
  resolveProductScanLatestOutcomeSummary,
  resolveProductScanRejectedCandidateSummary,
} from '@/features/products/components/scans/ProductScanSteps';
import { useProductScan1688ReviewState } from '@/features/products/components/scans/useProductScan1688ReviewState';
import type {
  ProductScanBatchResponse,
  ProductScanListResponse,
  ProductScanProvider,
  ProductScanRecord,
  ProductScanStatus,
} from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus, isProductScanTerminalStatus } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import {
  invalidateProductScans,
  invalidateProductsAndDetail,
  invalidateProductsAndCounts,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { safeSetInterval, safeClearInterval, type SafeTimerId } from '@/shared/lib/timers';
import { resolveProductScanRunFeedbackPresentation } from '@/features/products/lib/product-scan-run-feedback';
import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';
import { CopyButton } from '@/shared/ui/copy-button';
import { useToast } from '@/shared/ui/toast';

type ProductAmazonScanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  products: ProductWithImages[];
  provider?: Extract<ProductScanProvider, 'amazon' | '1688'>;
};

type ScanModalRow = {
  productId: string;
  productName: string;
  requestedAt: string;
  scanId: string | null;
  runId: string | null;
  status: ProductScanStatus | 'enqueuing';
  message: string | null;
  scan: ProductScanRecord | null;
};

const STATUS_LABELS: Record<ScanModalRow['status'], string> = {
  enqueuing: 'Enqueuing',
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  no_match: 'No Match',
  conflict: 'Conflict',
  failed: 'Failed',
};

const STATUS_CLASSES: Record<ScanModalRow['status'], string> = {
  enqueuing: 'border-border/70 text-muted-foreground',
  queued: 'border-border/70 text-muted-foreground',
  running: 'border-blue-500/40 text-blue-300',
  completed: 'border-emerald-500/40 text-emerald-300',
  no_match: 'border-amber-500/40 text-amber-300',
  conflict: 'border-orange-500/40 text-orange-300',
  failed: 'border-destructive/40 text-destructive',
};

type ProductScanModalProvider = Extract<ProductScanProvider, 'amazon' | '1688'>;

type ProductScanModalConfig = {
  batchEndpoint: string;
  batchFailureMessage: string;
  batchLabel: string;
  modalTitle: string;
  noQueuedMessage: string;
  openResultLabel: string;
  preparingLabel: string;
  refreshFailureMessage: string;
  resultStatusLabel: string;
  resultTypeLabel: string;
};

const PRODUCT_SCAN_MODAL_CONFIG: Record<ProductScanModalProvider, ProductScanModalConfig> = {
  amazon: {
    batchEndpoint: '/api/v2/products/scans/amazon/batch',
    batchFailureMessage: 'Failed to enqueue Amazon scans.',
    batchLabel: 'Amazon scans',
    modalTitle: 'Amazon Reverse Image Scan',
    noQueuedMessage: 'No Amazon scans were queued.',
    openResultLabel: 'Open Amazon Result',
    preparingLabel: 'Preparing Amazon scans...',
    refreshFailureMessage: 'Failed to refresh Amazon scans.',
    resultStatusLabel: 'Amazon reverse image scan',
    resultTypeLabel: 'Amazon',
  },
  '1688': {
    batchEndpoint: '/api/v2/products/scans/1688/batch',
    batchFailureMessage: 'Failed to enqueue 1688 supplier scans.',
    batchLabel: '1688 scans',
    modalTitle: '1688 Supplier Reverse Image Scan',
    noQueuedMessage: 'No 1688 supplier scans were queued.',
    openResultLabel: 'Open 1688 Result',
    preparingLabel: 'Preparing 1688 supplier scans...',
    refreshFailureMessage: 'Failed to refresh 1688 supplier scans.',
    resultStatusLabel: '1688 supplier reverse image scan',
    resultTypeLabel: '1688',
  },
};

const isManualVerificationPending = (scan: Pick<ProductScanRecord, 'rawResult'> | null): boolean => {
  const rawResult = scan?.rawResult;
  if (!rawResult || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    return false;
  }

  return (rawResult as Record<string, unknown>)['manualVerificationPending'] === true;
};

const resolveRowStatusLabel = (row: ScanModalRow): string =>
  row.status === 'enqueuing'
    ? STATUS_LABELS[row.status]
    : resolveProductScanRunFeedbackPresentation(row.status, {
        manualVerificationPending: isManualVerificationPending(row.scan),
        manualVerificationMessage: row.scan?.asinUpdateMessage ?? null,
        amazonEvaluationStatus: row.scan?.amazonEvaluation?.status ?? null,
        amazonEvaluationLanguageAccepted: row.scan?.amazonEvaluation?.languageAccepted ?? null,
        supplierEvaluationStatus: row.scan?.supplierEvaluation?.status ?? null,
      }).label;

const resolveRowStatusClassName = (row: ScanModalRow): string =>
  row.status === 'enqueuing'
    ? STATUS_CLASSES[row.status]
    : resolveProductScanRunFeedbackPresentation(row.status, {
        manualVerificationPending: isManualVerificationPending(row.scan),
        manualVerificationMessage: row.scan?.asinUpdateMessage ?? null,
        amazonEvaluationStatus: row.scan?.amazonEvaluation?.status ?? null,
        amazonEvaluationLanguageAccepted: row.scan?.amazonEvaluation?.languageAccepted ?? null,
        supplierEvaluationStatus: row.scan?.supplierEvaluation?.status ?? null,
      }).badgeClassName ?? STATUS_CLASSES[row.status];

const resolveActiveStatusMessage = (
  resultStatusLabel: string,
  status: ProductScanStatus | 'enqueuing',
  fallback: string | null
): string | null => {
  if (status === 'enqueuing') {
    return fallback;
  }

  if (status === 'queued') {
    return `${resultStatusLabel} queued.`;
  }

  if (status === 'running') {
    return `${resultStatusLabel} running.`;
  }

  return fallback;
};

const formatSummary = (rows: ScanModalRow[]): string => {
  if (rows.length === 0) {
    return 'No products selected';
  }

  const counts = {
    enqueuing: rows.filter((row) => row.status === 'enqueuing').length,
    queued: rows.filter((row) => row.status === 'queued').length,
    running: rows.filter((row) => row.status === 'running').length,
    completed: rows.filter((row) => row.status === 'completed').length,
    noMatch: rows.filter((row) => row.status === 'no_match').length,
    conflict: rows.filter((row) => row.status === 'conflict').length,
    failed: rows.filter((row) => row.status === 'failed').length,
  };

  return [
    `${rows.length} selected`,
    counts.enqueuing > 0 && `${counts.enqueuing} enqueuing`,
    counts.queued > 0 && `${counts.queued} queued`,
    counts.running > 0 && `${counts.running} running`,
    counts.completed > 0 && `${counts.completed} completed`,
    counts.noMatch > 0 && `${counts.noMatch} no match`,
    counts.conflict > 0 && `${counts.conflict} conflicts`,
    counts.failed > 0 && `${counts.failed} failed`,
  ]
    .filter(Boolean)
    .join(' · ');
};

const buildToastSummaryFromRows = (
  rows: ScanModalRow[],
  batchLabel: string,
  noQueuedMessage: string
): { message: string; variant: 'success' | 'warning' } => {
  const counts = {
    queued: rows.filter((row) => row.status === 'queued').length,
    running: rows.filter((row) => row.status === 'running').length,
    completed: rows.filter((row) => row.status === 'completed').length,
    noMatch: rows.filter((row) => row.status === 'no_match').length,
    conflict: rows.filter((row) => row.status === 'conflict').length,
    failed: rows.filter((row) => row.status === 'failed').length,
  };

  const summary = [
    counts.queued > 0 && `${counts.queued} queued`,
    counts.running > 0 && `${counts.running} running`,
    counts.completed > 0 && `${counts.completed} completed`,
    counts.noMatch > 0 && `${counts.noMatch} no match`,
    counts.conflict > 0 && `${counts.conflict} conflicts`,
    counts.failed > 0 && `${counts.failed} failed`,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    message: summary ? `${batchLabel}: ${summary}.` : noQueuedMessage,
    variant: counts.failed > 0 || counts.conflict > 0 ? 'warning' : 'success',
  };
};

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatPlaywrightBrowserLabel = (
  value: 'auto' | 'brave' | 'chrome' | 'chromium' | null | undefined
): string => {
  if (value === 'brave') return 'Brave';
  if (value === 'chrome') return 'Chrome';
  if (value === 'chromium') return 'Chromium';
  return 'Auto';
};

const formatPlaywrightIdentityProfileLabel = (
  value: 'default' | 'search' | 'marketplace' | null | undefined
): string => {
  if (value === 'search') return 'Search';
  if (value === 'marketplace') return 'Marketplace';
  return 'Default';
};

const resolve1688PostureWarnings = (connection: {
  playwrightBrowser?: 'auto' | 'brave' | 'chrome' | 'chromium' | null;
  playwrightIdentityProfile?: 'default' | 'search' | 'marketplace' | null;
  playwrightPersonaId?: string | null;
  playwrightHumanizeMouse?: boolean;
} | null): string[] => {
  if (!connection) {
    return [];
  }

  const warnings: string[] = [];
  if (!connection.playwrightPersonaId?.trim()) {
    warnings.push('No Playwright persona is configured for this 1688 profile.');
  }
  if ((connection.playwrightIdentityProfile ?? 'default') !== 'marketplace') {
    warnings.push(
      `Identity profile is ${formatPlaywrightIdentityProfileLabel(
        connection.playwrightIdentityProfile
      )}. 1688 is more reliable with Marketplace posture.`
    );
  }
  if ((connection.playwrightBrowser ?? 'auto') === 'auto') {
    warnings.push('Browser is set to Auto. Runtime browser choice can vary between runs.');
  }
  if (connection.playwrightHumanizeMouse === false) {
    warnings.push('Humanized input is disabled for this 1688 profile.');
  }

  return warnings;
};

const isDiscoveredScanCurrentForRow = (
  row: ScanModalRow,
  discoveredScan: ProductScanRecord | null
): discoveredScan is ProductScanRecord => {
  if (!discoveredScan) {
    return false;
  }

  if (isProductScanActiveStatus(discoveredScan.status)) {
    return true;
  }

  const requestedAtTs = Date.parse(row.requestedAt);
  const createdAtTs = Date.parse(discoveredScan.createdAt || '');
  if (!Number.isFinite(requestedAtTs) || !Number.isFinite(createdAtTs)) {
    return false;
  }

  return createdAtTs >= requestedAtTs - 1_000;
};

const resolveRowDisplayMessages = (
  row: ScanModalRow
): { infoMessage: string | null; errorMessage: string | null } => {
  if (!row.scan) {
    return row.status === 'failed'
      ? { infoMessage: null, errorMessage: row.message }
      : { infoMessage: row.message, errorMessage: null };
  }

  if (row.scan.status === 'completed') {
    return {
      infoMessage: row.message,
      errorMessage: null,
    };
  }

  if (row.scan.status === 'no_match') {
    return {
      infoMessage: row.scan.asinUpdateMessage ?? row.scan.error ?? row.message,
      errorMessage: null,
    };
  }

  if (row.scan.status === 'conflict' || row.scan.status === 'failed') {
    return {
      infoMessage: null,
      errorMessage: row.scan.error ?? row.scan.asinUpdateMessage ?? row.message,
    };
  }

  return {
    infoMessage: row.message,
    errorMessage: row.scan.error,
  };
};

export function ProductAmazonScanModal(
  props: ProductAmazonScanModalProps
): React.JSX.Element {
  const { isOpen, onClose, productIds, products, provider = 'amazon' } = props;
  const modalConfig = PRODUCT_SCAN_MODAL_CONFIG[provider];
  const missingBatchResultMessage = `${modalConfig.resultTypeLabel} scan request did not return a result for this product.`;
  const missingScanRecordMessage = `${modalConfig.resultTypeLabel} scan record could not be refreshed.`;
  const untrackableActiveScanMessage = `${modalConfig.resultTypeLabel} scan request returned an active scan without a trackable scan id.`;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pollTimerRef = useRef<SafeTimerId | null>(null);
  const modalSessionRef = useRef(0);
  const autoStarted1688ConnectionIdsRef = useRef<Set<string>>(new Set());
  const rowsRef = useRef<ScanModalRow[]>([]);
  const selectedProductsRef = useRef<Array<{ productId: string; productName: string }>>([]);
  const toastRef = useRef(toast);
  const stopPollingRef = useRef<() => void>(() => undefined);
  const refreshScanRowsRef = useRef<(sessionId?: number) => Promise<void>>(async () => undefined);
  const handleRefreshFailureRef = useRef<
    (error: unknown, options?: { stopPolling?: boolean; sessionId?: number }) => void
  >(() => undefined);
  const startPollingRef = useRef<(sessionId?: number) => void>(() => undefined);
  const ensurePollingForTrackedActiveRowsRef = useRef<(sessionId?: number) => void>(
    () => undefined
  );
  const handle1688RefreshSessionRef = useRef<() => Promise<{ ok: boolean; message: string }>>(
    async () => ({ ok: false, message: '1688 browser profile required before running supplier scans.' })
  );
  const [rows, setRows] = useState<ScanModalRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [expandedDiagnosticRowIds, setExpandedDiagnosticRowIds] = useState<Set<string>>(new Set());
  const [expandedExtractedFieldRowIds, setExpandedExtractedFieldRowIds] = useState<Set<string>>(
    new Set()
  );
  const {
    isBlockedScanReviewed,
    markBlockedScanReviewed,
    clearBlockedScanReviewed,
  } = useProductScan1688ReviewState();
  const testConnectionMutation = useTestConnection();
  const [is1688LoginPending, setIs1688LoginPending] = useState(false);
  const [refreshed1688ConnectionIds, setRefreshed1688ConnectionIds] = useState<Set<string>>(
    new Set()
  );
  const [latest1688SessionMessage, setLatest1688SessionMessage] = useState<string | null>(null);
  const [latest1688SessionError, setLatest1688SessionError] = useState<string | null>(null);
  const integrationsWithConnectionsQuery = useIntegrationsWithConnections();
  const default1688ConnectionQuery = useDefault1688Connection();
  const productFormCoreState = useContext(ProductFormCoreStateContext);
  const productFormCoreActions = useContext(ProductFormCoreActionsContext);
  const productFormImages = useContext(ProductFormImageContext);
  const productFormParameters = useContext(ProductFormParameterContext);
  const productFormCustomFields = useContext(ProductFormCustomFieldContext);

  const productNamesById = useMemo(
    () =>
      new Map(
        products.map((product) => [
          product.id,
          product.name_en || product.name_pl || product.name_de || product.sku || product.id,
        ])
      ),
    [products]
  );

  const selectedProducts = useMemo(
    () =>
      Array.from(
        new Set(
          productIds
            .map((productId) => productId.trim())
            .filter((productId) => productId.length > 0)
        )
      ).map((productId) => ({
        productId,
        productName: productNamesById.get(productId) ?? productId,
      })),
    [productIds, productNamesById]
  );
  const selectedProductIdsKey = useMemo(
    () =>
      selectedProducts
        .map((entry) => entry.productId)
        .slice()
        .sort()
        .join('\u0000'),
    [selectedProducts]
  );
  const integrationConnections = integrationsWithConnectionsQuery.data ?? [];
  const connectionNamesById = useMemo(() => {
    const names = new Map<string, string>();
    for (const integration of integrationConnections) {
      for (const connection of integration.connections ?? []) {
        const connectionId = connection.id?.trim();
        const connectionName = connection.name?.trim();
        if (!connectionId || !connectionName || names.has(connectionId)) {
          continue;
        }
        names.set(connectionId, connectionName);
      }
    }
    return names;
  }, [integrationConnections]);
  const scanner1688Integration = useMemo(
    () => integrationConnections.find((integration) => integration.slug === '1688') ?? null,
    [integrationConnections]
  );
  const scanner1688Connections = scanner1688Integration?.connections ?? [];
  const resolved1688ConnectionId = useMemo(() => {
    if (provider !== '1688') {
      return null;
    }

    const preferredConnectionId = default1688ConnectionQuery.data?.connectionId?.trim() || '';
    if (
      preferredConnectionId &&
      scanner1688Connections.some((connection) => connection.id === preferredConnectionId)
    ) {
      return preferredConnectionId;
    }

    return scanner1688Connections[0]?.id ?? null;
  }, [default1688ConnectionQuery.data?.connectionId, provider, scanner1688Connections]);
  const active1688ConnectionName = useMemo(() => {
    if (!resolved1688ConnectionId) {
      return null;
    }

    return (
      scanner1688Connections.find((connection) => connection.id === resolved1688ConnectionId)?.name ??
      null
    );
  }, [resolved1688ConnectionId, scanner1688Connections]);
  const active1688Connection = useMemo(() => {
    if (!resolved1688ConnectionId) {
      return null;
    }

    return (
      scanner1688Connections.find((connection) => connection.id === resolved1688ConnectionId) ?? null
    );
  }, [resolved1688ConnectionId, scanner1688Connections]);
  const active1688ConnectionId = active1688Connection?.id?.trim() || null;
  const active1688IntegrationId = active1688Connection?.integrationId?.trim() || null;
  const active1688ProfileName = active1688Connection?.name?.trim() || active1688ConnectionName;
  const active1688PostureWarnings = useMemo(
    () => resolve1688PostureWarnings(active1688Connection),
    [
      active1688Connection?.playwrightBrowser,
      active1688Connection?.playwrightHumanizeMouse,
      active1688Connection?.playwrightIdentityProfile,
      active1688Connection?.playwrightPersonaId,
    ]
  );
  const hasResolved1688Session =
    provider === '1688' &&
    Boolean(
      active1688Connection &&
        (active1688Connection.hasPlaywrightStorageState === true ||
          refreshed1688ConnectionIds.has(active1688Connection.id))
    );
  const is1688ConnectionBootstrapPending =
    provider === '1688' &&
    (integrationsWithConnectionsQuery.isLoading || default1688ConnectionQuery.isLoading);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const handle1688RefreshSession = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    if (!active1688ConnectionId || !active1688IntegrationId || is1688LoginPending) {
      return {
        ok: false,
        message: '1688 browser profile required before running supplier scans.',
      };
    }
    setIs1688LoginPending(true);
    setLatest1688SessionError(null);
    setLatest1688SessionMessage(null);
    try {
      const response = await testConnectionMutation.mutateAsync({
        integrationId: active1688IntegrationId,
        connectionId: active1688ConnectionId,
        type: 'test',
        body: { mode: 'manual_session_refresh', manualTimeoutMs: 300000 },
        timeoutMs: 360000,
      });
      setRefreshed1688ConnectionIds((current) => {
        const next = new Set(current);
        next.add(active1688ConnectionId);
        return next;
      });
      const successMessage =
        typeof response?.['message'] === 'string' && response['message'].trim().length > 0
          ? response['message'].trim()
          : `1688 session refreshed for profile ${active1688ProfileName ?? '1688 profile'}.`;
      setLatest1688SessionMessage(successMessage);
      toastRef.current(successMessage, { variant: 'success' });
      return {
        ok: true,
        message: successMessage,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to refresh the 1688 session for profile ${active1688ProfileName ?? '1688 profile'}.`;
      setLatest1688SessionError(message);
      toastRef.current(message, { variant: 'error' });
      return {
        ok: false,
        message,
      };
    } finally {
      setIs1688LoginPending(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrations.withConnections() }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.integrations.selection.scanner1688DefaultConnection(),
        }),
      ]);
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: QUERY_KEYS.integrations.withConnections(),
          type: 'active',
        }),
        queryClient.refetchQueries({
          queryKey: QUERY_KEYS.integrations.selection.scanner1688DefaultConnection(),
          type: 'active',
        }),
      ]);
    }
  }, [
    active1688ConnectionId,
    active1688IntegrationId,
    active1688ProfileName,
    is1688LoginPending,
    queryClient,
    testConnectionMutation,
    toast,
  ]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      safeClearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    stopPollingRef.current = stopPolling;
  }, [stopPolling]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    selectedProductsRef.current = selectedProducts;
  }, [selectedProducts]);

  useEffect(() => {
    const selectedProductNames = new Map(
      selectedProducts.map(({ productId, productName }) => [productId, productName])
    );

    setRows((currentRows) => {
      let didChange = false;
      const nextRows = currentRows.map((row) => {
        const nextProductName = selectedProductNames.get(row.productId);
        if (!nextProductName || nextProductName === row.productName) {
          return row;
        }
        didChange = true;
        return {
          ...row,
          productName: nextProductName,
        };
      });

      if (didChange) {
        rowsRef.current = nextRows;
      }

      return didChange ? nextRows : currentRows;
    });
  }, [selectedProducts]);

  const invalidateProductViews = useCallback(
    async (productId: string) => {
      await Promise.allSettled([
        invalidateProductsAndDetail(queryClient, productId),
        invalidateProductsAndCounts(queryClient),
        invalidateProductScans(queryClient, productId),
      ]);
    },
    [queryClient]
  );

  const refreshScanRows = useCallback(async (sessionId = modalSessionRef.current) => {
    if (sessionId !== modalSessionRef.current) {
      return;
    }

    const currentRows = rowsRef.current;
    const scanIds = currentRows
      .map((row) => row.scanId)
      .filter((scanId): scanId is string => Boolean(scanId));
    const untrackedProductIds = Array.from(
      new Set(
        currentRows
          .filter((row) => !row.scanId)
          .map((row) => row.productId.trim())
          .filter((productId) => productId.length > 0)
      )
    );
    const scansById = new Map<string, ProductScanRecord>();
    const scansByProductId = new Map<string, ProductScanRecord | null>();
    const discoveryFailedProductIds = new Set<string>();
    let trackedLookupFailed = false;
    let refreshError: unknown = null;

    if (scanIds.length === 0 && untrackedProductIds.length === 0) {
      stopPolling();
      return;
    }

    if (scanIds.length > 0) {
      try {
        const response = await api.get<ProductScanListResponse>('/api/v2/products/scans', {
          cache: 'no-store',
          params: {
            ids: scanIds.join(','),
            limit: scanIds.length,
          },
        });
        if (sessionId !== modalSessionRef.current) {
          return;
        }

        response.scans.forEach((scan) => {
          scansById.set(scan.id, scan);
        });
      } catch (error) {
        trackedLookupFailed = true;
        refreshError ??= error;
      }
    }

    const missingTrackedProductIds = Array.from(
      new Set(
        currentRows
          .filter((row) => row.scanId && !scansById.has(row.scanId))
          .map((row) => row.productId.trim())
          .filter((productId) => productId.length > 0)
      )
    );
    const productIdsForDiscovery = Array.from(
      new Set([...untrackedProductIds, ...missingTrackedProductIds])
    );

    if (productIdsForDiscovery.length > 0) {
      const discoveredScans = await Promise.all(
        productIdsForDiscovery.map(async (productId) => {
          try {
            return {
              productId,
              response: await api.get<ProductScanListResponse>(
                `/api/v2/products/${productId}/scans`,
                {
                  cache: 'no-store',
                  params: { limit: 1, provider },
                }
              ),
              error: null,
            };
          } catch (error) {
            return {
              productId,
              response: null,
              error,
            };
          }
        })
      );
      if (sessionId !== modalSessionRef.current) {
        return;
      }

      discoveredScans.forEach(({ productId, response, error }) => {
        if (error) {
          discoveryFailedProductIds.add(productId);
          refreshError ??= error;
          return;
        }

        if (response?.scans) {
          scansByProductId.set(
            productId,
            response.scans.find((scan) => scan.productId === productId) ?? null
          );
        }
      });
    }

    const hadSuccessfulLookup =
      (scanIds.length > 0 && !trackedLookupFailed) ||
      scansByProductId.size > 0 ||
      (productIdsForDiscovery.length > 0 &&
        discoveryFailedProductIds.size < productIdsForDiscovery.length);
    if (!hadSuccessfulLookup && refreshError) {
      throw refreshError;
    }

    const terminalProductIds: string[] = [];
    const nextRows = currentRows.map((row) => {
      const currentDiscoveredScan = isDiscoveredScanCurrentForRow(
        row,
        scansByProductId.get(row.productId) ?? null
      )
        ? (scansByProductId.get(row.productId) ?? null)
        : null;
      const lookupUnavailable =
        (Boolean(row.scanId) && trackedLookupFailed && !scansById.has(row.scanId ?? '')) ||
        discoveryFailedProductIds.has(row.productId);
      if (lookupUnavailable && !currentDiscoveredScan && !scansById.get(row.scanId ?? '')) {
        return row;
      }
      const refreshedScan = row.scanId
        ? (scansById.get(row.scanId) ?? currentDiscoveredScan ?? null)
        : (currentDiscoveredScan ?? row.scan);
      const isMissingRefreshedScan =
        Boolean(row.scanId) && !scansById.get(row.scanId ?? '') && !currentDiscoveredScan;
      const scan = isMissingRefreshedScan ? null : refreshedScan;
      const status = scan?.status ?? row.status;
      const wasTerminal =
        row.status !== 'enqueuing' && isProductScanTerminalStatus(row.status);
      const hasNewTerminalScan =
        scan &&
        isProductScanTerminalStatus(scan.status) &&
        (!wasTerminal || scan.id !== row.scan?.id);
      if (isMissingRefreshedScan || hasNewTerminalScan) {
        terminalProductIds.push(row.productId);
      }
      if (isMissingRefreshedScan) {
        return {
          ...row,
          scanId: null,
          runId: null,
          status: 'failed' as const,
          message: missingScanRecordMessage,
          scan: null,
        };
      }
      return {
        ...row,
        scanId: scan?.id ?? row.scanId,
        runId: scan?.engineRunId ?? row.runId,
        status,
        message:
          scan?.status === 'completed'
            ? (scan.asinUpdateMessage ?? null)
            : scan && isProductScanActiveStatus(scan.status)
                ? (scan.asinUpdateMessage ??
                resolveActiveStatusMessage(modalConfig.resultStatusLabel, scan.status, row.message))
              : scan && isProductScanTerminalStatus(scan.status)
              ? null
              : row.message,
        scan,
      };
    });

    rowsRef.current = nextRows;
    setRows(nextRows);

    if (sessionId !== modalSessionRef.current) {
      return;
    }
    await Promise.all(terminalProductIds.map(async (productId) => await invalidateProductViews(productId)));

    if (!nextRows.some((row) => row.status === 'enqueuing' || isProductScanActiveStatus(row.status))) {
      stopPolling();
    }
  }, [invalidateProductViews, modalConfig.resultStatusLabel, missingScanRecordMessage, provider, stopPolling]);

  useEffect(() => {
    refreshScanRowsRef.current = refreshScanRows;
  }, [refreshScanRows]);

  const handleRefreshFailure = useCallback(
    (error: unknown, options?: { stopPolling?: boolean; sessionId?: number }) => {
      if (
        typeof options?.sessionId === 'number' &&
        options.sessionId !== modalSessionRef.current
      ) {
        return;
      }
      if (options?.stopPolling) {
        stopPolling();
      }
      const message =
        error instanceof Error ? error.message : modalConfig.refreshFailureMessage;
      toast(message, { variant: 'error' });
    },
    [modalConfig.refreshFailureMessage, stopPolling, toast]
  );

  useEffect(() => {
    handleRefreshFailureRef.current = handleRefreshFailure;
  }, [handleRefreshFailure]);

  const startPolling = useCallback((sessionId = modalSessionRef.current) => {
    stopPolling();
    if (sessionId !== modalSessionRef.current) {
      return;
    }
    setIsPolling(true);
    pollTimerRef.current = safeSetInterval(() => {
      void refreshScanRows(sessionId).catch((error: unknown) => {
        handleRefreshFailure(error, { stopPolling: true, sessionId });
      });
    }, 3000);
  }, [handleRefreshFailure, refreshScanRows, stopPolling]);

  useEffect(() => {
    startPollingRef.current = startPolling;
  }, [startPolling]);

  const ensurePollingForTrackedActiveRows = useCallback((sessionId = modalSessionRef.current) => {
    if (sessionId !== modalSessionRef.current) {
      return;
    }

    if (
      !pollTimerRef.current &&
      rowsRef.current.some((row) => Boolean(row.scanId) && isProductScanActiveStatus(row.status))
    ) {
      startPolling(sessionId);
    }
  }, [startPolling]);

  useEffect(() => {
    ensurePollingForTrackedActiveRowsRef.current = ensurePollingForTrackedActiveRows;
  }, [ensurePollingForTrackedActiveRows]);

  useEffect(() => {
    handle1688RefreshSessionRef.current = handle1688RefreshSession;
  }, [handle1688RefreshSession]);

  const handleManualRefresh = useCallback(() => {
    const sessionId = modalSessionRef.current;
    if (rowsRef.current.length === 0) {
      toast(
        provider === '1688'
          ? 'No 1688 scan rows to refresh. Use Refresh 1688 session to renew the browser profile.'
          : 'No scan rows to refresh.',
        { variant: 'info' }
      );
      return;
    }
    void refreshScanRows(sessionId)
      .then(() => {
        ensurePollingForTrackedActiveRows(sessionId);
      })
      .catch((error: unknown) => {
        handleRefreshFailure(error, { sessionId });
      });
  }, [ensurePollingForTrackedActiveRows, handleRefreshFailure, provider, refreshScanRows, toast]);

  useEffect(() => {
    if (!isOpen) {
      modalSessionRef.current += 1;
      rowsRef.current = [];
      setRows([]);
      setIsSubmitting(false);
      setIs1688LoginPending(false);
      autoStarted1688ConnectionIdsRef.current = new Set();
      setRefreshed1688ConnectionIds(new Set());
      setLatest1688SessionMessage(null);
      setLatest1688SessionError(null);
      setExpandedRowIds(new Set());
      setExpandedDiagnosticRowIds(new Set());
      setExpandedExtractedFieldRowIds(new Set());
      stopPollingRef.current();
      return;
    }

    if (is1688ConnectionBootstrapPending) {
      rowsRef.current = [];
      setRows([]);
      setIsSubmitting(true);
      stopPollingRef.current();
      return;
    }

    const sessionId = modalSessionRef.current + 1;
    modalSessionRef.current = sessionId;
    const selectedProductEntries = selectedProductsRef.current;
    if (selectedProductEntries.length === 0) {
      rowsRef.current = [];
      setRows([]);
      setIsSubmitting(false);
      setExpandedRowIds(new Set());
      setExpandedDiagnosticRowIds(new Set());
      setExpandedExtractedFieldRowIds(new Set());
      stopPollingRef.current();
      return;
    }

    const initialRows = selectedProductEntries.map(({ productId, productName }) => ({
      productId,
      productName,
      requestedAt: new Date().toISOString(),
      scanId: null,
      runId: null,
      status: 'enqueuing' as const,
      message: null,
      scan: null,
    }));
    if (provider === '1688') {
      const missing1688SessionMessage = !active1688ConnectionId
        ? '1688 browser profile required before running supplier scans.'
        : `1688 login required for profile ${active1688ProfileName ?? '1688 profile'}. Refresh the saved browser session before scanning.`;
      if (!active1688ConnectionId) {
        const blockedRows = initialRows.map((row) => ({
          ...row,
          status: 'failed' as const,
          message: missing1688SessionMessage,
        }));
        rowsRef.current = blockedRows;
        setRows(blockedRows);
        setIsSubmitting(false);
        stopPollingRef.current();
        return;
      }
      if (!hasResolved1688Session) {
        const connectionId = active1688ConnectionId;
        if (connectionId.length > 0 && !autoStarted1688ConnectionIdsRef.current.has(connectionId)) {
          autoStarted1688ConnectionIdsRef.current.add(connectionId);
          rowsRef.current = [];
          setRows([]);
          setIsSubmitting(true);
          stopPollingRef.current();
          void handle1688RefreshSessionRef.current().then((sessionRefreshResult) => {
            if (sessionId !== modalSessionRef.current || sessionRefreshResult.ok) {
              return;
            }

            const blockedRows = initialRows.map((row) => ({
              ...row,
              status: 'failed' as const,
              message: sessionRefreshResult.message,
            }));
            rowsRef.current = blockedRows;
            setRows(blockedRows);
            setIsSubmitting(false);
          });
          return;
        }

        const blockedRows = initialRows.map((row) => ({
          ...row,
          status: 'failed' as const,
          message: latest1688SessionError ?? missing1688SessionMessage,
        }));
        rowsRef.current = blockedRows;
        setRows(blockedRows);
        setIsSubmitting(false);
        stopPollingRef.current();
        return;
      }
    }
    rowsRef.current = initialRows;
    setRows(initialRows);
    setIsSubmitting(true);

    void (async () => {
      try {
        const response = await api.post<ProductScanBatchResponse>(
          modalConfig.batchEndpoint,
          {
            productIds: selectedProductEntries.map(({ productId }) => productId),
            ...(provider === '1688' ? { connectionId: resolved1688ConnectionId } : {}),
          }
        );
        if (sessionId !== modalSessionRef.current) {
          return;
        }

        const resultsByProductId = new Map(response.results.map((result) => [result.productId, result]));
        const summaryCounts = {
          queued: response.queued,
          running: response.running,
          alreadyRunning: response.alreadyRunning,
          failed: response.failed,
        };
        let toastMessage: string | null = null;
        let toastVariant: 'success' | 'warning' = 'success';

        const queuedRows: ScanModalRow[] = initialRows.map((row) => {
          const result = resultsByProductId.get(row.productId);
          if (!result) {
            summaryCounts.failed += 1;
            return {
              ...row,
              status: 'failed' as const,
              message: missingBatchResultMessage,
            };
          }
          const resultIsActive =
            result.status === 'queued' ||
            result.status === 'running' ||
            result.status === 'already_running';
          if (resultIsActive && !result.scanId) {
            if (result.status === 'queued') {
              summaryCounts.queued = Math.max(0, summaryCounts.queued - 1);
            } else if (result.status === 'running') {
              summaryCounts.running = Math.max(0, summaryCounts.running - 1);
            } else {
              summaryCounts.alreadyRunning = Math.max(0, summaryCounts.alreadyRunning - 1);
            }
            summaryCounts.failed += 1;
            return {
              ...row,
              status: 'failed' as const,
              message: untrackableActiveScanMessage,
            };
          }
          const nextStatus: ScanModalRow['status'] =
            result.status === 'already_running'
              ? (result.currentStatus && isProductScanActiveStatus(result.currentStatus)
                  ? result.currentStatus
                  : 'running')
              : result.status;
          return {
            ...row,
            scanId: result.scanId,
            runId: result.runId,
            status: nextStatus,
            message: result.message,
          };
        });
        rowsRef.current = queuedRows;
        setRows(queuedRows);
        await Promise.all(
          Array.from(new Set(queuedRows.map((row) => row.productId))).map(
            async (productId) => await invalidateProductScans(queryClient, productId)
          )
        );

        const immediateTerminalProductIds = queuedRows
          .filter((row) => row.status === 'failed')
          .map((row) => row.productId);
        if (immediateTerminalProductIds.length > 0) {
          await Promise.all(
            immediateTerminalProductIds.map(
              async (productId) => await invalidateProductViews(productId)
            )
          );
        }

        if (queuedRows.some((row) => row.status === 'queued' || row.status === 'running')) {
          startPollingRef.current(sessionId);
          void refreshScanRowsRef.current(sessionId).catch((error: unknown) => {
            handleRefreshFailureRef.current(error, { stopPolling: true, sessionId });
          });
        } else if (queuedRows.some((row) => !row.scanId)) {
          let recoveredRows = queuedRows;
          try {
            await refreshScanRowsRef.current(sessionId);
            ensurePollingForTrackedActiveRowsRef.current(sessionId);
            recoveredRows = rowsRef.current;
          } catch {
            recoveredRows = queuedRows;
          }

          const recoveredState = recoveredRows.some((row, index) => {
            const queuedRow = queuedRows[index];
            return (
              queuedRow?.scan !== row.scan ||
              queuedRow?.scanId !== row.scanId ||
              queuedRow?.runId !== row.runId ||
              queuedRow?.status !== row.status ||
              queuedRow?.message !== row.message
            );
          });
          if (recoveredState) {
            const recoveredSummary = buildToastSummaryFromRows(
              recoveredRows,
              modalConfig.batchLabel,
              modalConfig.noQueuedMessage
            );
            toastMessage = recoveredSummary.message;
            toastVariant = recoveredSummary.variant;
          }
        }

        if (!toastMessage) {
          const totalFailedCount = summaryCounts.failed;
          const summary = [
            summaryCounts.queued > 0 && `${summaryCounts.queued} queued`,
            summaryCounts.running > 0 && `${summaryCounts.running} running`,
            summaryCounts.alreadyRunning > 0 &&
              `${summaryCounts.alreadyRunning} already in progress`,
            totalFailedCount > 0 && `${totalFailedCount} failed`,
          ]
            .filter(Boolean)
            .join(', ');
          toastMessage = summary ? `${modalConfig.batchLabel}: ${summary}.` : modalConfig.noQueuedMessage;
          toastVariant = totalFailedCount > 0 ? 'warning' : 'success';
        }

        if (sessionId !== modalSessionRef.current) {
          return;
        }
        toastRef.current(toastMessage, {
          variant: toastVariant,
        });
      } catch (error) {
        if (sessionId !== modalSessionRef.current) {
          return;
        }
        const message =
          error instanceof Error ? error.message : modalConfig.batchFailureMessage;
        const failedRows = initialRows.map((row) => ({
          ...row,
          status: 'failed' as const,
          message,
        }));
        rowsRef.current = failedRows;
        setRows(failedRows);
        await Promise.all(
          Array.from(new Set(initialRows.map((row) => row.productId))).map(
            async (productId) => await invalidateProductScans(queryClient, productId)
          )
        );
        await Promise.all(
          Array.from(new Set(initialRows.map((row) => row.productId))).map(
            async (productId) => await invalidateProductViews(productId)
          )
        );
        let recoveredState = false;
        try {
          await refreshScanRowsRef.current(sessionId);
          ensurePollingForTrackedActiveRowsRef.current(sessionId);
          const latestRows = rowsRef.current;
          recoveredState = latestRows.some((row, index) => {
            const failedRow = failedRows[index];
            return (
              failedRow?.scan !== row.scan ||
              failedRow?.scanId !== row.scanId ||
              failedRow?.runId !== row.runId ||
              failedRow?.status !== row.status ||
              failedRow?.message !== row.message
            );
          });
        } catch {
          // Keep the original enqueue failure visible when recovery probing also fails.
        }
        if (sessionId !== modalSessionRef.current || recoveredState) {
          return;
        }
        toastRef.current(message, { variant: 'error' });
      } finally {
        if (sessionId === modalSessionRef.current) {
          setIsSubmitting(false);
        }
      }
    })();

    return () => {
      if (modalSessionRef.current === sessionId) {
        modalSessionRef.current += 1;
      }
      stopPollingRef.current();
    };
  }, [
    is1688ConnectionBootstrapPending,
    isOpen,
    missingBatchResultMessage,
    missingScanRecordMessage,
    modalConfig.batchEndpoint,
    modalConfig.batchFailureMessage,
    modalConfig.batchLabel,
    modalConfig.noQueuedMessage,
    modalConfig.resultTypeLabel,
    active1688ConnectionId,
    active1688ProfileName,
    hasResolved1688Session,
    latest1688SessionError,
    provider,
    resolved1688ConnectionId,
    selectedProductIdsKey,
    untrackableActiveScanMessage,
  ]);

  const toggleRowSteps = useCallback((productId: string) => {
    setExpandedRowIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const toggleRowDiagnostics = useCallback((productId: string) => {
    setExpandedDiagnosticRowIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const toggleRowExtractedFields = useCallback((productId: string) => {
    setExpandedExtractedFieldRowIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const productFormBindings = useMemo(() => {
    if (
      !productFormCoreState ||
      !productFormCoreActions ||
      !productFormParameters ||
      !productFormCustomFields
    ) {
      return null;
    }

    return {
      getTextFieldValue: (field: 'asin' | 'ean' | 'gtin') => {
        const value = productFormCoreState.getValues(field);
        return typeof value === 'string' ? value : null;
      },
      getNumberFieldValue: (field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length') => {
        const value = productFormCoreState.getValues(field);
        return typeof value === 'number' ? value : null;
      },
      applyTextField: (field: 'asin' | 'ean' | 'gtin', value: string) => {
        productFormCoreActions.setValue(field, value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      applyNumberField: (
        field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length',
        value: number
      ) => {
        productFormCoreActions.setValue(field, value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      parameters: productFormParameters.parameters,
      parameterValues: productFormParameters.parameterValues,
      addParameterValue: productFormParameters.addParameterValue,
      updateParameterId: productFormParameters.updateParameterId,
      updateParameterValue: productFormParameters.updateParameterValue,
      customFields: productFormCustomFields.customFields,
      customFieldValues: productFormCustomFields.customFieldValues,
      setTextValue: productFormCustomFields.setTextValue,
      toggleSelectedOption: productFormCustomFields.toggleSelectedOption,
    };
  }, [
    productFormCoreActions,
    productFormCoreState,
    productFormCustomFields,
    productFormParameters,
  ]);

  const productSupplier1688FormBindings = useMemo(() => {
    if (!productFormCoreState || !productFormCoreActions) {
      return null;
    }

    return {
      getTextFieldValue: (field: 'supplierName' | 'supplierLink' | 'priceComment') => {
        const value = productFormCoreState.getValues(field);
        return typeof value === 'string' ? value : null;
      },
      applyTextField: (field: 'supplierName' | 'supplierLink' | 'priceComment', value: string) => {
        productFormCoreActions.setValue(field, value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      imageLinks: productFormImages?.imageLinks,
      imageBase64s: productFormImages?.imageBase64s,
      setImageLinkAt: productFormImages?.setImageLinkAt,
      setImageBase64At: productFormImages?.setImageBase64At,
    } as const;
  }, [productFormCoreActions, productFormCoreState, productFormImages]);

  const render1688SessionPanel =
    provider === '1688' ? (
      <div className='flex items-start gap-3 rounded-md border border-border/60 bg-card/30 px-3 py-2 text-xs text-muted-foreground'>
        <div className='flex-1 space-y-1'>
          <div>
            <span className='font-medium text-white'>1688 profile:</span>{' '}
            {active1688ConnectionName ?? 'No saved browser profile selected'}
          </div>
          <div>
            <span className='font-medium text-white'>Session:</span>{' '}
            {hasResolved1688Session ? 'Stored' : 'Missing'}
          </div>
          {active1688Connection ? (
            <>
              <div>
                <span className='font-medium text-white'>Browser:</span>{' '}
                {formatPlaywrightBrowserLabel(active1688Connection.playwrightBrowser)}
              </div>
              <div>
                <span className='font-medium text-white'>Identity profile:</span>{' '}
                {formatPlaywrightIdentityProfileLabel(
                  active1688Connection.playwrightIdentityProfile
                )}
              </div>
              <div>
                <span className='font-medium text-white'>Persona:</span>{' '}
                {active1688Connection.playwrightPersonaId?.trim() || 'Custom / none'}
              </div>
            </>
          ) : null}
          {active1688Connection?.playwrightStorageStateUpdatedAt ? (
            <div>
              <span className='font-medium text-white'>Updated:</span>{' '}
              {new Date(active1688Connection.playwrightStorageStateUpdatedAt).toLocaleString()}
            </div>
          ) : null}
          {active1688PostureWarnings.length > 0 ? (
            <div className='space-y-1 text-amber-300'>
              {active1688PostureWarnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          ) : null}
          {latest1688SessionMessage ? (
            <div className='text-emerald-300'>{latest1688SessionMessage}</div>
          ) : null}
          {latest1688SessionError ? (
            <div className='text-destructive'>{latest1688SessionError}</div>
          ) : null}
        </div>
        {active1688Connection ? (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              void handle1688RefreshSession();
            }}
            disabled={is1688LoginPending || isSubmitting}
            className='h-7 gap-1 px-2 text-xs'
          >
            {is1688LoginPending ? (
              <Loader2 className='h-3 w-3 animate-spin' />
            ) : (
              <RefreshCw className='h-3 w-3' />
            )}
            {is1688LoginPending ? 'Refreshing…' : 'Refresh 1688 session'}
          </Button>
        ) : null}
      </div>
    ) : null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalConfig.modalTitle}
      subtitle={formatSummary(rows)}
      size='lg'
      headerActions={
        <div className='flex items-center gap-2'>
          {provider === '1688' && active1688Connection ? (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                void handle1688RefreshSession();
              }}
              disabled={is1688LoginPending || isSubmitting}
              className='h-8 gap-1.5 px-2 text-xs'
            >
              {is1688LoginPending ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <RefreshCw className='h-3.5 w-3.5' />
              )}
              Refresh 1688 session
            </Button>
          ) : null}
          <Button
            variant='ghost'
            size='sm'
            onClick={handleManualRefresh}
            disabled={isSubmitting}
            className='h-8 gap-1.5 px-2 text-xs'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPolling ? 'animate-spin' : ''}`} />
            Refresh scans
          </Button>
        </div>
      }
    >
      <div className='space-y-3'>
        {render1688SessionPanel}
        {rows.length === 0 ? (
          <div className='flex min-h-[160px] items-center justify-center gap-3 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            {provider === '1688' && is1688ConnectionBootstrapPending
              ? 'Loading 1688 browser profiles...'
              : provider === '1688' && is1688LoginPending
                ? 'Opening 1688 login window...'
              : provider === '1688' && !hasResolved1688Session
                ? '1688 session refresh required before scanning.'
                : modalConfig.preparingLabel}
          </div>
        ) : (
          rows.map((row) => {
              const { infoMessage, errorMessage } = resolveRowDisplayMessages(row);
              const scanSteps = Array.isArray(row.scan?.steps) ? row.scan.steps : [];
              const isExpanded = expandedRowIds.has(row.productId);
              const diagnosticsExpanded = expandedDiagnosticRowIds.has(row.productId);
              const extractedFieldsExpanded = expandedExtractedFieldRowIds.has(row.productId);
              const effectiveProvider = row.scan?.provider ?? provider;
              const isAmazonScan = effectiveProvider !== '1688';
              const resolvedConnectionLabel =
                !isAmazonScan
                  ? ((row.scan?.connectionId
                      ? connectionNamesById.get(row.scan.connectionId)
                      : null) ??
                    active1688ConnectionName ??
                    row.scan?.connectionId ??
                    null)
                  : null;
              const supplierDetails = row.scan?.provider === '1688' ? row.scan.supplierDetails : null;
              const supplierSummary = [
                supplierDetails?.supplierName,
                supplierDetails?.priceText ?? supplierDetails?.priceRangeText,
                supplierDetails?.moqText,
              ]
                .filter(Boolean)
                .join(' · ');
              const hasExtractedFields =
                isAmazonScan &&
                ((row.scan && hasProductScanAmazonDetails(row.scan.amazonDetails)) ||
                  Boolean(row.scan?.asin));
              const recommendationReason =
                row.scan == null
                  ? null
                  : isAmazonScan
                    ? hasExtractedFields
                      ? resolveAmazonScanRecommendationReason(row.scan)
                      : null
                    : resolve1688ScanRecommendationReason(row.scan);
              const supplierApplyPolicySummary =
                row.scan && !isAmazonScan
                  ? resolveProductScan1688ApplyPolicySummary(row.scan)
                  : null;
              const supplierRecommendationSignal =
                !isAmazonScan && recommendationReason
                  ? resolveProductScan1688RecommendationSignal()
                  : null;
              const isBlocked1688ResultReviewed =
                supplierApplyPolicySummary?.blockActions === true &&
                isBlockedScanReviewed(row.scan?.id);
              const blocked1688CandidateUrlsHref =
                row.scan && !isAmazonScan && supplierApplyPolicySummary?.blockActions
                  ? buildProductScan1688SectionId(row.scan.id, 'candidate-urls')
                  : null;
              const blocked1688MatchEvaluationHref =
                row.scan && !isAmazonScan && supplierApplyPolicySummary?.blockActions
                  ? buildProductScan1688SectionId(row.scan.id, 'match-evaluation')
                  : null;
              const recommendationRejectedBreakdown =
                row.scan && isAmazonScan && hasExtractedFields
                  ? resolveRejectedAmazonCandidateBreakdown(row.scan.steps)
                  : null;
              const diagnostics = row.scan ? resolveProductScanDiagnostics(row.scan) : null;
              const hasDiagnostics = Boolean(diagnostics);
              const latestFailureArtifact = diagnostics?.failureArtifacts[0] ?? null;
              const failureArtifactCount = diagnostics?.failureArtifacts.length ?? 0;
              const latestFailureArtifactPath = latestFailureArtifact?.path ?? null;
              const latestFailureArtifactHref =
                row.scan && latestFailureArtifact
                  ? buildProductScanArtifactHref(row.scan.id, latestFailureArtifact)
                  : null;
              const progressSummary =
                (row.status === 'queued' || row.status === 'running') && scanSteps.length > 0
                  ? resolveProductScanActiveStepSummary(scanSteps)
                  : null;
              const continuationSummary =
                (row.status === 'queued' || row.status === 'running') && scanSteps.length > 0
                  ? resolveProductScanContinuationSummary(scanSteps)
                  : null;
              const rejectedCandidateSummary =
                scanSteps.length > 0 && !progressSummary && !continuationSummary
                  ? resolveProductScanRejectedCandidateSummary(scanSteps)
                  : null;
              const evaluationPolicySummary =
                scanSteps.length > 0 && !progressSummary
                  ? resolveProductScanEvaluationPolicySummary(scanSteps)
                  : null;
              const latestOutcomeSummary =
                scanSteps.length > 0 &&
                !progressSummary &&
                (row.status === 'failed' ||
                  row.status === 'conflict' ||
                  row.status === 'queued' ||
                  row.status === 'running')
                  ? resolveProductScanLatestOutcomeSummary(scanSteps, {
                      allowStalled: row.status === 'queued' || row.status === 'running',
                    })
                  : null;
              const fallbackFailureSummary =
                !latestOutcomeSummary && row.scan
                  ? resolveProductScanDiagnosticFailureSummary(row.scan)
                  : null;
              const isActiveDiagnosticSummary =
                !latestOutcomeSummary &&
                Boolean(fallbackFailureSummary) &&
                (row.status === 'queued' || row.status === 'running');
              const usesFailureSummaryStyling =
                latestOutcomeSummary?.kind === 'failed' ||
                (fallbackFailureSummary != null && !isActiveDiagnosticSummary);

              return (
                <section
                  key={row.productId}
                  className='space-y-2 rounded-md border border-border/60 px-4 py-4'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='text-sm font-medium'>{row.productName}</span>
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                        {modalConfig.resultTypeLabel}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${resolveRowStatusClassName(row)}`}
                      >
                        {row.status === 'running' ? <Loader2 className='mr-1 h-3 w-3 animate-spin' /> : null}
                        {resolveRowStatusLabel(row)}
                      </span>
                      {!isAmazonScan && resolvedConnectionLabel ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                          Profile {resolvedConnectionLabel}
                        </span>
                      ) : null}
                    </div>
                    <span className='text-xs text-muted-foreground'>
                      {formatTimestamp(row.scan?.createdAt)}
                    </span>
                  </div>

                  <div className='flex items-center justify-end gap-1'>
                    {isAmazonScan ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => toggleRowExtractedFields(row.productId)}
                        disabled={!hasExtractedFields}
                        className='h-7 gap-1.5 px-2 text-xs'
                      >
                        {extractedFieldsExpanded ? (
                          <ChevronUp className='h-3.5 w-3.5' />
                        ) : (
                          <ChevronDown className='h-3.5 w-3.5' />
                        )}
                        {extractedFieldsExpanded ? 'Hide extracted fields' : 'Show extracted fields'}
                      </Button>
                    ) : null}
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => toggleRowDiagnostics(row.productId)}
                      disabled={!hasDiagnostics}
                      className='h-7 gap-1.5 px-2 text-xs'
                    >
                      {diagnosticsExpanded ? (
                        <ChevronUp className='h-3.5 w-3.5' />
                      ) : (
                        <ChevronDown className='h-3.5 w-3.5' />
                      )}
                      {diagnosticsExpanded ? 'Hide diagnostics' : 'Show diagnostics'}
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => toggleRowSteps(row.productId)}
                      disabled={scanSteps.length === 0}
                      className='h-7 gap-1.5 px-2 text-xs'
                    >
                      {isExpanded ? (
                        <ChevronUp className='h-3.5 w-3.5' />
                      ) : (
                        <ChevronDown className='h-3.5 w-3.5' />
                      )}
                      {isExpanded ? 'Hide steps' : 'Show steps'}
                    </Button>
                  </div>

                  {progressSummary ? (
                    <div className='space-y-1 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2'>
                      <div className='flex flex-wrap items-center gap-2 text-xs'>
                        <span className='inline-flex items-center rounded-md border border-blue-500/20 px-2 py-0.5 font-medium text-foreground'>
                          {progressSummary.phaseLabel}
                        </span>
                        <span className='text-muted-foreground'>Current step</span>
                        <span className='font-medium text-foreground'>{progressSummary.stepLabel}</span>
                        {progressSummary.attempt ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            Attempt {progressSummary.attempt}
                          </span>
                        ) : null}
                        {progressSummary.inputSource ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {progressSummary.inputSource === 'url' ? 'URL input' : 'File input'}
                          </span>
                        ) : null}
                      </div>
                      {progressSummary.message ? (
                        <p className='text-sm text-muted-foreground'>{progressSummary.message}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {continuationSummary ? (
                    <div className='space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2'>
                      <div className='flex flex-wrap items-center gap-2 text-xs'>
                        <span className='inline-flex items-center rounded-md border border-amber-500/20 px-2 py-0.5 font-medium text-amber-300'>
                          Candidate continuation
                        </span>
                        <span className='text-muted-foreground'>
                          {continuationSummary.rejectionKind === 'language'
                            ? 'After language rejection'
                            : 'After AI rejection'}
                        </span>
                        <span className='font-medium text-foreground'>{continuationSummary.stepLabel}</span>
                        {continuationSummary.resultCodeLabel ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {continuationSummary.resultCodeLabel}
                          </span>
                        ) : null}
                        {continuationSummary.attempt ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            Attempt {continuationSummary.attempt}
                          </span>
                        ) : null}
                      </div>
                      {continuationSummary.message ? (
                        <p className='text-sm text-muted-foreground'>{continuationSummary.message}</p>
                      ) : null}
                      <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
                        {continuationSummary.rejectedUrl ? (
                          <span>Rejected: {continuationSummary.rejectedUrl}</span>
                        ) : null}
                        {continuationSummary.nextUrl ? (
                          <span>Next: {continuationSummary.nextUrl}</span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {rejectedCandidateSummary ? (
                    <div className='space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2'>
                      <div className='flex flex-wrap items-center gap-2 text-xs'>
                        <span className='inline-flex items-center rounded-md border border-amber-500/20 px-2 py-0.5 font-medium text-amber-300'>
                          {rejectedCandidateSummary.latestRejectionKind === 'language'
                            ? 'AI language rejections'
                            : 'AI candidate rejections'}
                        </span>
                        <span className='font-medium text-foreground'>
                          {rejectedCandidateSummary.rejectedCount} candidate
                          {rejectedCandidateSummary.rejectedCount === 1 ? '' : 's'} rejected before{' '}
                          {row.status === 'completed' || row.status === 'conflict'
                            ? 'match'
                            : row.status === 'no_match'
                              ? 'no match'
                              : 'final result'}
                        </span>
                      </div>
                      {rejectedCandidateSummary.latestReason ? (
                        <p className='text-sm text-muted-foreground'>
                          {rejectedCandidateSummary.latestReason}
                        </p>
                      ) : null}
                      {rejectedCandidateSummary.languageRejectedCount > 0 ? (
                        <p className='text-xs text-muted-foreground'>
                          {rejectedCandidateSummary.languageRejectedCount} non-English page
                          {rejectedCandidateSummary.languageRejectedCount === 1 ? '' : 's'} rejected
                        </p>
                      ) : null}
                      {rejectedCandidateSummary.latestRejectedUrl ? (
                        <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
                          <span>Latest rejected: {rejectedCandidateSummary.latestRejectedUrl}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {evaluationPolicySummary ? (
                    <div className='space-y-1 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
                      <div className='flex flex-wrap items-center gap-2 text-xs'>
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          AI evaluator policy
                        </span>
                        {evaluationPolicySummary.executionLabel ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.executionLabel}
                          </span>
                        ) : null}
                        {evaluationPolicySummary.modelSource ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.modelSource}
                          </span>
                        ) : null}
                        {evaluationPolicySummary.thresholdLabel ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.thresholdLabel}
                          </span>
                        ) : null}
                        {evaluationPolicySummary.scopeLabel ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.scopeLabel}
                          </span>
                        ) : null}
                        {evaluationPolicySummary.languageGateLabel ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.languageGateLabel}
                          </span>
                        ) : null}
                        {evaluationPolicySummary.languageDetectionLabel ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {evaluationPolicySummary.languageDetectionLabel}
                          </span>
                        ) : null}
                      </div>
                      {evaluationPolicySummary.modelLabel ? (
                        <p className='text-sm text-muted-foreground'>
                          Model {evaluationPolicySummary.modelLabel}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {latestOutcomeSummary || fallbackFailureSummary ? (
                    <div
                      className={`space-y-1 rounded-md px-3 py-2 ${
                        usesFailureSummaryStyling
                          ? 'border border-destructive/20 bg-destructive/5'
                          : 'border border-amber-500/20 bg-amber-500/5'
                      }`}
                    >
                      <div className='flex flex-wrap items-center gap-2 text-xs'>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${
                            usesFailureSummaryStyling
                              ? 'border border-destructive/20 text-destructive'
                              : 'border border-amber-500/20 text-amber-300'
                          }`}
                        >
                          {latestOutcomeSummary?.phaseLabel ?? fallbackFailureSummary?.phaseLabel}
                        </span>
                        <span className='text-muted-foreground'>
                          {latestOutcomeSummary?.kind === 'failed'
                            ? 'Last failure'
                            : isActiveDiagnosticSummary
                              ? 'Latest diagnostics'
                              : fallbackFailureSummary
                                ? 'Last failure'
                            : 'Last completed step'}
                        </span>
                        <span className='font-medium text-foreground'>
                          {latestOutcomeSummary?.stepLabel ?? fallbackFailureSummary?.stepLabel}
                        </span>
                        {(latestOutcomeSummary?.sourceLabel ?? fallbackFailureSummary?.sourceLabel) ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {latestOutcomeSummary?.sourceLabel ?? fallbackFailureSummary?.sourceLabel}
                          </span>
                        ) : null}
                        {(latestOutcomeSummary?.resultCodeLabel ?? fallbackFailureSummary?.resultCodeLabel) ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {latestOutcomeSummary?.resultCodeLabel ?? fallbackFailureSummary?.resultCodeLabel}
                          </span>
                        ) : null}
                        {latestOutcomeSummary?.attempt ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            Attempt {latestOutcomeSummary.attempt}
                          </span>
                        ) : null}
                        {latestOutcomeSummary?.inputSource ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {latestOutcomeSummary.inputSource === 'url' ? 'URL input' : 'File input'}
                          </span>
                        ) : null}
                        {failureArtifactCount > 0 ? (
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            {failureArtifactCount} artifact{failureArtifactCount === 1 ? '' : 's'}
                          </span>
                        ) : null}
                        {latestFailureArtifactPath ? (
                          <CopyButton
                            value={latestFailureArtifactPath}
                            variant='outline'
                            size='sm'
                            showText
                            className='h-6 px-2 text-[11px]'
                            ariaLabel='Copy artifact path'
                          />
                        ) : null}
                      </div>
                      {(latestOutcomeSummary?.message ?? fallbackFailureSummary?.message) ? (
                        <p className='text-sm text-muted-foreground'>
                          {latestOutcomeSummary?.message ?? fallbackFailureSummary?.message}
                        </p>
                      ) : null}
                      {(latestOutcomeSummary?.timingLabel ?? fallbackFailureSummary?.timingLabel) ? (
                        <p className='text-xs text-muted-foreground'>
                          {latestOutcomeSummary?.timingLabel ?? fallbackFailureSummary?.timingLabel}
                        </p>
                      ) : null}
                      {(latestOutcomeSummary?.url ?? fallbackFailureSummary?.url) ? (
                        <a
                          href={latestOutcomeSummary?.url ?? fallbackFailureSummary?.url ?? undefined}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                        >
                          Open stage URL
                          <ExternalLink className='h-3.5 w-3.5' />
                        </a>
                      ) : null}
                      {latestFailureArtifactHref ? (
                        <a
                          href={latestFailureArtifactHref}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                        >
                          Open latest artifact
                          <ExternalLink className='h-3.5 w-3.5' />
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {recommendationReason ? (
                    <div className='space-y-1 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
                      <div className='flex flex-wrap items-center gap-2 text-xs'>
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {isAmazonScan
                            ? 'Amazon result signal'
                            : (supplierRecommendationSignal?.badgeLabel ?? '1688 supplier result')}
                        </span>
                        <span className='font-medium text-foreground'>{recommendationReason}</span>
                      </div>
                      {supplierApplyPolicySummary ? (
                        <div className='flex flex-wrap items-center gap-2 text-xs'>
                          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                            Apply policy
                          </span>
                          <span
                            className={
                              isBlocked1688ResultReviewed
                                ? 'font-medium text-muted-foreground'
                                : supplierApplyPolicySummary.tone === 'destructive'
                                ? 'font-medium text-destructive'
                                : 'font-medium text-amber-300'
                            }
                          >
                            {isBlocked1688ResultReviewed
                              ? 'Blocked result reviewed'
                              : supplierApplyPolicySummary.label}
                          </span>
                          {blocked1688CandidateUrlsHref ? (
                            <a
                              href={`#${blocked1688CandidateUrlsHref}`}
                              className='text-primary underline-offset-2 hover:underline'
                            >
                              Review candidates
                            </a>
                          ) : null}
                          {blocked1688MatchEvaluationHref ? (
                            <a
                              href={`#${blocked1688MatchEvaluationHref}`}
                              className='text-primary underline-offset-2 hover:underline'
                            >
                              Review evaluation
                            </a>
                          ) : null}
                          {supplierApplyPolicySummary.blockActions ? (
                            <button
                              type='button'
                              onClick={() =>
                                isBlocked1688ResultReviewed
                                  ? clearBlockedScanReviewed(row.scan?.id)
                                  : markBlockedScanReviewed(row.scan?.id)
                              }
                              className='text-primary underline-offset-2 hover:underline'
                            >
                              {isBlocked1688ResultReviewed ? 'Undo review' : 'Mark reviewed'}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      {recommendationRejectedBreakdown &&
                      recommendationRejectedBreakdown.languageRejectedCount > 0 ? (
                        <p className='text-sm text-muted-foreground'>
                          Includes {recommendationRejectedBreakdown.languageRejectedCount} non-English
                          page
                          {recommendationRejectedBreakdown.languageRejectedCount === 1 ? '' : 's'} rejected
                          by the language gate.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {!recommendationReason && supplierApplyPolicySummary ? (
                    <div className='space-y-1 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
                      <div className='flex flex-wrap items-center gap-2 text-xs'>
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          Apply policy
                        </span>
                        <span
                          className={
                            isBlocked1688ResultReviewed
                              ? 'font-medium text-muted-foreground'
                              : supplierApplyPolicySummary.tone === 'destructive'
                              ? 'font-medium text-destructive'
                              : 'font-medium text-amber-300'
                          }
                        >
                          {isBlocked1688ResultReviewed
                            ? 'Blocked result reviewed'
                            : supplierApplyPolicySummary.label}
                        </span>
                        {blocked1688CandidateUrlsHref ? (
                          <a
                            href={`#${blocked1688CandidateUrlsHref}`}
                            className='text-primary underline-offset-2 hover:underline'
                          >
                            Review candidates
                          </a>
                        ) : null}
                        {blocked1688MatchEvaluationHref ? (
                          <a
                            href={`#${blocked1688MatchEvaluationHref}`}
                            className='text-primary underline-offset-2 hover:underline'
                          >
                            Review evaluation
                          </a>
                        ) : null}
                        {supplierApplyPolicySummary.blockActions ? (
                          <button
                            type='button'
                            onClick={() =>
                              isBlocked1688ResultReviewed
                                ? clearBlockedScanReviewed(row.scan?.id)
                                : markBlockedScanReviewed(row.scan?.id)
                            }
                            className='text-primary underline-offset-2 hover:underline'
                          >
                            {isBlocked1688ResultReviewed ? 'Undo review' : 'Mark reviewed'}
                          </button>
                        ) : null}
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        {supplierApplyPolicySummary.detail}
                      </p>
                    </div>
                  ) : null}

                  {row.scan?.title ? <p className='text-sm font-medium'>{row.scan.title}</p> : null}
                  {isAmazonScan && (row.scan?.asin || row.scan?.price) ? (
                    <p className='text-xs text-muted-foreground'>
                      {[row.scan?.asin && `ASIN ${row.scan.asin}`, row.scan?.price && `Price ${row.scan.price}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                  {!isAmazonScan && supplierSummary ? (
                    <p className='text-xs text-muted-foreground'>{supplierSummary}</p>
                  ) : null}
                  {row.scan?.url ? (
                    <a
                      href={row.scan.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                    >
                      {modalConfig.openResultLabel}
                      <ExternalLink className='h-3.5 w-3.5' />
                    </a>
                  ) : null}
                  {row.scan?.description ? (
                    <p className='line-clamp-3 text-sm text-muted-foreground'>{row.scan.description}</p>
                  ) : null}
                  {infoMessage ? <p className='text-sm text-muted-foreground'>{infoMessage}</p> : null}
                  {errorMessage ? <p className='text-sm text-destructive'>{errorMessage}</p> : null}
                  {!isAmazonScan && row.scan ? (
                    <ProductScan1688Details
                      scan={row.scan}
                      scanId={row.scan.id}
                      connectionLabel={resolvedConnectionLabel}
                    />
                  ) : null}
                  {!isAmazonScan && row.scan ? (
                    <ProductScan1688ApplyPanel
                      scan={row.scan}
                      formBindings={productSupplier1688FormBindings}
                    />
                  ) : null}
                  {isAmazonScan && extractedFieldsExpanded && row.scan ? (
                    <ProductScanAmazonExtractedFieldsPanel
                      scan={row.scan}
                      formBindings={productFormBindings}
                    />
                  ) : null}
                  {diagnosticsExpanded && row.scan ? <ProductScanDiagnostics scan={row.scan} /> : null}
                  {isExpanded && scanSteps.length > 0 ? <ProductScanSteps steps={scanSteps} /> : null}
                </section>
              );
          })
        )}
      </div>
    </AppModal>
  );
}
