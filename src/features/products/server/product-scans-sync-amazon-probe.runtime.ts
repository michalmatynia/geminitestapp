import 'server-only';

import {
  createCustomPlaywrightInstance,
  type PlaywrightEngineRunInstance,
  type PlaywrightEngineRunRequest,
} from '@/features/playwright/server';
import { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { ProductScannerSettings } from '@/shared/contracts/products/scanner-settings';
import { resolveAmazonRuntimeActionName } from '@/shared/lib/browser-execution/amazon-runtime-constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { resolveAmazonScanDiagnosticCapture } from './product-scan-amazon-diagnostics';
import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  requireProductScanNativeRuntime,
} from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
} from './product-scanner-settings';
import {
  readOptionalString,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  toRecord,
} from './product-scans-service.helpers';
import {
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchPageUrl,
  resolveAmazonImageSearchProvider,
  type AmazonProductScanRuntimeKey,
  resolveAmazonProductScanRuntimeKey,
  resolveAmazonRuntimeActionDefinition,
} from './product-scans-service.helpers.amazon';
import type { AmazonProbeReadyContext } from './product-scans-sync-amazon-probe.types';

export const amazonProbeScanRuntime = requireProductScanNativeRuntime(
  AMAZON_PRODUCT_SCAN_PROVIDER
);

export type AmazonProbeRuntimeRequestContext = {
  amazonImageSearchProvider: ReturnType<typeof resolveAmazonImageSearchProvider>;
  amazonImageSearchPageUrl: string | null;
  amazonSelectorProfile: string;
  manualVerificationTimeoutMs: number;
  allowManualVerification: boolean;
  diagnosticCapture: ReturnType<typeof resolveAmazonScanDiagnosticCapture>;
  scannerRuntimeOptions: Partial<PlaywrightEngineRunRequest>;
};

export type AmazonProbeTaskInstanceInput = {
  label: string;
  tags: string[];
};

export const loadAmazonProbeScannerSettings = async (
  scan: ProductScanRecord,
  engineRunId: string
): Promise<ProductScannerSettings> => {
  try {
    return await getProductScannerSettings();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.loadScannerSettingsForProbeEvaluation',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
    return createDefaultProductScannerSettings();
  }
};

export const resolveAmazonProbeRuntimeKey = (rawResult: unknown): AmazonProductScanRuntimeKey =>
  resolveAmazonProductScanRuntimeKey(toRecord(rawResult)?.['runtimeKey']);

export const resolveAmazonProbeRuntimeAction = async (
  runtimeKey: AmazonProductScanRuntimeKey
): ReturnType<typeof resolveAmazonRuntimeActionDefinition> =>
  await resolveAmazonRuntimeActionDefinition(runtimeKey);

export const resolveAmazonProbeOwnerUserId = (scan: ProductScanRecord): string | null =>
  readOptionalString(scan.updatedBy);

export const resolveAmazonProbeRuntimeActionName = (
  context: Pick<AmazonProbeReadyContext, 'amazonRuntimeAction'>
): string =>
  context.amazonRuntimeAction?.name ??
  resolveAmazonRuntimeActionName(amazonProbeScanRuntime.runtimeKey);

export const resolveAmazonProbeRuntimeRequestContext = (
  context: AmazonProbeReadyContext
): AmazonProbeRuntimeRequestContext => {
  const scannerEngineRequestOptions = buildProductScannerEngineRequestOptions(
    context.scannerSettings
  );
  const allowManualVerification = shouldAutoShowScannerCaptchaBrowser(context.scannerSettings);
  return {
    amazonImageSearchProvider: resolveAmazonImageSearchProvider(
      context.scan.rawResult,
      context.scannerSettings
    ),
    amazonImageSearchPageUrl: resolveAmazonImageSearchPageUrl(
      context.scan.rawResult,
      context.scannerSettings
    ),
    amazonSelectorProfile:
      readOptionalString(toRecord(context.scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon',
    manualVerificationTimeoutMs: resolveScanManualVerificationTimeoutMs(context.scannerSettings),
    allowManualVerification,
    diagnosticCapture: resolveAmazonScanDiagnosticCapture(context.scan.rawResult),
    scannerRuntimeOptions: buildAmazonScannerRequestRuntimeOptions({
      scannerSettings: context.scannerSettings,
      scannerEngineRequestOptions,
      actionExecutionSettings: context.amazonRuntimeAction?.executionSettings ?? null,
      actionPersonaId: context.amazonRuntimeAction?.personaId ?? null,
      runtimeKey: context.amazonRuntimeKey,
    }),
  };
};

export const createAmazonProbeTaskInstance = (
  input: AmazonProbeTaskInstanceInput
): PlaywrightEngineRunInstance =>
  createCustomPlaywrightInstance({
    family: 'scrape',
    label: input.label,
    tags: input.tags,
  });
