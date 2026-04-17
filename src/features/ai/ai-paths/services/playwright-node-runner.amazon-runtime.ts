import type { ProductScanStep } from '@/shared/contracts/product-scans';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS,
  AMAZON_REVERSE_IMAGE_SCAN_SELECTOR_PROFILE,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';
import { resolveAmazonReverseImageScanRuntime } from '@/features/products/server/product-scan-amazon-runtime';

export {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
};

type ExecuteAmazonReverseImageScanRuntimeInput = {
  runtimeKey: string;
  input: Record<string, unknown>;
  executeScript: (script: string) => Promise<unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const createAmazonActionRunSteps = (payload: unknown): Array<Record<string, unknown>> => {
  if (!isRecord(payload) || !Array.isArray(payload['steps'])) {
    return [];
  }

  const mappedSteps: Array<Record<string, unknown>> = [];

  for (const entry of payload['steps']) {
    if (!isRecord(entry)) continue;
    const productStep = entry as Partial<ProductScanStep>;
    const productStepKey = readString(productStep.key);
    if (!productStepKey) continue;

    mappedSteps.push({
      key: productStepKey,
      refId: productStepKey,
      kind: 'runtime_step',
      order: mappedSteps.length + 3,
      label: readString(productStep.label) ?? productStepKey,
      status: readString(productStep.status) ?? 'pending',
      message: readString(productStep.message),
      warning: readString(productStep.warning),
      details: Array.isArray(productStep.details) ? productStep.details : [],
      url: readString(productStep.url),
      startedAt: readString(productStep.startedAt),
      completedAt: readString(productStep.completedAt),
      durationMs:
        typeof productStep.durationMs === 'number' && Number.isFinite(productStep.durationMs)
          ? productStep.durationMs
          : null,
      output: {
        productStepKey,
        candidateId: productStep.candidateId ?? null,
        candidateRank: productStep.candidateRank ?? null,
        inputSource: productStep.inputSource ?? null,
        retryOf: productStep.retryOf ?? null,
        resultCode: productStep.resultCode ?? null,
      },
    });
  }

  if (mappedSteps.length === 0) {
    return [];
  }

  const firstStep = mappedSteps[0] ?? null;
  const lastStep = mappedSteps[mappedSteps.length - 1] ?? null;
  const lifecycleStartedAt = readString(firstStep?.['startedAt']);
  const lifecycleCompletedAt = readString(lastStep?.['completedAt']) ?? readString(lastStep?.['startedAt']);

  return [
    {
      key: AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserPreparation,
      refId: AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserPreparation,
      kind: 'runtime_step',
      order: 1,
      label: 'Prepare browser runtime',
      status: 'completed',
      message: 'Browser runtime prepared for Amazon reverse image scan.',
      warning: null,
      details: [],
      url: null,
      startedAt: lifecycleStartedAt,
      completedAt: lifecycleStartedAt,
      durationMs: null,
      output: null,
    },
    {
      key: AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserOpen,
      refId: AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserOpen,
      kind: 'runtime_step',
      order: 2,
      label: 'Open browser',
      status: 'completed',
      message: 'Browser page opened for Amazon reverse image scan.',
      warning: null,
      details: [],
      url: readString(payload['currentUrl']) ?? readString(payload['url']),
      startedAt: lifecycleStartedAt,
      completedAt: lifecycleStartedAt,
      durationMs: null,
      output: null,
    },
    ...mappedSteps,
    {
      key: AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserClose,
      refId: AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_STEPS.browserClose,
      kind: 'runtime_step',
      order: mappedSteps.length + 3,
      label: 'Close browser',
      status: 'completed',
      message: 'Browser runtime released after Amazon reverse image scan.',
      warning: null,
      details: [],
      url: readString(payload['currentUrl']) ?? readString(payload['url']),
      startedAt: lifecycleCompletedAt,
      completedAt: lifecycleCompletedAt,
      durationMs: null,
      output: {
        status: readString(payload['status']),
        stage: readString(payload['stage']),
      },
    },
  ];
};

const withAmazonActionRunSteps = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;
  const actionRunSteps = createAmazonActionRunSteps(payload);
  if (actionRunSteps.length === 0) return payload;
  return {
    ...payload,
    actionRunSteps,
  };
};

export async function executeAmazonReverseImageScanRuntime(
  input: ExecuteAmazonReverseImageScanRuntimeInput
): Promise<unknown> {
  const selectorProfile =
    readString(input.input['selectorProfile']) ?? AMAZON_REVERSE_IMAGE_SCAN_SELECTOR_PROFILE;
  const script = await resolveAmazonReverseImageScanRuntime({ selectorProfile });
  const resultPayload = await input.executeScript(script);
  return withAmazonActionRunSteps(resultPayload);
}
