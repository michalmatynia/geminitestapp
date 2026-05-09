/**
 * AI Brain Model Vendor
 * 
 * Utilities for inferring and normalizing AI model vendors and IDs.
 * Supports OpenAI, Anthropic, Gemini, and Ollama vendors.
 * Handles prefixed model IDs (e.g., "openai:gpt-4").
 */

import type { BrainModelVendor } from '@/shared/contracts/ai-brain';

const PREFIXED_MODEL_PATTERN = /^(openai|ollama|anthropic|gemini)\s*[:/]\s*(.+)$/i;
const BRAIN_MODEL_VENDORS: readonly BrainModelVendor[] = [
  'openai',
  'ollama',
  'anthropic',
  'gemini',
];
const OPENAI_NON_GPT_PREFIXES = [
  'ft:gpt-',
  'o1-',
  'o3-',
  'o4-',
  'chatgpt-',
  'dall-e-',
] as const;

/**
 * Type guard to check if a string is a valid BrainModelVendor.
 * 
 * @param vendor - The string to check.
 * @returns True if the value is a valid model vendor.
 */
const isBrainModelVendor = (vendor: string): vendor is BrainModelVendor =>
  BRAIN_MODEL_VENDORS.includes(vendor as BrainModelVendor);

/**
 * Checks if a normalized model ID belongs to OpenAI.
 * 
 * @param normalized - The normalized model ID in lowercase.
 * @returns True if it's an OpenAI model.
 */
const isOpenAiModelId = (normalized: string): boolean =>
  (normalized.startsWith('gpt-') && !normalized.includes('oss')) ||
  OPENAI_NON_GPT_PREFIXES.some((prefix) => normalized.startsWith(prefix));

/**
 * Normalizes a model ID by stripping vendor prefixes.
 * 
 * @param modelId - The raw model ID (possibly with prefix).
 * @returns An object containing the inferred vendor (if prefixed) and the stripped model ID.
 */
const normalizeModelPrefix = (
  modelId: string
): { vendor: BrainModelVendor | null; modelId: string } => {
  const trimmed = modelId.trim();
  const match = trimmed.match(PREFIXED_MODEL_PATTERN);
  if (match === null) {
    return {
      vendor: null,
      modelId: trimmed,
    };
  }
  const vendorRaw = (match[1] ?? '').toLowerCase();
  const normalizedModelId = match[2]?.trim() ?? '';
  if (!isBrainModelVendor(vendorRaw)) {
    return {
      vendor: null,
      modelId: trimmed,
    };
  }
  return {
    vendor: vendorRaw,
    modelId: normalizedModelId,
  };
};

/**
 * Normalizes a Brain model ID by removing any vendor prefix.
 * 
 * @param modelId - The raw model ID.
 * @returns The normalized model ID without the vendor prefix.
 */
export const normalizeBrainModelId = (modelId: string): string =>
  normalizeModelPrefix(modelId).modelId;

/**
 * Infers the AI vendor for a given model ID.
 * Supports explicit prefixes (e.g., "openai:...") and heuristic inference based on ID patterns.
 * Defaults to "ollama" if no other vendor matches.
 * 
 * @param modelId - The model ID to inspect.
 * @returns The inferred BrainModelVendor.
 */
export const inferBrainModelVendor = (modelId: string): BrainModelVendor => {
  const prefixed = normalizeModelPrefix(modelId);
  if (prefixed.vendor !== null) return prefixed.vendor;

  const normalized = prefixed.modelId.toLowerCase();
  if (isOpenAiModelId(normalized)) {
    return 'openai';
  }
  if (normalized.startsWith('claude-')) {
    return 'anthropic';
  }
  if (normalized.startsWith('gemini-') || normalized.startsWith('models/gemini-')) {
    return 'gemini';
  }
  return 'ollama';
};
