import type { ProductScanStep } from '@/shared/contracts/product-scans';
import { AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS } from '@/shared/lib/browser-execution/amazon-runtime-constants';
import { FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS } from '@/shared/lib/browser-execution/filemaker-organization-presence-runtime-constants';
import { JOB_BOARD_SCRAPE_RUNTIME_STEPS } from '@/shared/lib/browser-execution/job-board-runtime-constants';
import { SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS } from '@/shared/lib/browser-execution/supplier-1688-runtime-constants';

import {
  buildScanStepActionRunStep,
  readString,
  withPlaywrightScanActionRunSteps,
  type PlaywrightScanActionRunStep,
  type PlaywrightScanLifecycleStep,
} from './action-run-steps.core';

type ProductScanActionStepExpansion = {
  label?: string;
  stepId: string;
};

const createLifecycleStep = (input: {
  key: string;
  label: string;
  message: string;
  completedWithStartedFallback?: boolean;
  output?: PlaywrightScanLifecycleStep['output'];
}): PlaywrightScanLifecycleStep => ({
  key: input.key,
  label: input.label,
  message: input.message,
  output: input.output,
  startedTiming: input.completedWithStartedFallback === true
    ? 'completedWithStartedFallback'
    : 'completed',
  completedTiming: input.completedWithStartedFallback === true
    ? 'completedWithStartedFallback'
    : 'completed',
});

const createStartLifecycleStep = (input: {
  key: string;
  label: string;
  message: string;
  url?: PlaywrightScanLifecycleStep['url'];
}): PlaywrightScanLifecycleStep => ({
  key: input.key,
  label: input.label,
  message: input.message,
  url: input.url,
  startedTiming: 'start',
  completedTiming: 'start',
});

const readCurrentUrl = (payload: Record<string, unknown>): string | null =>
  readString(payload['currentUrl']) ?? readString(payload['url']);

const mapProductScanStep = (
  step: Record<string, unknown>,
  expansion: ProductScanActionStepExpansion
): PlaywrightScanActionRunStep => {
  const productStep = step as Partial<ProductScanStep>;
  const productStepKey = readString(productStep.key);
  return buildScanStepActionRunStep({
    key: expansion.stepId,
    label: expansion.label ?? readString(productStep.label) ?? expansion.stepId,
    status: productStep.status ?? null,
    message: productStep.message,
    warning: productStep.warning,
    details: productStep.details,
    url: productStep.url,
    startedAt: productStep.startedAt,
    completedAt: productStep.completedAt,
    durationMs: productStep.durationMs,
    output: buildProductScanStepOutput(productStep, productStepKey),
  });
};

const buildProductScanStepOutput = (
  productStep: Partial<ProductScanStep>,
  productStepKey: string | null
): Record<string, unknown> => ({
  productStepKey,
  candidateId: productStep.candidateId ?? null,
  candidateRank: productStep.candidateRank ?? null,
  inputSource: productStep.inputSource ?? null,
  retryOf: productStep.retryOf ?? null,
  resultCode: productStep.resultCode ?? null,
});

const mapOneToOneProductScanStep = (
  step: Record<string, unknown>
): PlaywrightScanActionRunStep[] => {
  const productStepKey = readString(step['key']);
  if (productStepKey === null) return [];
  return [mapProductScanStep(step, { stepId: productStepKey })];
};

const mapExpandedProductScanStep = (
  expansions: Record<string, readonly ProductScanActionStepExpansion[]>
) => (step: Record<string, unknown>): PlaywrightScanActionRunStep[] => {
  const productStepKey = readString(step['key']);
  if (productStepKey === null) return [];
  return (expansions[productStepKey] ?? []).map((expansion) =>
    mapProductScanStep(step, expansion)
  );
};

const mapGenericSequencerStep = (
  step: Record<string, unknown>
): PlaywrightScanActionRunStep[] => {
  const key = readString(step['key']);
  const label = readString(step['label']);
  if (key === null || label === null) return [];
  return [
    buildScanStepActionRunStep({
      key,
      label,
      status: readString(step['status']),
      message: step['message'],
      warning: step['warning'],
      details: step['details'],
      url: step['url'],
      startedAt: step['startedAt'],
      completedAt: step['completedAt'],
      durationMs: step['durationMs'],
      output: null,
    }),
  ];
};

const SUPPLIER_1688_ACTION_STEPS_BY_PRODUCT_STEP_KEY: Record<
  string,
  readonly ProductScanActionStepExpansion[]
> = {
  validate: [{ stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.inputValidate }],
  '1688_open': [{ stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.openSearch }],
  '1688_upload': [
    { stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.uploadImage },
    {
      stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.submitSearch,
      label: 'Submit 1688 image search',
    },
  ],
  '1688_collect_candidates': [
    { stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.collectCandidates },
  ],
  supplier_open: [{ stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.probeCandidate }],
  supplier_overlays: [{ stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.accessCheck }],
  supplier_content_ready: [{ stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.waitSupplier }],
  supplier_probe: [{ stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.scoreCandidate }],
  supplier_evaluate: [{ stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.evaluateMatch }],
  supplier_extract: [{ stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.extractDetails }],
  supplier_ai_evaluate: [{ stepId: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.evaluateMatch }],
};

export const withAmazonScanActionRunSteps = (payload: unknown): unknown =>
  withPlaywrightScanActionRunSteps(payload, {
    mapStep: mapOneToOneProductScanStep,
    preparation: createStartLifecycleStep({
      key: AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserPreparation,
      label: 'Prepare browser runtime',
      message: 'Browser runtime prepared for Amazon reverse image scan.',
    }),
    open: createStartLifecycleStep({
      key: AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserOpen,
      label: 'Open browser',
      message: 'Browser page opened for Amazon reverse image scan.',
      url: readCurrentUrl,
    }),
    close: createLifecycleStep({
      key: AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserClose,
      label: 'Close browser',
      message: 'Browser runtime released after Amazon reverse image scan.',
      completedWithStartedFallback: true,
      output: (scanPayload: Record<string, unknown>) => ({
        status: readString(scanPayload['status']),
        stage: readString(scanPayload['stage']),
      }),
    }),
  });

export const withSupplier1688ScanActionRunSteps = (payload: unknown): unknown =>
  withPlaywrightScanActionRunSteps(payload, {
    mapStep: mapExpandedProductScanStep(SUPPLIER_1688_ACTION_STEPS_BY_PRODUCT_STEP_KEY),
    preparation: createStartLifecycleStep({
      key: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.browserPreparation,
      label: 'Prepare browser runtime',
      message: 'Browser runtime prepared for 1688 supplier probe scan.',
    }),
    open: createStartLifecycleStep({
      key: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.browserOpen,
      label: 'Open browser',
      message: 'Browser page opened for 1688 supplier probe scan.',
      url: readCurrentUrl,
    }),
    finalize: {
      key: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.finalize,
      label: 'Finalize 1688 probe result',
      status: (scanPayload: Record<string, unknown>) =>
        readString(scanPayload['status']) === 'failed' ||
        readString(scanPayload['status']) === 'captcha_required'
          ? 'failed'
          : 'completed',
      message: (scanPayload: Record<string, unknown>) => readString(scanPayload['message']),
      warning: (scanPayload: Record<string, unknown>) =>
        readString(scanPayload['status']) === 'failed' ? readString(scanPayload['message']) : null,
      url: readCurrentUrl,
      output: (scanPayload: Record<string, unknown>) => ({
        status: readString(scanPayload['status']),
        matchedImageId: scanPayload['matchedImageId'] ?? null,
      }),
      startedTiming: 'completedWithStartedFallback',
      completedTiming: 'completed',
    },
    close: createLifecycleStep({
      key: SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.browserClose,
      label: 'Close browser',
      message: 'Browser runtime released after 1688 supplier probe scan.',
      output: null,
    }),
  });

export const withJobBoardScanActionRunSteps = (payload: unknown): unknown =>
  withPlaywrightScanActionRunSteps(payload, {
    mapStep: mapGenericSequencerStep,
    includeLifecycleWithoutMappedSteps: true,
    preparation: createStartLifecycleStep({
      key: JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserPreparation,
      label: 'Prepare browser runtime',
      message: 'Browser runtime prepared for job board scraping.',
    }),
    open: createStartLifecycleStep({
      key: JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserOpen,
      label: 'Open browser',
      message: 'Browser page opened for job board scraping.',
      url: (scanPayload: Record<string, unknown>) => readString(scanPayload['currentUrl']),
    }),
    close: createLifecycleStep({
      key: JOB_BOARD_SCRAPE_RUNTIME_STEPS.browserClose,
      label: 'Close browser',
      message: 'Browser runtime released after job board scraping.',
      output: (scanPayload: Record<string, unknown>) => ({
        status: readString(scanPayload['status']),
        provider: readString(scanPayload['provider']),
      }),
    }),
  });

export const withFilemakerOrganizationPresenceScanActionRunSteps = (
  payload: unknown
): unknown =>
  withPlaywrightScanActionRunSteps(payload, {
    mapStep: mapGenericSequencerStep,
    includeLifecycleWithoutMappedSteps: true,
    preparation: createStartLifecycleStep({
      key: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserPreparation,
      label: 'Prepare browser runtime',
      message: 'Browser runtime prepared for FileMaker organisation discovery.',
    }),
    open: createStartLifecycleStep({
      key: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserOpen,
      label: 'Open browser',
      message: 'Browser page opened for FileMaker organisation discovery.',
      url: (scanPayload: Record<string, unknown>) => readString(scanPayload['currentUrl']),
    }),
    close: createLifecycleStep({
      key: FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserClose,
      label: 'Close browser',
      message: 'Browser runtime released after FileMaker organisation discovery.',
      output: (scanPayload: Record<string, unknown>) => ({
        status: readString(scanPayload['status']),
      }),
    }),
  });
