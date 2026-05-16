import 'server-only';

import {
  createCustomPlaywrightInstance,
  startPlaywrightEngineTask,
} from '@/features/playwright/server';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  resolveAmazonRuntimeActionName,
} from '@/shared/lib/browser-execution';

import { buildAmazonDirectCandidateUrlsFromAsin } from './product-scan-amazon.helpers';
import { resolveAmazonScanDiagnosticCapture } from './product-scan-amazon-diagnostics';
import {
  buildProductScannerEngineRequestOptions,
  resolveProductScannerAmazonCandidateEvaluatorConfig,
  resolveProductScannerAmazonCandidateEvaluatorProbeConfig,
} from './product-scanner-settings';
import {
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchPageUrl,
  resolveAmazonImageSearchProvider,
  resolveAmazonRuntimeActionDefinition,
  resolveAmazonScanRuntimeTimeoutMs,
} from './product-scans-service.helpers.amazon';
import {
  AMAZON_RUNTIME_KEY_DEFAULTED_FLAG,
  type BatchScanQueueConfig,
  type ProductScanImageCandidates,
  type ProductScannerSettings,
  type QueuedProductRecord,
  type StartedQueuedScanRun,
} from './product-scans-queuing.shared';
import {
  readOptionalString,
  shouldAutoShowScannerCaptchaBrowser,
  toRecord,
} from './product-scans-service.helpers';

export type AmazonRuntimeKey =
  | typeof AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY
  | typeof AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
  | typeof AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY;

const AMAZON_RUNTIME_KEYS = new Set<string>([
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
]);

export const resolveAmazonRuntimeKey = (value: unknown): AmazonRuntimeKey =>
  typeof value === 'string' && AMAZON_RUNTIME_KEYS.has(value)
    ? (value as AmazonRuntimeKey)
    : AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY;

export const hasDirectAmazonCandidateRequestInput = (
  requestInput: Record<string, unknown> | undefined
): boolean => {
  if (readOptionalString(requestInput?.['directAmazonCandidateUrl'], 4_000) !== null) {
    return true;
  }
  const urls = requestInput?.['directAmazonCandidateUrls'];
  return Array.isArray(urls) && urls.some((value) => readOptionalString(value, 4_000) !== null);
};

const shouldAutoSeedExistingAsin = (
  requestInput: Record<string, unknown>,
  requestedRuntimeKey: string | null
): boolean => {
  const runtimeKeyWasDefaulted = requestInput[AMAZON_RUNTIME_KEY_DEFAULTED_FLAG] === true;
  return (
    requestedRuntimeKey === null ||
    (
      runtimeKeyWasDefaulted &&
      requestedRuntimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY
    )
  );
};

export const resolveEffectiveAmazonRequestInput = (input: {
  requestInput: Record<string, unknown>;
  existingAsin: string | null | undefined;
  hasUsableImageCandidates: boolean;
}): Record<string, unknown> => {
  if (hasDirectAmazonCandidateRequestInput(input.requestInput)) return input.requestInput;

  const directCandidateUrls = buildAmazonDirectCandidateUrlsFromAsin(input.existingAsin);
  if (directCandidateUrls.length === 0) return input.requestInput;

  const requestedRuntimeKey = readOptionalString(input.requestInput['runtimeKey'], 160);
  if (requestedRuntimeKey === AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY) {
    return appendDirectAmazonCandidateInput(input.requestInput, directCandidateUrls);
  }
  if (input.hasUsableImageCandidates) return input.requestInput;
  if (!shouldAutoSeedExistingAsin(input.requestInput, requestedRuntimeKey)) return input.requestInput;
  return appendDirectAmazonCandidateInput(input.requestInput, directCandidateUrls);
};

const appendDirectAmazonCandidateInput = (
  requestInput: Record<string, unknown>,
  directCandidateUrls: string[]
): Record<string, unknown> => ({
  ...requestInput,
  runtimeKey: AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  directAmazonCandidateUrl: directCandidateUrls[0] ?? null,
  directAmazonCandidateUrls: directCandidateUrls,
});

export const resolveQueuedAmazonRuntimeKey = (input: {
  config: BatchScanQueueConfig;
  effectiveRequestInput: Record<string, unknown>;
  hasDirectAmazonCandidateInput: boolean;
}): AmazonRuntimeKey | null => {
  if (input.config.provider !== 'amazon') return null;
  const requestedAmazonRuntimeKey = input.effectiveRequestInput['runtimeKey'];
  const hasExplicitAmazonRuntimeKey =
    typeof requestedAmazonRuntimeKey === 'string' &&
    requestedAmazonRuntimeKey.trim().length > 0;
  if (!hasExplicitAmazonRuntimeKey && input.hasDirectAmazonCandidateInput) {
    return AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY;
  }
  return resolveAmazonRuntimeKey(requestedAmazonRuntimeKey ?? input.config.runtime.runtimeKey);
};

export const resolveAmazonSelectorProfile = (
  requestInput: Record<string, unknown>
): string => {
  const selectorProfile = requestInput['selectorProfile'];
  return typeof selectorProfile === 'string' && selectorProfile.trim().length > 0
    ? selectorProfile.trim()
    : 'amazon';
};

const readStringArray = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : null;

type AmazonRuntimeInputArgs = {
  amazonRuntimeKey: AmazonRuntimeKey;
  config: BatchScanQueueConfig;
  effectiveRequestInput: Record<string, unknown>;
  imageCandidates: ProductScanImageCandidates;
  imageSearchPageUrl: string | null;
  imageSearchProvider: string;
  manualVerificationTimeoutMs: number;
  product: QueuedProductRecord;
  productName: string;
  probeEvaluatorEnabled: boolean;
  requestedStepSequenceInput: Record<string, unknown>;
  selectorProfile: string;
  shouldAutoShowCaptchaBrowser: boolean;
  triageEvaluatorEnabled: boolean;
};

const buildAmazonRuntimeInput = (args: AmazonRuntimeInputArgs): Record<string, unknown> => {
  const isCandidateSearchRuntime =
    args.amazonRuntimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY;
  const isCandidateExtractionRuntime =
    args.amazonRuntimeKey === AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY;
  const shouldSkipCandidateOnlyEvaluation = isCandidateSearchRuntime || isCandidateExtractionRuntime;

  const input = args.config.runtime.buildRequestInput({
    productId: args.product.id,
    productName: args.productName,
    existingAsin: args.product.asin,
    imageCandidates: args.imageCandidates,
    runtimeKey: args.amazonRuntimeKey,
    imageSearchProvider: args.imageSearchProvider,
    imageSearchPageUrl: args.imageSearchPageUrl,
    selectorProfile: args.selectorProfile,
    allowManualVerification: args.shouldAutoShowCaptchaBrowser,
    manualVerificationTimeoutMs: args.manualVerificationTimeoutMs,
    triageOnlyOnAmazonCandidates: shouldSkipCandidateOnlyEvaluation
      ? false
      : args.triageEvaluatorEnabled,
    collectAmazonCandidatePreviews: isCandidateSearchRuntime,
    probeOnlyOnAmazonMatch: shouldSkipCandidateOnlyEvaluation
      ? false
      : args.probeEvaluatorEnabled,
    skipAmazonProbe: args.effectiveRequestInput['skipAmazonProbe'] === true,
    directAmazonCandidateUrl: readOptionalString(
      args.effectiveRequestInput['directAmazonCandidateUrl'],
      4_000
    ),
    directAmazonCandidateUrls: readStringArray(
      args.effectiveRequestInput['directAmazonCandidateUrls']
    ),
    directMatchedImageId: readOptionalString(
      args.effectiveRequestInput['directMatchedImageId'],
      4_000
    ),
    directAmazonCandidateRank:
      typeof args.effectiveRequestInput['directAmazonCandidateRank'] === 'number'
        ? args.effectiveRequestInput['directAmazonCandidateRank']
        : null,
    ...args.requestedStepSequenceInput,
  });
  return toRecord(input) ?? {};
};

type StartAmazonQueuedProductScanRunArgs = {
  amazonRuntimeKey: AmazonRuntimeKey;
  config: BatchScanQueueConfig;
  effectiveRequestInput: Record<string, unknown>;
  imageCandidates: ProductScanImageCandidates;
  manualVerificationTimeoutMs: number;
  ownerUserId?: string | null;
  product: QueuedProductRecord;
  productName: string;
  requestedStepSequenceInput: Record<string, unknown>;
  scannerSettings: ProductScannerSettings;
  selectorProfile: string;
};

type AmazonStartContext = {
  amazonRuntimeAction: Awaited<ReturnType<typeof resolveAmazonRuntimeActionDefinition>>;
  imageSearchPageUrl: string | null;
  imageSearchProvider: string;
  probeEvaluatorEnabled: boolean;
  scannerRuntimeOptions: ReturnType<typeof buildAmazonScannerRequestRuntimeOptions>;
  shouldAutoShowCaptchaBrowser: boolean;
  triageEvaluatorEnabled: boolean;
};

const resolveAmazonStartContext = async (
  args: StartAmazonQueuedProductScanRunArgs
): Promise<AmazonStartContext> => {
  const amazonRuntimeAction = await resolveAmazonRuntimeActionDefinition(args.amazonRuntimeKey);
  const scannerEngineRequestOptions = buildProductScannerEngineRequestOptions(args.scannerSettings);
  const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
    scannerSettings: args.scannerSettings,
    scannerEngineRequestOptions,
    actionExecutionSettings: amazonRuntimeAction?.executionSettings ?? null,
    actionPersonaId: amazonRuntimeAction?.personaId ?? null,
    runtimeKey: args.amazonRuntimeKey,
  });

  return {
    amazonRuntimeAction,
    imageSearchPageUrl: resolveAmazonImageSearchPageUrl(
      args.effectiveRequestInput,
      args.scannerSettings
    ),
    imageSearchProvider: resolveAmazonImageSearchProvider(
      args.effectiveRequestInput,
      args.scannerSettings
    ),
    probeEvaluatorEnabled: (
      await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(args.scannerSettings)
    ).enabled,
    scannerRuntimeOptions,
    shouldAutoShowCaptchaBrowser: shouldAutoShowScannerCaptchaBrowser(args.scannerSettings),
    triageEvaluatorEnabled: (
      await resolveProductScannerAmazonCandidateEvaluatorConfig(args.scannerSettings)
    ).enabled,
  };
};

const resolveAmazonActionName = (
  args: StartAmazonQueuedProductScanRunArgs,
  context: AmazonStartContext
): string => context.amazonRuntimeAction?.name ?? resolveAmazonRuntimeActionName(args.amazonRuntimeKey);

const buildAmazonEngineRequest = (
  args: StartAmazonQueuedProductScanRunArgs,
  context: AmazonStartContext
): Parameters<typeof startPlaywrightEngineTask>[0]['request'] => ({
  runtimeKey: args.amazonRuntimeKey,
  actionId: context.amazonRuntimeAction?.id ?? null,
  actionName: resolveAmazonActionName(args, context),
  selectorProfile: args.selectorProfile,
  input: buildAmazonRuntimeInput({
    ...args,
    imageSearchPageUrl: context.imageSearchPageUrl,
    imageSearchProvider: context.imageSearchProvider,
    probeEvaluatorEnabled: context.probeEvaluatorEnabled,
    shouldAutoShowCaptchaBrowser: context.shouldAutoShowCaptchaBrowser,
    triageEvaluatorEnabled: context.triageEvaluatorEnabled,
  }),
  timeoutMs: resolveAmazonScanRuntimeTimeoutMs({
    allowManualVerification: context.shouldAutoShowCaptchaBrowser,
    manualVerificationTimeoutMs: args.manualVerificationTimeoutMs,
  }),
  browserEngine: 'chromium',
  ...context.scannerRuntimeOptions,
  capture: resolveAmazonScanDiagnosticCapture(args.effectiveRequestInput),
  preventNewPages: true,
});

export const startAmazonQueuedProductScanRun = async (
  args: StartAmazonQueuedProductScanRunArgs
): Promise<StartedQueuedScanRun> => {
  const context = await resolveAmazonStartContext(args);
  const run = await startPlaywrightEngineTask({
    request: buildAmazonEngineRequest(args, context),
    ownerUserId: args.ownerUserId ?? null,
    instance: createCustomPlaywrightInstance({
      family: 'scrape',
      label: 'Amazon product scan',
      tags: ['product', 'amazon', 'scan', 'batch'],
    }),
  });

  return {
    actionId: context.amazonRuntimeAction?.id ?? null,
    allowManualVerification: context.shouldAutoShowCaptchaBrowser,
    imageSearchPageUrl: context.imageSearchPageUrl,
    imageSearchProvider: context.imageSearchProvider,
    manualVerificationTimeoutMs: args.manualVerificationTimeoutMs,
    recordDiagnostics: args.effectiveRequestInput['recordDiagnostics'] === true,
    run,
    runtimeKey: args.amazonRuntimeKey,
    selectorProfile: args.selectorProfile,
  };
};
