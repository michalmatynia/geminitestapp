import 'server-only';

import {
  createCustomPlaywrightInstance,
  startPlaywrightConnectionEngineTask,
} from '@/features/playwright/server';
import { extractIntegrationConnectionPlaywrightSettingsOverrides } from '@/features/playwright/server/connection-settings-shared';
import {
  resolveSupplier1688SelectorRegistryNativeRuntime,
  toSupplier1688SelectorRegistryResolutionSummary,
} from '@/features/integrations/services/supplier-1688-selector-registry';
import { getPlaywrightRuntimeActionSeed } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import {
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
  SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
} from '@/shared/lib/browser-execution';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { getProductScanProviderDefinition, requireProductScanNativeRuntime } from './product-scan-providers';
import { resolveProductScanner1688CandidateEvaluatorConfig } from './product-scanner-settings';
import {
  PRODUCT_SCAN_TIMEOUT_MS,
  shouldAutoShowScannerCaptchaBrowser,
  toRecord,
} from './product-scans-service.helpers';
import { resolve1688ConnectionEngineSettings } from './product-scans-sync-1688';
import type {
  BatchScanQueueConfig,
  ProductScanImageCandidates,
  ProductScannerSettings,
  QueuedProductRecord,
  ResolvedPlaywrightConnectionRuntime,
  StartedQueuedScanRun,
  SupplierConnectionContext,
} from './product-scans-queuing.shared';

type StartSupplier1688QueuedProductScanRunArgs = {
  config: BatchScanQueueConfig;
  forceVisible?: boolean;
  imageCandidates: ProductScanImageCandidates;
  manualVerificationTimeoutMs: number;
  ownerUserId?: string | null;
  product: QueuedProductRecord;
  productName: string;
  requestedStepSequenceInput: Record<string, unknown>;
  scannerSettings: ProductScannerSettings;
  supplierConnectionContext: NonNullable<SupplierConnectionContext>;
};

const nullable = <T>(value: T | null | undefined): T | null => value ?? null;

const resolveSupplierAllowUrlImageSearchFallback = (
  args: StartSupplier1688QueuedProductScanRunArgs
): boolean =>
  args.supplierConnectionContext.connection.scanner1688AllowUrlImageSearchFallback ??
  args.scannerSettings.scanner1688?.allowUrlImageSearchFallback ??
  true;

const buildSupplierConnectionRuntimeInput = (
  args: StartSupplier1688QueuedProductScanRunArgs
): Record<string, unknown> => {
  const supplierConnection = args.supplierConnectionContext.connection;
  return {
    scanner1688StartUrl: nullable(supplierConnection.scanner1688StartUrl),
    scanner1688LoginMode: nullable(supplierConnection.scanner1688LoginMode),
    scanner1688DefaultSearchMode: nullable(supplierConnection.scanner1688DefaultSearchMode),
    candidateResultLimit: nullable(supplierConnection.scanner1688CandidateResultLimit),
    minimumCandidateScore: nullable(supplierConnection.scanner1688MinimumCandidateScore),
    maxExtractedImages: nullable(supplierConnection.scanner1688MaxExtractedImages),
    allowUrlImageSearchFallback: resolveSupplierAllowUrlImageSearchFallback(args),
  };
};

type Supplier1688RuntimeAction = ReturnType<typeof getPlaywrightRuntimeActionSeed>;

const resolveSupplier1688ActionName = (action: Supplier1688RuntimeAction): string =>
  action?.name ?? '1688 Supplier Probe Scan';

const resolveSupplier1688ActionBlocks = (action: Supplier1688RuntimeAction): unknown[] =>
  action?.blocks ?? [];

const resolveSelectorRuntime = (
  selectorNativeRuntimeResolution: Awaited<ReturnType<typeof resolveSupplier1688SelectorRegistryNativeRuntime>> | null
): unknown => selectorNativeRuntimeResolution?.selectorRuntime ?? null;

const resolveSupplier1688SelectorRuntime = async (
  config: BatchScanQueueConfig,
  productId: string
): Promise<Awaited<ReturnType<typeof resolveSupplier1688SelectorRegistryNativeRuntime>> | null> =>
  resolveSupplier1688SelectorRegistryNativeRuntime({
    profile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
  }).catch(async (error) => {
    await ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: `${config.actionPrefix}.resolve1688SelectorRegistryRuntime`,
      productId,
    });
    return null;
  });

const buildSupplier1688RuntimeInput = async (
  args: StartSupplier1688QueuedProductScanRunArgs,
  selectorNativeRuntimeResolution: Awaited<ReturnType<typeof resolveSupplier1688SelectorRegistryNativeRuntime>> | null
): Promise<unknown> => {
  const supplier1688Runtime = requireProductScanNativeRuntime(getProductScanProviderDefinition('1688'));
  const { integrationId, connection: supplierConnection } = args.supplierConnectionContext;
  const supplier1688RuntimeAction = getPlaywrightRuntimeActionSeed(
    SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY
  );

  return supplier1688Runtime.buildRequestInput({
    productId: args.product.id,
    productName: args.productName,
    imageCandidates: args.imageCandidates,
    integrationId,
    connectionId: supplierConnection.id,
    actionId: supplier1688RuntimeAction?.id ?? null,
    actionName: resolveSupplier1688ActionName(supplier1688RuntimeAction),
    action: supplier1688RuntimeAction,
    blocks: resolveSupplier1688ActionBlocks(supplier1688RuntimeAction),
    runtimeKey: supplier1688Runtime.runtimeKey,
    selectorProfile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
    selectorRegistryResolution: toSupplier1688SelectorRegistryResolutionSummary(
      selectorNativeRuntimeResolution
    ),
    selectorRuntime: resolveSelectorRuntime(selectorNativeRuntimeResolution),
    ...buildSupplierConnectionRuntimeInput(args),
    manualVerificationTimeoutMs: args.manualVerificationTimeoutMs,
    evaluatorConfig: await resolveProductScanner1688CandidateEvaluatorConfig(args.scannerSettings),
    ...args.requestedStepSequenceInput,
  });
};

export const startSupplier1688QueuedProductScanRun = async (
  args: StartSupplier1688QueuedProductScanRunArgs
): Promise<StartedQueuedScanRun> => {
  const supplier1688Runtime = requireProductScanNativeRuntime(getProductScanProviderDefinition('1688'));
  const { integrationId, connection: supplierConnection } = args.supplierConnectionContext;
  const supplier1688RuntimeAction = getPlaywrightRuntimeActionSeed(
    SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY
  );
  const selectorNativeRuntimeResolution = await resolveSupplier1688SelectorRuntime(
    args.config,
    args.product.id
  );
  const run = await startPlaywrightConnectionEngineTask({
    connection: supplierConnection,
    request: {
      runtimeKey: supplier1688Runtime.runtimeKey,
      actionId: supplier1688RuntimeAction?.id ?? null,
      actionName: supplier1688RuntimeAction?.name ?? '1688 Supplier Probe Scan',
      selectorProfile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
      input: await buildSupplier1688RuntimeInput(args, selectorNativeRuntimeResolution),
      timeoutMs: PRODUCT_SCAN_TIMEOUT_MS,
      capture: { screenshot: true, html: true },
      preventNewPages: true,
    },
    resolveEngineRequestConfig: (runtime: ResolvedPlaywrightConnectionRuntime) => ({
      browserPreference: runtime.browserPreference,
      settings: resolve1688ConnectionEngineSettings(
        {
          ...toRecord(runtime.settings),
          ...extractIntegrationConnectionPlaywrightSettingsOverrides(supplierConnection),
        },
        { forceVisible: args.forceVisible ?? false }
      ),
    }),
    ownerUserId: args.ownerUserId ?? null,
    instance: createCustomPlaywrightInstance({
      family: 'scrape',
      label: '1688 product scan',
      tags: ['product', '1688', 'scan', 'batch'],
      connectionId: supplierConnection.id,
      integrationId,
    }),
  });

  return {
    actionId: `runtime_action__${SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY}`,
    allowManualVerification: shouldAutoShowScannerCaptchaBrowser(args.scannerSettings),
    imageSearchPageUrl: null,
    imageSearchProvider: 'google_images_upload',
    manualVerificationTimeoutMs: args.manualVerificationTimeoutMs,
    recordDiagnostics: false,
    run,
    runtimeKey: SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
    selectorProfile: SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
  };
};
