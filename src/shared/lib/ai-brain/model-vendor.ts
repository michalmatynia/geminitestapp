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

const isBrainModelVendor = (vendor: string): vendor is BrainModelVendor =>
  BRAIN_MODEL_VENDORS.includes(vendor as BrainModelVendor);

const isOpenAiModelId = (normalized: string): boolean =>
  (normalized.startsWith('gpt-') && !normalized.includes('oss')) ||
  OPENAI_NON_GPT_PREFIXES.some((prefix) => normalized.startsWith(prefix));

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

export const normalizeBrainModelId = (modelId: string): string =>
  normalizeModelPrefix(modelId).modelId;

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
