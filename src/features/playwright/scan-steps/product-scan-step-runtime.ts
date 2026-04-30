import {
  PRODUCT_SCAN_STEP_REGISTRY,
  PRODUCT_SCAN_STEP_SEQUENCES,
  type ProductScanSequenceEntry,
  type ProductScanStepExtension,
} from './product-scan-step-definitions';
import { PRODUCT_SCAN_STEP_RUNTIME_SOURCE } from './product-scan-step-runtime-source';

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

  return [
    '// --- Product scan step sequencing ---',
    `const PRODUCT_SCAN_STEP_REGISTRY = ${JSON.stringify(mergedRegistry)};`,
    `const PRODUCT_SCAN_STEP_SEQUENCES = ${JSON.stringify(mergedSequences)};`,
    PRODUCT_SCAN_STEP_RUNTIME_SOURCE,
  ].join('\n');
};

export const PRODUCT_SCAN_PLAYWRIGHT_STEP_SEQUENCER_RUNTIME =
  generateProductScanPlaywrightStepSequencerRuntime();
