import 'server-only';

import type { ProductScanStep, ProductScanStepGroup } from '@/shared/contracts/product-scans';
import {
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEP_IDS,
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS,
  type Supplier1688ProbeScanRuntimeStepId,
} from '@/shared/lib/browser-execution/supplier-1688-runtime-constants';
import type { BrowserExecutionStepStatus } from '@/shared/lib/browser-execution/step-registry';

type Supplier1688ProductStepBridgeEntry = {
  key: string;
  label: string;
  group: ProductScanStepGroup | null;
};

const SUPPLIER_1688_PRODUCT_STEP_BRIDGE: Record<
  Supplier1688ProbeScanRuntimeStepId,
  Supplier1688ProductStepBridgeEntry
> = {
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.browserPreparation]: {
    key: 'browser_preparation',
    label: 'Prepare browser runtime',
    group: 'input',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.browserOpen]: {
    key: 'browser_open',
    label: 'Open browser',
    group: 'input',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.inputValidate]: {
    key: '1688_validate_input',
    label: 'Validate 1688 supplier scan input',
    group: 'input',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.openSearch]: {
    key: '1688_open',
    label: 'Open 1688 image search',
    group: 'supplier',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.accessCheck]: {
    key: '1688_access_check',
    label: 'Check 1688 access barriers',
    group: 'supplier',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.uploadImage]: {
    key: '1688_upload',
    label: 'Upload image to 1688 search',
    group: 'supplier',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.submitSearch]: {
    key: '1688_submit_search',
    label: 'Submit 1688 image search',
    group: 'supplier',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.collectCandidates]: {
    key: '1688_collect_candidates',
    label: 'Collect 1688 supplier candidates',
    group: 'supplier',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.probeCandidate]: {
    key: '1688_probe_candidate',
    label: 'Probe 1688 supplier candidate',
    group: 'supplier',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.waitSupplier]: {
    key: '1688_wait_supplier',
    label: 'Wait for 1688 supplier content',
    group: 'supplier',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.extractDetails]: {
    key: '1688_extract_details',
    label: 'Extract 1688 supplier details',
    group: 'supplier',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.scoreCandidate]: {
    key: '1688_score_candidate',
    label: 'Score 1688 supplier candidate',
    group: 'supplier',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.evaluateMatch]: {
    key: '1688_evaluate_match',
    label: 'Evaluate 1688 supplier candidate match',
    group: 'supplier',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.finalize]: {
    key: '1688_finalize_result',
    label: 'Finalize 1688 probe result',
    group: 'product',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.browserClose]: {
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

const PRODUCT_SCAN_STEP_STATUS_BY_RUNTIME_STATUS: Readonly<Record<string, ProductScanStep['status']>> = {
  cancelled: 'skipped',
  completed: 'completed',
  error: 'failed',
  failed: 'failed',
  running: 'running',
  skipped: 'skipped',
  success: 'completed',
  succeeded: 'completed',
};

const BROWSER_EXECUTION_STATUS_BY_RUNTIME_STATUS: Readonly<
  Record<string, BrowserExecutionStepStatus>
> = {
  cancelled: 'skipped',
  completed: 'success',
  error: 'error',
  failed: 'error',
  running: 'running',
  skipped: 'skipped',
  success: 'success',
  succeeded: 'success',
};

const isBridgeStepId = (value: string): value is Supplier1688ProbeScanRuntimeStepId =>
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEP_IDS.includes(
    value as Supplier1688ProbeScanRuntimeStepId
  );

const normalizeProductScanStepStatus = (
  status: string | null | undefined,
  error: unknown
): ProductScanStep['status'] => {
  if (error !== null && error !== undefined) {
    return 'failed';
  }

  return status === null || status === undefined
    ? 'pending'
    : PRODUCT_SCAN_STEP_STATUS_BY_RUNTIME_STATUS[status] ?? 'pending';
};

const normalizeRuntimeStatus = (
  status: string | null | undefined
): BrowserExecutionStepStatus => {
  return status === null || status === undefined
    ? 'pending'
    : BROWSER_EXECUTION_STATUS_BY_RUNTIME_STATUS[status] ?? 'pending';
};

const toStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const SUPPLIER_1688_PRODUCT_STEP_ALIASES: Record<string, Supplier1688ProductStepBridgeEntry> = {
  validate: {
    key: 'validate',
    label: 'Validate scan input',
    group: 'input',
  },
  '1688_open': SUPPLIER_1688_PRODUCT_STEP_BRIDGE[SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.openSearch],
  '1688_upload': SUPPLIER_1688_PRODUCT_STEP_BRIDGE[SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.uploadImage],
  '1688_collect_candidates':
    SUPPLIER_1688_PRODUCT_STEP_BRIDGE[SUPPLIER_1688_PROBE_SCAN_RUNTIME_STEPS.collectCandidates],
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
    if (candidate === null) continue;
    if (isBridgeStepId(candidate)) return SUPPLIER_1688_PRODUCT_STEP_BRIDGE[candidate];
    const alias = SUPPLIER_1688_PRODUCT_STEP_ALIASES[candidate];
    if (alias !== undefined) return alias;
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

const resolveStepDetails = (
  step: RetainedActionRunStepLike
): ProductScanStep['details'] => {
  const selectorKey = toStringOrNull(step.selectorKey);
  const selector = toStringOrNull(step.selector);
  const parentStepId = toStringOrNull(step.parentStepId);
  const details: ProductScanStep['details'] = [];
  if (selectorKey !== null) details.push({ label: 'Selector key', value: selectorKey });
  if (selector !== null) details.push({ label: 'Selector', value: selector });
  if (typeof step.order === 'number') {
    details.push({ label: 'Action-run order', value: String(step.order) });
  }
  if (parentStepId !== null) details.push({ label: 'Parent step', value: parentStepId });
  return details;
};

const resolveStepWarning = (step: RetainedActionRunStepLike): string | null =>
  toStringOrNull(step.warning) ??
  (normalizeRuntimeStatus(step.status) === 'error' ? toStringOrNull(step.error) : null);

export const mapSupplier1688ActionRunStepToProductScanStep = (
  step: RetainedActionRunStepLike
): ProductScanStep | null => {
  const bridge = resolveBridgeEntry(step);
  if (bridge === null) {
    return null;
  }

  return {
    key: bridge.key,
    label: toStringOrNull(step.label) ?? bridge.label,
    group: bridge.group,
    attempt: null,
    candidateId: null,
    inputSource: null,
    status: normalizeProductScanStepStatus(step.status, step.error),
    message: toMessage(step),
    warning: resolveStepWarning(step),
    details: resolveStepDetails(step),
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
