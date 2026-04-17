import type { Page } from 'playwright';

import type { ProductScanStep } from '@/shared/contracts/product-scans';
import {
  Supplier1688ScanSequencer,
  type Supplier1688ScanInput,
} from '@/shared/lib/browser-execution/sequencers/Supplier1688ScanSequencer';
import { SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY } from '@/shared/lib/browser-execution/supplier-1688-runtime-constants';
import type {
  ProductScanArtifacts,
  ProductScanHelpers,
} from '@/shared/lib/browser-execution/sequencers/ProductScanSequencer';

export { SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY };

type ExecuteSupplier1688ProbeScanRuntimeInput = {
  page: Page;
  input: Record<string, unknown>;
  emit: (port: string, value: unknown) => void;
  log: (...args: unknown[]) => void;
  artifacts: ProductScanArtifacts;
  helpers: ProductScanHelpers;
};

type Supplier1688ActionStepExpansion = {
  label?: string;
  stepId: string;
};

const SUPPLIER_1688_ACTION_STEPS_BY_PRODUCT_STEP_KEY: Record<
  string,
  readonly Supplier1688ActionStepExpansion[]
> = {
  validate: [{ stepId: 'supplier_1688_input_validate' }],
  '1688_open': [{ stepId: 'supplier_1688_open_search' }],
  '1688_upload': [
    { stepId: 'supplier_1688_upload_image' },
    { stepId: 'supplier_1688_submit_search', label: 'Submit 1688 image search' },
  ],
  '1688_collect_candidates': [{ stepId: 'supplier_1688_collect_candidates' }],
  supplier_open: [{ stepId: 'supplier_1688_probe_candidate' }],
  supplier_overlays: [{ stepId: 'supplier_1688_access_check' }],
  supplier_content_ready: [{ stepId: 'supplier_1688_wait_supplier' }],
  supplier_probe: [{ stepId: 'supplier_1688_score_candidate' }],
  supplier_evaluate: [{ stepId: 'supplier_1688_evaluate_match' }],
  supplier_extract: [{ stepId: 'supplier_1688_extract_details' }],
  supplier_ai_evaluate: [{ stepId: 'supplier_1688_evaluate_match' }],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const createSupplier1688ActionRunSteps = (payload: unknown): Array<Record<string, unknown>> => {
  if (!isRecord(payload) || !Array.isArray(payload['steps'])) {
    return [];
  }

  const mappedSteps: Array<Record<string, unknown>> = [];

  for (const entry of payload['steps']) {
    if (!isRecord(entry)) continue;
    const productStep = entry as Partial<ProductScanStep>;
    const productStepKey = readString(productStep.key);
    const expansions = productStepKey
      ? SUPPLIER_1688_ACTION_STEPS_BY_PRODUCT_STEP_KEY[productStepKey]
      : null;
    if (!expansions) continue;

    for (const expansion of expansions) {
      mappedSteps.push({
        key: expansion.stepId,
        refId: expansion.stepId,
        kind: 'runtime_step',
        order: mappedSteps.length + 3,
        label: expansion.label ?? readString(productStep.label) ?? expansion.stepId,
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
          resultCode: productStep.resultCode ?? null,
        },
      });
    }
  }

  if (mappedSteps.length === 0) {
    return [];
  }

  const rawStatus = readString(payload['status']);
  const finalizeStatus =
    rawStatus === 'failed' || rawStatus === 'captcha_required' ? 'failed' : 'completed';
  const firstStep = mappedSteps[0] ?? null;
  const lastStep = mappedSteps[mappedSteps.length - 1] ?? null;
  const lifecycleStartedAt = readString(firstStep?.['startedAt']);
  const lifecycleCompletedAt = readString(lastStep?.['completedAt']);

  return [
    {
      key: 'browser_preparation',
      refId: 'browser_preparation',
      kind: 'runtime_step',
      order: 1,
      label: 'Prepare browser runtime',
      status: 'completed',
      message: 'Browser runtime prepared for 1688 supplier probe scan.',
      warning: null,
      details: [],
      url: null,
      startedAt: lifecycleStartedAt,
      completedAt: lifecycleStartedAt,
      durationMs: null,
      output: null,
    },
    {
      key: 'browser_open',
      refId: 'browser_open',
      kind: 'runtime_step',
      order: 2,
      label: 'Open browser',
      status: 'completed',
      message: 'Browser page opened for 1688 supplier probe scan.',
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
      key: 'supplier_1688_finalize',
      refId: 'supplier_1688_finalize',
      kind: 'runtime_step',
      order: mappedSteps.length + 3,
      label: 'Finalize 1688 probe result',
      status: finalizeStatus,
      message: readString(payload['message']),
      warning: finalizeStatus === 'failed' ? readString(payload['message']) : null,
      details: [],
      url: readString(payload['url']) ?? readString(payload['currentUrl']),
      startedAt: readString(lastStep?.['completedAt']) ?? readString(lastStep?.['startedAt']),
      completedAt: readString(lastStep?.['completedAt']) ?? null,
      durationMs: null,
      output: {
        status: rawStatus,
        matchedImageId: payload['matchedImageId'] ?? null,
      },
    },
    {
      key: 'browser_close',
      refId: 'browser_close',
      kind: 'runtime_step',
      order: mappedSteps.length + 4,
      label: 'Close browser',
      status: 'completed',
      message: 'Browser runtime released after 1688 supplier probe scan.',
      warning: null,
      details: [],
      url: readString(payload['currentUrl']) ?? readString(payload['url']),
      startedAt: lifecycleCompletedAt,
      completedAt: lifecycleCompletedAt,
      durationMs: null,
      output: null,
    },
  ];
};

const withSupplier1688ActionRunSteps = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;
  const actionRunSteps = createSupplier1688ActionRunSteps(payload);
  if (actionRunSteps.length === 0) return payload;
  return {
    ...payload,
    actionRunSteps,
  };
};

export async function executeSupplier1688ProbeScanRuntime(
  input: ExecuteSupplier1688ProbeScanRuntimeInput
): Promise<unknown> {
  let resultPayload: unknown = null;

  const sequencer = new Supplier1688ScanSequencer(
    {
      page: input.page,
      emit: (type, payload) => {
        if (type === 'result') {
          resultPayload = payload;
        }
        input.emit(type, payload);
      },
      log: (message, context) => input.log(message, context),
      artifacts: input.artifacts,
      helpers: input.helpers,
    },
    input.input as Supplier1688ScanInput
  );

  await sequencer.scan();

  return resultPayload
    ? withSupplier1688ActionRunSteps(resultPayload)
    : {
      status: 'completed',
      message: '1688 supplier probe scan completed without an explicit result payload.',
    };
}
