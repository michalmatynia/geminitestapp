import type {
  ProductScanStep,
  ProductScanStepGroup,
} from '@/shared/contracts/product-scans';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
} from './amazon-runtime-constants';

type ProductScanStepDefinition = {
  key: string;
  label: string;
  group: ProductScanStepGroup;
};

export const PRODUCT_SCAN_STEP_REGISTRY = {
  validate: { key: 'validate', label: 'Validate scan input', group: 'input' },
  prepare_scan: { key: 'prepare_scan', label: 'Prepare scan input', group: 'input' },
  queue_scan: { key: 'queue_scan', label: 'Queue follow-up scan', group: 'input' },
  product_asin_update: {
    key: 'product_asin_update',
    label: 'Update product ASIN',
    group: 'product',
  },

  google_lens_open: {
    key: 'google_lens_open',
    label: 'Open Google reverse image search',
    group: 'google_lens',
  },
  google_upload: {
    key: 'google_upload',
    label: 'Upload product image to Google',
    group: 'google_lens',
  },
  google_captcha: {
    key: 'google_captcha',
    label: 'Resolve Google captcha',
    group: 'google_lens',
  },
  google_candidates: {
    key: 'google_candidates',
    label: 'Collect Amazon candidates from Google',
    group: 'google_lens',
  },

  amazon_open: { key: 'amazon_open', label: 'Open Amazon candidate', group: 'amazon' },
  amazon_overlays: {
    key: 'amazon_overlays',
    label: 'Dismiss Amazon overlays',
    group: 'amazon',
  },
  amazon_content_ready: {
    key: 'amazon_content_ready',
    label: 'Wait for Amazon product content',
    group: 'amazon',
  },
  amazon_probe: {
    key: 'amazon_probe',
    label: 'Probe Amazon product page',
    group: 'amazon',
  },
  amazon_extract: {
    key: 'amazon_extract',
    label: 'Extract Amazon details',
    group: 'amazon',
  },
  amazon_ai_triage: {
    key: 'amazon_ai_triage',
    label: 'Triage Amazon candidates',
    group: 'amazon',
  },
  amazon_ai_evaluate: {
    key: 'amazon_ai_evaluate',
    label: 'Evaluate Amazon candidate match',
    group: 'amazon',
  },

  '1688_open': {
    key: '1688_open',
    label: 'Open 1688 image search',
    group: 'supplier',
  },
  '1688_upload': {
    key: '1688_upload',
    label: 'Upload image to 1688 search',
    group: 'supplier',
  },
  '1688_collect_candidates': {
    key: '1688_collect_candidates',
    label: 'Collect 1688 supplier candidates',
    group: 'supplier',
  },
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
  supplier_extract: {
    key: 'supplier_extract',
    label: 'Extract supplier details',
    group: 'supplier',
  },
  supplier_evaluate: {
    key: 'supplier_evaluate',
    label: 'Evaluate supplier candidate',
    group: 'supplier',
  },
  supplier_ai_evaluate: {
    key: 'supplier_ai_evaluate',
    label: 'Evaluate supplier candidate match',
    group: 'supplier',
  },
} as const satisfies Record<string, ProductScanStepDefinition>;

export type ProductScanStepKey = keyof typeof PRODUCT_SCAN_STEP_REGISTRY;

export type ProductScanSequenceEntry =
  | ProductScanStepKey
  | {
      key: string;
      label?: string | null;
      group?: ProductScanStepGroup | null;
    };

export const PRODUCT_SCAN_STEP_GROUP_LABELS: Record<ProductScanStepGroup, string> = {
  input: 'Input',
  google_lens: 'Google Lens',
  amazon: 'Amazon',
  supplier: 'Supplier',
  product: 'Product Update',
};

export const PRODUCT_SCAN_STEP_GROUP_ORDER: Record<ProductScanStepGroup, number> = {
  input: 0,
  google_lens: 1,
  amazon: 2,
  supplier: 3,
  product: 4,
};

export const PRODUCT_SCAN_STEP_SEQUENCES = {
  [AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY]: [
    'validate',
    'google_lens_open',
    'google_upload',
    'google_captcha',
    'google_candidates',
    'amazon_open',
    'amazon_overlays',
    'amazon_content_ready',
    'amazon_probe',
  ],
  [AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY]: [
    'validate',
    'google_lens_open',
    'google_upload',
    'google_captcha',
    'google_candidates',
    'amazon_open',
    'amazon_overlays',
    'amazon_content_ready',
    'amazon_probe',
    'amazon_extract',
  ],
  [AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY]: [
    'validate',
    'amazon_open',
    'amazon_overlays',
    'amazon_content_ready',
    'amazon_probe',
    'amazon_extract',
    'amazon_ai_evaluate',
    'queue_scan',
    'product_asin_update',
  ],
  supplier_reverse_image_scan_browser: [
    'validate',
    '1688_open',
    '1688_upload',
    '1688_collect_candidates',
    'supplier_open',
    'supplier_overlays',
    'supplier_content_ready',
    'supplier_probe',
    'supplier_evaluate',
    'supplier_extract',
  ],
  supplier_direct_candidate_followup: [
    'validate',
    'supplier_open',
    'supplier_overlays',
    'supplier_content_ready',
    'supplier_probe',
    'supplier_evaluate',
    'supplier_extract',
  ],
  supplier_reverse_image_scan_full: [
    'validate',
    '1688_open',
    '1688_upload',
    '1688_collect_candidates',
    'supplier_open',
    'supplier_overlays',
    'supplier_content_ready',
    'supplier_probe',
    'supplier_evaluate',
    'supplier_extract',
    'supplier_ai_evaluate',
    'queue_scan',
    'product_asin_update',
  ],
} as const satisfies Record<string, readonly ProductScanSequenceEntry[]>;

export type ProductScanSequenceKey = keyof typeof PRODUCT_SCAN_STEP_SEQUENCES;

const normalizeText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const resolveProductScanStepDefinition = (
  key: string | null | undefined
): ProductScanStepDefinition | null => {
  const normalizedKey = normalizeText(key);
  if (!normalizedKey) {
    return null;
  }

  return PRODUCT_SCAN_STEP_REGISTRY[normalizedKey as ProductScanStepKey] ?? null;
};

export const resolveProductScanStepGroup = (
  key: string | null | undefined
): ProductScanStep['group'] => {
  const normalizedKey = normalizeText(key);
  if (!normalizedKey) {
    return null;
  }

  return resolveProductScanStepDefinition(normalizedKey)?.group ?? null;
};

const resolveSequenceEntries = (input?: {
  defaultSequenceKey?: string | null;
  sequenceKey?: string | null;
  customSequence?: readonly ProductScanSequenceEntry[] | null;
}): readonly ProductScanSequenceEntry[] => {
  if (input?.customSequence && input.customSequence.length > 0) {
    return input.customSequence;
  }

  const requestedSequenceKey = normalizeText(input?.sequenceKey);
  if (requestedSequenceKey) {
    const requestedSequence =
      PRODUCT_SCAN_STEP_SEQUENCES[requestedSequenceKey as ProductScanSequenceKey];
    if (requestedSequence) {
      return requestedSequence;
    }
  }

  const defaultSequenceKey = normalizeText(input?.defaultSequenceKey);
  if (!defaultSequenceKey) {
    return [];
  }

  return PRODUCT_SCAN_STEP_SEQUENCES[defaultSequenceKey as ProductScanSequenceKey] ?? [];
};

export const buildProductScanStepSequenceManifest = (input?: {
  defaultSequenceKey?: string | null;
  sequenceKey?: string | null;
  customSequence?: readonly ProductScanSequenceEntry[] | null;
}): ProductScanStepDefinition[] =>
  resolveSequenceEntries(input)
    .map((entry) => {
      const rawEntry = typeof entry === 'string' ? { key: entry } : entry;
      const key = normalizeText(rawEntry?.key);
      if (!key) {
        return null;
      }

      const definition = resolveProductScanStepDefinition(key);
      const group = rawEntry?.group ?? definition?.group ?? resolveProductScanStepGroup(key);
      if (!group) {
        return null;
      }

      return {
        key,
        label: normalizeText(rawEntry?.label) ?? definition?.label ?? key,
        group,
      };
    })
    .filter((entry): entry is ProductScanStepDefinition => Boolean(entry));

export const buildProductScanPendingSteps = (input?: {
  defaultSequenceKey?: string | null;
  sequenceKey?: string | null;
  customSequence?: readonly ProductScanSequenceEntry[] | null;
}): ProductScanStep[] =>
  buildProductScanStepSequenceManifest(input).map((step) => ({
    key: step.key,
    label: step.label,
    group: step.group,
    attempt: null,
    candidateId: null,
    candidateRank: null,
    inputSource: null,
    retryOf: null,
    resultCode: null,
    status: 'pending',
    message: null,
    warning: null,
    details: [],
    url: null,
    startedAt: null,
    completedAt: null,
    durationMs: null,
  }));

export type ProductScanStepExtension = {
  key: string;
  label: string;
  group: ProductScanStepGroup;
};

export const generateProductScanPlaywrightStepSequencerRuntime = (options?: {
  /** Merge additional step definitions into the embedded registry. */
  additionalSteps?: Record<string, ProductScanStepExtension>;
  /** Merge additional named sequences into the embedded registry. */
  additionalSequences?: Record<string, readonly ProductScanSequenceEntry[]>;
}): string => {
  const mergedRegistry = { ...PRODUCT_SCAN_STEP_REGISTRY, ...(options?.additionalSteps ?? {}) };
  const mergedSequences = {
    ...PRODUCT_SCAN_STEP_SEQUENCES,
    ...(options?.additionalSequences ?? {}),
  };
  const registryLiteral = JSON.stringify(mergedRegistry);
  const sequenceLiteral = JSON.stringify(mergedSequences);

  return [
    '// --- Product scan step sequencing ---',
    `const PRODUCT_SCAN_STEP_REGISTRY = ${registryLiteral};`,
    `const PRODUCT_SCAN_STEP_SEQUENCES = ${sequenceLiteral};`,
    'const productScanResolveText = (value) => {',
    '  if (typeof value !== \'string\') {',
    '    return null;',
    '  }',
    '  const trimmed = value.trim();',
    '  return trimmed.length > 0 ? trimmed : null;',
    '};',
    'const productScanResolveAttempt = (attempt) =>',
    '  typeof attempt === \'number\' && Number.isFinite(attempt) && attempt > 0',
    '    ? Math.trunc(attempt)',
    '    : 1;',
    'const productScanResolveStepGroup = (key) => {',
    '  const normalizedKey = productScanResolveText(key);',
    '  if (!normalizedKey) {',
    '    return null;',
    '  }',
    '  return PRODUCT_SCAN_STEP_REGISTRY[normalizedKey]?.group || null;',
    '};',
    'const productScanNormalizeStepDetails = (details) =>',
    '  (Array.isArray(details) ? details : [])',
    '    .map((entry) => {',
    '      const label = productScanResolveText(entry?.label);',
    '      const value = productScanResolveText(entry?.value);',
    '      if (!label) {',
    '        return null;',
    '      }',
    '      return { label, value };',
    '    })',
    '    .filter(Boolean)',
    '    .slice(0, 12);',
    'const mergeStepDetails = (...detailSets) =>',
    '  detailSets.flatMap((details) => productScanNormalizeStepDetails(details));',
    'const buildProductScanSequenceSteps = (input = {}) => {',
    '  const defaultSequenceKey = productScanResolveText(input?.defaultSequenceKey);',
    '  const sequenceKey = productScanResolveText(input?.sequenceKey);',
    '  const customSequence = Array.isArray(input?.customSequence) ? input.customSequence : null;',
    '  const entries =',
    '    customSequence && customSequence.length > 0',
    '      ? customSequence',
    '      : PRODUCT_SCAN_STEP_SEQUENCES[sequenceKey] ||',
    '        PRODUCT_SCAN_STEP_SEQUENCES[defaultSequenceKey] ||',
    '        [];',
    '  return entries',
    '    .map((entry) => {',
    '      const normalizedEntry = typeof entry === \'string\' ? { key: entry } : entry;',
    '      const key = productScanResolveText(normalizedEntry?.key);',
    '      if (!key) {',
    '        return null;',
    '      }',
    '      const registryEntry = PRODUCT_SCAN_STEP_REGISTRY[key] || null;',
    '      return {',
    '        key,',
    '        label: productScanResolveText(normalizedEntry?.label) || registryEntry?.label || key,',
    '        group:',
    '          productScanResolveText(normalizedEntry?.group) ||',
    '          registryEntry?.group ||',
    '          productScanResolveStepGroup(key),',
    '        attempt: null,',
    '        candidateId: null,',
    '        candidateRank: null,',
    '        inputSource: null,',
    '        retryOf: null,',
    '        resultCode: null,',
    '        status: \'pending\',',
    '        message: null,',
    '        warning: null,',
    '        details: [],',
    '        url: null,',
    '        startedAt: null,',
    '        completedAt: null,',
    '        durationMs: null,',
    '      };',
    '    })',
    '    .filter(Boolean);',
    '};',
    'const productScanResolveStepIdentity = (key, attempt, inputSource, candidateId = null) =>',
    '  String(productScanResolveText(key) || \'\') +',
    '  \'::\' +',
    '  String(productScanResolveAttempt(attempt)) +',
    '  \'::\' +',
    '  String(productScanResolveText(inputSource) || \'none\') +',
    '  \'::\' +',
    '  String(productScanResolveText(candidateId) || \'none\');',
    'const productScanIsPendingTemplateStep = (step) =>',
    '  step?.status === \'pending\' &&',
    '  !step?.startedAt &&',
    '  !step?.completedAt &&',
    '  !productScanResolveText(step?.message) &&',
    '  !productScanResolveText(step?.warning) &&',
    '  (!Array.isArray(step?.details) || step.details.length === 0) &&',
    '  !productScanResolveText(step?.url) &&',
    '  !productScanResolveText(step?.candidateId) &&',
    '  !productScanResolveText(step?.inputSource) &&',
    '  (!Number.isFinite(step?.candidateRank) || step.candidateRank <= 0);',
    'const seedProductScanStepSequence = (input = {}) => {',
    '  const seededSteps = buildProductScanSequenceSteps(input);',
    '  for (const seededStep of seededSteps) {',
    '    const existingIndex = scanSteps.findIndex(',
    '      (entry) =>',
    '        productScanResolveStepIdentity(',
    '          entry.key,',
    '          entry.attempt,',
    '          entry.inputSource,',
    '          entry.candidateId',
    '        ) ===',
    '        productScanResolveStepIdentity(',
    '          seededStep.key,',
    '          seededStep.attempt,',
    '          seededStep.inputSource,',
    '          seededStep.candidateId',
    '        )',
    '    );',
    '    if (existingIndex < 0) {',
    '      scanSteps.push(seededStep);',
    '    }',
    '  }',
    '  return seededSteps;',
    '};',
    'const upsertScanStep = (input) => {',
    '  const key = productScanResolveText(input?.key);',
    '  const status = productScanResolveText(input?.status);',
    '  const registryEntry = key ? PRODUCT_SCAN_STEP_REGISTRY[key] || null : null;',
    '  const label = productScanResolveText(input?.label) || registryEntry?.label || key;',
    '  if (!key || !label || !status) {',
    '    return null;',
    '  }',
    '  const normalizedStatus =',
    '    status === \'pending\' ||',
    '    status === \'running\' ||',
    '    status === \'completed\' ||',
    '    status === \'failed\' ||',
    '    status === \'skipped\'',
    '      ? status',
    '      : null;',
    '  if (!normalizedStatus) {',
    '    return null;',
    '  }',
    '  const timestamp = new Date().toISOString();',
    '  const stepUrl = productScanResolveText(input?.url) || productScanResolveText(page.url());',
    '  const stepMessage = productScanResolveText(input?.message);',
    '  const stepAttempt = productScanResolveAttempt(input?.attempt);',
    '  const normalizedInputSource = productScanResolveText(input?.inputSource);',
    '  const normalizedCandidateId = productScanResolveText(input?.candidateId);',
    '  const existingIndex = scanSteps.findIndex(',
    '    (entry) =>',
    '      productScanResolveStepIdentity(',
    '        entry.key,',
    '        entry.attempt,',
    '        entry.inputSource,',
    '        entry.candidateId',
    '      ) ===',
    '      productScanResolveStepIdentity(',
    '        key,',
    '        stepAttempt,',
    '        normalizedInputSource,',
    '        normalizedCandidateId',
    '      )',
    '  );',
    '  const pendingTemplateIndex =',
    '    existingIndex >= 0',
    '      ? -1',
    '      : scanSteps.findIndex(',
    '          (entry) => entry.key === key && productScanIsPendingTemplateStep(entry)',
    '        );',
    '  const existingStep =',
    '    existingIndex >= 0',
    '      ? scanSteps[existingIndex]',
    '      : pendingTemplateIndex >= 0',
    '        ? scanSteps[pendingTemplateIndex]',
    '      : {',
    '          key,',
    '          label,',
    '          group: registryEntry?.group || productScanResolveStepGroup(key),',
    '          attempt: stepAttempt,',
    '          candidateId: normalizedCandidateId,',
    '          candidateRank: null,',
    '          inputSource: null,',
    '          retryOf: null,',
    '          resultCode: null,',
    '          status: \'pending\',',
    '          message: null,',
    '          warning: null,',
    '          details: [],',
    '          url: null,',
    '          startedAt: null,',
    '          completedAt: null,',
    '          durationMs: null,',
    '        };',
    '  const startedAt =',
    '    normalizedStatus === \'pending\'',
    '      ? existingStep.startedAt',
    '      : existingStep.startedAt || timestamp;',
    '  const completedAt =',
    '    normalizedStatus === \'completed\' ||',
    '    normalizedStatus === \'failed\' ||',
    '    normalizedStatus === \'skipped\'',
    '      ? timestamp',
    '      : null;',
    '  const durationMs =',
    '    startedAt && completedAt',
    '      ? Math.max(0, Date.parse(completedAt) - Date.parse(startedAt))',
    '      : null;',
    '  const nextStep = {',
    '    ...existingStep,',
    '    label,',
    '    group:',
    '      productScanResolveText(input?.group) ||',
    '      existingStep.group ||',
    '      registryEntry?.group ||',
    '      productScanResolveStepGroup(key),',
    '    attempt: stepAttempt,',
    '    candidateId: normalizedCandidateId || existingStep.candidateId || null,',
    '    candidateRank:',
    '      typeof input?.candidateRank === \'number\' &&',
    '      Number.isFinite(input.candidateRank) &&',
    '      input.candidateRank > 0',
    '        ? Math.trunc(input.candidateRank)',
    '        : existingStep.candidateRank || null,',
    '    inputSource: normalizedInputSource || existingStep.inputSource || null,',
    '    retryOf: productScanResolveText(input?.retryOf) ?? existingStep.retryOf ?? null,',
    '    resultCode: productScanResolveText(input?.resultCode) ?? existingStep.resultCode ?? null,',
    '    status: normalizedStatus,',
    '    message: stepMessage ?? existingStep.message ?? null,',
    '    warning: productScanResolveText(input?.warning) ?? existingStep.warning ?? null,',
    '    details:',
    '      Array.isArray(input?.details)',
    '        ? productScanNormalizeStepDetails(input.details)',
    '        : existingStep.details || [],',
    '    url: stepUrl ?? existingStep.url ?? null,',
    '    startedAt,',
    '    completedAt,',
    '    durationMs,',
    '  };',
    '  if (existingIndex >= 0) {',
    '    scanSteps[existingIndex] = nextStep;',
    '  } else if (pendingTemplateIndex >= 0) {',
    '    scanSteps[pendingTemplateIndex] = nextStep;',
    '  } else {',
    '    scanSteps.push(nextStep);',
    '  }',
    '  return nextStep;',
    '};',
  ].join('\n');
};

export const PRODUCT_SCAN_PLAYWRIGHT_STEP_SEQUENCER_RUNTIME =
  generateProductScanPlaywrightStepSequencerRuntime();
