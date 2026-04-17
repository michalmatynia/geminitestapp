import 'server-only';

import type { ProductScanStep, ProductScanStepGroup } from '@/shared/contracts/product-scans';
import type { BrowserExecutionStepStatus } from '@/shared/lib/browser-execution/step-registry';

const SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEP_IDS = [
  'browser_preparation',
  'browser_open',
  'supplier_1688_input_validate',
  'supplier_1688_open_search',
  'supplier_1688_access_check',
  'supplier_1688_upload_image',
  'supplier_1688_submit_search',
  'supplier_1688_collect_candidates',
  'supplier_1688_probe_candidate',
  'supplier_1688_wait_supplier',
  'supplier_1688_extract_details',
  'supplier_1688_score_candidate',
  'supplier_1688_evaluate_match',
  'supplier_1688_finalize',
  'browser_close',
] as const;

type Supplier1688ProbeScanRuntimeStepId =
  (typeof SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEP_IDS)[number];

type Supplier1688ProductStepBridgeEntry = {
  key: string;
  label: string;
  group: ProductScanStepGroup | null;
};

const SUPPLIER_1688_PRODUCT_STEP_BRIDGE: Record<
  Supplier1688ProbeScanRuntimeStepId,
  Supplier1688ProductStepBridgeEntry
> = {
  browser_preparation: {
    key: 'browser_preparation',
    label: 'Prepare browser runtime',
    group: 'input',
  },
  browser_open: {
    key: 'browser_open',
    label: 'Open browser',
    group: 'input',
  },
  supplier_1688_input_validate: {
    key: '1688_validate_input',
    label: 'Validate 1688 supplier scan input',
    group: 'input',
  },
  supplier_1688_open_search: {
    key: '1688_open',
    label: 'Open 1688 image search',
    group: 'supplier',
  },
  supplier_1688_access_check: {
    key: '1688_access_check',
    label: 'Check 1688 access barriers',
    group: 'supplier',
  },
  supplier_1688_upload_image: {
    key: '1688_upload',
    label: 'Upload image to 1688 search',
    group: 'supplier',
  },
  supplier_1688_submit_search: {
    key: '1688_submit_search',
    label: 'Submit 1688 image search',
    group: 'supplier',
  },
  supplier_1688_collect_candidates: {
    key: '1688_collect_candidates',
    label: 'Collect 1688 supplier candidates',
    group: 'supplier',
  },
  supplier_1688_probe_candidate: {
    key: '1688_probe_candidate',
    label: 'Probe 1688 supplier candidate',
    group: 'supplier',
  },
  supplier_1688_wait_supplier: {
    key: '1688_wait_supplier',
    label: 'Wait for 1688 supplier content',
    group: 'supplier',
  },
  supplier_1688_extract_details: {
    key: '1688_extract_details',
    label: 'Extract 1688 supplier details',
    group: 'supplier',
  },
  supplier_1688_score_candidate: {
    key: '1688_score_candidate',
    label: 'Score 1688 supplier candidate',
    group: 'supplier',
  },
  supplier_1688_evaluate_match: {
    key: '1688_evaluate_match',
    label: 'Evaluate 1688 supplier candidate match',
    group: 'supplier',
  },
  supplier_1688_finalize: {
    key: '1688_finalize_result',
    label: 'Finalize 1688 probe result',
    group: 'product',
  },
  browser_close: {
    key: 'browser_close',
    label: 'Close browser',
    group: 'product',
  },
};

type RetainedActionRunStepLike = {
  completedAt?: string | null;
  durationMs?: number | null;
  error?: unknown;
  input?: unknown;
  key?: string | null;
  label?: string | null;
  message?: string | null;
  name?: string | null;
  order?: number | null;
  output?: unknown;
  parentStepId?: string | null;
  refId?: string | null;
  selector?: string | null;
  selectorKey?: string | null;
  startedAt?: string | null;
  status?: string | null;
  stepId?: string | null;
  type?: string | null;
  url?: string | null;
  warning?: string | null;
};

const isBridgeStepId = (value: string): value is Supplier1688ProbeScanRuntimeStepId =>
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEP_IDS.includes(
    value as Supplier1688ProbeScanRuntimeStepId
  );

const normalizeProductScanStepStatus = (
  status: string | null | undefined,
  error: unknown
): ProductScanStep['status'] => {
  if (status === 'succeeded' || status === 'success' || status === 'completed') {
    return 'completed';
  }
  if (status === 'failed' || status === 'error' || error != null) {
    return 'failed';
  }
  if (status === 'skipped' || status === 'cancelled') {
    return 'skipped';
  }
  if (status === 'running') {
    return 'running';
  }
  return 'pending';
};

const normalizeRuntimeStatus = (
  status: string | null | undefined
): BrowserExecutionStepStatus => {
  if (status === 'succeeded' || status === 'success' || status === 'completed') return 'success';
  if (status === 'failed' || status === 'error') return 'error';
  if (status === 'skipped' || status === 'cancelled') return 'skipped';
  if (status === 'running') return 'running';
  return 'pending';
};

const toStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const SUPPLIER_1688_PRODUCT_STEP_ALIASES: Record<string, Supplier1688ProductStepBridgeEntry> = {
  validate: {
    key: 'validate',
    label: 'Validate scan input',
    group: 'input',
  },
  '1688_open': SUPPLIER_1688_PRODUCT_STEP_BRIDGE.supplier_1688_open_search,
  '1688_upload': SUPPLIER_1688_PRODUCT_STEP_BRIDGE.supplier_1688_upload_image,
  '1688_collect_candidates': SUPPLIER_1688_PRODUCT_STEP_BRIDGE.supplier_1688_collect_candidates,
  supplier_open: {
    key: 'supplier_open',
    label: 'Open supplier product page',
    group: 'supplier',
  },
  supplier_overlays: {
    key: 'supplier_overlays',
    label: 'Resolve supplier barriers',
    group: 'supplier',
  },
  supplier_content_ready: {
    key: 'supplier_content_ready',
    label: 'Wait for supplier product content',
    group: 'supplier',
  },
  supplier_probe: {
    key: 'supplier_probe',
    label: 'Probe supplier product page',
    group: 'supplier',
  },
  supplier_evaluate: {
    key: 'supplier_evaluate',
    label: 'Evaluate supplier candidate',
    group: 'supplier',
  },
  supplier_extract: {
    key: 'supplier_extract',
    label: 'Extract supplier details',
    group: 'supplier',
  },
  supplier_ai_evaluate: {
    key: 'supplier_ai_evaluate',
    label: 'Evaluate supplier candidate match',
    group: 'supplier',
  },
};

const resolveBridgeEntry = (
  step: RetainedActionRunStepLike
): Supplier1688ProductStepBridgeEntry | null => {
  const candidates = [
    toStringOrNull(step.stepId),
    toStringOrNull(step.refId),
    toStringOrNull(step.key),
    toStringOrNull(step.type),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (isBridgeStepId(candidate)) return SUPPLIER_1688_PRODUCT_STEP_BRIDGE[candidate];
    const alias = SUPPLIER_1688_PRODUCT_STEP_ALIASES[candidate];
    if (alias) return alias;
  }
  return null;
};

const toMessage = (step: RetainedActionRunStepLike): string | null =>
  toStringOrNull(step.message) ??
  toStringOrNull(step.output) ??
  toStringOrNull(step.error) ??
  toStringOrNull(step.input) ??
  toStringOrNull(step.label) ??
  toStringOrNull(step.name);

export const mapSupplier1688ActionRunStepToProductScanStep = (
  step: RetainedActionRunStepLike
): ProductScanStep | null => {
  const bridge = resolveBridgeEntry(step);
  if (bridge === null) {
    return null;
  }

  const selectorKey = toStringOrNull(step.selectorKey);
  const selector = toStringOrNull(step.selector);
  const details = [
    selectorKey ? { label: 'Selector key', value: selectorKey } : null,
    selector ? { label: 'Selector', value: selector } : null,
    typeof step.order === 'number' ? { label: 'Action-run order', value: String(step.order) } : null,
    toStringOrNull(step.parentStepId)
      ? { label: 'Parent step', value: toStringOrNull(step.parentStepId) }
      : null,
  ].filter((entry): entry is ProductScanStep['details'][number] => entry !== null);

  return {
    key: bridge.key,
    label: toStringOrNull(step.label) ?? bridge.label,
    group: bridge.group,
    attempt: null,
    candidateId: null,
    inputSource: null,
    status: normalizeProductScanStepStatus(step.status, step.error),
    message: toMessage(step),
    warning:
      toStringOrNull(step.warning) ??
      (normalizeRuntimeStatus(step.status) === 'error' ? toStringOrNull(step.error) : null),
    details,
    url: toStringOrNull(step.url),
    startedAt: step.startedAt ?? null,
    completedAt: step.completedAt ?? null,
    durationMs: step.durationMs ?? null,
  };
};

export const mapSupplier1688ActionRunStepsToProductScanSteps = (
  steps: readonly RetainedActionRunStepLike[]
): ProductScanStep[] => {
  return steps
    .map((step) => mapSupplier1688ActionRunStepToProductScanStep(step))
    .filter((step): step is ProductScanStep => step !== null);
};
